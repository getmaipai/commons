import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { MediaStage, MediaStageProgress } from "./media-stage";
import { MediaStageShowcase } from "./MediaStageShowcase";

const realMatchMedia = window.matchMedia;
beforeEach(() => stubMatchMedia({}));
afterEach(() => { cleanup(); mock.restore(); window.matchMedia = realMatchMedia; });

const media = { still: "/still.png", loop: "/loop.mp4", position: "50% 30%" };
const slot = (root: HTMLElement, name: string) => root.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe("MediaStage", () => {
  test("the picture is a named image and the still goes through SafeImage", () => {
    const v = render(<MediaStage description="A boat on a pond" media={media} />);
    expect(v.getByRole("img", { name: "A boat on a pond" })).toBeTruthy();
    const still = slot(v.container, "media-stage-still") as HTMLImageElement;
    expect(still.getAttribute("src")).toBe("/still.png");
    expect(still.style.objectPosition).toBe("50% 30%");
  });

  test("idle drifts, and reduced motion keeps the still without drift", () => {
    const v = render(<MediaStage description="x" media={media} />);
    expect(slot(v.container, "media-stage")!.hasAttribute("data-drift")).toBe(true);
    cleanup();
    stubMatchMedia({ "(prefers-reduced-motion: reduce)": true });
    const r = render(<MediaStage description="x" media={media} />);
    expect(slot(r.container, "media-stage")!.hasAttribute("data-drift")).toBe(false);
  });

  test("looping renders a muted, inline, hidden video and stops the drift", () => {
    const v = render(<MediaStage description="x" state="looping" media={media} />);
    const video = slot(v.container, "media-stage-loop") as HTMLVideoElement;
    expect(video.tagName).toBe("VIDEO");
    expect(video.getAttribute("src")).toBe("/loop.mp4");
    expect(video.getAttribute("aria-hidden")).toBe("true");
    expect(video.getAttribute("preload")).toBe("auto");
    expect(video.muted).toBe(true);
    expect(video.hasAttribute("playsinline")).toBe(true);
    expect(slot(v.container, "media-stage")!.hasAttribute("data-drift")).toBe(false);
    expect(slot(v.container, "media-stage-still")).toBeTruthy();
  });

  test("looping under reduced motion, paused or without a loop shows the still only", () => {
    stubMatchMedia({ "(prefers-reduced-motion: reduce)": true });
    const a = render(<MediaStage description="x" state="looping" media={media} />);
    expect(slot(a.container, "media-stage-loop")).toBeNull();
    cleanup();
    stubMatchMedia({});
    const b = render(<MediaStage description="x" state="paused" media={media} />);
    expect(slot(b.container, "media-stage-loop")).toBeNull();
    expect(slot(b.container, "media-stage")!.hasAttribute("data-drift")).toBe(false);
    cleanup();
    const c = render(<MediaStage description="x" state="looping" media={{ still: "/s.png" }} />);
    expect(slot(c.container, "media-stage-loop")).toBeNull();
  });

  test("a loop that cannot play leaves the still", () => {
    const v = render(<MediaStage description="x" state="looping" media={media} />);
    fireEvent.error(slot(v.container, "media-stage-loop")!);
    expect(slot(v.container, "media-stage-loop")).toBeNull();
    expect(slot(v.container, "media-stage-still")).toBeTruthy();
  });

  test("waiting and dim set the waiting look", () => {
    const a = render(<MediaStage description="x" state="waiting" media={media} />);
    expect(slot(a.container, "media-stage")!.hasAttribute("data-dim")).toBe(true);
    cleanup();
    const b = render(<MediaStage description="x" dim media={media} />);
    expect(slot(b.container, "media-stage")!.hasAttribute("data-dim")).toBe(true);
  });

  test("loading shows a skeleton and a status, with no picture", () => {
    const v = render(<MediaStage description="x" state="loading" media={media} />);
    expect(slot(v.container, "media-stage-skeleton")).toBeTruthy();
    expect(slot(v.container, "media-stage-still")).toBeNull();
    expect(v.getByRole("status").textContent).toBe("Loading");
    expect(slot(v.container, "media-stage")!.getAttribute("aria-busy")).toBe("true");
  });

  test("error keeps the still and shows the message and actions instead of the overlay", () => {
    const v = render(
      <MediaStage description="x" state="error" media={media} overlay={<p>Progress</p>} errorMessage="The video could not be made. Try again." errorActions={<button type="button">Try again</button>} playButton={{ label: "Play", onSelect: () => {} }} />,
    );
    expect(v.getByRole("alert").textContent).toBe("The video could not be made. Try again.");
    expect(v.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(v.queryByText("Progress")).toBeNull();
    expect(v.queryByRole("button", { name: "Play" })).toBeNull();
    expect(slot(v.container, "media-stage-still")).toBeTruthy();
  });

  test("pills are real buttons with a name and call back; the title pill, title level and slots render", () => {
    const calls: string[] = [];
    const v = render(
      <MediaStage description="x" media={media} titleLevel={1} eyebrow="Eyebrow" title="Title" subtitle="Subtitle" titlePill="Chapter 2" overlay={<p>Overlay</p>}
        pills={[{ id: "share", label: "Share", icon: "share", onSelect: () => calls.push("share") }, { id: "dl", label: "Download", onSelect: () => calls.push("dl"), disabled: true }]}
        playButton={{ label: "Play", onSelect: () => calls.push("play") }}>
        <p>Composer</p>
      </MediaStage>,
    );
    fireEvent.click(v.getByRole("button", { name: "Share" }));
    fireEvent.click(v.getByRole("button", { name: "Play" }));
    expect(calls).toEqual(["share", "play"]);
    expect(v.getByRole("button", { name: "Download" }).hasAttribute("disabled")).toBe(true);
    expect(v.getByRole("heading", { level: 1, name: "Title" })).toBeTruthy();
    for (const t of ["Eyebrow", "Subtitle", "Chapter 2", "Overlay", "Composer"]) expect(v.getByText(t)).toBeTruthy();
    expect(slot(v.container, "media-stage-composer")).toBeTruthy();
  });

  test("at a phone width three actions are one row of at most two buttons, and the rest sit in a More menu", async () => {
    stubMatchMedia({ "(max-width: 859.98px)": true });
    const calls: string[] = [];
    const pills = [
      { id: "share", label: "Share", icon: "share", onSelect: () => calls.push("share") },
      { id: "dl", label: "Download", icon: "download", onSelect: () => calls.push("dl"), disabled: true, disabledReason: "Finish the video first." },
      { id: "again", label: "Another take", icon: "sparkles", onSelect: () => calls.push("again") },
    ];
    const v = render(<MediaStage description="x" media={media} title="Title" pills={pills} />);
    const row = slot(v.container, "media-stage-pills")!;
    const buttons = Array.from(row.querySelectorAll("button"));
    expect(buttons.length).toBeLessThanOrEqual(2);
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual(["Share", "More"]);
    expect(v.queryByRole("button", { name: "Another take" })).toBeNull();
    const more = v.getByRole("button", { name: "More" });
    expect(more.tagName).toBe("BUTTON");
    fireEvent.pointerDown(more, { button: 0, ctrlKey: false });
    const items = await v.findAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["DownloadFinish the video first.", "Another take"]);
    expect(items[0]!.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(items[1]!);
    expect(calls).toEqual(["again"]);
  });

  test("a phone width with two actions, and a wide screen with three, keep every pill in the row and no More menu", () => {
    const three = [{ id: "a", label: "A", onSelect: () => {} }, { id: "b", label: "B", onSelect: () => {} }, { id: "c", label: "C", onSelect: () => {} }];
    stubMatchMedia({ "(max-width: 859.98px)": true });
    const a = render(<MediaStage description="x" pills={three.slice(0, 2)} />);
    expect(a.queryByRole("button", { name: "More" })).toBeNull();
    expect(a.getAllByRole("button").length).toBe(2);
    cleanup();
    stubMatchMedia({});
    const b = render(<MediaStage description="x" pills={three} />);
    expect(b.queryByRole("button", { name: "More" })).toBeNull();
    expect(b.getAllByRole("button").length).toBe(3);
  });

  test("hero is ready by default, compact gives up the minimum height, aspect and scrim are props", () => {
    const a = render(<MediaStage size="hero" description="x" />);
    expect(slot(a.container, "media-stage")!.hasAttribute("data-ready")).toBe(true);
    cleanup();
    const b = render(<MediaStage size="hero" compact description="x" />);
    expect(slot(b.container, "media-stage")!.hasAttribute("data-ready")).toBe(false);
    expect(slot(b.container, "media-stage")!.hasAttribute("data-compact")).toBe(true);
    cleanup();
    const c = render(<MediaStage size="hero" ready={false} description="x" />);
    expect(slot(c.container, "media-stage")!.hasAttribute("data-ready")).toBe(false);
    cleanup();
    const e = render(<MediaStage size="stage" aspect="21 / 9" scrim="strong" description="x" />);
    const root = slot(e.container, "media-stage")!;
    expect(root.style.getPropertyValue("--media-stage-aspect")).toBe("21 / 9");
    expect(root.getAttribute("data-scrim")).toBe("strong");
    expect(root.hasAttribute("data-ready")).toBe(false);
  });

  test("the progress strip clamps and names its value", () => {
    const v = render(<MediaStageProgress value={140} label="Video progress" />);
    const bar = v.getByRole("progressbar", { name: "Video progress" });
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect((slot(v.container, "media-stage-progress-fill") as HTMLElement).style.width).toBe("100%");
  });

  test("the showcase renders every state", () => {
    const v = render(<MediaStageShowcase />);
    const states = Array.from(v.container.querySelectorAll('[data-slot="media-stage"]')).map((n) => n.getAttribute("data-state"));
    for (const s of ["idle", "looping", "paused", "waiting", "loading", "error"]) expect(states).toContain(s);
    expect(v.container.querySelectorAll("video").length).toBe(1);
    expect(v.getByTestId("media-stage-three-actions").querySelectorAll('[data-slot="media-stage-pill"]').length).toBe(3);
  });
});

