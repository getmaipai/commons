import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, test } from "bun:test";
import { HubCard } from "@/kit/blocks/dashboard/components/HubCard";

afterEach(cleanup);

test("HubCard shows the name, subtitle and status label, and fires onClick", () => {
  let clicked = false;
  render(<HubCard name="Jesses-MBP" subtitle="macOS 27" status="ok" statusLabel="All systems healthy" onClick={() => { clicked = true; }} />);
  expect(document.body.textContent).toContain("Jesses-MBP");
  expect(document.body.textContent).toContain("macOS 27");
  expect(document.body.textContent).toContain("All systems healthy");
  fireEvent.click(document.querySelector("button")!);
  expect(clicked).toBe(true);
});

test("HubCard collapses to its status dot alone", () => {
  render(<HubCard collapsed name="Jesses-MBP" subtitle="macOS 27" status="warning" statusLabel="2 repairs open" onClick={() => {}} />);
  expect(document.body.textContent).not.toContain("Jesses-MBP");
  expect(document.querySelector('button[aria-label="Jesses-MBP: 2 repairs open"]')).toBeTruthy();
});
