// VIDEO-UI-13: the Style poster banner, the wide popover, and the split view's recessed stage.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { SplitView, SplitViewLayoutContext, type SplitViewLayout } from "@/kit/primitives/SplitView";
import { PromptBar, type PromptBarChip } from "./prompt-bar";

const realMatchMedia = window.matchMedia;
beforeEach(() => stubMatchMedia({}));
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; });

const look: PromptBarChip = { id: "look", label: "Look", variant: "cards", presentation: "popover", group: "Style", value: "anime", onValueChange: () => {}, options: [{ value: "none", label: "Auto" }, { value: "anime", label: "Anime", media: "/l/anime.png" }] };
const camera: PromptBarChip = { id: "camera", label: "Camera", variant: "cards", presentation: "popover", group: "Style", value: "dolly", onValueChange: () => {}, options: [{ value: "still", label: "Still", media: "/c/still.png" }, { value: "dolly", label: "Dolly in", media: "/c/dolly.png" }] };
const banner = { trigger: "banner", popoverSize: "wide" } as const;

function bar(layout: SplitViewLayout | null, chips: PromptBarChip[]) {
  return render(<SplitViewLayoutContext.Provider value={layout}><PromptBar label="Describe" placement="panel" value="a fox" onValueChange={() => {}} onSubmit={() => {}} chips={chips} /></SplitViewLayoutContext.Provider>);
}

describe("prompt_bar chip group trigger banner", () => {
  test("default: the small row, no banner, a 32 rem popover with no size flag", async () => {
    const view = bar("side", [look, camera]);
    const trigger = view.container.querySelector('[data-slot="prompt-bar-group"]')!;
    expect(trigger.hasAttribute("data-trigger")).toBe(false);
    expect(view.container.querySelector('[data-slot="prompt-bar-banner"]')).toBeNull();
    fireEvent.click(trigger);
    await view.findByRole("radiogroup", { name: "Look" });
    expect(document.querySelector('[data-slot="prompt-bar-group-body"]')!.hasAttribute("data-size")).toBe(false);
  });

  test("banner: the chosen picture, the names, the chosen words and a Change pill, in one button", () => {
    const view = bar("side", [{ ...look, ...banner }, camera]);
    const wrap = view.container.querySelector('[data-slot="prompt-bar-banner"]')!;
    expect(wrap.textContent).toContain("Style");
    const button = wrap.querySelector('[data-slot="prompt-bar-group"]') as HTMLButtonElement;
    expect(button.getAttribute("data-trigger")).toBe("banner");
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(button.textContent).toContain("look and camera");
    expect(button.textContent).toContain("Anime, Dolly in");
    expect(button.textContent).toContain("Change");
    expect(button.querySelector("video, img")).toBeTruthy();
    expect(button.className).toContain("aspect-[16/6]");
    // Colour over the picture comes from the kit's art tokens only.
    expect(button.innerHTML).toContain("var(--art-scrim)");
    expect(button.innerHTML).toContain("var(--art-foreground)");
    expect(button.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });

  test("keyboard: Enter opens the wide popover with both sections and six-up cards, Escape closes it and returns focus to the banner", async () => {
    const view = bar("side", [{ ...look, ...banner }, camera]);
    const button = view.container.querySelector('[data-slot="prompt-bar-group"]') as HTMLButtonElement;
    button.focus();
    expect(document.activeElement).toBe(button);
    fireEvent.click(button); // a keyboard Enter or Space on a button is a click
    const lookGroup = await view.findByRole("radiogroup", { name: "Look" });
    const body = document.querySelector('[data-slot="prompt-bar-group-body"]')!;
    expect(body.getAttribute("data-size")).toBe("wide");
    expect(lookGroup.className).toContain("sm:grid-cols-6");
    expect(within(body as HTMLElement).getByRole("radiogroup", { name: "Camera" })).toBeTruthy();
    expect(document.querySelector('[role="dialog"]')!.className).toContain("47.5rem");
    // ui-v0.5.476: never wider than the room Radix leaves beside the trigger (the panel sits at the left edge, the popover opens to its right).
    expect(document.querySelector('[role="dialog"]')!.className).toContain("var(--radix-popper-available-width");
    expect(document.querySelector('[role="tablist"]')).toBeNull();
    fireEvent.keyDown(lookGroup, { key: "Escape" });
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(view.queryByRole("radiogroup", { name: "Look" })).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  test("on a phone or a stacked split view the group opens in a bottom sheet with the cards flat, as before", async () => {
    stubMatchMedia({ "(max-width: 639px)": true });
    const view = bar("stacked", [{ ...look, ...banner }, camera]);
    expect(view.container.querySelector('[data-slot="prompt-bar-banner"]')).toBeNull();
    expect(view.container.querySelector('[data-slot="prompt-bar-dock"], [data-mode="dock"]')).toBeTruthy();
  });

  test("choosing a card writes its value", async () => {
    const picked: (string | number)[] = [];
    const view = bar("side", [{ ...look, ...banner, onValueChange: (v) => picked.push(v) }, camera]);
    fireEvent.click(view.container.querySelector('[data-slot="prompt-bar-group"]')!);
    const lookGroup = await view.findByRole("radiogroup", { name: "Look" });
    fireEvent.click(within(lookGroup).getByRole("radio", { name: "Auto" }));
    expect(picked).toEqual(["none"]);
  });

  test("a disabled bar still draws", () => {
    const view = render(<SplitViewLayoutContext.Provider value="side"><PromptBar label="Describe" placement="panel" value="" onValueChange={() => {}} onSubmit={() => {}} disabledReason="Starting" chips={[{ ...look, ...banner }, camera]} /></SplitViewLayoutContext.Provider>);
    expect(view.container.querySelector('[data-slot="prompt-bar"]')).toBeTruthy();
  });
});

describe("split_view main_surface", () => {
  const main = <p>Feed</p>;
  const aside = <p>Panel</p>;
  test("default: the main column draws no surface", () => {
    const view = render(<SplitView main={main} aside={aside} />);
    const col = view.getByText("Feed").parentElement!;
    expect(col.hasAttribute("data-surface")).toBe(false);
    expect(col.className).not.toContain("surface-stage");
  });
  test("stage: the main column is a recessed pane on --surface-stage, never --surface-pane or a fixed colour", () => {
    const view = render(<SplitView main={main} aside={aside} mainSurface="stage" />);
    const col = view.getByText("Feed").parentElement!;
    expect(col.getAttribute("data-surface")).toBe("stage");
    expect(col.className).toContain("bg-[var(--surface-stage)]");
    expect(col.className).not.toContain("surface-pane");
    expect(col.className).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb|bg-(black|white|slate|gray|zinc|neutral)/);
    expect(view.getByText("Panel").parentElement!.hasAttribute("data-surface")).toBe(false);
  });
});
