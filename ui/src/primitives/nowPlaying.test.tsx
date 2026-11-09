import { afterEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { Player } from "@/kit/primitives/Player";
import { MediaHostContext } from "@/kit/schema/mediaHost";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { PlayerNodeSchema } from "@/kit/schema/types";

afterEach(cleanup);

const base = { src: "/api/media/files/s1", kind: "audio" as const, title: "Lanterns", subtitle: "Iris Vale", poster: "/art/lanterns.jpg" };

function fakeAudio(el: HTMLMediaElement) {
  let paused = true;
  Object.defineProperty(el, "paused", { configurable: true, get: () => paused });
  el.play = mock(() => { paused = false; el.dispatchEvent(new Event("play")); return Promise.resolve(); });
  el.pause = mock(() => { paused = true; el.dispatchEvent(new Event("pause")); });
  return el;
}

describe("Now Playing (audio layout)", () => {
  test("shows the cover, title, artist, scrubber with elapsed and remaining time, and a large play button", () => {
    const view = render(<Player {...base} />);
    const root = view.container.querySelector("[data-slot=player]")!;
    expect(root.getAttribute("data-layout")).toBe("audio");
    expect(view.getByText("Lanterns")).toBeTruthy();
    expect(view.getByText("Iris Vale")).toBeTruthy();
    expect(view.container.querySelector("[data-slot=player-scrubber]")!.textContent).toBe("0:00-0:00");
    expect(view.container.querySelector("[data-slot=player-play]")!.getAttribute("aria-label")).toBe("Play");
    expect(view.container.querySelector("img")!.className).toContain("rounded-[var(--radius-card)]");
  });
  test("a static art-colour gradient sits behind the whole player area and never animates", () => {
    const view = render(<Player {...base} />);
    const gradient = view.container.querySelector("[data-slot=art-gradient]")!;
    expect(gradient.getAttribute("aria-hidden")).toBe("true");
    expect(gradient.className).toContain("-z-10");
    expect(gradient.className).not.toMatch(/animate-/);
    expect(view.container.querySelector("[data-slot=player]")!.className).toContain("isolate");
  });
  test("without shuffle and repeat callbacks it keeps the old 15 and 30 second buttons and draws no shuffle or repeat", () => {
    const view = render(<Player {...base} onNext={() => {}} onPrevious={() => {}} />);
    expect(view.container.querySelector('[data-media-chrome="MediaSeekBackwardButton"]')).not.toBeNull();
    expect(view.queryByRole("button", { name: "Shuffle" })).toBeNull();
    expect(view.container.querySelector("[data-slot=player-repeat]")).toBeNull();
    expect(view.getByRole("button", { name: "Previous" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Next" })).toBeTruthy();
  });
  test("shuffle and repeat buttons show the host's mode: pressed state, repeat all and a 1 badge for repeat one", () => {
    const onShuffle = mock(() => {});
    const onRepeat = mock(() => {});
    const view = render(<Player {...base} shuffle={false} repeat="off" onShuffle={onShuffle} onRepeat={onRepeat} onNext={() => {}} onPrevious={() => {}} />);
    expect(view.container.querySelector('[data-media-chrome="MediaSeekBackwardButton"]')).toBeNull();
    const shuffle = view.getByRole("button", { name: "Shuffle" });
    expect(shuffle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(shuffle);
    expect(onShuffle).toHaveBeenCalledTimes(1);
    const repeat = view.getByRole("button", { name: "Repeat off" });
    expect(repeat.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(repeat);
    expect(onRepeat).toHaveBeenCalledTimes(1);
    view.rerender(<Player {...base} shuffle repeat="all" onShuffle={onShuffle} onRepeat={onRepeat} />);
    expect(view.getByRole("button", { name: "Shuffle" }).getAttribute("aria-pressed")).toBe("true");
    expect(view.getByRole("button", { name: "Repeat all" }).getAttribute("aria-pressed")).toBe("true");
    expect(view.container.querySelector("[data-slot=player-repeat-one]")).toBeNull();
    view.rerender(<Player {...base} repeat="one" onShuffle={onShuffle} onRepeat={onRepeat} />);
    expect(view.getByRole("button", { name: "Repeat one" })).toBeTruthy();
    expect(view.container.querySelector("[data-slot=player-repeat-one]")!.textContent).toBe("1");
  });
  test("skip given alongside shuffle keeps the numbered skip buttons", () => {
    const view = render(<Player {...base} onShuffle={() => {}} skip={{ back: 15, forward: 30 }} />);
    expect(view.container.querySelector('[data-media-chrome="MediaSeekBackwardButton"]')).not.toBeNull();
  });
  test("like pops when it turns on, announces its state and calls back; queue, lyrics, sleep and share are named buttons at the default 48 px icon size", () => {
    const onLike = mock(() => {});
    const onQueue = mock(() => {});
    const onShare = mock(() => {});
    const view = render(<Player {...base} onLike={onLike} onQueue={onQueue} onShare={onShare} lyrics={{ text: "words" }} sleepTimer />);
    const like = view.getByRole("button", { name: "Like" });
    expect(like.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(like);
    expect(onLike).toHaveBeenCalledTimes(1);
    view.rerender(<Player {...base} liked onLike={onLike} onQueue={onQueue} onShare={onShare} lyrics={{ text: "words" }} sleepTimer />);
    const liked = view.getByRole("button", { name: "Unlike" });
    expect(liked.getAttribute("aria-pressed")).toBe("true");
    expect(liked.querySelector("svg")!.getAttribute("class")).toContain("like-pop");
    fireEvent.click(view.getByRole("button", { name: "Up next" }));
    expect(onQueue).toHaveBeenCalledTimes(1);
    fireEvent.click(view.getByRole("button", { name: "Share" }));
    expect(onShare).toHaveBeenCalledTimes(1);
    for (const name of ["Unlike", "Up next", "Lyrics", "Sleep timer", "Share"]) expect(view.getByRole("button", { name }).className).toMatch(/size-1[12]/);
    for (const button of view.container.querySelectorAll("[data-slot=player-tools] button, [data-slot=player-transport] button")) expect(button.getAttribute("aria-label") ?? button.textContent).toBeTruthy();
  });
  test("a volume control is drawn for wide screens only (hidden below sm)", () => {
    const view = render(<Player {...base} />);
    expect(view.container.querySelector("[data-slot=player-volume]")!.className).toContain("max-sm:hidden");
  });
  test("other layouts are unchanged: video has no gradient, the mini bar has no shuffle or repeat", () => {
    const video = render(<Player src="/v" title="Clip" onShuffle={() => {}} onRepeat={() => {}} />);
    expect(video.container.querySelector("[data-slot=art-gradient]")).toBeNull();
    cleanup();
    const mini = render(<Player {...base} layout="mini" onShuffle={() => {}} onRepeat={() => {}} onExpand={() => {}} />);
    expect(mini.container.querySelector("[data-slot=player-repeat]")).toBeNull();
    expect(mini.container.querySelector("[data-slot=art-gradient]")).toBeNull();
  });
  test("a host-owned element survives the redesign: docking to the mini bar and back keeps the same element playing", () => {
    const owned = fakeAudio(document.createElement("audio"));
    const full = render(<Player {...base} media={owned} onShuffle={() => {}} onRepeat={() => {}} />);
    expect(full.container.querySelector("[data-slot=player-media]")).toBe(owned);
    act(() => { void owned.play(); });
    full.unmount();
    expect(owned.parentElement?.getAttribute("data-slot")).toBe("player-parking");
    expect(owned.paused).toBe(false);
    const mini = render(<Player {...base} media={owned} layout="mini" onExpand={() => {}} />);
    expect(mini.container.querySelector("[data-slot=player-media]")).toBe(owned);
    mini.unmount();
    const again = render(<Player {...base} media={owned} />);
    expect(again.container.querySelector("[data-slot=player-media]")).toBe(owned);
    expect(owned.paused).toBe(false);
    expect(owned.play).toHaveBeenCalledTimes(1);
  });
  test("a player node in the audio layout takes shuffle, repeat and the queue from the media host", () => {
    const onShuffle = mock(() => {});
    const onRepeat = mock(() => {});
    const openQueue = mock(() => {});
    const original = globalThis.fetch;
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify({ id: "s1", src: "/api/media/files/s1", title: "Lanterns", subtitle: "Iris Vale", poster: "/art/l.jpg" }), { status: 200 }))) as unknown as typeof fetch;
    const node = PlayerNodeSchema.parse({ type: "player", bind: { source: "route", path: "/api/song" }, kind: "audio", layout: "audio" });
    const view = renderWithQueryClient(
      <MemoryRouter><MediaHostContext.Provider value={{ onPlay: () => {}, playMode: { shuffle: true, repeat: "one", onShuffle, onRepeat }, openQueue }}><NodeRenderer node={node} /></MediaHostContext.Provider></MemoryRouter>,
    );
    return view.findByRole("button", { name: "Repeat one" }).then((repeat) => {
      expect(view.getByRole("button", { name: "Shuffle" }).getAttribute("aria-pressed")).toBe("true");
      fireEvent.click(repeat);
      fireEvent.click(view.getByRole("button", { name: "Shuffle" }));
      fireEvent.click(view.getByRole("button", { name: "Up next" }));
      expect(onRepeat).toHaveBeenCalledTimes(1);
      expect(onShuffle).toHaveBeenCalledTimes(1);
      expect(openQueue).toHaveBeenCalledTimes(1);
    }).finally(() => { globalThis.fetch = original; });
  });
});
