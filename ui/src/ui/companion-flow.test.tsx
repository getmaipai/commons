// KIT-3S-01: the three companion screens draw from shipped kit parts and their
// additive variants, with no className on any kit part and no fixed colour.
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { useState } from "react";
import { CharacterTile } from "@/kit/primitives/CharacterTile";
import { Progress } from "@/kit/primitives/Progress";
import { Button, buttonVariants } from "./button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogSection, DialogTitle } from "./dialog";
import { Input } from "./input";
import { Select, SelectTrigger, SelectValue } from "./select";
import { Textarea } from "./textarea";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";
import { toggleVariants } from "./toggle";
import { GenerationStage } from "../elements/generation-stage";
import { CompanionStage } from "../elements/companion-stage";
import { AnimateCharacterShowcase, CreateCharacterShowcase, CustomizeCompanionShowcase } from "./CompanionFlowShowcase";

afterEach(cleanup);
const cls = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

describe("Button shape", () => {
  test("default adds nothing; pill rounds every variant", () => {
    expect(buttonVariants({ shape: "default" })).toBe(buttonVariants({}));
    expect(buttonVariants({ variant: "outline", shape: "pill" }).split(/\s+/)).toContain("rounded-full");
    const el = render(<Button variant="secondary" shape="pill">Back</Button>).getByRole("button");
    expect(cls(el)).toContain("rounded-full");
    expect(cls(el)).not.toContain("rounded-md");
  });
});

describe("pill fields", () => {
  test("Input, Textarea and SelectTrigger take a shape and keep their default without it", () => {
    const view = render(<><Input aria-label="a" /><Input aria-label="b" shape="pill" /><Textarea aria-label="c" shape="rounded" /><Textarea aria-label="d" />
      <Select><SelectTrigger aria-label="e" shape="pill"><SelectValue /></SelectTrigger></Select></>);
    expect(cls(view.getByLabelText("a"))).toContain("rounded-md");
    expect(view.getByLabelText("a").getAttribute("data-shape")).toBeNull();
    expect(cls(view.getByLabelText("b"))).toContain("rounded-full");
    expect(cls(view.getByLabelText("b"))).not.toContain("rounded-md");
    expect(cls(view.getByLabelText("c"))).toContain("rounded-2xl");
    expect(cls(view.getByLabelText("d"))).toContain("rounded-lg");
    expect(cls(view.getByLabelText("e"))).toContain("rounded-full");
  });
});

describe("ToggleGroup segmented and chip", () => {
  test("segmented draws a muted pill track, fills the row and selects one", () => {
    const view = render(<ToggleGroup type="single" variant="segmented" fill defaultValue="a" aria-label="mode"><ToggleGroupItem value="a">Describe</ToggleGroupItem><ToggleGroupItem value="b">Upload Photo</ToggleGroupItem></ToggleGroup>);
    const group = view.container.querySelector("[data-slot=toggle-group]");
    expect(cls(group)).toContain("rounded-full");
    expect(cls(group)).toContain("bg-muted");
    expect(cls(group)).toContain("w-full");
    const [a, b] = view.getAllByRole("radio") as [HTMLElement, HTMLElement];
    expect(cls(a)).toContain("flex-1");
    expect(cls(a)).toContain("rounded-full");
    expect(cls(a)).not.toContain("data-[spacing=0]:rounded-none");
    expect(a.getAttribute("data-state")).toBe("on");
    fireEvent.click(b);
    expect(b.getAttribute("data-state")).toBe("on");
    expect(a.getAttribute("data-state")).toBe("off");
  });

  test("chip wraps, has a gap, and the selected chip uses the text colour as fill", () => {
    const view = render(<ToggleGroup type="single" variant="chip" wrap defaultValue="Warm" aria-label="traits"><ToggleGroupItem value="Warm">Warm</ToggleGroupItem><ToggleGroupItem value="Calm">Calm</ToggleGroupItem></ToggleGroup>);
    const group = view.container.querySelector("[data-slot=toggle-group]");
    expect(cls(group)).toContain("flex-wrap");
    expect(group?.getAttribute("data-spacing")).toBe("2");
    expect(toggleVariants({ variant: "chip" })).toContain("data-[state=on]:bg-foreground");
    expect(toggleVariants({ variant: "chip" })).toContain("data-[state=on]:text-background");
    expect(cls(view.getAllByRole("radio")[0] ?? null)).toContain("rounded-full");
  });

  test("a group without the new props is unchanged", () => {
    const view = render(<ToggleGroup type="single" aria-label="old"><ToggleGroupItem value="a">A</ToggleGroupItem></ToggleGroup>);
    const group = view.container.querySelector("[data-slot=toggle-group]");
    expect(cls(group)).not.toContain("flex-wrap");
    expect(cls(group)).not.toContain("w-full");
    expect(group?.getAttribute("data-spacing")).toBe("0");
    expect(cls(view.getAllByRole("radio")[0] ?? null)).toContain("data-[spacing=0]:rounded-none");
  });
});

