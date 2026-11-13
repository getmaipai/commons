import { describe, expect, test, mock, afterEach } from "bun:test";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { MediaShelf, MediaTileOverlay } from "@/kit/primitives/MediaShelf";

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
  test("the empty action uses the existing button and stays hidden with hideWhenEmpty", () => {
    const onEmptyAction = mock(() => {});
    const props = {
      items: [] as Track[], getKey: (t: Track) => t.id, renderItem: () => null,
      emptyState: { icon: "film", text: "No videos yet." },
      emptyActionLabel: "Add a folder", onEmptyAction,
    };
    const { getByRole, container, rerender } = render(<MediaShelf {...props} />);
    fireEvent.click(getByRole("button", { name: "Add a folder" }));
    expect(onEmptyAction).toHaveBeenCalledTimes(1);
    rerender(<MediaShelf {...props} hideWhenEmpty />);
    expect(container.innerHTML).toBe("");
  });

  test("omitting the new variants preserves the explicit default rendering", () => {
    const props = { items: tracks, getKey: (t: Track) => t.id, renderItem: (t: Track) => <span>{t.title}</span>, heading: "Music" };
    const { container, rerender } = render(<MediaShelf {...props} />);
    const before = container.innerHTML;
    rerender(<MediaShelf {...props} layout="rail" artShape="default" density="default" />);
    expect(container.innerHTML).toBe(before);
    expect(container.querySelector('[data-slot="media-tile-backdrop"]')).toBeNull();
  });

  test("backdrop decorates each image and contains the sharp art with hover and focus zoom", () => {
    const { container } = render(<MediaShelf items={tracks} getKey={(t) => t.id} renderItem={() => <img alt="Cover" src="/art.png" className="size-full object-cover" />} look="backdrop" />);
    const decorations = container.querySelectorAll('[data-slot="media-tile-backdrop"]');
    expect(decorations).toHaveLength(tracks.length);
    for (const decoration of decorations) {
      expect(decoration).toHaveAttribute("aria-hidden", "true");
      expect(decoration).toHaveAttribute("alt", "");
      expect(decoration).toHaveAttribute("src", "/art.png");
    }
    const main = [...container.querySelectorAll("img")].find((img) => img.dataset.slot !== "media-tile-backdrop")!;
    expect(main).toHaveClass("object-contain");
    expect(main.className).toContain("group-hover/tile:scale-[1.03]");
    expect(main.className).toContain("group-focus-within/tile:scale-[1.03]");
    expect(main.className).toContain("motion-safe:");
  });

  test("headingStyle eyebrow draws the heading as an uppercase tracked line, in a plain and a card shelf; default is unchanged (VIDEO-STUDIO-03)", () => {
    const props = { items: tracks, getKey: (t: Track) => t.id, renderItem: (t: Track) => <span>{t.title}</span>, heading: "Try this" };
    for (const variant of ["plain", "card"] as const) {
      const plain = render(<MediaShelf {...props} variant={variant} />);
      const h = plain.getByRole("heading", { name: "Try this" });
      expect(h.className).not.toContain("uppercase");
      const before = plain.container.innerHTML;
      plain.rerender(<MediaShelf {...props} variant={variant} headingStyle="default" />);
      expect(plain.container.innerHTML).toBe(before);
      plain.rerender(<MediaShelf {...props} variant={variant} headingStyle="eyebrow" />);
      const e = plain.getByRole("heading", { name: "Try this" });
      expect(e.className).toContain("uppercase");
      expect(e.className).toContain("tracking-widest");
      expect(e.className).toContain("text-muted-foreground");
      cleanup();
    }
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

    test("MUSIC-TILES-01: a compact frameless row uses the smaller tile width, the default keeps its own", () => {
      const props = { items: tracks, getKey: (t: { id: string }) => t.id, renderItem: () => <span>x</span>, heading: "Recently played", variant: "plain" as const };
      const { container, rerender } = render(<MediaShelf {...props} />);
      expect(container.querySelector("li")!.className).toContain("w-[72%]");
      rerender(<MediaShelf {...props} density="compact" />);
      const li = container.querySelector("li")!;
      expect(li.className).toContain("w-[44%]");
      expect(li.className).not.toContain("w-[72%]");
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

  describe("MUSIC-KIT-01 props", () => {
    const base = { items: tracks, getKey: (t: Track) => t.id, renderItem: (t: Track) => <span>{t.title}</span>, getLabel: (t: Track) => t.title, onSelect: () => {}, heading: "Music" };
    test("cardRadius tight uses the 8 px token on the art; default keeps the card radius", () => {
      const { container, rerender } = render(<MediaShelf {...base} />);
      expect(container.innerHTML).not.toContain("--media-card-radius");
      rerender(<MediaShelf {...base} cardRadius="tight" />);
      expect(container.querySelector("li button > div")?.className).toContain("rounded-[var(--media-card-radius)]");
    });
    test("cardRadius soft uses the 18 px soft token on the art", () => {
      const { container } = render(<MediaShelf {...base} cardRadius="soft" />);
      expect(container.querySelector("li button > div")?.className).toContain("rounded-[var(--media-soft-radius)]");
    });
    test("pressScale adds the motion-safe press class only when asked", () => {
      const { container, rerender } = render(<MediaShelf {...base} />);
      expect(container.innerHTML).not.toContain("media-press-scale");
      rerender(<MediaShelf {...base} pressScale />);
      expect(container.querySelector("button")?.className).toContain("motion-safe:active:scale-[var(--media-press-scale)]");
    });
    test("onPlay draws a Play button beside the tile button, named per item, and plays without selecting", () => {
      const onPlay = mock((_t: Track) => {});
      const onSelect = mock(() => {});
      const { getByRole, queryByRole, rerender } = render(<MediaShelf {...base} onSelect={onSelect} />);
      expect(queryByRole("button", { name: "Play Tempo" })).toBeNull();
      rerender(<MediaShelf {...base} onSelect={onSelect} onPlay={onPlay} getPlayLabel={(t) => `Play ${t.title}`} />);
      const play = getByRole("button", { name: "Play Tempo" });
      expect(play.parentElement?.querySelector("button:not([data-slot=media-tile-play])")).toBeTruthy();
      expect(play.closest("button:not([data-slot=media-tile-play])")).toBeNull();
      expect(play.className).toContain("motion-safe:transition");
      fireEvent.click(play);
      expect(onPlay.mock.calls[0]![0].id).toBe("2");
      expect(onSelect).not.toHaveBeenCalled();
    });
    test("vertical rows with renderIndex get a hover number-to-play swap", () => {
      const onPlay = mock((_t: Track) => {});
      const { container } = render(<MediaShelf {...base} orientation="vertical" density="compact" renderIndex={(t) => t.id} onPlay={onPlay} />);
      expect(container.querySelector("[data-slot=media-shelf-index] > span")?.className).toContain("group-hover/row:opacity-0");
      const plays = container.querySelectorAll("[data-slot=media-shelf-index-play]");
      expect(plays.length).toBe(2);
      fireEvent.click(plays[1]!);
      expect(onPlay.mock.calls[0]![0].id).toBe("2");
    });
  });

  describe("library additions (VIDEO-UI-05, K12)", () => {
    const clips = [
      { id: "a", title: "Sunrise", day: "2026-11-02" },
      { id: "b", title: "Harbor", day: "2026-11-02" },
      { id: "c", title: "Forest", day: "2026-11-01" },
    ];
    const base = { items: clips, getKey: (c: (typeof clips)[number]) => c.id, renderItem: () => null, layout: "grid" as const, heading: "My clips", getLabel: (c: (typeof clips)[number]) => c.title };

    test("groupBy draws one DayDivider and one list per run, in the order given", () => {
      const { getAllByRole, getByRole } = render(
        <MediaShelf {...base} groupBy={{ getKey: (c) => c.day, label: (key, n) => `${key}, ${n} clips` }} />,
      );
      expect(getAllByRole("separator").map((el) => el.getAttribute("aria-label"))).toEqual(["2026-11-02, 2 clips", "2026-11-01, 1 clips"]);
      expect(getByRole("list", { name: "My clips, 2026-11-02, 2 clips" }).querySelectorAll("li")).toHaveLength(2);
      expect(getByRole("list", { name: "My clips, 2026-11-01, 1 clips" }).querySelectorAll("li")).toHaveLength(1);
    });

    test("groupBy and sizeControl are ignored on a rail", () => {
      const props = { ...base, layout: "rail" as const };
      const { container, rerender } = render(<MediaShelf {...props} />);
      const before = container.innerHTML;
      rerender(<MediaShelf {...props} groupBy={{ getKey: (c) => c.day, label: () => "x" }} sizeControl={{ size: 300, onChange: () => {} }} />);
      expect(container.innerHTML).toBe(before);
    });

    test("sizeControl draws the shipped slider, sets the shared tile-size variable and reports a key press", () => {
      const onChange = mock((_n: number) => {});
      const { getByRole, container } = render(<MediaShelf {...base} sizeControl={{ size: 300, onChange, label: "Clip size" }} />);
      const slider = getByRole("slider", { name: "Clip size" });
      expect((container.querySelector("[data-slot=media-shelf-sized]") as HTMLElement).style.getPropertyValue("--maipai-card-size")).toBe("300px");
      expect(getByRole("list", { name: "My clips" }).className).toContain("var(--maipai-card-size");
      expect(getByRole("list", { name: "My clips" }).className).toContain("grid-cols-2");
      slider.focus();
      fireEvent.keyDown(slider, { key: "ArrowRight" });
      expect(onChange).toHaveBeenCalledWith(320);
    });

    test("favorite is a pressed toggle beside the tile button, never inside it", () => {
      const onToggle = mock((_c: (typeof clips)[number]) => {});
      const { getByRole } = render(
        <MediaShelf {...base} favorite={{ isOn: (c) => c.id === "b", onToggle, label: (c) => `Favorite ${c.title}` }} />,
      );
      const off = getByRole("button", { name: "Favorite Sunrise" });
      const on = getByRole("button", { name: "Favorite Harbor" });
      expect(off.getAttribute("aria-pressed")).toBe("false");
      expect(on.getAttribute("aria-pressed")).toBe("true");
      expect(off.closest("button:not([data-slot=media-tile-favorite])")).toBeNull();
      fireEvent.click(off);
      expect(onToggle).toHaveBeenCalledWith(clips[0]);
    });

    test("without the three props the markup is unchanged", () => {
      const { container, rerender } = render(<MediaShelf {...base} />);
      const before = container.innerHTML;
      rerender(<MediaShelf {...base} groupBy={undefined} sizeControl={undefined} favorite={undefined} />);
      expect(container.innerHTML).toBe(before);
      expect(container.querySelector("[data-slot=media-tile-favorite]")).toBeNull();
    });
  });

  test("section heading, pro tile size, bleed and card radius add their documented classes", () => {
    const props = { items: tracks, getKey: (t: Track) => t.id, renderItem: () => null, heading: "Music", variant: "plain" as const, seeAll: { label: "See all", onSelect: () => {} } };
    const { getByRole, container, rerender } = render(<MediaShelf {...props} />);
    rerender(<MediaShelf {...props} headingStyle="section" />);
    expect(getByRole("heading", { name: "Music" }).className).toContain("text-lg md:text-xl font-semibold tracking-tight");
    expect(getByRole("button", { name: /See all/ }).textContent).toContain("See all");
    rerender(<MediaShelf {...props} tileSize="pro" />);
    const list = getByRole("list", { name: "Music" });
    expect(list.className).toContain("-mr-4 pr-4");
    expect(list.querySelector("li")!.className).toContain("w-[156px] md:w-[176px]");
    expect(container.querySelector("[class*=aspect-square]")!.className).toContain("rounded-[var(--radius-card)]");
    rerender(<MediaShelf {...props} bleed />);
    expect(getByRole("list", { name: "Music" }).className).toContain("-mr-4 pr-4");
    rerender(<MediaShelf {...props} cardRadius="card" />);
    expect(container.querySelector("[class*=aspect-video]")!.className).toContain("rounded-[var(--radius-card)]");
  });

  test("tile overlay combines start metadata with the mono duration badge", () => {
    const { container } = render(<div className="relative"><MediaTileOverlay badge="HD" meta="03:14" metaPlacement="start" badgeStyle="mono" /></div>);
    const badge = container.querySelector('[data-slot="media-tile-badge"]')!;
    expect(badge.className).toContain("font-mono text-[length:var(--font-size-badge)] font-semibold");
    expect(badge.className).toContain("bg-[var(--art-overlay)]");
    expect(badge.className).toContain("backdrop-blur-sm");
    expect(container.querySelector('[data-slot="media-tile-meta"]')!.className).toContain("start-2");
  });

  test("tile overlay draws an opted-in name once and keeps opt-out empty", () => {
    const { container, rerender } = render(<div className="relative"><MediaTileOverlay label="Blue Hour" /></div>);
    expect(container.querySelectorAll('[data-slot="media-tile-label"]')).toHaveLength(1);
    expect(container.querySelector('[data-slot="media-tile-label"]')!.textContent).toBe("Blue Hour");
    expect(container.querySelector('[data-slot="media-tile-label"]')!.className).toContain("bg-[var(--art-scrim)]");
    rerender(<div className="relative"><MediaTileOverlay label="Blue Hour" hasSafeImageLabel /></div>);
    expect(container.querySelectorAll('[data-slot="media-tile-label"]')).toHaveLength(0);
    rerender(<div className="relative"><MediaTileOverlay /></div>);
    expect(container.querySelectorAll('[data-slot="media-tile-label"]')).toHaveLength(0);
  });
});
