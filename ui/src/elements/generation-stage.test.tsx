import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { GenerationStage, previewBlur } from "./generation-stage";
import { ImageGeneration } from "./image-generation";
import { VideoPlayer } from "./video-player";

const realImage = globalThis.Image;
const loading: string[] = [];
beforeEach(() => {
  loading.length = 0;
  // A picture that "loads" at once, so the preview swap can be seen without a network.
  (globalThis as { Image: unknown }).Image = class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(value: string) { loading.push(value); queueMicrotask(() => this.onload?.()); }
  };
});
afterEach(() => { cleanup(); (globalThis as { Image: unknown }).Image = realImage; });

const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 40)); });

describe("previewBlur", () => {
  test("heavy on the first step, none on the last, none when the steps are unknown", () => {
    expect(previewBlur(1, 4)).toBe(8);
    expect(previewBlur(2, 4)).toBe(5);
    expect(previewBlur(3, 4)).toBe(3);
    expect(previewBlur(4, 4)).toBe(0);
    expect(previewBlur(undefined, 4)).toBe(0);
    expect(previewBlur(2, undefined)).toBe(0);
    expect(previewBlur(9, 4)).toBe(0);
  });
});

describe("the preview cross-fade", () => {
  test("without a preview only the shimmer shows; with one the picture fades in over it and the dots fade out", async () => {
    const view = render(<GenerationStage generating previewSrc={undefined} />);
    expect(view.container.querySelector("img")).toBeNull();
    view.rerender(<GenerationStage generating previewSrc="/p.jpg?v=1" previewStep={1} steps={4} />);
    await settle();
    const img = view.container.querySelector("img[data-slot=generation-preview]") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/p.jpg?v=1");
    expect(img.getAttribute("alt")).toBe("");
    expect(img.className).toContain("opacity-100");
    expect(img.style.filter).toBe("blur(8px)");
    expect((view.container.querySelector("[aria-hidden]") as HTMLElement).className).toContain("opacity-0");
  });

  test("each new preview replaces the last without blinking to empty, and the blur drops as the steps advance", async () => {
    const view = render(<GenerationStage generating previewSrc="/p.jpg?v=1" previewStep={1} steps={4} />);
    await settle();
    view.rerender(<GenerationStage generating previewSrc="/p.jpg?v=2" previewStep={2} steps={4} />);
    expect((view.container.querySelector("img") as HTMLImageElement).getAttribute("src")).toBe("/p.jpg?v=1");
    await settle();
    const img = view.container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/p.jpg?v=2");
    expect(img.style.filter).toBe("blur(5px)");
    view.rerender(<GenerationStage generating previewSrc="/p.jpg?v=4" previewStep={4} steps={4} />);
    await settle();
    expect((view.container.querySelector("img") as HTMLImageElement).style.filter).toBe("");
    expect(loading).toEqual(["/p.jpg?v=1", "/p.jpg?v=2", "/p.jpg?v=4"]);
  });

  test("a preview that fails during preload still renders the shared picture fallback", async () => {
    const currentImage = globalThis.Image;
    (globalThis as { Image: unknown }).Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { queueMicrotask(() => this.onerror?.()); }
    };
    try {
      const view = render(<GenerationStage generating previewSrc="/failed.jpg" />);
      await settle();
      fireEvent.error(view.container.querySelector("img[data-slot=generation-preview]")!);
      expect(view.container.querySelector('[data-slot="safe-image-fallback"][data-kind="picture"]')).not.toBeNull();
      expect(view.container.querySelector("img[data-slot=generation-preview]")).toBeNull();
    } finally {
      (globalThis as { Image: unknown }).Image = currentImage;
    }
  });

  test("reduced motion switches the transitions off; the preview goes away when generating stops", async () => {
    const view = render(<GenerationStage generating previewSrc="/p.jpg" previewStep={1} steps={4} />);
    await settle();
    const img = view.container.querySelector("img") as HTMLImageElement;
    expect(img.className).toContain("motion-reduce:transition-none");
    expect((view.container.querySelector("[aria-hidden]") as HTMLElement).className).toContain("motion-reduce:transition-none");
    view.rerender(<GenerationStage generating={false} previewSrc="/p.jpg" previewStep={1} steps={4} />);
    await settle();
    expect(view.container.querySelector("img")).toBeNull();
  });

  test("ImageGeneration draws the preview inside its card with the status, clock and time left", async () => {
    const view = render(<ImageGeneration prompt="A fox" generating previewSrc="/p.jpg" previewStep={2} steps={4} statusLabel="Drawing, step 3 of 4" elapsedLabel="3s" etaLabel="about 2 seconds left" progress={50} />);
    await settle();
    expect(view.container.querySelector("img[data-slot=generation-preview]")).not.toBeNull();
    expect(view.getByText("Drawing, step 3 of 4")).toBeTruthy();
    expect(view.getByText("about 2 seconds left")).toBeTruthy();
  });
});

describe("VideoPlayer while it is made", () => {
  test("no empty grey box: the shimmer and the prompt show, then the first-frame preview takes the box; stage, clock, percent and time left are in words", async () => {
    const props = { status: "generating" as const, prompt: "a paper boat in the rain", progress: 12, startedAt: Date.now() - 35_000, phaseLabel: "Loading the video model", etaLabel: "about 2 minutes left", hint: "Videos are 5 seconds at 480p and take about 2 minutes." };
    const view = render(<VideoPlayer {...props} />);
    expect(view.container.querySelectorAll("span.rounded-full").length).toBe(64);
    expect(view.container.querySelector("[data-slot=video-player-stage]")!.textContent).toContain("a paper boat in the rain");
    expect(view.container.textContent).toContain("Loading the video model");
    expect(view.container.textContent).toMatch(/0:3\d · 12% · about 2 minutes left/);
    expect(view.container.textContent).toContain("take about 2 minutes");
    view.rerender(<VideoPlayer {...props} previewSrc="/frame.jpg" phaseLabel="Putting the frames together, 4 of 60" />);
    await settle();
    expect(view.container.querySelector("img[data-slot=generation-preview]")!.getAttribute("src")).toBe("/frame.jpg");
    expect(view.container.querySelector("[data-slot=video-player-stage]")!.textContent).not.toContain("a paper boat in the rain");
    expect(view.getByRole("status").textContent).toContain("Putting the frames together, 4 of 60");
    expect(view.container.textContent).toContain("Putting the frames together, 4 of 60");
  });
  test("queued shows the place in line and no preview; the time left is not shown while waiting", async () => {
    const view = render(<VideoPlayer status="queued" prompt="x" queuePosition={2} previewSrc="/frame.jpg" etaLabel="about 2 minutes left" startedAt={Date.now()} />);
    await settle();
    expect(view.getByRole("status").textContent).toContain("Place in line: 2");
    expect(view.container.querySelector("img")).toBeNull();
    expect(view.container.textContent).not.toContain("about 2 minutes left");
  });
});
