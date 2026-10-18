import { describe, expect, test, mock, afterEach } from "bun:test";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { useState } from "react";
import { FileGrid, type FileGridProps } from "@/kit/primitives/FileGrid";
import type { FileTileData } from "@/kit/primitives/FileTile";

afterEach(cleanup);

const items: FileTileData[] = [
  { id: "alfred", name: "Alfred", kind: "image" },
  { id: "bramble", name: "Bramble", kind: "video", durationSeconds: 8 },
  { id: "clover", name: "Clover", kind: "audio", durationSeconds: 120 },
  { id: "daisy", name: "Daisy", kind: "document", extension: "pdf" },
  { id: "ember", name: "Ember", kind: "other" },
  { id: "iris", name: "Iris", kind: "image" },
];

/** A caller that owns the selection, as Home will. */
function Harness(props: Partial<FileGridProps> & { initial?: string[]; seen?: (ids: string[]) => void }) {
  const [ids, setIds] = useState<string[]>(props.initial ?? []);
  const { seen, ...withInitial } = props;
  const rest: Partial<FileGridProps> = { ...withInitial };
  delete (rest as { initial?: string[] }).initial;
  return (
    <FileGrid
      items={items}
      label="Library files"
      selectedIds={ids}
      onSelectionChange={(next) => {
        setIds(next);
        seen?.(next);
      }}
      {...rest}
    />
  );
}

function tileButton(view: ReturnType<typeof render>, name: string): HTMLButtonElement {
  return view.getByRole("button", { name: new RegExp(`^${name}`) }) as HTMLButtonElement;
}

describe("FileGrid structure and semantics", () => {
  test("reads as a list of files with one item per file, in order", () => {
    const view = render(<FileGrid items={items} label="Library files" />);
    const list = view.getByRole("list", { name: "Library files" });
    expect(list.querySelectorAll(":scope > li")).toHaveLength(6);
    expect(Array.from(list.querySelectorAll('[data-slot="file-tile-name"]')).map((n) => n.textContent)).toEqual(items.map((i) => i.name));
  });

  test("the empty slot replaces the list", () => {
    const view = render(<FileGrid items={[]} label="Library files" empty={<p>Nothing here yet.</p>} />);
    expect(view.getByText("Nothing here yet.")).toBeTruthy();
    expect(view.queryByRole("list")).toBeNull();
  });

  test("no empty slot and no items renders nothing", () => {
    const view = render(<FileGrid items={[]} label="Library files" />);
    expect(view.container.innerHTML).toBe("");
  });

  test("density follows the kit's column budget, and slider follows the card-size variable", () => {
    const compact = render(<FileGrid items={items} label="Files" />);
    expect(compact.getByRole("list").className).toContain("grid-cols-2");
    cleanup();
    const normal = render(<FileGrid items={items} label="Files" density="default" />);
    expect(normal.getByRole("list").className).toContain("grid-cols-1");
    cleanup();
    const slider = render(<FileGrid items={items} label="Files" density="slider" />);
    expect(slider.getByRole("list").style.gridTemplateColumns).toContain("--maipai-card-size");
  });

  test("tiles skip layout and paint while off screen", () => {
    const view = render(<FileGrid items={items} label="Files" />);
    expect(view.getByRole("list").firstElementChild!.className).toContain("content-visibility:auto");
  });

  test("a tile press reports the id", () => {
    const onOpen = mock((_id: string) => {});
    const view = render(<FileGrid items={items} label="Files" onOpen={onOpen} />);
    fireEvent.click(tileButton(view, "Clover"));
    expect(onOpen).toHaveBeenCalledWith("clover");
  });

  test("an actions click reports the id and the event", () => {
    const onActions = mock((_id: string, _e: unknown) => {});
    const view = render(<FileGrid items={items} label="Files" onActionsClick={onActions} />);
    fireEvent.click(view.getByRole("button", { name: "Actions for Daisy" }));
    expect(onActions.mock.calls[0]![0]).toBe("daisy");
  });

  test("wrapActions wraps the right tile's button", () => {
    const view = render(
      <FileGrid items={items} label="Files" wrapActions={(id, button) => <div data-wrap={id}>{button}</div>} />,
    );
    expect(view.getByRole("button", { name: "Actions for Ember" }).parentElement!.getAttribute("data-wrap")).toBe("ember");
  });
});

