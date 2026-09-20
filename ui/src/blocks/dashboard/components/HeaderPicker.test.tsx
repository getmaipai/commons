import { describe, expect, test, afterEach, mock } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { HeaderPicker } from "./HeaderPicker";

afterEach(cleanup);

// Radix's DropdownMenuTrigger opens on pointerdown, not a plain click;
// happy-dom's click alone leaves it closed (aria-expanded stays false).
function openMenu(trigger: HTMLElement): void {
  act(() => {
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerId: 1 });
    fireEvent.click(trigger);
  });
}

describe("HeaderPicker", () => {
  test("shows the current item's label in the trigger", () => {
    const { getByRole } = render(
      <HeaderPicker
        triggerIcon="monitor"
        triggerLabel="Machine"
        current={{ id: "this", label: "This computer" }}
        actions={[]}
      />,
    );
    expect(getByRole("button", { name: /This computer/ })).toBeInTheDocument();
  });

  test("opening the menu shows the current item's sublabel and every action", () => {
    const onSelect = mock(() => {});
    const { getByRole, getByText } = render(
      <HeaderPicker
        triggerIcon="monitor"
        triggerLabel="Machine"
        current={{ id: "this", label: "This computer", sublabel: "All systems healthy" }}
        actions={[{ id: "settings", label: "Settings", icon: "settings", onSelect }]}
      />,
    );
    openMenu(getByRole("button", { name: /This computer/ }));
    expect(getByText("All systems healthy")).toBeInTheDocument();
    fireEvent.click(getByText("Settings"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test("renders no switch section when otherItems is empty", () => {
    const { getByRole, queryByText } = render(
      <HeaderPicker triggerIcon="monitor" triggerLabel="Machine" current={{ id: "this", label: "This computer" }} actions={[]} />,
    );
    openMenu(getByRole("button", { name: /This computer/ }));
    expect(queryByText("Switch")).not.toBeInTheDocument();
  });

  test("lists other items and calls onSelectOther with the chosen id", () => {
    const onSelectOther = mock((_id: string) => {});
    const { getByRole, getByText } = render(
      <HeaderPicker
        triggerIcon="monitor"
        triggerLabel="Machine"
        current={{ id: "this", label: "This computer" }}
        otherItems={[{ id: "other-1", label: "Other machine" }]}
        onSelectOther={onSelectOther}
        actions={[]}
      />,
    );
    openMenu(getByRole("button", { name: /This computer/ }));
    fireEvent.click(getByText("Other machine"));
    expect(onSelectOther).toHaveBeenCalledWith("other-1");
  });
});
