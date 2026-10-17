import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { MusicTrack } from "./music-track";

afterEach(cleanup);
const versions = [{ id: "a", label: "Original" }, { id: "b", label: "Slower" }, { id: "c", label: "Jazz" }];

describe("MusicTrack", () => {
  test("generating shows stage, clock, progress, ETA, hint and Stop without a picture", () => {
    let stopped = 0;
    const view = render(<MusicTrack status="generating" title="Pancakes" description="Folk, 1:00" progress={40} startedAt={Date.now() - 65_000} phaseLabel="Mixing it down" etaLabel="about a minute left" hint="Nearly there" onStop={() => stopped++} />);
    expect(view.getByRole("status").textContent).toContain("Making your song");
    expect(view.getByRole("status").textContent).toContain("Mixing it down");
    expect(view.getByRole("progressbar").getAttribute("aria-valuetext")).toContain("40 percent, 1:05");
    expect(view.container.textContent).toContain("about a minute left");
    expect(view.container.textContent).toContain("Nearly there");
    expect(view.container.querySelector("img, audio, video, .animate-pulse")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Stop" }));
    expect(stopped).toBe(1);
  });
  test("clock ticks and unreported progress uses the shared estimate", async () => {
    const view = render(<MusicTrack status="generating" title="Song" startedAt={Date.now() - 60_000} />);
    expect(view.getByRole("progressbar").getAttribute("aria-valuetext")).toContain("45 percent");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1200)); });
    expect(view.container.textContent).toContain("1:01");
  });
  test("queued gives its place and default copy", () => {
    const view = render(<MusicTrack status="queued" title="Song" queuePosition={2} />);
    expect(view.getByRole("status").textContent).toContain("Waiting its turn");
    expect(view.getByRole("status").textContent).toContain("Place in line: 2");
  });
  test("ready uses the kit audio player and wires actions", () => {
    const calls: string[] = [];
    const view = render(<MusicTrack status="ready" title="Pancakes" description="Folk, 1:00" src="/song.m4a" onDownload={() => calls.push("download")} onShare={() => calls.push("share")} onSaveToLibrary={() => calls.push("save")} onMakeAnother={() => calls.push("another")} actions={<button type="button">Extra</button>} />);
    expect(view.container.querySelector("audio")?.getAttribute("src")).toBe("/song.m4a");
    expect(view.container.querySelector('[data-layout="audio"]')).toBeTruthy();
    expect(view.container.textContent).toContain("Pancakes");
    expect(view.container.textContent).toContain("Folk, 1:00");
    for (const name of ["Download", "Share", "Save to Music", "Make another"]) fireEvent.click(view.getByRole("button", { name }));
    expect(calls).toEqual(["download", "share", "save", "another"]);
    expect(view.getByRole("button", { name: "Extra" })).toBeTruthy();
  });
  test("download falls back to a temporary link with default or supplied name", () => {
    const links: string[][] = [];
    const click = spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { links.push([this.getAttribute("href")!, this.download]); });
    try {
      const view = render(<MusicTrack status="ready" title="Song" src="/song.m4a" />);
      expect(view.queryByRole("button", { name: "Share" })).toBeNull();
      expect(view.queryByRole("button", { name: "Save to Music" })).toBeNull();
      fireEvent.click(view.getByRole("button", { name: "Download" }));
      view.rerender(<MusicTrack status="ready" title="Song" src="/song.m4a" downloadName="pancakes.m4a" />);
      fireEvent.click(view.getByRole("button", { name: "Download" }));
      expect(links).toEqual([["/song.m4a", "song.m4a"], ["/song.m4a", "pancakes.m4a"]]);
      expect(view.container.querySelector("a[download]")).toBeNull();
    } finally { click.mockRestore(); }
  });
  test("lyrics disclosure preserves literal text and line breaks only when ready", () => {
    const lyrics = "[Verse]\nPancakes **today**\n<chorus>";
    const view = render(<MusicTrack status="ready" title="Song" src="/song.m4a" lyrics={lyrics} />);
    expect(view.container.querySelector("pre")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Lyrics" }));
    expect(view.container.querySelector("pre")?.textContent).toBe(lyrics);
    expect(view.container.querySelector("pre")?.className).toContain("whitespace-pre-wrap");
    view.rerender(<MusicTrack status="generating" title="Song" lyrics={lyrics} />);
    expect(view.queryByRole("button", { name: "Lyrics" })).toBeNull();
  });
  test("version cursor is controlled, bounded and can use an older version", () => {
    const selected: string[] = [], used: string[] = [];
    const props = { status: "ready" as const, title: "Song", src: "/song.m4a", versions, onSelectVersion: (id: string) => selected.push(id), onUseVersion: (id: string) => used.push(id) };
    const view = render(<MusicTrack {...props} currentId="a" />);
    expect((view.getByRole("button", { name: "Previous" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(view.getByRole("button", { name: "Next" }));
    expect(selected).toEqual(["b"]);
    view.rerender(<MusicTrack {...props} currentId="b" />);
    expect(view.container.textContent).toContain("Version 2 of 3");
    fireEvent.click(view.getByRole("button", { name: "Previous" }));
    fireEvent.click(view.getByRole("button", { name: "Use this version" }));
    expect(selected).toEqual(["b", "a"]);
    expect(used).toEqual(["b"]);
    view.rerender(<MusicTrack {...props} currentId="c" />);
    expect((view.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true);
    expect(view.queryByRole("button", { name: "Use this version" })).toBeNull();
    view.rerender(<MusicTrack {...props} versions={[versions[0]!]} currentId="a" />);
    expect(view.queryByRole("button", { name: "Previous" })).toBeNull();
  });
  test("failed gives reason and retry, cancelled gives stopped copy", () => {
    let retries = 0;
    const view = render(<MusicTrack status="failed" title="Song" onRetry={() => retries++} />);
    expect(view.getByRole("alert").textContent).toBe("I couldn't make that song.");
    view.rerender(<MusicTrack status="failed" title="Song" error="Try a shorter song." onRetry={() => retries++} />);
    expect(view.getByRole("alert").textContent).toBe("Try a shorter song.");
    fireEvent.click(view.getByRole("button", { name: "Try again" }));
    expect(retries).toBe(1);
    view.rerender(<MusicTrack status="cancelled" title="Song" />);
    expect(view.container.textContent).toContain("Stopped. Nothing was kept.");
    expect(view.container.querySelector("audio")).toBeNull();
  });
  test("copy is supplied by the host and rendering never calls fetch", () => {
    const fetch = spyOn(globalThis, "fetch");
    try {
      const view = render(<MusicTrack status="queued" title="Song" copy={{ queued: "In line" }} />);
      expect(view.getByRole("status").textContent).toContain("In line");
      for (const status of ["generating", "ready", "failed", "cancelled"] as const) view.rerender(<MusicTrack status={status} title="Song" src="/song.m4a" />);
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); }
  });
});