describe("FileGrid roving focus", () => {
  test("exactly one tile button is in the tab order, and the tile controls are not", () => {
    const view = render(<Harness onActionsClick={() => {}} />);
    const stops = view.container.querySelectorAll('[tabindex="0"]');
    expect(stops).toHaveLength(1);
    expect(stops[0]).toBe(tileButton(view, "Alfred"));
    expect(view.getAllByRole("checkbox").every((c) => c.getAttribute("tabindex") === "-1")).toBe(true);
    expect(view.getByRole("button", { name: "Actions for Alfred" }).getAttribute("tabindex")).toBe("-1");
  });

  test("arrow keys move focus and the tab stop follows", () => {
    const view = render(<Harness />);
    const first = tileButton(view, "Alfred");
    act(() => first.focus());
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(tileButton(view, "Bramble"));
    expect(tileButton(view, "Bramble").getAttribute("tabindex")).toBe("0");
    expect(tileButton(view, "Alfred").getAttribute("tabindex")).toBe("-1");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(tileButton(view, "Alfred"));
  });

  test("arrows stop at the ends", () => {
    const view = render(<Harness />);
    const first = tileButton(view, "Alfred");
    act(() => first.focus());
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(first);
  });

  test("Home and End jump to the first and last", () => {
    const view = render(<Harness />);
    const third = tileButton(view, "Clover");
    act(() => third.focus());
    fireEvent.keyDown(third, { key: "End" });
    expect(document.activeElement).toBe(tileButton(view, "Iris"));
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toBe(tileButton(view, "Alfred"));
  });

  test("Up and Down move by drawn rows", () => {
    const view = render(<Harness />);
    const cells = Array.from(view.getByRole("list").children) as HTMLElement[];
    // Three columns: the layout engine is not running under happy-dom, so say where the tiles are.
    cells.forEach((cell, i) => {
      Object.defineProperty(cell, "offsetTop", { value: Math.floor(i / 3) * 200, configurable: true });
      Object.defineProperty(cell, "offsetLeft", { value: (i % 3) * 200, configurable: true });
    });
    const start = tileButton(view, "Bramble");
    act(() => start.focus());
    fireEvent.keyDown(start, { key: "ArrowDown" });
    expect(document.activeElement).toBe(tileButton(view, "Ember"));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
    expect(document.activeElement).toBe(tileButton(view, "Bramble"));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
    expect(document.activeElement).toBe(tileButton(view, "Bramble"));
  });

  test("focusing a tile any other way makes it the tab stop", () => {
    const view = render(<Harness />);
    act(() => tileButton(view, "Daisy").focus());
    expect(tileButton(view, "Daisy").getAttribute("tabindex")).toBe("0");
  });

  test("the menu key and Shift+F10 open the focused tile's actions", () => {
    const onActions = mock((_id: string, _e: unknown) => {});
    const view = render(<Harness onActionsClick={onActions} />);
    const tile = tileButton(view, "Clover");
    act(() => tile.focus());
    fireEvent.keyDown(tile, { key: "ContextMenu" });
    fireEvent.keyDown(tile, { key: "F10", shiftKey: true });
    fireEvent.keyDown(tile, { key: "F10" });
    expect(onActions.mock.calls.map((c) => c[0])).toEqual(["clover", "clover"]);
  });

  test("when the focused tile leaves the list the first one takes the tab stop", () => {
    const view = render(<FileGrid items={items} label="Files" />);
    act(() => tileButton(view, "Daisy").focus());
    view.rerender(<FileGrid items={items.filter((i) => i.id !== "daisy")} label="Files" />);
    expect(tileButton(view, "Alfred").getAttribute("tabindex")).toBe("0");
  });
});

