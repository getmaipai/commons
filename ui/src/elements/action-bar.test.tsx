import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ActionBar } from "./action-bar";

afterEach(cleanup);

describe("ActionBar", () => {
  test("shows the server's estimate beside the actions and fires them", () => {
    const hits: string[] = [];
    const v = render(<ActionBar estimate="About 45 minutes to render" primary={{ label: "Render film", onSelect: () => hits.push("p") }} secondary={{ label: "Save as draft", onSelect: () => hits.push("s") }} />);
    expect(v.getByText("About 45 minutes to render")).toBeTruthy();
    fireEvent.click(v.getByRole("button", { name: "Render film" }));
    fireEvent.click(v.getByRole("button", { name: "Save as draft" }));
    expect(hits).toEqual(["p", "s"]);
    expect(v.getByRole("region", { name: "Actions" }).getAttribute("data-sticky")).toBe("");
  });
  test("busy shows the busy label and blocks a second press", () => {
    let n = 0;
    const v = render(<ActionBar primary={{ label: "Render film", busy: true, busyLabel: "Starting", onSelect: () => n++ }} />);
    const b = v.getByRole("button", { name: "Starting" }) as HTMLButtonElement;
    expect(b.disabled).toBe(true);
    expect(b.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(b);
    expect(n).toBe(0);
  });
  test("a reason disables the primary action and replaces the estimate", () => {
    const v = render(<ActionBar estimate="About 45 minutes" reason="Add a shot first. A film needs at least one." primary={{ label: "Render film", onSelect: () => {} }} secondary={{ label: "Save as draft", onSelect: () => {} }} />);
    expect((v.getByRole("button", { name: "Render film" }) as HTMLButtonElement).disabled).toBe(true);
    expect(v.getByRole("status").textContent).toContain("Add a shot first");
    expect(v.queryByText("About 45 minutes")).toBeNull();
    expect((v.getByRole("button", { name: "Save as draft" }) as HTMLButtonElement).disabled).toBe(false);
  });
  test("sticky can be turned off", () => {
    const v = render(<ActionBar sticky={false} primary={{ label: "Go", onSelect: () => {} }} />);
    expect(v.getByRole("region").hasAttribute("data-sticky")).toBe(false);
  });
});
