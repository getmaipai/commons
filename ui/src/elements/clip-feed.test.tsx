// CLIPS-FEED-01: the vertical clip feed (a composition of the carousel and the VideoPlayer Element) and the `clip_feed` node.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { ClipFeed, CLIP_FEED_MUTE_KEY, clipFeedRetry, resetClipFeedFailures, type ClipFeedClip } from "@/kit/elements/clip-feed";
import { stubMatchMedia } from "../../tests/stubMatchMedia";

const realMatchMedia = window.matchMedia;
const clips: ClipFeedClip[] = [
  { id: "c1", src: "/m/1.mp4", poster: "/p/1.jpg", title: "Blue Hour", subtitle: "By nova", durationS: 12, liked: false },
  { id: "c2", src: "/m/2.mp4", poster: "/p/2.jpg", title: "Second", durationS: 8, liked: true },
  { id: "c3", src: "/m/3.mp4", poster: "/p/3.jpg", title: "Third", durationS: 9 },
  { id: "c4", src: "/m/4.mp4", poster: "/p/4.jpg", title: "Fourth", durationS: 9 },
];

let plays: string[] = [];
let pauses: string[] = [];
const proto = HTMLMediaElement.prototype as unknown as { play: () => Promise<void>; pause: () => void };
const realPlay = proto.play;
const realPause = proto.pause;
beforeEach(() => {
  stubMatchMedia({});
  resetClipFeedFailures();
  clipFeedRetry.delayMs = 20;
  plays = []; pauses = [];
  try { window.localStorage.removeItem(CLIP_FEED_MUTE_KEY); } catch { /* none */ }
  proto.play = function (this: HTMLVideoElement) { plays.push(this.getAttribute("src") ?? ""); return Promise.resolve(); };
  proto.pause = function (this: HTMLVideoElement) { pauses.push(this.getAttribute("src") ?? ""); };
});
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; proto.play = realPlay; proto.pause = realPause; });

const empty = <p>No clips yet.</p>;
const draw = (props: Partial<React.ComponentProps<typeof ClipFeed>> = {}) =>
  render(<ClipFeed clips={clips} onClose={() => {}} empty={empty} {...props} />);
const videos = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLVideoElement>("video"));

describe("ClipFeed layout", () => {
  test("is one vertical carousel with one slide per clip and a labelled region", () => {
    const view = draw();
    expect(view.getByRole("region", { name: "Clips" })).toBeTruthy();
    expect(view.container.querySelector("[data-slot=carousel]")).not.toBeNull();
    const slides = view.getAllByRole("group");
    expect(slides).toHaveLength(4);
    expect(slides[0]!.getAttribute("aria-label")).toBe("Clip 1 of 4");
    // the vertical orientation lays the slides in a column
    expect(view.container.querySelector("[data-slot=carousel-content] > div")!.className).toContain("flex-col");
  });
  test("opens on start_id, and on the first clip when it is not found", () => {
    const view = draw({ startId: "c3" });
    expect(view.container.querySelector("[data-slot=clip-feed-stage][data-active=true] h2")!.textContent).toBe("Third");
    cleanup();
    const missing = draw({ startId: "zzz" });
    expect(missing.container.querySelector("[data-slot=clip-feed-stage][data-active=true] h2")!.textContent).toBe("Blue Hour");
  });
  test("title and subtitle sit over the theme-token scrim", () => {
    const view = draw();
    const scrim = view.container.querySelector("[data-slot=clip-feed-scrim]") as HTMLElement;
    expect(scrim.style.backgroundImage).toBe("var(--art-scrim)");
    expect(within(scrim).getByText("By nova")).toBeTruthy();
  });
});