describe("FileGrid selection", () => {
  test("no select boxes without onSelectionChange", () => {
    const view = render(<FileGrid items={items} label="Files" />);
    expect(view.queryAllByRole("checkbox")).toHaveLength(0);
  });

  test("a select box toggles one tile", () => {
    const seen = mock((_ids: string[]) => {});
    const view = render(<Harness seen={seen} />);
    fireEvent.click(view.getByRole("checkbox", { name: "Select Clover" }));
    expect(seen).toHaveBeenLastCalledWith(["clover"]);
    fireEvent.click(view.getByRole("checkbox", { name: "Select Clover" }));
    expect(seen).toHaveBeenLastCalledWith([]);
  });

  test("Ctrl or Command click toggles without opening", () => {
    const onOpen = mock((_id: string) => {});
    const seen = mock((_ids: string[]) => {});
    const view = render(<Harness seen={seen} onOpen={onOpen} />);
    fireEvent.click(tileButton(view, "Alfred"), { ctrlKey: true });
    fireEvent.click(tileButton(view, "Daisy"), { metaKey: true });
    expect(seen).toHaveBeenLastCalledWith(["alfred", "daisy"]);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test("Shift click selects the range from the last toggled tile, in list order", () => {
    const seen = mock((_ids: string[]) => {});
    const view = render(<Harness seen={seen} />);
    fireEvent.click(tileButton(view, "Daisy"), { ctrlKey: true });
    fireEvent.click(tileButton(view, "Bramble"), { shiftKey: true });
    expect(seen).toHaveBeenLastCalledWith(["bramble", "clover", "daisy"]);
  });

  test("Shift click on a select box does the same range", () => {
    const seen = mock((_ids: string[]) => {});
    const view = render(<Harness seen={seen} />);
    fireEvent.click(view.getByRole("checkbox", { name: "Select Bramble" }));
    fireEvent.click(view.getByRole("checkbox", { name: "Select Ember" }), { shiftKey: true });
    expect(seen).toHaveBeenLastCalledWith(["bramble", "clover", "daisy", "ember"]);
  });

  test("Shift click with nothing to start from just selects that tile", () => {
    const seen = mock((_ids: string[]) => {});
    const view = render(<Harness seen={seen} />);
    fireEvent.click(tileButton(view, "Clover"), { shiftKey: true });
    expect(seen).toHaveBeenLastCalledWith(["clover"]);
  });

  test("in selection mode a plain press toggles, and select boxes are all shown", () => {
    const onOpen = mock((_id: string) => {});
    const seen = mock((_ids: string[]) => {});
    const view = render(<Harness selectionMode seen={seen} onOpen={onOpen} />);
    fireEvent.click(tileButton(view, "Ember"));
    expect(seen).toHaveBeenLastCalledWith(["ember"]);
    expect(onOpen).not.toHaveBeenCalled();
    expect(view.getAllByRole("checkbox").every((c) => !c.parentElement!.className.includes("opacity-0"))).toBe(true);
  });

  test("anything selected puts the grid in selection mode on its own", () => {
    const onOpen = mock((_id: string) => {});
    const seen = mock((_ids: string[]) => {});
    const view = render(<Harness initial={["alfred"]} seen={seen} onOpen={onOpen} />);
    fireEvent.click(tileButton(view, "Daisy"));
    expect(seen).toHaveBeenLastCalledWith(["alfred", "daisy"]);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test("selected tiles are marked and the checkbox is checked", () => {
    const view = render(<Harness initial={["bramble"]} />);
    expect(view.getByRole("checkbox", { name: "Select Bramble" }).getAttribute("aria-checked")).toBe("true");
    expect(view.getByRole("checkbox", { name: "Select Alfred" }).getAttribute("aria-checked")).toBe("false");
    expect(view.container.querySelectorAll('[data-selected="true"]')).toHaveLength(1);
  });

  test("Space toggles the focused tile and does not open it", () => {
    const onOpen = mock((_id: string) => {});
    const seen = mock((_ids: string[]) => {});
    const view = render(<Harness seen={seen} onOpen={onOpen} />);
    const tile = tileButton(view, "Clover");
    act(() => tile.focus());
    const down = fireEvent.keyDown(tile, { key: " " });
    expect(down).toBe(false);
    expect(seen).toHaveBeenLastCalledWith(["clover"]);
    const up = fireEvent.keyUp(tile, { key: " " });
    expect(up).toBe(false);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test("Space does nothing special when the grid cannot select", () => {
    const view = render(<FileGrid items={items} label="Files" />);
    const tile = tileButton(view, "Clover");
    expect(fireEvent.keyDown(tile, { key: " " })).toBe(true);
  });

  test("Escape clears the selection and leaves selection mode", () => {
    const seen = mock((_ids: string[]) => {});
    const onExit = mock(() => {});
    const view = render(<Harness initial={["alfred", "bramble"]} selectionMode seen={seen} onExitSelectionMode={onExit} />);
    const tile = tileButton(view, "Alfred");
    act(() => tile.focus());
    fireEvent.keyDown(tile, { key: "Escape" });
    expect(seen).toHaveBeenLastCalledWith([]);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  test("Escape with nothing selected and no selection mode does nothing", () => {
    const seen = mock((_ids: string[]) => {});
    const view = render(<Harness seen={seen} />);
    fireEvent.keyDown(tileButton(view, "Alfred"), { key: "Escape" });
    expect(seen).not.toHaveBeenCalled();
  });

  test("Ctrl or Command A selects every tile", () => {
    const seen = mock((_ids: string[]) => {});
    const view = render(<Harness seen={seen} />);
    fireEvent.keyDown(tileButton(view, "Alfred"), { key: "a", ctrlKey: true });
    expect(seen).toHaveBeenLastCalledWith(items.map((i) => i.id));
  });

  test("the selection stays controlled: the grid shows what the caller passes", () => {
    const view = render(<FileGrid items={items} label="Files" selectedIds={["daisy"]} onSelectionChange={() => {}} />);
    fireEvent.click(view.getByRole("checkbox", { name: "Select Alfred" }));
    expect(view.getByRole("checkbox", { name: "Select Alfred" }).getAttribute("aria-checked")).toBe("false");
    expect(view.getByRole("checkbox", { name: "Select Daisy" }).getAttribute("aria-checked")).toBe("true");
  });
});
