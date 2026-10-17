import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import * as React from "react";
import { PasscodeInput } from "./passcode-input";

afterEach(cleanup);

function Harness({ digits, onComplete, invalid, disabled }: { digits: number; onComplete?: (v: string) => void; invalid?: boolean; disabled?: boolean }) {
  const [value, setValue] = React.useState("");
  return <PasscodeInput digits={digits} value={value} onChange={setValue} onComplete={onComplete} invalid={invalid} disabled={disabled} />;
}

describe("PasscodeInput", () => {
  test.each([4, 6])("draws exactly %i boxes in one labelled group", (n) => {
    const view = render(<Harness digits={n} />);
    expect(view.container.querySelectorAll('[data-slot="passcode-input-slot"]').length).toBe(n);
    expect(view.getByRole("group").getAttribute("aria-label")).toBe(`Enter your ${n}-digit passcode`);
    expect(view.getAllByRole("img")[2]?.getAttribute("aria-label")).toBe(`Digit 3 of ${n}, empty`);
  });

  test("one real numeric input, autocomplete off, maxLength = digits", () => {
    const input = render(<Harness digits={6} />).container.querySelector("input")!;
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.getAttribute("autocomplete")).toBe("off");
    expect(input.maxLength).toBe(6);
  });

  test("typing shows dots not digits; onComplete fires once at the last digit", () => {
    const done = mock((_v: string) => {});
    const view = render(<Harness digits={4} onComplete={done} />);
    const input = view.container.querySelector("input")!;
    fireEvent.change(input, { target: { value: "123" } });
    expect(view.container.querySelectorAll('[data-slot="passcode-input-dot"]').length).toBe(3);
    expect(view.container.textContent).not.toContain("1");
    expect(done).toHaveBeenCalledTimes(0);
    fireEvent.change(input, { target: { value: "1234" } });
    expect(done).toHaveBeenCalledTimes(1);
    expect(done.mock.calls[0]?.[0]).toBe("1234");
  });

  test("a pasted full code fills every box", () => {
    const view = render(<Harness digits={6} />);
    fireEvent.change(view.container.querySelector("input")!, { target: { value: "987654" } });
    expect(view.container.querySelectorAll('[data-slot="passcode-input-dot"]').length).toBe(6);
  });

  test("masked=false shows the digits", () => {
    const view = render(<PasscodeInput digits={4} value="12" onChange={() => {}} masked={false} />);
    expect(view.container.textContent).toContain("12");
  });

  test("invalid marks every box and the group shakes only under motion-safe", () => {
    const view = render(<Harness digits={4} invalid />);
    const slots = view.container.querySelectorAll('[data-slot="passcode-input-slot"]');
    slots.forEach((s) => expect(s.getAttribute("data-invalid")).toBe("true"));
    const group = view.getByRole("group");
    expect(group.getAttribute("data-shaking")).toBe("true");
    expect(group.className).toContain("motion-safe:animate-[passcode-shake");
    fireEvent.animationEnd(group);
    expect(group.getAttribute("data-shaking")).toBeNull();
  });

  test("disabled disables the real input", () => {
    expect(render(<Harness digits={4} disabled />).container.querySelector("input")!.disabled).toBe(true);
  });
});
