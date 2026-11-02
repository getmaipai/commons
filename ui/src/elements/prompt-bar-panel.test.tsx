// VIDEO-UI-03: the prompt bar's panel and dock, suggestions, submit detail, popover group, fold, in-field reference, audio and video slots.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { useState } from "react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { SplitView, SplitViewLayoutContext, type SplitViewLayout } from "@/kit/primitives/SplitView";
import { PromptBar, type PromptBarProps, type PromptBarReference } from "./prompt-bar";

const realMatchMedia = window.matchMedia;
beforeEach(() => stubMatchMedia({}));
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; });

const look = { id: "look", label: "Look", variant: "cards" as const, presentation: "popover" as const, group: "Style", value: "anime", onValueChange: () => {}, options: [{ value: "none", label: "Natural", media: "/l/none.png" }, { value: "anime", label: "Anime", media: "/l/anime.png" }] };
const camera = { id: "camera", label: "Camera", variant: "cards" as const, presentation: "popover" as const, group: "Style", value: "dolly", onValueChange: () => {}, options: [{ value: "still", label: "Still", media: "/c/still.png" }, { value: "dolly", label: "Dolly in", media: "/c/dolly.png" }] };
const length = { id: "length", label: "Length", value: 5, onValueChange: () => {}, options: [{ value: 5, label: "5 s" }, { value: 10, label: "10 s" }] };
const voices = { id: "voices", label: "Voices", fold: true, value: "auto", onValueChange: () => {}, options: [{ value: "auto", label: "Auto" }, { value: "none", label: "None" }] };
const frame: PromptBarReference = { id: "start_frame", label: "Start frame", kind: "picture", placement: "in_field", value: null, onPick: () => {}, onRemove: () => {} };

function bar(layout: SplitViewLayout | null, props: Partial<PromptBarProps> = {}) {
  const ui = <PromptBar label="Describe" placement="panel" submitLabel="Generate" value="a fox" onValueChange={() => {}} onSubmit={() => {}} {...props} />;
  return render(<SplitViewLayoutContext.Provider value={layout}>{ui}</SplitViewLayoutContext.Provider>);
}

