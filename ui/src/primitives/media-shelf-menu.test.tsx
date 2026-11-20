import { describe, expect, test } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import { MediaShelf } from "@/kit/primitives/MediaShelf";
import { HIT_FLOOR } from "@/kit/utils";

const row = { id: "a", name: "Alpha" };
const menu = (layout: "rail" | "grid" = "grid", orientation: "horizontal" | "vertical" = "horizontal", actions = true) => render(<MediaShelf items={[row]} getKey={(r) => r.id} getLabel={(r) => r.name} layout={layout} orientation={orientation} onSelect={() => {}} renderItem={() => <div>art</div>} renderMenu={actions ? () => <button role="menuitem">Save</button> : undefined} />);

describe("MediaShelf tile menu", () => {
  test("draws on rail and grid tiles but not vertical shelves or shelves without actions", () => {
    for (const layout of ["rail", "grid"] as const) { const view = menu(layout); expect(view.container.querySelector('[data-slot="media-shelf-tile-menu-trigger"]')).not.toBeNull(); view.unmount(); }
    expect(menu("grid", "vertical").container.querySelector('[data-slot="media-shelf-tile-menu-trigger"]')).toBeNull();
    expect(menu("grid", "horizontal", false).container.querySelector('[data-slot="media-shelf-tile-menu-trigger"]')).toBeNull();
  });
  test("opens from its button without selecting the tile, with the 44 px hit floor class", async () => {
    let selected = 0;
    const view = render(<MediaShelf items={[row]} getKey={(r) => r.id} getLabel={(r) => r.name} layout="grid" onSelect={() => selected++} renderItem={() => <div>art</div>} renderMenu={() => <button role="menuitem">Save</button>} />);
    const trigger = view.getByRole("button", { name: "More actions for Alpha" });
    expect(trigger.className).toContain(HIT_FLOOR);
    trigger.focus(); fireEvent.keyDown(trigger, { key: "Enter" });
    expect(await view.findByRole("menuitem", { name: "Save" })).toBeTruthy();
    expect(selected).toBe(0);
    view.unmount();
  });
});
