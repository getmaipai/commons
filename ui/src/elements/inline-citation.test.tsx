import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { Citation } from "./inline-citation";

afterEach(cleanup);

function Harness({ href }: { href?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p>
        Frogs live near ponds
        <Citation index={0} source={{ domain: "example.com", title: "All about frogs", detail: "CC BY-SA", href }} open={open} onOpenChange={setOpen} />
      </p>
      <button type="button">elsewhere</button>
    </div>
  );
}

const tap = (el: Element) => {
  fireEvent.pointerDown(el, { pointerType: "touch" });
  fireEvent.click(el);
};

describe("Citation on a touch screen", () => {
  test("a tap on a chip without a link opens the excerpt, a second tap closes it", async () => {
    const view = render(<Harness />);
    const chip = view.getByRole("button", { name: "1" });
    tap(chip);
    expect(await view.findByText("All about frogs")).toBeTruthy();
    tap(chip);
    await waitFor(() => expect(view.queryByText("All about frogs")).toBeNull());
  });

  test("a tap elsewhere closes it", async () => {
    const view = render(<Harness />);
    tap(view.getByRole("button", { name: "1" }));
    expect(await view.findByText("All about frogs")).toBeTruthy();
    fireEvent.pointerDown(view.getByRole("button", { name: "elsewhere" }), { pointerType: "touch" });
    await waitFor(() => expect(view.queryByText("All about frogs")).toBeNull());
  });

  test("a chip with a link stays a link and a tap does not open the card", () => {
    const view = render(<Harness href="https://example.com/frogs" />);
    const chip = view.getByRole("link", { name: "1" });
    expect(chip.getAttribute("href")).toBe("https://example.com/frogs");
    tap(chip);
    expect(view.queryByText("All about frogs")).toBeNull();
  });

  test("a keyboard activation after a touch tap does not toggle the card", async () => {
    const view = render(<Harness />);
    const chip = view.getByRole("button", { name: "1" });
    tap(chip);
    expect(await view.findByText("All about frogs")).toBeTruthy();
    fireEvent.click(chip); // no pointerdown: a keyboard press
    expect(view.queryByText("All about frogs")).toBeTruthy();
  });
});
