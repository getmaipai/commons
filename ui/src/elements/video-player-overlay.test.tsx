import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { VideoPlayer, type VideoPlayerAction } from "./video-player";

afterEach(cleanup);

const noop = () => {};

describe("VideoPlayer overlayActions", () => {
  const items = (log: string[]): VideoPlayerAction[] => [
    { label: "Another take", icon: "sparkles", onSelect: () => log.push("take") },
    { label: "Extend", icon: "plus", disabledReason: "Extend needs Final HD.", onSelect: () => log.push("extend") },
    { label: "Enhance", icon: "wand-sparkles", busy: true, onSelect: () => log.push("enhance") },
  ];

  test("draws the actions as glass pills on the picture and no row under it", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/a.mp4" ambient={false} overlayActions actionItems={items([])} onShare={noop} />);
    const pills = view.container.querySelector("[data-slot=video-player-picture] [data-slot=video-player-overlay-pills]")!;
    expect(pills).not.toBeNull();
    expect(pills.className).toContain("max-w-[80%]");
    expect(pills.className).toContain("flex-wrap");
    expect(view.container.querySelector("[data-slot=video-player-actions]")).toBeNull();
    const buttons = pills.querySelectorAll("button");
    expect(Array.from(buttons).map(b => b.getAttribute("aria-label"))).toEqual(["Download", "Share", "Another take", "Extend", "Enhance"]);
    expect(buttons[0]!.className).toContain("backdrop-blur-[10px]");
    expect(buttons[0]!.className).toContain("color-mix(in_oklab,var(--background)_60%,transparent)");
    expect(buttons[0]!.className).toContain("min-h-12");
  });

  test("each pill keeps a visible label and hides it only behind an icon on a phone", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/a.mp4" ambient={false} overlayActions actionItems={[{ label: "Another take", icon: "sparkles" }, { label: "Words only" }]} />);
    const withIcon = view.getByRole("button", { name: "Another take" });
    expect(withIcon.querySelector("span")!.className).toContain("hidden sm:inline");
    expect(withIcon.textContent).toBe("Another take");
    expect(view.getByRole("button", { name: "Words only" }).querySelector("span")!.className).not.toContain("hidden");
  });

  test("a disabled pill puts its reason in title and aria-description, stays focusable and does not fire", () => {
    const log: string[] = [];
    const view = render(<VideoPlayer status="ready" prompt="x" src="/a.mp4" ambient={false} overlayActions actionItems={items(log)} />);
    const extend = view.getByRole("button", { name: "Extend" });
    expect(extend.getAttribute("title")).toBe("Extend needs Final HD.");
    expect(extend.getAttribute("aria-description")).toBe("Extend needs Final HD.");
    expect(extend.getAttribute("aria-disabled")).toBe("true");
    expect((extend as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(extend);
    expect(log).toEqual([]);
    fireEvent.click(view.getByRole("button", { name: "Another take" }));
    expect(log).toEqual(["take"]);
  });

  test("a busy pill shows a spinner, sets aria-busy and does not fire", () => {
    const log: string[] = [];
    const view = render(<VideoPlayer status="ready" prompt="x" src="/a.mp4" ambient={false} overlayActions actionItems={items(log)} />);
    const busy = view.getByRole("button", { name: "Enhance" });
    expect(busy.getAttribute("aria-busy")).toBe("true");
    expect(busy.hasAttribute("data-busy")).toBe(true);
    expect(busy.querySelector("svg")!.getAttribute("class")).toContain("animate-spin");
    fireEvent.click(busy);
    expect(log).toEqual([]);
  });

  test("a draft draws its actions as pills and Favorite stays reachable", () => {
    const log: string[] = [];
    const view = render(<VideoPlayer status="draft" prompt="x" still="/s.jpg" overlayActions onRender={() => log.push("render")} onFavorite={() => log.push("fav")} />);
    const pills = view.container.querySelector("[data-slot=video-player-overlay-pills]")!;
    fireEvent.click(pills.querySelector("button[aria-label='Make the video from this']")!);
    fireEvent.click(view.getByRole("button", { name: "Favorite" }));
    expect(log).toEqual(["render", "fav"]);
    expect(view.container.querySelector("[data-slot=video-player-actions]")).toBeNull();
  });

  test("off by default and for a status without a picture: the row stays where it was", () => {
    const off = render(<VideoPlayer status="ready" prompt="x" src="/a.mp4" ambient={false} actionItems={items([])} />);
    expect(off.container.querySelector("[data-slot=video-player-overlay-pills]")).toBeNull();
    expect(off.container.querySelector("[data-slot=video-player-actions]")).not.toBeNull();
    off.unmount();
    const failed = render(<VideoPlayer status="failed" prompt="x" overlayActions onRetry={noop} />);
    expect(failed.container.querySelector("[data-slot=video-player-overlay-pills]")).toBeNull();
    expect(failed.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  test("with chrome overlay the pills replace its action box and sit beside the Favorite button", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/a.mp4" ambient={false} chrome="overlay" overlayActions onFavorite={noop} actionItems={items([])} />);
    expect(view.container.querySelector("[data-slot=video-player-overlay-actions]")).toBeNull();
    expect(view.container.querySelector("[data-slot=video-player-overlay-pills]")!.className).toContain("end-14");
    expect(view.container.querySelectorAll("[data-slot=video-player-favorite]").length).toBe(1);
  });
});