describe("ClipFeed loading and playing", () => {
  test("only the visible clip and the next one are loaded, the rest are posters", () => {
    const view = draw();
    const loaded = videos(view.container);
    expect(loaded.map((v) => v.getAttribute("src"))).toEqual(["/m/1.mp4", "/m/2.mp4"]);
    expect(loaded.every((v) => v.getAttribute("preload") === "auto")).toBe(true);
    expect(view.container.querySelectorAll("img").length).toBe(2);
  });
  test("exactly one clip plays: the visible one, looping and muted at first", async () => {
    const view = draw();
    await waitFor(() => expect(plays).toContain("/m/1.mp4"));
    expect(plays).not.toContain("/m/2.mp4");
    const first = videos(view.container)[0]!;
    expect(first.loop).toBe(true);
    expect(first.muted).toBe(true);
    expect(pauses).toContain("/m/2.mp4");
  });
  test("one tap pauses and the next tap plays again", async () => {
    const view = draw();
    await waitFor(() => expect(plays.length).toBeGreaterThan(0));
    fireEvent.click(view.getByRole("button", { name: "Pause" }));
    await waitFor(() => expect(view.getAllByRole("button", { name: "Play" }).length).toBe(2));
    expect(pauses).toContain("/m/1.mp4");
    plays.length = 0;
    fireEvent.click(view.getAllByRole("button", { name: "Play" })[0]!);
    await waitFor(() => expect(plays).toContain("/m/1.mp4"));
  });
  test("Space on the feed toggles play", async () => {
    const view = draw();
    const feed = view.getByRole("region", { name: "Clips" });
    feed.focus();
    fireEvent.keyDown(feed, { key: " " });
    await waitFor(() => expect(view.getAllByRole("button", { name: "Play" }).length).toBeGreaterThan(0));
  });
  test("a hidden tab pauses the visible clip and showing it again resumes", async () => {
    const view = draw();
    await waitFor(() => expect(plays).toContain("/m/1.mp4"));
    const original = Object.getOwnPropertyDescriptor(document, "visibilityState");
    const setState = (value: string) => Object.defineProperty(document, "visibilityState", { configurable: true, get: () => value });
    try {
      pauses.length = 0;
      act(() => { setState("hidden"); document.dispatchEvent(new Event("visibilitychange")); });
      await waitFor(() => expect(pauses).toContain("/m/1.mp4"));
      plays.length = 0;
      act(() => { setState("visible"); document.dispatchEvent(new Event("visibilitychange")); });
      await waitFor(() => expect(plays).toContain("/m/1.mp4"));
    } finally {
      if (original) Object.defineProperty(document, "visibilityState", original); else delete (document as unknown as Record<string, unknown>).visibilityState;
    }
    expect(view.container).toBeTruthy();
  });
});

describe("ClipFeed paging", () => {
  test("ArrowDown moves to the next clip and only that clip plays; the old one is unloaded to a poster", async () => {
    const view = draw();
    await waitFor(() => expect(plays).toContain("/m/1.mp4"));
    const feed = view.getByRole("region", { name: "Clips" });
    plays.length = 0;
    fireEvent.keyDown(feed, { key: "ArrowDown" });
    await waitFor(() => expect(view.container.querySelector("[data-slot=clip-feed-stage][data-active=true] h2")!.textContent).toBe("Second"));
    await waitFor(() => expect(plays).toContain("/m/2.mp4"));
    expect(plays).not.toContain("/m/1.mp4");
    expect(videos(view.container).map((v) => v.getAttribute("src"))).toEqual(["/m/2.mp4", "/m/3.mp4"]);
    fireEvent.keyDown(feed, { key: "ArrowUp" });
    await waitFor(() => expect(view.container.querySelector("[data-slot=clip-feed-stage][data-active=true] h2")!.textContent).toBe("Blue Hour"));
  });
  test("a wheel turn pages once, not once per event", async () => {
    const view = draw();
    const feed = view.getByRole("region", { name: "Clips" });
    fireEvent.wheel(feed, { deltaY: 120 });
    fireEvent.wheel(feed, { deltaY: 120 });
    await waitFor(() => expect(view.container.querySelector("[data-slot=clip-feed-stage][data-active=true] h2")!.textContent).toBe("Second"));
  });
});

describe("ClipFeed motion and child band", () => {
  test("reduced motion: no autoplay, the poster stays and a Play button shows", async () => {
    stubMatchMedia({ "(prefers-reduced-motion: reduce)": true });
    const view = draw();
    await new Promise((r) => setTimeout(r, 20));
    expect(plays).toEqual([]);
    expect(view.getAllByRole("button", { name: "Play" }).length).toBeGreaterThan(0);
    fireEvent.click(view.container.querySelector("[data-slot=clip-feed-play]")!);
    await waitFor(() => expect(plays).toContain("/m/1.mp4"));
  });
  test("autoplay false behaves the same", async () => {
    const view = draw({ autoplay: false });
    await new Promise((r) => setTimeout(r, 20));
    expect(plays).toEqual([]);
    expect(view.container.querySelector("[data-slot=clip-feed-play]")).not.toBeNull();
  });
});

