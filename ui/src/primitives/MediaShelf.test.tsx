import { describe, expect, test, mock, afterEach } from "bun:test";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { MediaShelf } from "@/kit/primitives/MediaShelf";

afterEach(cleanup);

interface Track {
  id: string;
  title: string;
}

const tracks: Track[] = [
  { id: "1", title: "Sprout" },
  { id: "2", title: "Tempo" },
];

describe("MediaShelf", () => {
  test("omitting the new variants preserves the explicit default rendering", () => {
    const props = { items: tracks, getKey: (t: Track) => t.id, renderItem: (t: Track) => <span>{t.title}</span>, heading: "Music" };
    const { container, rerender } = render(<MediaShelf {...props} />);
    const before = container.innerHTML;
    rerender(<MediaShelf {...props} layout="rail" artShape="default" density="default" />);
    expect(container.innerHTML).toBe(before);
  });

  test("grid keeps the existing density budgets above the two-column phone layout", () => {
    const props = { items: tracks, getKey: (t: Track) => t.id, renderItem: () => null, heading: "Music", layout: "grid" as const };
    const { getByRole, rerender } = render(<MediaShelf {...props} />);
    expect(getByRole("list").className).toContain("lg:grid-cols-3");
    rerender(<MediaShelf {...props} density="compact" />);
    expect(getByRole("list").className).toContain("lg:grid-cols-5");
    rerender(<MediaShelf {...props} variant="plain" />);
    expect(getByRole("list").className).toContain("xl:grid-cols-4");
  });

  for (const aspect of ["square", "poster"] as const) {
    test(`grid wraps ${aspect} tiles in two phone columns without rail widths`, () => {
      const { getByRole, container } = render(
        <MediaShelf items={tracks} getKey={(t) => t.id} renderItem={() => <img alt="" src="/art.png" />}
          heading="Collection" layout="grid" aspect={aspect} />,
      );
      const grid = getByRole("list", { name: "Collection" });
      expect(grid.className.split(" ")).toContain("grid-cols-2");
      expect(grid.className).not.toContain("overflow-x-auto");
      expect(grid).not.toHaveAttribute("tabindex");
      expect(grid.querySelector("li")!.className).not.toContain("w-[72%]");
      expect(container.querySelector("img")!.parentElement!.className).toContain(aspect === "square" ? "aspect-square" : "aspect-[2/3]");
    });
  }

  test("an empty grid honours hideWhenEmpty before the heading and empty state", () => {
    const { container } = render(
      <MediaShelf<Track> items={[]} getKey={(t) => t.id} renderItem={() => null} layout="grid"
        hideWhenEmpty heading="Albums" emptyState={{ icon: "music", text: "No albums" }} />,
    );
    expect(container.textContent).toBe("");
  });

  test("circle art overrides poster aspect and gives the card a circular current ring", () => {
    const { getByRole, container } = render(
      <MediaShelf items={tracks} getKey={(t) => t.id} renderItem={() => <img alt="" src="/artist.png" />}
        getLabel={(t) => t.title} onSelect={() => {}} artShape="circle" aspect="poster"
        isHighlighted={(t) => t.id === "2"} layout="grid" />,
    );
    const box = container.querySelector("img")!.parentElement!;
    expect(box.className).toContain("rounded-full");
    expect(box.className).toContain("aspect-square");
    expect(box.className).not.toContain("aspect-[2/3]");
    const current = getByRole("button", { name: "Tempo" });
    expect(current.className).toContain("rounded-full");
    expect(current.className).toContain("ring-[var(--media-current-ring)]");
    expect(current.closest("li")).toHaveAttribute("aria-current", "true");
    expect(getByRole("button", { name: "Sprout" }).closest("li")).not.toHaveAttribute("aria-current");
  });

  test("compact rows have 72 px art, two caption lines, a leading index and trailing time outside the art", () => {
    const select = mock((_t: Track) => {});
    const action = mock((_t: Track) => {});
    const { getByRole, getAllByText, container } = render(
      <MediaShelf items={tracks} getKey={(t) => t.id} renderItem={() => <img alt="" src="/track.png" />}
        getLabel={(t) => t.title} onSelect={select} orientation="vertical" density="compact" aspect="square"
        renderCaption={(t) => <span>{t.title}<br />Artist</span>} renderIndex={(t) => Number(t.id) - 1}
        renderMeta={() => "3:14"} isHighlighted={(t) => t.id === "1"}
        renderActions={(t) => <button type="button" onClick={() => action(t)}>Save {t.title}</button>} />,
    );
    const tile = getByRole("button", { name: "Sprout" });
    expect(tile.className).toContain("w-[72px]");
    expect(container.querySelector('[data-slot="media-shelf-index"]')!.textContent).toBe("0");
    expect(container.querySelector(".line-clamp-2")).not.toBeNull();
    const time = getAllByText("3:14")[0]!;
    expect(time.closest('[data-slot="media-shelf-duration"]')).not.toBeNull();
    expect(time.closest("button")).toBeNull();
    expect(container.querySelector('[data-slot="media-tile-meta"]')).toBeNull();
    expect(tile.className).toContain("ring-[var(--media-current-ring)]");
    const save = getByRole("button", { name: "Save Sprout" });
    expect(save.parentElement!.closest("button")).toBeNull();
    fireEvent.click(save);
    expect(action.mock.calls[0]![0]).toEqual(tracks[0]!);
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(tile);
    expect(select.mock.calls[0]![0]).toEqual(tracks[0]!);
  });

  test("vertical orientation wins over grid layout and circle art still applies", () => {
    const { getByRole, container } = render(
      <MediaShelf items={tracks} getKey={(t) => t.id} renderItem={() => <img alt="" src="/art.png" />}
        heading="Queue" orientation="vertical" layout="grid" artShape="circle" />,
    );
    expect(getByRole("list", { name: "Queue" })).toHaveAttribute("data-orientation", "vertical");
    expect(getByRole("list", { name: "Queue" }).className).not.toContain("grid-cols");
    expect(container.querySelector("img")!.parentElement!.className).toContain("rounded-full");
  });

  test("renders one tile per item under its heading", () => {
    const { getByRole, getByLabelText } = render(
      <MediaShelf
        items={tracks}
        getKey={(t) => t.id}
        renderItem={(t) => <img src={`/${t.id}.png`} alt="" />}
        renderCaption={(t) => t.title}
        heading="Recently added"
      />,
    );
    expect(getByRole("heading", { name: "Recently added" })).toBeInTheDocument();
    expect(getByLabelText("Recently added").querySelectorAll("li")).toHaveLength(2);
  });

  test("the heading also names the rail, so it is not an unlabelled scroll region", () => {
    const { getByLabelText } = render(
      <MediaShelf items={tracks} getKey={(t) => t.id} renderItem={(t) => <span>{t.title}</span>} heading="Shows" />,
    );
    expect(getByLabelText("Shows").tagName).toBe("UL");
  });

  test("playing a tile reports its item", () => {
    const onSelect = mock((_t: Track) => {});
    const { getByRole } = render(
      <MediaShelf
        items={tracks}
        getKey={(t) => t.id}
        renderItem={() => <img src="/x.png" alt="" />}
        getLabel={(t) => t.title}
        onSelect={onSelect}
        label="Music"
      />,
    );
    fireEvent.click(getByRole("button", { name: "Tempo" }));
    expect(onSelect.mock.calls[0]?.[0]).toEqual({ id: "2", title: "Tempo" });
  });

  // WCAG 2.2 AA 2.1.1: a region that scrolls has to be reachable without
  // a mouse. Interactive tiles are their own tab stops; a shelf of plain
  // artwork has none, so the rail itself takes one.
  test("a non-interactive rail is focusable; an interactive one is not a redundant tab stop", () => {
    const { getByLabelText, rerender } = render(
      <MediaShelf items={tracks} getKey={(t) => t.id} renderItem={(t) => <span>{t.title}</span>} label="Art" />,
    );
    expect(getByLabelText("Art")).toHaveAttribute("tabindex", "0");

    rerender(
      <MediaShelf
        items={tracks}
        getKey={(t) => t.id}
        renderItem={(t) => <span>{t.title}</span>}
        onSelect={() => {}}
        label="Art"
      />,
    );
    expect(getByLabelText("Art")).not.toHaveAttribute("tabindex");
  });

  test("the media box carries the declared aspect ratio and no fixed size", () => {
    const { getByLabelText } = render(
      <MediaShelf
        items={tracks}
        getKey={(t) => t.id}
        renderItem={(t) => <img src={`/${t.id}.png`} alt={t.title} />}
        aspect="poster"
        label="Films"
      />,
    );
    const box = getByLabelText("Films").querySelector("li > div > div");
    expect(box?.className).toContain("aspect-[2/3]");
    // docs/UI.md: no fixed widths or heights on content.
    expect(box?.className).not.toMatch(/\b[wh]-\d+\b/);
  });

  test("the caption sits outside the aspect box so a long title cannot crop the art", () => {
    const { getByText } = render(
      <MediaShelf
        items={tracks}
        getKey={(t) => t.id}
        renderItem={(t) => <img src={`/${t.id}.png`} alt="" />}
        renderCaption={(t) => t.title}
        aspect="square"
        label="Albums"
      />,
    );
    const caption = getByText("Sprout");
    expect(caption.closest("[class*='aspect-']")).toBeNull();
  });

  // Every finding below came from a code review, 2026-09-05.
  test("a selected tile is visibly selected, not only marked for assistive tech", () => {
    const { getByLabelText } = render(
      <MediaShelf
        items={tracks}
        getKey={(t) => t.id}
        renderItem={(t) => <img src={`/${t.id}.png`} alt="" />}
        getLabel={(t) => t.title}
        onSelect={() => {}}
        isSelected={(t) => t.id === "2"}
        label="Music"
      />,
    );
    const [first, second] = Array.from(getByLabelText("Music").querySelectorAll("li"));
    // Card draws selection as a border color, which a borderless artwork
    // tile zeroes out; without its own treatment the selected tile was
    // pixel-identical to every other one.
    expect(second?.querySelector("[class~='ring-2']")).not.toBeNull();
    expect(first?.querySelector("[class~='ring-2']")).toBeNull();
  });

  test("the caption is not nested inside the tile button", () => {
    const { getByText } = render(
      <MediaShelf
        items={tracks}
        getKey={(t) => t.id}
        renderItem={() => <img src="/x.png" alt="" />}
        renderCaption={(t) => <a href={`/artist/${t.id}`}>{t.title}</a>}
        getLabel={(t) => t.title}
        onSelect={() => {}}
        label="Music"
      />,
    );
    // A link inside a button is keyboard-unreachable and invalid HTML.
    expect(getByText("Sprout").closest("button")).toBeNull();
  });

  test("the rail leaves room for a tile's focus ring to draw", () => {
    const { getByLabelText } = render(
      <MediaShelf items={tracks} getKey={(t) => t.id} renderItem={(t) => <span>{t.title}</span>} label="Art" />,
    );
    // `overflow-x-auto` clips vertically too, so a rail with no padding
    // shaves the top of the ring off.
    expect(getByLabelText("Art").className).not.toContain("p-0");
    expect(getByLabelText("Art").className).toMatch(/\bp-1\.5\b/);
  });

  test("shows the empty state, still under its heading", () => {
    const { getByRole, getByText, queryByLabelText } = render(
      <MediaShelf
        items={[]}
        getKey={(t: Track) => t.id}
        renderItem={(t: Track) => <span>{t.title}</span>}
        heading="Continue watching"
        emptyState={{ icon: "archive", text: "Nothing started yet" }}
      />,
    );
    expect(getByRole("heading", { name: "Continue watching" })).toBeInTheDocument();
    expect(getByText("Nothing started yet")).toBeInTheDocument();
    expect(queryByLabelText("Continue watching")).toBeNull();
  });

  test("a tile shows its played share, a corner badge and its running time", () => {
    const { getAllByRole, getByText, container } = render(
      <MediaShelf
        items={tracks}
        getKey={(t) => t.id}
        renderItem={() => <img src="/x.png" alt="" />}
        getProgress={(t) => (t.id === "1" ? 0.4 : undefined)}
        renderBadge={(t) => (t.id === "2" ? <span>Not saved</span> : null)}
        renderMeta={() => "18:42"}
        aspect="poster"
        label="Continue"
      />,
    );
    const bars = getAllByRole("progressbar", { name: "Played" });
    expect(bars).toHaveLength(1);
    expect(bars[0]!.getAttribute("aria-valuenow")).toBe("40");
    expect(getByText("Not saved")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-slot=media-tile-meta]")).toHaveLength(2);
    expect(container.querySelector(".aspect-\\[2\\/3\\]")).toBeTruthy();
  });

  test("progress is clamped and nothing is drawn at zero", () => {
    const { getAllByRole } = render(
      <MediaShelf items={tracks} getKey={(t) => t.id} renderItem={() => null} getProgress={(t) => (t.id === "1" ? 0 : 3)} label="P" />,
    );
    const bars = getAllByRole("progressbar");
    expect(bars).toHaveLength(1);
    expect(bars[0]!.getAttribute("aria-valuenow")).toBe("100");
  });

  describe("MEDIA-POLISH-01", () => {
    test("the default stays the bordered card; plain draws no card", () => {
      const { container, rerender } = render(
        <MediaShelf items={tracks} getKey={(t) => t.id} renderItem={(t) => <span>{t.title}</span>} heading="Recently added" />,
      );
      expect(container.querySelector("section")!.className).toContain("border");
      rerender(<MediaShelf items={tracks} getKey={(t) => t.id} renderItem={(t) => <span>{t.title}</span>} heading="Recently added" variant="plain" />);
      const section = container.querySelector("section")!;
      expect(section.getAttribute("data-slot")).toBe("media-shelf-plain");
      expect(section.className).not.toContain("border");
      expect(section.className).not.toContain("bg-card");
    });

    test("See all sits beside the heading and fires its handler", () => {
      const onSelect = mock(() => {});
      const { getByRole } = render(
        <MediaShelf items={tracks} getKey={(t) => t.id} renderItem={(t) => <span>{t.title}</span>} heading="Continue watching" variant="plain" seeAll={{ label: "See all", onSelect }} />,
      );
      fireEvent.click(getByRole("button", { name: "See all" }));
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    test("hideWhenEmpty draws nothing, not even the heading or the empty state", () => {
      const { container } = render(
        <MediaShelf items={[]} getKey={(t: Track) => t.id} renderItem={(t) => <span>{t.title}</span>} heading="Watch again" emptyState={{ icon: "film", text: "Nothing yet" }} hideWhenEmpty />,
      );
      expect(container.innerHTML).toBe("");
    });

    test("without hideWhenEmpty an empty shelf still shows its empty state (default unchanged)", () => {
      const { getByText } = render(
        <MediaShelf items={[]} getKey={(t: Track) => t.id} renderItem={(t) => <span>{t.title}</span>} heading="Watch again" emptyState={{ icon: "film", text: "Nothing yet" }} />,
      );
      expect(getByText("Nothing yet")).toBeInTheDocument();
    });

    test("vertical stacks rows with the caption beside the tile", () => {
      const { getByLabelText } = render(
        <MediaShelf items={tracks} getKey={(t) => t.id} renderItem={() => <img src="/x.png" alt="" />} renderCaption={(t) => t.title} heading="Up next" variant="plain" orientation="vertical" getLabel={(t) => t.title} onSelect={() => {}} />,
      );
      const list = getByLabelText("Up next");
      expect(list.getAttribute("data-orientation")).toBe("vertical");
      expect(list.className).toContain("flex-col");
      const row = list.querySelector("li")!;
      expect(row.textContent).toContain("Sprout");
      expect(row.querySelector("button")).not.toBeNull();
    });
  });
});
