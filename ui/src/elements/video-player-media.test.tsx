// VIDEO-UI-14 (item 2): VideoPlayer `caption`, `badges`, `chrome: "overlay"` and `actionsReveal: "hover"`. Every default is unchanged.
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { VideoPlayer } from "./video-player";

afterEach(cleanup);

const noop = () => {};
const ready = { status: "ready" as const, prompt: "a paper boat", src: "/a.mp4", poster: "/p.jpg", onFavorite: noop, onMakeAnother: noop, actionsVariant: "icons" as const };

describe("VideoPlayer media look props", () => {
  test("omitting all four props draws exactly what the chat card draws today", () => {
    const base = render(<VideoPlayer {...ready} />).container.innerHTML;
    cleanup();
    const explicit = render(<VideoPlayer {...ready} caption actionsReveal="always" chrome="default" badges={[]} />).container.innerHTML;
    expect(explicit).toBe(base);
    expect(base).toContain("a paper boat");
    expect(base).not.toContain("group/player");
    expect(base).not.toContain("video-player-picture");
  });

  test("caption false drops the caption but the prompt stays the clip's accessible name", () => {
    const view = render(<VideoPlayer {...ready} caption={false} />);
    expect(view.container.querySelector("p.line-clamp-2")).toBeNull();
    expect(view.container.querySelector("video")!.getAttribute("aria-label")).toBe("a paper boat");
  });

  test("tracks render as native track children; omitted and locked players load no tracks", () => {
    const tracks = [{ src: "/en.vtt", srclang: "en", label: "English", kind: "captions" as const, default: true }];
    const view = render(<VideoPlayer {...ready} tracks={tracks} />);
    const track = view.container.querySelector("video track")!;
    expect(track.getAttribute("kind")).toBe("captions");
    expect(track.getAttribute("label")).toBe("English");
    expect(track.getAttribute("srclang")).toBe("en");
    expect(track.hasAttribute("default")).toBe(true);
    view.rerender(<VideoPlayer {...ready} />);
    expect(view.container.querySelector("track")).toBeNull();
    view.rerender(<VideoPlayer locked />);
    expect(view.container.querySelector("track")).toBeNull();
  });

  test("badges are drawn on the picture's top edge in every status, and not at all when empty", () => {
    const view = render(<VideoPlayer {...ready} badges={["Anime", "Dolly in"]} />);
    const list = view.container.querySelector("[data-slot=video-player-badges]")!;
    expect([...list.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["Anime", "Dolly in"]);
    expect(list.parentElement!.querySelector("video")).toBeTruthy();
    view.rerender(<VideoPlayer status="generating" prompt="x" badges={["Film"]} />);
    expect(view.container.querySelector("[data-slot=video-player-picture] [data-slot=video-player-badges]")).toBeTruthy();
    view.rerender(<VideoPlayer {...ready} badges={[]} />);
    expect(view.container.querySelector("[data-slot=video-player-badges]")).toBeNull();
  });

  test("overlay chrome draws Favorite, Play and the icon row over the picture, none under it", () => {
    const view = render(<VideoPlayer {...ready} chrome="overlay" onShare={noop} />);
    const picture = view.container.querySelector("[data-slot=video-player-picture]")!;
    expect(picture.querySelector("[data-slot=video-player-favorite]")).toBeTruthy();
    expect(picture.querySelector("[data-slot=video-player-play]")).toBeTruthy();
    expect(picture.querySelector("[data-slot=video-player-actions]")).toBeTruthy();
    expect(view.container.querySelectorAll("[data-slot=video-player-actions]").length).toBe(1);
    const overlay = picture.querySelector("[data-slot=video-player-overlay-actions]")!;
    expect(overlay.className).toContain("var(--art-overlay)");
    expect(overlay.className).toContain("var(--art-foreground)");
    expect(view.getByRole("button", { name: "Download" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Make another" })).toBeTruthy();
  });

  test("the Play button plays the clip, then gives way to the native controls", () => {
    const view = render(<VideoPlayer {...ready} chrome="overlay" />);
    const video = view.container.querySelector("video") as HTMLVideoElement;
    let played = 0;
    video.play = (() => { played += 1; return Promise.resolve(); }) as typeof video.play;
    expect(video.hasAttribute("controls")).toBe(false);
    fireEvent.click(view.getByRole("button", { name: "Play" }));
    expect(played).toBe(1);
    fireEvent.play(video);
    expect(view.queryByRole("button", { name: "Play" })).toBeNull();
    expect(video.hasAttribute("controls")).toBe(true);
    fireEvent.pause(video);
    expect(view.getByRole("button", { name: "Play" })).toBeTruthy();
  });

  test("a draft with overlay chrome puts its row over the still; failed and cancelled keep their row under the picture area", () => {
    const view = render(<VideoPlayer status="draft" prompt="x" still="/s.jpg" chrome="overlay" onRender={noop} onAnotherStill={noop} onFavorite={noop} />);
    const picture = view.container.querySelector("[data-slot=video-player-picture]")!;
    expect(picture.querySelector("[data-slot=video-player-still]")).toBeTruthy();
    expect(picture.querySelector("[data-slot=video-player-actions]")).toBeTruthy();
    expect(picture.querySelector("[data-slot=video-player-play]")).toBeNull();
    view.rerender(<VideoPlayer status="failed" prompt="x" chrome="overlay" onRetry={noop} />);
    expect(view.container.querySelector("[data-slot=video-player-picture]")).toBeNull();
    expect(view.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  test("actionsReveal hover hides only the ready and draft icon row; notice, progress, Stop, the reason and Try again stay visible", () => {
    const reveals = (el: Element | null) => (el?.className ?? "").includes("group-hover/player:opacity-100");
    const hidesAtRest = (el: Element | null) => (el?.className ?? "").includes("[@media(hover:hover)]:opacity-0");
    const view = render(<VideoPlayer {...ready} actionsReveal="hover" notice="Videos are not ready yet." />);
    const row = view.container.querySelector("[data-slot=video-player-actions]");
    expect(hidesAtRest(row) && reveals(row)).toBe(true);
    expect(row!.className).toContain("group-focus-within/player:opacity-100");
    expect(view.container.querySelector("[data-slot=video-player]")!.className).toContain("group/player");
    expect(view.getByText("Videos are not ready yet.")).toBeTruthy();
    for (const status of ["queued", "generating"] as const) {
      view.rerender(<VideoPlayer status={status} prompt="x" actionsReveal="hover" onStop={noop} notice="n" progress={20} />);
      expect(view.getByRole("button", { name: "Stop" })).toBeTruthy();
      expect(view.container.querySelector("[role=progressbar]")).toBeTruthy();
      expect(view.container.querySelector("[data-slot=video-player-actions]")).toBeNull();
    }
    for (const status of ["failed", "cancelled"] as const) {
      view.rerender(<VideoPlayer status={status} prompt="x" actionsReveal="hover" onRetry={noop} onMakeAnother={noop} error="Nope." />);
      expect(hidesAtRest(view.container.querySelector("[data-slot=video-player-actions]"))).toBe(false);
    }
    view.rerender(<VideoPlayer status="failed" prompt="x" actionsReveal="hover" onRetry={noop} error="Nope." />);
    expect(view.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(view.getByText("Nope.")).toBeTruthy();
  });

  test("with overlay chrome the hover reveal covers the icon row but not Favorite or Play", () => {
    const view = render(<VideoPlayer {...ready} chrome="overlay" actionsReveal="hover" />);
    const picture = view.container.querySelector("[data-slot=video-player-picture]")!;
    expect(picture.querySelector("[data-slot=video-player-overlay-actions]")!.className).toContain("[@media(hover:hover)]:opacity-0");
    expect(picture.querySelector("[data-slot=video-player-overlay-favorite]")!.className).not.toContain("opacity-0");
    expect(picture.querySelector("[data-slot=video-player-play]")!.className).not.toContain("opacity-0");
  });

  test("keyboard focus on an action is inside the group the reveal listens to, and the row stays in the tab order", () => {
    const view = render(<VideoPlayer {...ready} actionsReveal="hover" />);
    const card = view.container.querySelector("[data-slot=video-player]")!;
    const download = view.getByRole("button", { name: "Download" });
    expect(card.contains(download)).toBe(true);
    expect(download.tabIndex).toBeGreaterThanOrEqual(0);
    expect(download.closest("[data-slot=video-player-actions]")!.hasAttribute("hidden")).toBe(false);
  });
});