describe("ClipFeed controls", () => {
  test("Close is always drawn and calls onClose", () => {
    const onClose = mock(() => {});
    const view = draw({ onClose });
    fireEvent.click(view.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  test("mute remembers the person's choice", async () => {
    const view = draw();
    fireEvent.click(view.getByRole("button", { name: "Unmute" }));
    expect(view.getByRole("button", { name: "Mute" })).toBeTruthy();
    expect(window.localStorage.getItem(CLIP_FEED_MUTE_KEY)).toBe("0");
    expect(videos(view.container)[0]!.muted).toBe(false);
    cleanup();
    const again = draw();
    expect(again.getByRole("button", { name: "Mute" })).toBeTruthy();
  });
  test("every control is at least 44 px and named", () => {
    const view = draw({ onLike: () => {}, onRemake: () => {} });
    for (const name of ["Close", "Unmute", "Like", "Make another"]) {
      const button = view.getByRole("button", { name });
      expect(button.className).toMatch(/size-1[2-9]|size-[2-9]\d/);
    }
    expect(view.getByRole("slider", { name: "Seek" })).toBeTruthy();
  });
  test("Like toggles with aria-pressed and reports the new value; Make another reports the clip", () => {
    const onLike = mock((_c: ClipFeedClip, _l: boolean) => {});
    const onRemake = mock((_c: ClipFeedClip) => {});
    const view = draw({ onLike, onRemake });
    const like = view.getByRole("button", { name: "Like" });
    expect(like.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(like);
    expect(onLike).toHaveBeenCalledWith(clips[0], true);
    expect(like.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(view.getByRole("button", { name: "Make another" }));
    expect(onRemake).toHaveBeenCalledWith(clips[0]);
  });
  test("an undeclared action draws no button", () => {
    const view = draw();
    expect(view.queryByRole("button", { name: "Like" })).toBeNull();
    expect(view.queryByRole("button", { name: "Make another" })).toBeNull();
    expect(view.queryByRole("button", { name: "Save" })).toBeNull();
    expect(view.queryByRole("button", { name: "Share" })).toBeNull();
  });
  test("Make another is disabled with the notice while making is unavailable", () => {
    const onRemake = mock((_c: ClipFeedClip) => {});
    const view = draw({ onRemake, remakeNotice: "Video is not ready yet." });
    const button = view.getByRole("button", { name: "Make another" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.title).toBe("Video is not ready yet.");
    expect(view.getByText("Video is not ready yet.")).toBeTruthy();
    fireEvent.click(button);
    expect(onRemake).not.toHaveBeenCalled();
  });
});

describe("ClipFeed failure and empty", () => {
  test("a clip file that cannot load falls back to its poster, quietly", async () => {
    const view = draw();
    fireEvent.error(videos(view.container)[0]!);
    await waitFor(() => expect(videos(view.container).map((v) => v.getAttribute("src"))).toEqual(["/m/2.mp4"]));
    expect(view.container.querySelector("img[src='/p/1.jpg']")).not.toBeNull();
    expect(view.queryByRole("alert")).toBeNull();
    expect(view.container.querySelector("[data-slot=clip-feed-play]")).toBeNull();
  });
  test("a source that always fails is requested at most twice, then stays a poster", async () => {
    // Every <video src> that mounts is one request; count mounts of the first clip's file while it keeps failing.
    let mounts = 0;
    const seen = new WeakSet<Element>();
    const view = draw({ clips: clips.slice(0, 1) });
    const fail = () => {
      for (const v of videos(view.container)) {
        if (!seen.has(v)) { seen.add(v); mounts++; fireEvent.error(v); }
      }
    };
    fail();
    await waitFor(() => expect(videos(view.container).length).toBe(1)); // the one retry
    fail();
    await new Promise((r) => setTimeout(r, 120));
    fail();
    await new Promise((r) => setTimeout(r, 120));
    expect(mounts).toBe(2);
    expect(videos(view.container)).toHaveLength(0);
    expect(view.container.querySelector("img[src='/p/1.jpg']")).not.toBeNull();
    // a remounted feed does not start over
    cleanup();
    const again = draw({ clips: clips.slice(0, 1) });
    await new Promise((r) => setTimeout(r, 60));
    expect(videos(again.container)).toHaveLength(0);
  });
  test("the feed takes focus on load, without scrolling", () => {
    const view = draw();
    expect(document.activeElement).toBe(view.getByRole("region", { name: "Clips" }));
  });
  test("it is sized from the available height and the phone nav, not a fixed chrome guess", () => {
    const view = draw();
    const feed = view.getByRole("region", { name: "Clips" });
    expect(feed.className).toContain("var(--clip-feed-top");
    expect(feed.className).toContain("var(--phone-nav-offset");
    expect(feed.style.getPropertyValue("--clip-feed-top")).toBe("0px");
  });
  test("the progress track is drawn in a high-contrast art token", () => {
    const view = draw();
    expect(view.container.querySelector("[data-slot=clip-feed-progress]")!.innerHTML).toContain("--art-foreground-muted");
  });
  test("an empty feed shows the status card and still has Close", () => {
    const view = draw({ clips: [] });
    expect(view.getByText("No clips yet.")).toBeTruthy();
    expect(view.getByRole("button", { name: "Close" })).toBeTruthy();
    expect(view.container.querySelector("video")).toBeNull();
  });
});
