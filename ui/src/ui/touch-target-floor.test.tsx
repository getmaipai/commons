// Regression coverage for the 48px touch-target / 16px type floor
// (docs/UI.md) that ui-v0.1.0 shipped without, on the primitives ported
// from Stack's kit rather than Home's already-hardened copies. The
// rendered-geometry proof lives in Home's scripts/screenshot.ts gate,
// which measures the real thing on a page; these are class-level
// assertions that guard against the fix being reverted.
import { describe, expect, test, afterEach } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Button } from "@/kit/ui/button";
import { Input } from "@/kit/ui/input";
import { Checkbox } from "@/kit/ui/checkbox";
import { Toggle } from "@/kit/ui/toggle";
import { Label } from "@/kit/ui/label";
import { Table, TableBody, TableCell, TableRow } from "@/kit/ui/table";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem } from "@/kit/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger } from "@/kit/ui/tabs";
import { Select, SelectTrigger, SelectValue } from "@/kit/ui/select";
import { Command, CommandDialog, CommandInput, CommandItem } from "@/kit/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/kit/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/kit/ui/toggle-group";

afterEach(cleanup);

describe("touch-target and type floor (docs/UI.md)", () => {
  test("Button's default, lg and icon sizes clear 48px directly", () => {
    const byDefault = render(<Button>Save</Button>);
    expect(byDefault.getByRole("button").className).toContain("h-12");
    expect(byDefault.getByRole("button").className).toContain("text-base");
    cleanup();

    const byLg = render(<Button size="lg">Save</Button>);
    expect(byLg.getByRole("button").className).toContain("h-14");
    cleanup();

    const byIcon = render(<Button size="icon" aria-label="x" />);
    expect(byIcon.getByRole("button").className).toContain("size-12");
  });

  test("Button's compact sizes keep a 48px hit area via a pseudo-element", () => {
    const { getByRole } = render(<Button size="sm">Save</Button>);
    const el = getByRole("button");
    expect(el.className).toContain("relative");
    expect(el.className).toMatch(/before:-inset-/);
  });

  test("Input is 48px tall with no desktop demotion of its text size", () => {
    const { getByRole } = render(<Input placeholder="Name" />);
    const el = getByRole("textbox");
    expect(el.className).toContain("h-12");
    expect(el.className).toContain("text-base");
    expect(el.className).not.toMatch(/md:text-sm/);
  });

  test("Checkbox's tap area is stretched past its 16px visual box", () => {
    const { getByRole } = render(<Checkbox />);
    const el = getByRole("checkbox");
    expect(el.className).toContain("relative");
    expect(el.className).toContain("after:-inset-4");
  });

  test("Toggle's default size clears 48px; sm/lg keep a pseudo-element hit area", () => {
    const byDefault = render(<Toggle aria-label="bold" />);
    expect(byDefault.getByRole("button").className).toContain("h-12");
    expect(byDefault.getByRole("button").className).toContain("text-base");
    cleanup();

    const bySm = render(<Toggle size="sm" aria-label="bold" />);
    expect(bySm.getByRole("button").className).toMatch(/before:-inset-/);
  });

  test("Label reads at the 16px body-text floor", () => {
    const { getByText } = render(<Label>Household name</Label>);
    expect(getByText("Household name").className).toContain("text-base");
  });

  test("Table's cell text reads at the 16px body-text floor", () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Row</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(container.querySelector("table")?.className).toContain("text-base");
  });

  test("Breadcrumb's trail reads at the 16px body-text floor", () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>Home</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(container.querySelector("ol")?.className).toContain("text-base");
  });

  test("TabsTrigger extends its hit area past the painted tab", () => {
    const { getByRole } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(getByRole("tab").className).toMatch(/before:-inset-y-3\.5/);
  });

  test("SelectTrigger's default size is 48px with 16px text", () => {
    const { getByRole } = render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
      </Select>,
    );
    const el = getByRole("combobox");
    expect(el.className).toContain("text-base");
    expect(el.className).toMatch(/data-\[size=default\]:h-12/);
  });

  test("Command's search box and items read at the type floor", () => {
    const { getByRole, container } = render(
      <Command>
        <CommandInput placeholder="Search" />
        <CommandItem>Result</CommandItem>
      </Command>,
    );
    expect(getByRole("combobox").className).toContain("text-base");
    expect(getByRole("option").className).toContain("min-h-12");
    expect(getByRole("option").className).toContain("text-base");
    // The wrapper is 49px, not an even 48px: its own border-b would
    // otherwise eat 1px off the input's own `h-full`, landing the real
    // tappable element (not just this wrapper) under the floor.
    expect(container.querySelector('[data-slot="command-input-wrapper"]')?.className).toContain("h-[49px]");
  });

  test("CommandDialog's own Command doesn't reintroduce a competing height on the input wrapper", () => {
    // A code review caught CommandDialog's own <Command> still carrying
    // a `**:data-[slot=command-input-wrapper]:h-12` override that fought
    // CommandInput's base h-[49px] fix at equal specificity - exercising
    // CommandDialog itself (nothing did before) so this can't slip back.
    render(
      <CommandDialog open title="Search" description="Search for a command to run">
        <CommandInput placeholder="Search" />
        <CommandItem>Result</CommandItem>
      </CommandDialog>,
    );
    // CommandDialog renders through a Dialog portal, outside this
    // render's own container - document.body is where Radix mounts it.
    const wrapper = document.body.querySelector('[data-slot="command-input-wrapper"]');
    expect(wrapper?.className).toContain("h-[49px]");
    expect(wrapper?.className).not.toContain("h-12");
  });

  test("DropdownMenuItem clears the floor, not just DropdownMenuLabel", () => {
    // A first pass fixed only the label and left every real menu row at
    // text-sm with no min-height; a code review caught it.
    const { getByRole } = render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const el = getByRole("menuitem");
    expect(el.className).toContain("min-h-12");
    expect(el.className).toContain("text-base");
  });

  test("ToggleGroupItem's compact sizes cancel the hit-area extension to avoid overlapping the next item", () => {
    // ToggleGroup's own default spacing is 0 (edge-to-edge); an inherited
    // all-sides pseudo-element there would reach into the next item.
    const { getByRole } = render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="a" size="sm">A</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(getByRole("radio").className).toContain("before:content-none");
  });
});