describe("PromptBar placement panel", () => {
  test("outside a SplitView the panel placement draws as the inline bar", () => {
    const view = bar(null);
    expect(view.container.querySelector('[data-slot="prompt-bar"]')!.hasAttribute("data-mode")).toBe(false);
  });

  test("side by side: a pane with a scrolling body and the submit pinned in its own foot", () => {
    const view = bar("side", { chips: [look, camera, length, voices], tier: { value: "standard", onValueChange: () => {}, tiers: [{ id: "standard", label: "Standard" }, { id: "boost", label: "Boost" }] }, submitDetail: "Under a minute" });
    const form = view.container.querySelector('[data-slot="prompt-bar"]')!;
    expect(form.getAttribute("data-mode")).toBe("panel");
    const body = form.querySelector('[data-slot="prompt-bar-body"]')!;
    const foot = form.querySelector('[data-slot="prompt-bar-foot"]')!;
    expect(body.className).toContain("overflow-y-auto");
    expect(body.getAttribute("tabindex")).toBe("0");
    expect(within(foot as HTMLElement).getByRole("button", { name: "Generate" })).toBeTruthy();
    expect(within(body as HTMLElement).queryByRole("button", { name: "Generate" })).toBeNull();
    expect(foot.textContent).toContain("Under a minute");
    expect(view.getByRole("button", { name: "Generate" }).getAttribute("aria-describedby")).toBe(foot.querySelector('[data-slot="prompt-bar-detail"]')!.id);
  });

  test("Generate submits once, and is off for an empty box", () => {
    let made = 0;
    const view = bar("side", { value: "", onSubmit: () => { made += 1; } });
    expect((view.getByRole("button", { name: "Generate" }) as HTMLButtonElement).disabled).toBe(true);
    view.rerender(<SplitViewLayoutContext.Provider value="side"><PromptBar label="Describe" placement="panel" submitLabel="Generate" value="a fox" onValueChange={() => {}} onSubmit={() => { made += 1; }} /></SplitViewLayoutContext.Provider>);
    fireEvent.click(view.getByRole("button", { name: "Generate" }));
    expect(made).toBe(1);
  });

  test("suggestions show while the box is empty, fill it, then go away", () => {
    function Harness() {
      const [text, setText] = useState("");
      return <SplitViewLayoutContext.Provider value="side"><PromptBar label="Describe" placement="panel" value={text} onValueChange={setText} onSubmit={() => {}} suggestions={[{ label: "Fox", text: "A fox in snow" }, { label: "Sea", text: "Waves at dawn" }]} /></SplitViewLayoutContext.Provider>;
    }
    const view = render(<Harness />);
    expect(view.getAllByRole("button", { name: /Fox|Sea/ }).length).toBe(2);
    fireEvent.click(view.getByRole("button", { name: "Fox" }));
    expect((view.getByRole("textbox", { name: "Describe" }) as HTMLTextAreaElement).value).toBe("A fox in snow");
    expect(view.queryByRole("button", { name: "Fox" })).toBeNull();
  });

  test("a popover group is one trigger showing the chosen words; it opens both pickers and Escape returns focus to it", async () => {
    const picked: (string | number)[] = [];
    const view = bar("side", { chips: [{ ...look, onValueChange: (v) => picked.push(v) }, camera, length] });
    const trigger = view.getByRole("button", { name: /Style/ });
    expect(trigger.textContent).toContain("Anime, Dolly in");
    expect(view.container.querySelectorAll('[data-slot="prompt-bar-group"]').length).toBe(1);
    expect(view.queryByRole("radiogroup", { name: "Look" })).toBeNull();
    trigger.focus();
    fireEvent.click(trigger);
    const lookGroup = await view.findByRole("radiogroup", { name: "Look" });
    expect(within(lookGroup).getAllByRole("radio").length).toBe(2);
    expect(view.getByRole("radiogroup", { name: "Camera" })).toBeTruthy();
    fireEvent.click(within(lookGroup).getByRole("radio", { name: "Natural" }));
    expect(picked).toEqual(["none"]);
    fireEvent.keyDown(lookGroup, { key: "Escape" });
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(view.queryByRole("radiogroup", { name: "Look" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  test("the fold hides its chips until More settings is opened", async () => {
    const view = bar("side", { chips: [look, voices] });
    expect(view.queryByRole("combobox", { name: "Voices" })).toBeNull();
    const fold = view.getByRole("button", { name: "More settings" });
    expect(fold.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(fold);
    expect(view.getByRole("button", { name: "More settings" }).getAttribute("aria-expanded")).toBe("true");
    expect(await view.findByRole("combobox", { name: "Voices" })).toBeTruthy();
  });

  test("the in-field reference: an add button in the box, then a named thumbnail with a remove control inside it", () => {
    let picks = 0;
    let removed = 0;
    const view = bar("side", { references: [{ ...frame, onPick: () => { picks += 1; } }] });
    fireEvent.click(view.getByRole("button", { name: "Add Start frame" }));
    expect(picks).toBe(1);
    expect(view.container.querySelector('[data-slot="prompt-bar-field"] [aria-label="Add Start frame"]')).toBeTruthy();
    view.rerender(<SplitViewLayoutContext.Provider value="side"><PromptBar label="Describe" placement="panel" value="a fox" onValueChange={() => {}} onSubmit={() => {}} references={[{ ...frame, value: "f1", thumb: "/t.png", onRemove: () => { removed += 1; } }]} /></SplitViewLayoutContext.Provider>);
    const thumb = view.container.querySelector('[data-slot="prompt-bar-field"] [data-slot="prompt-bar-infield"]')!;
    expect(thumb.textContent).toContain("Start frame");
    expect(view.container.querySelector('[data-slot="prompt-bar-references"]')).toBeNull();
    fireEvent.click(within(thumb as HTMLElement).getByRole("button", { name: "Remove Start frame" }));
    expect(removed).toBe(1);
  });

  test("audio and video slots are file slots in the row, like a picture", () => {
    const view = bar("side", { references: [{ ...frame, id: "voice", label: "Voice clip", kind: "audio", placement: "row" }, { ...frame, id: "src", label: "Source clip", kind: "video", placement: "row" }] });
    expect(view.getByRole("button", { name: "Add Voice clip" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Add Source clip" })).toBeTruthy();
    expect(view.container.querySelector('[data-slot="prompt-bar-references"]')).toBeTruthy();
  });

  test("a disabled reason stops the panel, shows its line, and a control stays reachable by keyboard order", () => {
    const view = bar("side", { chips: [look, length], disabledReason: "Video is not ready yet. Try again in a minute." });
    expect((view.getByRole("button", { name: "Generate" }) as HTMLButtonElement).disabled).toBe(true);
    expect((view.getByRole("textbox", { name: "Describe" }) as HTMLTextAreaElement).disabled).toBe(true);
    expect((view.getByRole("button", { name: /Style/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(view.getByText("Video is not ready yet. Try again in a minute.")).toBeTruthy();
  });
});

describe("PromptBar placement panel, stacked (the dock)", () => {
  test("the dock holds the box, an Options button and a round Generate; the controls wait in the sheet", () => {
    const view = bar("stacked", { chips: [look, camera, length], references: [frame] });
    const form = view.container.querySelector('[data-slot="prompt-bar"]')!;
    expect(form.getAttribute("data-mode")).toBe("dock");
    expect(form.className).toContain("fixed");
    expect(view.getByRole("button", { name: "Options" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Generate" }).getAttribute("type")).toBe("submit");
    expect(view.queryByRole("radiogroup", { name: "Look" })).toBeNull();
    expect(view.queryByRole("button", { name: /Style/ })).toBeNull();
  });

  test("Options opens a sheet with the pickers three to a row and its own Generate, which submits and closes", async () => {
    let made = 0;
    const view = bar("stacked", { chips: [look, camera, length], onSubmit: () => { made += 1; }, submitDetail: "About a minute" });
    fireEvent.click(view.getByRole("button", { name: "Options" }));
    const dialog = await view.findByRole("dialog");
    const lookGroup = within(dialog).getByRole("radiogroup", { name: "Look" });
    expect(lookGroup.className).toContain("grid-cols-3");
    expect(within(dialog).getByRole("radiogroup", { name: "Camera" })).toBeTruthy();
    expect(within(dialog).getByRole("combobox", { name: "Length" })).toBeTruthy();
    expect(dialog.textContent).toContain("About a minute");
    fireEvent.click(within(dialog).getByRole("button", { name: "Generate" }));
    expect(made).toBe(1);
  });

  test("the dock's Generate is off while the box is empty or a reason is set, and the reason shows in the dock", () => {
    const view = bar("stacked", { value: "", disabledReason: "Video is not ready yet." });
    expect((view.getByRole("button", { name: "Generate" }) as HTMLButtonElement).disabled).toBe(true);
    expect((view.getByRole("button", { name: "Options" }) as HTMLButtonElement).disabled).toBe(true);
    expect(view.getByText("Video is not ready yet.")).toBeTruthy();
  });

  test("a filled in-field reference shows as a named thumbnail inside the dock's box", () => {
    const view = bar("stacked", { references: [{ ...frame, value: "f1", thumb: "/t.png" }] });
    expect(view.container.querySelector('[data-slot="prompt-bar-field"] [data-slot="prompt-bar-infield"]')!.textContent).toContain("Start frame");
  });
});

describe("SplitView layout context", () => {
  function Probe() {
    return <SplitViewLayoutContext.Consumer>{(v) => <p data-testid="layout">{String(v)}</p>}</SplitViewLayoutContext.Consumer>;
  }
  test("side by side from the kit's lg width (960 px), stacked below it", () => {
    stubMatchMedia({ "(min-width: 960px)": true });
    expect(render(<SplitView main={<p>m</p>} aside={<Probe />} />).getByTestId("layout").textContent).toBe("side");
    cleanup();
    stubMatchMedia({ "(min-width: 960px)": false });
    expect(render(<SplitView main={<p>m</p>} aside={<Probe />} />).getByTestId("layout").textContent).toBe("stacked");
  });

  test("a prompt bar in the aside takes its mode from the SplitView, and runs no media query of its own", () => {
    const queries: string[] = [];
    window.matchMedia = ((query: string) => { queries.push(query); return { matches: query === "(min-width: 960px)", media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }; }) as typeof window.matchMedia;
    const view = render(<SplitView main={<p>feed</p>} aside={<PromptBar label="Describe" placement="panel" value="x" onValueChange={() => {}} onSubmit={() => {}} />} asideSide="start" />);
    expect(view.container.querySelector('[data-slot="prompt-bar"]')!.getAttribute("data-mode")).toBe("panel");
    expect(queries.filter((q) => !q.startsWith("(min-width: 960px)") && !q.includes("max-width: 639") && !q.includes("pointer: coarse"))).toEqual([]);
  });

  test("aside_side start puts the aside first at lg and swaps the columns; end is unchanged", () => {
    const start = render(<SplitView main={<p>m</p>} aside={<p>a</p>} asideLabel="Panel" asideSide="start" />);
    expect(start.container.querySelector('[data-slot="split-view"]')!.className).toContain("lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]");
    expect(start.getByRole("region", { name: "Panel" }).className).toContain("lg:order-first");
    cleanup();
    const end = render(<SplitView main={<p>m</p>} aside={<p>a</p>} asideLabel="Panel" />);
    expect(end.container.querySelector('[data-slot="split-view"]')!.className).toContain("lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]");
    expect(end.getByRole("region", { name: "Panel" }).className).not.toContain("order-first");
  });
});

describe("VIDEO-UI-12 roomy panel props", () => {
  const tiers = [{ id: "standard" as const, label: "Standard", hint: "Fast" }, { id: "boost" as const, label: "Boost", hint: "Sharper" }];
  test("fieldSize large makes a five row box in the panel; default and the dock are unchanged", () => {
    const large = bar("side", { fieldSize: "large" });
    expect(large.container.querySelector("textarea")!.className).toContain("min-h-[calc(5lh+1.5rem)]");
    cleanup();
    expect(bar("side").container.querySelector("textarea")!.className).not.toContain("5lh");
    cleanup();
    expect(bar("stacked", { fieldSize: "large" }).container.querySelector("textarea")!.className).not.toContain("5lh");
  });
  test("a tile reference is a full-width tile with label and hint in the box, then the named thumbnail with a remove control", () => {
    let picked = 0;
    const tile: PromptBarReference = { ...frame, placement: "tile", hint: "Optional. Begin from a picture.", onPick: () => { picked += 1; } };
    const view = bar("side", { references: [tile] });
    const button = view.getByRole("button", { name: "Add Start frame" });
    expect(button.getAttribute("data-slot")).toBe("prompt-bar-tile");
    expect(button.closest('[data-slot="prompt-bar-field"]')).toBeTruthy();
    expect(button.textContent).toContain("Optional. Begin from a picture.");
    fireEvent.click(button);
    expect(picked).toBe(1);
    view.rerender(<SplitViewLayoutContext.Provider value="side"><PromptBar label="Describe" placement="panel" value="a fox" onValueChange={() => {}} onSubmit={() => {}} references={[{ ...tile, value: "f1", thumb: "/t.png" }]} /></SplitViewLayoutContext.Provider>);
    expect(view.container.querySelector('[data-slot="prompt-bar-infield"]')).toBeTruthy();
    expect(view.getByRole("button", { name: "Remove Start frame" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Add Start frame" })).toBeNull();
  });
  test("a locked bar disables the tile", () => {
    const view = bar("side", { disabledReason: "Not ready", references: [{ ...frame, placement: "tile" }] });
    expect((view.getByRole("button", { name: "Add Start frame" }) as HTMLButtonElement).disabled).toBe(true);
  });
  test("in the phone sheet an empty tile shows full width in the references", async () => {
    const view = bar("stacked", { references: [{ ...frame, placement: "tile", hint: "Optional." }] });
    fireEvent.click(view.getByRole("button", { name: "Options" }));
    const tile = await within(document.body).findByRole("button", { name: "Add Start frame" });
    expect(tile.getAttribute("data-slot")).toBe("prompt-bar-tile");
  });
  test("tier cards take their time words from submit detail", () => {
    const view = bar("side", { tier: { value: "standard", onValueChange: () => {}, tiers, presentation: "cards", details: { standard: "Under a minute", boost: "About a minute" } } });
    expect(view.container.querySelector('[data-presentation="cards"]')).toBeTruthy();
    expect(view.getByText("About a minute")).toBeTruthy();
  });
  test("submitDetailPlacement in_button puts the time inside the button, keeps the button's name and its description, and draws no line below", () => {
    const view = bar("side", { tier: undefined, submitDetail: "Standard, about a minute", submitDetailPlacement: "in_button" });
    const button = view.getByRole("button", { name: "Generate" });
    expect(button.textContent).toContain("Standard, about a minute");
    expect(button.className).toContain("h-16");
    const detail = button.querySelector('[data-slot="prompt-bar-detail"]')!;
    expect(button.getAttribute("aria-describedby")).toBe(detail.id);
    expect(view.container.querySelectorAll('[data-slot="prompt-bar-detail"]').length).toBe(1);
  });
  test("submitDetailPlacement below (default) is unchanged", () => {
    const view = bar("side", { submitDetail: "Under a minute" });
    expect(view.getByRole("button", { name: "Generate" }).textContent).toBe("Generate");
    expect(view.container.querySelector('[data-slot="prompt-bar-foot"] p[data-slot="prompt-bar-detail"]')).toBeTruthy();
  });
});
