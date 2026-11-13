// ONE-COMPOSER-2026-11-13 (COMPOSER-03): a Create page's prompt_bar draws the kit composer when the host lists the composer's modes.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext, PageStateContext } from "@/kit/schema/packageScope";
import { MediaHostContext, type MediaHost } from "@/kit/schema/mediaHost";
import type { UiNode } from "@/kit/schema/types";

const realMatchMedia = window.matchMedia;
beforeEach(() => { stubMatchMedia(); });
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; });

const node = {
  type: "prompt_bar", layout: "chat", label: "Describe a picture", placeholder: "Describe the picture you want.", submit_label: "Make picture",
  chips: [
    { state: "shape", label: "Shape", group: "Settings", default: "square", options: [{ value: "square", label: "Square" }, { value: "wide", label: "Wide" }] },
    { state: "count", label: "Pictures", group: "Settings", default: 1, options: [{ value: 1, label: "1 picture" }, { value: 2, label: "2 pictures" }] },
    { state: "look", label: "Look", group: "Style", variant: "cards", default: "none", quiet_value: "none", options: [{ value: "none", label: "Auto" }, { value: "anime", label: "Anime", media: "loops/anime.mp4" }] },
  ],
  tier: { state: "tier", label: "Quality", default: "standard", tiers: [{ id: "standard", label: "Standard", hint: "Fast" }, { id: "boost", label: "Boost", hint: "More detail" }, { id: "max", label: "Max", hint: "Best quality" }] },
  submit: { call: { target: "/api/plugins/image/actions/make", args: { prompt: "{prompt}", shape: "{shape}", tier: "{tier}" } } },
} as unknown as UiNode;

function draw(host: Partial<MediaHost>, bar: UiNode = node, state: Record<string, unknown> = {}, onState: (patch: Record<string, unknown>) => void = () => {}) {
  return renderWithQueryClient(
    <MemoryRouter>
      <PackageScopeContext.Provider value={{ packageId: "image" }}>
        <PageStateContext.Provider value={{ merge: onState }}>
          <MediaHostContext.Provider value={host as MediaHost}>
            <NodeRenderer node={bar} state={state} />
          </MediaHostContext.Provider>
        </PageStateContext.Provider>
      </PackageScopeContext.Provider>
    </MemoryRouter>,
  );
}

const modes = [
  { id: "picture", label: "Picture", icon: "image", primaryLabel: "Make picture" },
  { id: "video", label: "Video", icon: "film", primaryLabel: "Generate" },
];

