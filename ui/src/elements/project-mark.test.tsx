import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import vocab from "../../../spec/vocab/project-icons.json";
import { iconNames } from "../icons";
import { PROJECT_HUES, PROJECT_ICON_NAMES, ProjectIconPicker, ProjectMark, projectHueVar } from "./project-mark";

afterEach(cleanup);

describe("ProjectMark", () => {
  test("every project icon name is in the kit's icon registry", () => {
    for (const name of PROJECT_ICON_NAMES) expect(iconNames as string[]).toContain(name);
  });

  test("the kit's icon list is exactly the spec's project icon vocabulary", () => {
    expect([...PROJECT_ICON_NAMES] as string[]).toEqual(vocab.icons as string[]);
  });

  test("a hue name draws with its --hue token, neutral with muted-foreground, unknown falls back to neutral", () => {
    for (const hue of PROJECT_HUES) {
      expect(projectHueVar(hue)).toBe(hue === "neutral" ? "var(--muted-foreground)" : `var(--hue-${hue})`);
    }
    expect(projectHueVar("#ff0000")).toBe("var(--muted-foreground)");
    expect(projectHueVar(undefined)).toBe("var(--muted-foreground)");
  });

  test("absent or unknown icon draws the folder and renders an svg", () => {
    const view = render(<ProjectMark icon="not-an-icon" />);
    expect(view.container.querySelector("svg")).not.toBeNull();
    expect((view.container.querySelector("[data-slot=project-mark]") as HTMLElement).dataset.hue).toBe("neutral");
  });
});

describe("ProjectIconPicker", () => {
  test("opens a popover with the colours and icons and reports a pick", async () => {
    const onChange = mock(() => {});
    const view = render(<ProjectIconPicker icon="folder" color="neutral" onChange={onChange} />);
    fireEvent.click(view.getByRole("button", { name: "Choose icon and colour" }));
    fireEvent.click(await view.findByRole("radio", { name: "Violet" }));
    expect(onChange).toHaveBeenCalledWith({ icon: "folder", color: "violet" });
    fireEvent.click(await view.findByRole("radio", { name: "Paw print" }));
    expect(onChange).toHaveBeenCalledWith({ icon: "paw-print", color: "neutral" });
  });
});
