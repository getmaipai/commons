import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { CategoryTiles, QuickTiles, TopResultCard, TrackRows } from "@/kit/primitives/MusicBlocks";

afterEach(cleanup);

interface Song { id: string; title: string; artist: string; disc?: string }
const songs: Song[] = [
  { id: "1", title: "Lanterns", artist: "Iris Vale", disc: "Disc 1" },
  { id: "2", title: "Tempo", artist: "Iris Vale", disc: "Disc 1" },
  { id: "3", title: "Sprout", artist: "Iris Vale", disc: "Disc 2" },
];

describe("QuickTiles", () => {
  const props = { items: songs, getKey: (s: Song) => s.id, getTitle: (s: Song) => s.title, renderArt: () => <i />, label: "Pick up where you left off" };
  test("draws at most max tiles (6 by default), each selectable", () => {
    const onSelect = mock((_s: Song) => {});
    const many = Array.from({ length: 9 }, (_, i) => ({ id: String(i), title: `T${i}`, artist: "" }));
    const view = render(<QuickTiles {...props} items={many} onSelect={onSelect} />);
    expect(view.getByRole("list", { name: "Pick up where you left off" }).children.length).toBe(6);
    fireEvent.click(view.getByRole("button", { name: "T2" }));
    expect(onSelect.mock.calls[0]![0].id).toBe("2");
  });
  test("Play is a sibling of the tile button, only when onPlay is given", () => {
    const onPlay = mock((_s: Song) => {});
    const view = render(<QuickTiles {...props} />);
    expect(view.container.querySelector("[data-slot=music-play]")).toBeNull();
    view.rerender(<QuickTiles {...props} onPlay={onPlay} />);
    const play = view.getByRole("button", { name: "Play Tempo" });
    expect(play.closest("button:not([data-slot=music-play])")).toBeNull();
    fireEvent.click(play);
    expect(onPlay.mock.calls[0]![0].id).toBe("2");
  });
  test("renders nothing for no items", () => {
    expect(render(<QuickTiles {...props} items={[]} />).container.innerHTML).toBe("");
  });
});

describe("TopResultCard", () => {
  test("names the card, selects and plays separately", () => {
    const onSelect = mock(() => {});
    const onPlay = mock(() => {});
    const view = render(<TopResultCard title="Iris Vale" eyebrow="Artist" subtitle="12 songs" circle art={<i />} onSelect={onSelect} onPlay={onPlay} />);
    expect(view.getByText("Artist")).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Iris Vale" }));
    fireEvent.click(view.getByRole("button", { name: "Play Iris Vale" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector("[data-slot=top-result-art]")?.className).toContain("rounded-full");
  });
  test("without onPlay there is no Play button", () => {
    const view = render(<TopResultCard title="Lanterns" />);
    expect(view.queryByRole("button")).toBeNull();
  });
});

describe("CategoryTiles", () => {
  test("a tile is a labelled button and carries its colour as a token", () => {
    const onSelect = mock((_c: { id: string }) => {});
    const view = render(<CategoryTiles label="Browse all" items={[{ id: "jazz", title: "Jazz", color: "#2a6" }, { id: "made", title: "Made here" }]} onSelect={onSelect} />);
    fireEvent.click(view.getByRole("button", { name: "Jazz" }));
    expect(onSelect.mock.calls[0]![0].id).toBe("jazz");
    expect(view.container.innerHTML).toContain("--tile-color");
    expect(view.getAllByRole("listitem").length).toBe(2);
  });
});

describe("TrackRows", () => {
  const props = { items: songs, getKey: (s: Song) => s.id, getTitle: (s: Song) => s.title, getSubtitle: (s: Song) => s.artist, getMeta: () => "3:21", onPlay: () => {}, label: "Tracks" };
  test("numbers rows, shows a play icon beside each number and plays on press", () => {
    const onPlay = mock((_s: Song) => {});
    const view = render(<TrackRows {...props} onPlay={onPlay} />);
    expect([...view.container.querySelectorAll("[data-slot=track-number]")].map((n) => n.textContent)).toEqual(["1", "2", "3"]);
    expect(view.container.querySelectorAll("[data-slot=track-play]").length).toBe(3);
    fireEvent.click(view.getByRole("button", { name: "Play Tempo" }));
    expect(onPlay.mock.calls[0]![0].id).toBe("2");
  });
  test("the number hides on hover and focus, the play icon shows (token classes)", () => {
    const view = render(<TrackRows {...props} />);
    expect(view.container.querySelector("[data-slot=track-number]")?.className).toContain("group-hover/row:opacity-0");
    expect(view.container.querySelector("[data-slot=track-play]")?.getAttribute("class")).toContain("group-hover/row:opacity-100");
  });
  test("a group heading appears once per run, and the playing row is marked", () => {
    const view = render(<TrackRows {...props} getGroup={(s) => s.disc} isPlaying={(s) => s.id === "2"} />);
    expect(view.getAllByRole("heading").map((h) => h.textContent)).toEqual(["Disc 1", "Disc 2"]);
    expect(view.getAllByRole("listitem")[1]!.getAttribute("aria-current")).toBe("true");
  });
  test("a custom number and no meta are honoured", () => {
    const view = render(<TrackRows {...props} getMeta={undefined} getNumber={(_s, i) => `#${i + 1}`} />);
    expect(view.container.querySelector("[data-slot=track-number]")?.textContent).toBe("#1");
    expect(view.container.querySelector("[data-slot=track-meta]")).toBeNull();
  });
});