describe("prompt_bar with the host's composer modes", () => {
  test("draws one composer: a mode pill, one combined chip per group, the Quality chip, no dropdown row", () => {
    const view = draw({ composer: { modes, current: "picture", onModeChange: () => {} } });
    expect(view.container.querySelector('[data-composer-modes="true"]')).not.toBeNull();
    expect(view.container.querySelector('[data-slot="composer-chip-group"][data-group="Settings"]')?.textContent).toContain("Square · 1 picture");
    expect(view.container.querySelector('[data-slot="composer-chip-group"][data-group="Style"]')).not.toBeNull();
    expect(view.container.querySelector('[data-slot="composer-quality"]')).not.toBeNull();
    expect(view.container.querySelector("select")).toBeNull();
  });

  test("a chip's icon names its group's trigger icon; a group with no icon keeps the sliders", () => {
    const withIcon = { ...node, chips: (node as unknown as { chips: Array<Record<string, unknown>> }).chips.map((chip) => (chip.group === "Style" ? { ...chip, icon: "palette" } : chip)) } as unknown as UiNode;
    const view = draw({ composer: { modes, current: "picture", onModeChange: () => {} } }, withIcon);
    expect(view.container.querySelector('[data-group="Style"] svg')?.getAttribute("class")).toContain("lucide-palette");
    expect(view.container.querySelector('[data-group="Settings"] svg')?.getAttribute("class")).toContain("lucide-sliders-horizontal");
  });

  test("modes composer passes icon_only and option icons through to the shared chip", () => {
    const bar = { ...node, chips: [{ state: "shape", label: "Shape", group: "Settings", icon_only: true, icon: "sliders-horizontal", default: "wide", options: [{ value: "wide", label: "Landscape", icon: "image" }, { value: "tall", label: "Portrait" }] }] } as unknown as UiNode;
    const view = draw({ composer: { modes, current: "picture", onModeChange: () => {} } }, bar);
    const trigger = view.getByRole("button", { name: "Shape: Landscape" });
    expect(trigger.getAttribute("title")).toBe("Shape: Landscape");
    expect(trigger.querySelector("svg")?.getAttribute("class")).toContain("lucide-image");
    expect(trigger.textContent).not.toContain("Landscape");
    fireEvent.click(trigger);
    expect(view.getByRole("radio", { name: "Landscape" })).not.toBeNull();
    expect(view.getByRole("radio", { name: "Portrait" })).not.toBeNull();
  });

  test("a reference with a disabled_reason draws its slot and the plus disabled with that line", () => {
    const line = "Starting a picture from a reference is coming next.";
    const bar = { ...node, references: [{ state: "reference", label: "Image reference", kind: "picture", disabled_reason: line }] } as unknown as UiNode;
    const view = draw({ composer: { modes, current: "picture", onModeChange: () => {} }, pickMedia: () => Promise.resolve({ id: "f" }) }, bar);
    const add = view.container.querySelector('[data-slot="composer-add"]') as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    expect(add.getAttribute("title")).toBe(line);
    expect(view.container.querySelector('[data-slot="composer-slots"] [aria-disabled="true"]')).not.toBeNull();
  });

  test("multi-reference slots add distinct choices, remove one, and write the joined page-state value", async () => {
    const picked: string[] = [];
    const stateWrites: Record<string, unknown>[] = [];
    const bar = { ...node, references: [{ state: "reference", label: "Image reference", kind: "picture", max: 3 }], submit: { call: { target: "/make", args: { references: "{reference}" } } } } as unknown as UiNode;
    const host = { composer: { modes, current: "picture", onModeChange: () => {} }, pickMedia: mock(async () => { const id = `file-${picked.length + 1}`; picked.push(id); return { id }; }) };
    const view = draw(host, bar, {}, (patch) => stateWrites.push(patch));
    fireEvent.click(view.getByRole("button", { name: "Add Image reference" }));
    await waitFor(() => expect(picked).toHaveLength(1));
    fireEvent.click(view.getByRole("button", { name: "Add Image reference" }));
    await waitFor(() => expect(picked).toHaveLength(2));
    expect(stateWrites.at(-1)).toEqual({ reference: "file-1,file-2" });
    expect(view.getByRole("button", { name: "Remove Image reference 1" })).not.toBeNull();
    expect(view.getByRole("button", { name: "Remove Image reference 2" })).not.toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Remove Image reference 1" }));
    expect(stateWrites.at(-1)).toEqual({ reference: "file-2" });
    expect(view.getByRole("button", { name: "Remove Image reference 1" })).not.toBeNull();
    expect(view.getByRole("button", { name: "Add Image reference" })).not.toBeNull();
  });

  test("the composer plus picks the first reference slot with room", async () => {
    const seen: string[] = [];
    const bar = { ...node, references: [
      { state: "reference", label: "Image reference", kind: "picture", max: 1 },
      { state: "character", label: "Character", kind: "character", max: 2 },
    ] } as unknown as UiNode;
    const view = draw({ composer: { modes, current: "picture", onModeChange: () => {} }, pickMedia: mock(async (kind: string) => { seen.push(kind); return { id: `file-${seen.length}` }; }) as MediaHost["pickMedia"] }, bar, { reference: "existing-file" });
    fireEvent.click(view.container.querySelector('[data-slot="composer-add"]')!);
    await waitFor(() => expect(seen).toEqual(["character"]));
  });

  test("the host's quality list narrows the tiers (a minor never sees Max)", async () => {
    const view = draw({ composer: { modes, current: "picture", onModeChange: () => {}, quality: ["standard", "boost"] } });
    const trigger = view.container.querySelector('[data-slot="composer-quality"]') as HTMLButtonElement;
    expect(trigger.getAttribute("aria-label")).toBe("Quality: Standard");
    expect(trigger.getAttribute("title")).toBe("Quality: Standard");
    expect(trigger.textContent).not.toContain("Standard");
    fireEvent.click(trigger);
    await waitFor(() => expect(document.body.textContent).toContain("Boost"));
    expect(document.body.textContent).not.toContain("Max");
  });

  test("picking another mode hands the typed words to the host", () => {
    const picked = mock((_id: string, _draft: { text: string }) => {});
    const view = draw({ composer: { modes, current: "picture", onModeChange: picked } });
    fireEvent.change(view.getByLabelText("Describe a picture"), { target: { value: "a red fox" } });
    fireEvent.click(view.container.querySelector('[data-slot="prompt-bar"] button[aria-haspopup="listbox"]')!);
    fireEvent.click(view.getByRole("option", { name: /Video/ }));
    expect(picked).toHaveBeenCalledWith("video", { text: "a red fox" });
  });

  test("without a host composer the bar is unchanged", () => {
    const view = draw({});
    expect(view.container.querySelector('[data-composer-modes="true"]')).toBeNull();
  });

  test("the chip popover keeps the picture cards of a cards chip", async () => {
    const view = draw({ composer: { modes, current: "picture", onModeChange: () => {} } });
    fireEvent.click(view.container.querySelector('[data-slot="composer-chip-group"][data-group="Style"]')!);
    await waitFor(() => expect(document.querySelector('[data-chip="look"]')).not.toBeNull());
    expect(document.body.textContent).toContain("Anime");
  });

  test("the host's presets draw one Presets pill on the current mode", () => {
    const view = draw({ composer: { modes, current: "picture", onModeChange: () => {}, presets: { chips: [{ id: "look", label: "Look", group: "Look / Light", value: "none", onValueChange: () => {}, options: [{ value: "none", label: "None" }, { value: "noir", label: "Noir" }] }] } } });
    const trigger = view.getByRole("button", { name: "Presets" });
    expect(trigger.getAttribute("aria-label")).toBe("Presets");
    expect(trigger.getAttribute("title")).toBe("Presets");
    expect(trigger.textContent).not.toContain("Presets");
  });
});
