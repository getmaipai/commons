// MEDIA-PARITY-02: the reorder helper, MediaShelf / TrackRows props, the icons it needs and the Dialog `error` slot.
import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { moveKey } from "@/kit/primitives/reorder";
import { TrackRows } from "@/kit/primitives/MusicBlocks";
import { MediaShelf } from "@/kit/primitives/MediaShelf";
import { Dialog, DialogContent, DialogTitle } from "@/kit/ui/dialog";
import { iconNames } from "@/kit/icons";

afterEach(cleanup);

describe("moveKey", () => {
  test("moves one key and leaves the input alone", () => {
    const keys = ["a", "b", "c"];
    expect(moveKey(keys, 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveKey(keys, 2, 0)).toEqual(["c", "a", "b"]);
    expect(keys).toEqual(["a", "b", "c"]);
  });
  test("out of range or same index changes nothing", () => {
    expect(moveKey(["a", "b"], 0, 5)).toEqual(["a", "b"]);
    expect(moveKey(["a", "b"], 1, 1)).toEqual(["a", "b"]);
    expect(moveKey(["a", "b"], -1, 0)).toEqual(["a", "b"]);
  });
});

describe("kit reorder props", () => {
  const rows = [{ id: "a", t: "Alpha" }, { id: "b", t: "Beta" }];
  test("TrackRows calls onReorder with the whole order and a revert that restores the list", () => {
    let seen: string[] = [];
    let undo: () => void = () => {};
    const view = render(<TrackRows items={rows} label="Tracks" getKey={(r) => r.id} getTitle={(r) => r.t} onPlay={() => {}} reorder={{ onReorder: (keys, revert) => { seen = keys; undo = revert; } }} />);
    fireEvent.click(view.getByRole("button", { name: "Reorder" }));
    expect(view.getByRole("button", { name: "Done" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(view.getByRole("button", { name: "Move Alpha down" }));
    expect(seen).toEqual(["b", "a"]);
    expect(view.container.querySelector("[data-slot=track-row] .font-semibold")!.textContent).toBe("Beta");
    act(() => undo());
    expect(view.container.querySelector("[data-slot=track-row] .font-semibold")!.textContent).toBe("Alpha");
  });
  test("MediaShelf without reorder draws no handles", () => {
    const view = render(<MediaShelf items={rows} getKey={(r) => r.id} renderItem={(r) => <span>{r.t}</span>} getLabel={(r) => r.t} />);
    expect(view.container.querySelector("[data-slot=reorder-handle]")).toBeNull();
    expect(view.queryByRole("button", { name: "Reorder" })).toBeNull();
  });
});

describe("icons", () => {
  test("the reorder icons and the repeat icons the Now Playing stage uses are registered", () => {
    for (const name of ["grip-vertical", "chevron-up", "chevron-down", "repeat", "repeat-1"]) expect((iconNames as readonly string[]).includes(name)).toBe(true);
  });
});

describe("DialogContent error slot", () => {
  test("a StatusCard (problem by default) is drawn inside the dialog", () => {
    const view = render(<Dialog open><DialogContent error={{ title: "Could not save.", line: "Try again." }}><DialogTitle>Rename</DialogTitle></DialogContent></Dialog>);
    const slot = document.body.querySelector("[data-slot=dialog-error]")!;
    expect(slot.querySelector("[data-status-kind=problem]")).not.toBeNull();
    expect(slot.textContent).toContain("Could not save.");
    view.unmount();
  });
  test("no error, no slot", () => {
    render(<Dialog open><DialogContent><DialogTitle>Rename</DialogTitle></DialogContent></Dialog>);
    expect(document.body.querySelector("[data-slot=dialog-error]")).toBeNull();
  });
});
