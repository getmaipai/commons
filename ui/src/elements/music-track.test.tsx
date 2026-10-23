import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { Button } from "@/kit/ui/button";
import { Input } from "@/kit/ui/input";
import { MusicTrack } from "./music-track";

afterEach(() => act(() => cleanup()));
const stages = [{ id: "queued", label: "Queued" }, { id: "plan", label: "Planning" }, { id: "mix", label: "Mixing" }];

async function withViewport(width: number, check: (container: HTMLElement) => void) {
  const { container } = render(<div style={{ width: `${width}px` }}><MusicTrack status="ready" title="A song with a very long title that must wrap safely" src="/song.m4a" onShare={() => {}} editModes={[{ id: "song", label: "Change the song", content: <Input aria-label="Change" /> }, { id: "cover", label: "New cover", content: <Input aria-label="Cover" /> }]} /></div>);
  check(container);
}

describe("MusicTrack compact card", () => {
  test("generating card shows square placeholder, current stage, elapsed time, percent and supplied ETA", () => {
    const view = render(<MusicTrack status="generating" title="Pancakes" description="Folk song" progress={0.42} stages={stages} currentStage={2} elapsedSeconds={65} etaSeconds={28} phaseLabel="Mixing" onStop={() => {}} />);
    expect(view.getByRole("status").textContent).toBe("Step 3 of 3 · Mixing");
    expect(view.getByRole("status").textContent?.match(/Mixing/g)).toHaveLength(1);
    expect(view.container.querySelector('[data-slot="generation-stages"]')?.querySelectorAll("[aria-current=step]")).toHaveLength(1);
    expect(view.getAllByRole("progressbar").map(bar => bar.getAttribute("aria-valuenow"))).toEqual(["100", "100", "42"]);
    expect(view.container.textContent).toContain("Queued");
    expect(view.container.textContent).toContain("about 28 seconds left");
    expect(view.container.querySelector('[data-slot="generation-stage"]')?.getAttribute("style")).toContain("1 / 1");
    expect(view.getByRole("button", { name: "Stop" })).toBeTruthy();
  });

  test("waiting for memory is calm and omits ETA when the host gives none", () => {
    const view = render(<MusicTrack status="queued" title="Song" waitingForMemory progress={0.1} />);
    expect(view.getByRole("status").textContent).toBe("Waiting for memory, your song starts when there is room");
    expect(view.container.textContent).not.toContain("left");
    expect(view.queryByRole("progressbar")).toBeNull();
    expect(view.container.querySelector('[data-slot="generation-stages"]')).toBeNull();
  });

  test("stage rail represents queued, current progress, final stage and all-done states", () => {
    const view = render(<MusicTrack status="queued" title="Song" stages={stages} currentStage={0} progress={0} />);
    expect(view.getAllByRole("progressbar").map(bar => bar.getAttribute("aria-valuenow"))).toEqual(["0", "0", "0"]);
    view.rerender(<MusicTrack status="generating" title="Song" stages={stages} currentStage={1} progress={0.35} />);
    expect(view.getAllByRole("progressbar").map(bar => bar.getAttribute("aria-valuenow"))).toEqual(["100", "35", "0"]);
    view.rerender(<MusicTrack status="generating" title="Song" stages={stages} currentStage={2} progress={0.8} />);
    expect(view.getAllByRole("progressbar").map(bar => bar.getAttribute("aria-valuenow"))).toEqual(["100", "100", "80"]);
    view.rerender(<MusicTrack status="generating" title="Song" stages={stages} currentStage={3} progress={1} />);
    expect(view.getAllByRole("progressbar").map(bar => bar.getAttribute("aria-valuenow"))).toEqual(["100", "100", "100"]);
  });

  test("phone step line shows the current step and null ETA stays absent", () => {
    const view = render(<MusicTrack status="generating" title="Song" stages={stages} currentStage={1} progress={0.4} elapsedSeconds={8} etaSeconds={null} />);
    expect(view.getByRole("status").textContent).toBe("Step 2 of 3 · Planning");
    expect(view.container.textContent).toContain("40% · 0:08");
    expect(view.container.textContent).not.toContain("about");
    expect(view.getByRole("status").className).toContain("sm:hidden");
  });

  test("finished card has seek controls, accessible icon actions, speed menu and callbacks", () => {
    const calls: string[] = [];
    const view = render(<MusicTrack status="ready" title="Pancakes" src="/song.m4a" onDownload={() => calls.push("download")} onShare={() => calls.push("share")} lyrics="Verse" onSaveToLibrary={() => calls.push("save")} onMakeAnother={() => calls.push("another")} actions={<Button type="button">Extra</Button>} />);
    expect(view.container.querySelector("audio")?.getAttribute("src")).toBe("/song.m4a");
    expect(view.container.querySelector('[data-kind="music"]')).toBeTruthy();
    expect(view.getByRole("slider", { name: "Seek Pancakes" })).toBeTruthy();
    for (const label of ["Play", "Download", "Share", "Lyrics", "Save to Music", "Make another"]) expect(view.getByRole("button", { name: new RegExp(`^${label}$`) })).toBeTruthy();
    for (const label of ["Download", "Share", "Save to Music", "Make another"]) fireEvent.click(view.getByRole("button", { name: label }));
    expect(calls).toEqual(["download", "share", "save", "another"]);
    expect(view.getByRole("button", { name: "Extra" })).toBeTruthy();
  });

  test("cover fallback appears when absent and after an image error", () => {
    const view = render(<MusicTrack status="ready" title="Song" src="/song.m4a" cover="/broken.jpg" coverAlt="Cover" />);
    const image = view.getByRole("img", { name: "Cover" });
    fireEvent.error(image);
    expect(view.container.querySelector('[data-slot="safe-image-fallback"][data-kind="music"]')).toBeTruthy();
    view.rerender(<MusicTrack status="ready" title="Song" src="/song.m4a" />);
    expect(view.container.querySelector('[data-slot="safe-image-fallback"][data-kind="music"]')).toBeTruthy();
  });

  test("edit popover offers separate tabs and the quick-song length action", () => {
    const view = render(<MusicTrack status="ready" title="Song" src="/song.m4a" quickSong onMakeFull={() => {}} editModes={[{ id: "song", label: "Change the song", content: <Input aria-label="How should it change?" /> }, { id: "cover", label: "New cover", content: <Input aria-label="Describe the new cover" /> }]} />);
    fireEvent.click(view.getByRole("button", { name: "Edit" }));
    expect(document.querySelector('[data-slot="popover-content"]')?.getAttribute("data-align")).toBe("start");
    expect(view.getByRole("tab", { name: "Change the song" })).toBeTruthy();
    expect(view.getByRole("tab", { name: "New cover" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Make it full" })).toBeTruthy();
    expect(view.getByRole("textbox", { name: "How should it change?" })).toBeTruthy();
  });

  test("legacy host editContent remains available in the popover", () => {
    const view = render(<MusicTrack status="ready" title="Song" src="/song.m4a" editContent={<><Input aria-label="How should it change?" /><Button type="button">Make</Button></>} />);
    fireEvent.click(view.getByRole("button", { name: "Edit" }));
    expect(view.getByRole("textbox", { name: "How should it change?" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Make" })).toBeTruthy();
  });

  test("Home's existing edit fragment is reshaped into tabs with reasons for disabled Make actions", () => {
    const view = render(<MusicTrack status="ready" title="Song" src="/song.m4a" editContent={<><Button type="button">Make it full</Button><Input aria-label="How should it change? For example: make it heavy metal" /><Button type="button" disabled>Make</Button><Input aria-label="Describe the new cover" /><Button type="button" disabled>Make</Button></>} />);
    fireEvent.click(view.getByRole("button", { name: "Edit" }));
    expect(view.getByRole("tab", { name: "Change the song" })).toBeTruthy();
    expect(view.getByRole("tab", { name: "New cover" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Make it full" })).toBeTruthy();
    expect(view.getByText("Describe a song change to enable Make.")).toBeTruthy();
  });

  test("390 px card keeps content shrinkable and action targets at least 48 px", async () => {
    await withViewport(390, container => {
      const card = container.querySelector('[data-slot="music-track"]')!;
      expect(card.className).toContain("overflow-hidden");
      expect(card.querySelector(".min-w-0")).toBeTruthy();
      expect((card.querySelector('[aria-label="Download"]') as HTMLElement).className).toContain("before:-inset-3");
    });
  });

  test("quick legacy controls and versions still work", () => {
    const selected: string[] = [];
    const view = render(<MusicTrack status="ready" title="Song" src="/song.m4a" versions={[{ id: "a", label: "First" }, { id: "b", label: "Second" }]} currentId="a" onSelectVersion={id => selected.push(id)} />);
    fireEvent.click(view.getByRole("button", { name: "Next" }));
    expect(selected).toEqual(["b"]);
    expect(view.container.textContent).toContain("Version 1 of 2");
  });
});
