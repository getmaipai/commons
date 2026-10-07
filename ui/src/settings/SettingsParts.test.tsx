import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { SettingsPage } from "./SettingsPage";
import { SettingsPartsShowcase } from "./SettingsPartsShowcase";
import { SettingsRow } from "./SettingsRow";
import { SettingsSection } from "./SettingsSection";
import { SettingsSelect } from "./SettingsSelect";

afterEach(cleanup);

describe("SettingsRow", () => {
  test("draws label, description and the control slot", () => {
    const view = render(<SettingsRow label="Sounds" description="Plays a sound." control={<button type="button">Go</button>} />);
    expect(view.getByText("Sounds")).toBeTruthy();
    expect(view.getByText("Plays a sound.")).toBeTruthy();
    expect(view.getByRole("button", { name: "Go" })).toBeTruthy();
    expect(view.getByRole("group").getAttribute("aria-describedby")).toBeTruthy();
  });

  test("the disabled note shows only when disabled", () => {
    const off = render(<SettingsRow label="A" disabledNote="Disabled by Dad" />);
    expect(off.queryByText("Disabled by Dad")).toBeNull();
    cleanup();
    const on = render(<SettingsRow label="A" disabled disabledNote="Disabled by Dad" />);
    expect(on.getByText("Disabled by Dad")).toBeTruthy();
    cleanup();
    const noNote = render(<SettingsRow label="A" disabled />);
    expect(noNote.container.querySelector("[data-slot='settings-row-disabled-note']")).toBeNull();
  });

  test("has no reset action", () => {
    const view = render(<SettingsRow label="A" description="d" />);
    expect(view.container.textContent?.toLowerCase()).not.toContain("reset");
    expect(view.queryByRole("button")).toBeNull();
  });
});

describe("SettingsSection", () => {
  test("titles the section and separates rows with 1 px dividers, no shadow", () => {
    const view = render(
      <SettingsSection title="General">
        <SettingsRow label="One" />
        <SettingsRow label="Two" />
      </SettingsSection>,
    );
    expect(view.getByRole("heading", { level: 2 }).textContent).toBe("General");
    expect(view.getByRole("region", { name: "General" })).toBeTruthy();
    const list = view.container.querySelector("section > div")!;
    expect(list.className).toContain("divide-y");
    expect(list.className).toContain("divide-border");
    expect(view.container.innerHTML).not.toContain("shadow");
  });
});

describe("SettingsSelect", () => {
  test("shows the selected option's label and a chevron", () => {
    const view = render(
      <SettingsSelect
        aria-label="Appearance"
        value="dark"
        onValueChange={() => {}}
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
      />,
    );
    const trigger = view.getByRole("combobox", { name: "Appearance" });
    expect(trigger.textContent).toBe("Dark");
    expect(trigger.querySelector("svg")).toBeTruthy();
  });

  test("a disabled select cannot be opened", () => {
    const view = render(
      <SettingsSelect aria-label="A" value="x" disabled onValueChange={() => {}} options={[{ value: "x", label: "X" }]} />,
    );
    expect(view.getByRole("combobox").hasAttribute("disabled")).toBe(true);
  });
});

describe("SettingsPage", () => {
  const sections = [
    { id: "a", title: "Alpha" },
    { id: "b", title: "Beta" },
  ];

  test("lists the sections, marks the active one and reports navigation", () => {
    const onNavigate = mock((_: string) => {});
    const view = render(
      <SettingsPage sections={sections} activeId="a" onNavigate={onNavigate}>
        <p>Body</p>
      </SettingsPage>,
    );
    expect(view.getByRole("button", { name: "Alpha" }).getAttribute("aria-current")).toBe("page");
    expect(view.getByRole("button", { name: "Beta" }).getAttribute("aria-current")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Beta" }));
    expect(onNavigate).toHaveBeenCalledWith("b");
    expect(view.getByText("Body")).toBeTruthy();
  });

  test("the content column is capped at about 720 px", () => {
    const view = render(
      <SettingsPage sections={sections} activeId="a" onNavigate={() => {}}>
        x
      </SettingsPage>,
    );
    expect(view.container.querySelector("[data-slot='settings-page-content']")!.className).toContain("max-w-[720px]");
  });
});

describe("SettingsPartsShowcase", () => {
  test("switches sections and keeps a disabled row's note", () => {
    const view = render(<SettingsPartsShowcase />);
    expect(view.getByText("Disabled by Dad")).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Notifications" }));
    expect(view.getByRole("heading", { level: 2 }).textContent).toBe("Notifications");
    expect(view.container.textContent).not.toContain("—");
  });
});