describe("segmented Progress", () => {
  test("solid tone fills every reached segment the same; default dims the earlier ones", () => {
    const solid = render(<Progress mode="determinate" value={(2 / 3) * 100} segments={3} tone="solid" size="md" label="Step 2 of 3" />);
    const segs = Array.from(solid.container.querySelectorAll("[data-segment]"));
    expect(segs.map((s) => s.getAttribute("data-segment"))).toEqual(["done", "current", "todo"]);
    expect(cls(segs[0] ?? null)).toContain("data-[segment=done]:bg-primary");
    expect(cls(segs[0] ?? null)).toContain("h-1.5");
    expect(solid.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("2");
    cleanup();
    const plain = render(<Progress mode="determinate" value={50} segments={2} label="x" />);
    expect(cls(plain.container.querySelector("[data-segment]"))).toContain("data-[segment=done]:bg-primary/50");
  });
});

describe("Dialog flow variant", () => {
  test("fills the phone screen, is a rounded card from sm up, with a large title, body, section and between footer", () => {
    render(<Dialog open><DialogContent variant="flow"><DialogTitle size="xl">Create Character</DialogTitle>
      <DialogBody columns="two"><DialogSection title="Required" aside="0 of 4"><span>x</span></DialogSection></DialogBody>
      <DialogFooter align="between"><Button>Back</Button><Button>Next</Button></DialogFooter></DialogContent></Dialog>);
    const content = document.body.querySelector("[data-slot=dialog-content]");
    for (const c of ["h-dvh", "w-screen", "max-w-none", "rounded-none", "sm:max-w-5xl", "sm:rounded-3xl", "bg-background"]) expect(cls(content)).toContain(c);
    expect(cls(document.body.querySelector("[data-slot=dialog-title]"))).toContain("text-3xl");
    expect(cls(document.body.querySelector("[data-slot=dialog-body]"))).toContain("lg:grid-cols-2");
    expect(document.body.querySelector("[data-slot=dialog-section-aside]")?.textContent).toBe("0 of 4");
    expect(cls(document.body.querySelector("[data-slot=dialog-footer]"))).toContain("justify-between");
    expect(cls(document.body.querySelector("[data-slot=dialog-close]"))).toContain("sm:top-6");
  });

  test("the default dialog is unchanged", () => {
    render(<Dialog open><DialogContent><DialogTitle>Plain</DialogTitle><DialogFooter><Button>OK</Button></DialogFooter></DialogContent></Dialog>);
    const content = document.body.querySelector("[data-slot=dialog-content]");
    expect(cls(content)).toContain("sm:max-w-lg");
    expect(cls(content)).not.toContain("h-dvh");
    expect(cls(document.body.querySelector("[data-slot=dialog-title]"))).toContain("text-lg");
    expect(cls(document.body.querySelector("[data-slot=dialog-footer]"))).toContain("sm:justify-end");
  });
});

describe("CharacterTile picture and animation", () => {
  test("picture tile: selected is framed with a bold label, unselected is not", () => {
    const view = render(<><CharacterTile variant="picture" name="Cartoon" selected media={<span>img</span>} /><CharacterTile variant="picture" name="Anime" media={<span>img</span>} /></>);
    const [on, off] = view.getAllByRole("button") as [HTMLElement, HTMLElement];
    expect(on.getAttribute("aria-pressed")).toBe("true");
    expect(cls(on)).toContain("border-2");
    expect(cls(on)).toContain("border-foreground");
    expect(cls(on.querySelector(":scope > span:last-child") ?? null)).toContain("font-bold");
    expect(cls(off)).not.toContain("border-foreground");
    expect(cls(off.querySelector(":scope > span:last-child") ?? null)).not.toContain("font-bold");
  });

  test("animation tile: locked draws a lock and no checkbox; unlocked with a handler draws a working checkbox; selecting plays", () => {
    let played = 0;
    const seen: boolean[] = [];
    function Tiles() {
      const [on, setOn] = useState(false);
      return <><CharacterTile variant="animation" name="Idle" locked media={<span>still</span>} onSelect={() => played++} />
        <CharacterTile variant="animation" name="Sad" media={<span>still</span>} checked={on} onCheckedChange={(v) => { seen.push(v); setOn(v); }} /></>;
    }
    const view = render(<Tiles />);
    expect(view.getByRole("img", { name: "Required" })).toBeTruthy();
    expect(view.queryByRole("checkbox", { name: "Select Idle" })).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Idle" }));
    expect(played).toBe(1);
    const box = view.getByRole("checkbox", { name: "Select Sad" });
    fireEvent.click(box);
    expect(seen).toEqual([true]);
    expect(box.getAttribute("aria-checked")).toBe("true");
    expect(box.parentElement?.closest("button")).toBeNull();
  });

  test("the round default tile is unchanged", () => {
    const view = render(<CharacterTile name="Marlow" />);
    expect(cls(view.getByRole("button").querySelector("span"))).toContain("rounded-full");
  });
});

describe("GenerationStage and CompanionStage panels", () => {
  test("GenerationStage panel is a large rounded panel with a caption; card is unchanged", () => {
    const panel = render(<GenerationStage generating={false} shape="panel" caption="Idle" />);
    const stage = panel.container.querySelector("[data-slot=generation-stage]");
    expect(cls(stage)).toContain("rounded-3xl");
    expect(stage?.getAttribute("data-shape")).toBe("panel");
    expect(panel.container.querySelector("[data-slot=generation-caption]")?.textContent).toBe("Idle");
    cleanup();
    const card = render(<GenerationStage generating={false} />);
    const plain = card.container.querySelector("[data-slot=generation-stage]");
    expect(cls(plain)).toContain("rounded-2xl");
    expect(card.container.querySelector("[data-slot=generation-caption]")).toBeNull();
  });

  test("CompanionStage panel frames the stage and draws pill actions, the primary one filled", () => {
    const view = render(<CompanionStage surface="panel" name="Sage" mode="idle" character={<span>pic</span>} talk={null}
      actions={[{ id: "t", label: "Test Conversation", onSelect: () => {} }, { id: "s", label: "Save Companion", primary: true, onSelect: () => {} }]} />);
    const section = view.container.querySelector("[data-slot=companion-stage]");
    expect(cls(section)).toContain("rounded-3xl");
    const [test, save] = view.getAllByRole("button") as [HTMLElement, HTMLElement];
    expect(test.getAttribute("data-variant")).toBe("outline");
    expect(save.getAttribute("data-variant")).toBe("default");
    expect(cls(test)).toContain("rounded-full");
    expect(cls(test)).toContain("justify-center");
    cleanup();
    const plain = render(<CompanionStage name="Sage" mode="idle" character={<span>pic</span>} talk={null} actions={[{ id: "t", label: "Go", onSelect: () => {} }]} />);
    expect(cls(plain.getByRole("button"))).toContain("justify-start");
    expect(plain.container.querySelector("[data-slot=companion-stage]")?.getAttribute("data-surface")).toBeNull();
  });
});

describe("the three screens draw with no className on a kit part", () => {
  test("each screen renders its mockup regions", () => {
    render(<CreateCharacterShowcase />);
    expect(document.body.textContent).toContain("Step 1 of 3");
    expect(document.body.querySelectorAll("[data-segment]").length).toBe(3);
    expect(document.body.querySelectorAll("[data-slot=character-tile][data-variant=picture]").length).toBe(6);
    cleanup();
    render(<AnimateCharacterShowcase />);
    expect(document.body.querySelectorAll("[data-variant=animation]").length).toBe(13);
    expect(document.body.querySelectorAll("[role=img][aria-label=Required]").length).toBe(4);
    expect(document.body.querySelectorAll("[role=checkbox]").length).toBe(9);
    cleanup();
    render(<CustomizeCompanionShowcase />);
    expect(document.body.querySelectorAll("[data-slot=dialog-section]").length).toBe(4);
    expect(document.body.querySelector("[data-surface=panel]")).not.toBeNull();
  });

  test("the showcase puts className only on plain layout wrappers, never on a kit component", () => {
    const source = readFileSync(new URL("./CompanionFlowShowcase.tsx", import.meta.url), "utf8");
    const kit = /<(Button|Dialog\w*|Input|Textarea|Select\w*|ToggleGroup\w*|CharacterTile|Progress|GenerationStage|CompanionStage)\b[^>]*\bclassName=/;
    expect(source.match(kit)).toBeNull();
  });
});
