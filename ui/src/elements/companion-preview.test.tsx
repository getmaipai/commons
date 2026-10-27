import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { CompanionPreview } from "./companion-preview";

afterEach(cleanup);

test("opens on trigger focus and renders optional content only when supplied", async () => {
  const view = render(<CompanionPreview name="Mimi" trigger={<button type="button">Open Mimi</button>} askPlaceholder="Ask Mimi..." onAsk={() => {}} openDelay={0} ready context="You're on Models" lastLine="Hello" action={<button type="button">Review</button>} listeningLine="Listening for a wake word" onTurnOff={() => {}} onMic={() => {}} />);
  fireEvent.focus(view.getByRole("button", { name: "Open Mimi" }));
  await waitFor(() => expect(view.getByText("Listening for a wake word")).toBeTruthy());
  expect(view.getByText("Ready")).toBeTruthy();
  expect(view.getByText("You're on Models")).toBeTruthy();
  expect(view.getByText("Hello")).toBeTruthy();
  expect(view.getByRole("button", { name: "Review" })).toBeTruthy();
  expect(view.queryByRole("status")).toBeNull();
  expect(view.queryByRole("alert")).toBeNull();
  expect(view.container.querySelector("[aria-label*='dot' i]")).toBeNull();
  view.unmount();
  const minimal = render(<CompanionPreview name="Nia" trigger={<button type="button">Open Nia</button>} askPlaceholder="Ask Nia..." onAsk={() => {}} open />);
  expect(minimal.queryByText("Ready")).toBeNull();
  expect(minimal.queryByText("You're on Models")).toBeNull();
  expect(minimal.queryByText("Hello")).toBeNull();
  expect(minimal.queryByRole("button", { name: "Review" })).toBeNull();
  expect(minimal.queryByText("Listening for a wake word")).toBeNull();
});

test("Ask submits text and clears the field", async () => {
  const sent: string[] = [];
  const view = render(<CompanionPreview name="Mimi" trigger={<button type="button">Open Mimi</button>} askPlaceholder="Ask Mimi..." onAsk={(text) => sent.push(text)} open />);
  const input = view.getByRole("textbox", { name: "Ask Mimi" });
  fireEvent.change(input, { target: { value: "  Find my notes  " } });
  fireEvent.submit(input.closest("form")!);
  expect(sent).toEqual(["Find my notes"]);
  await waitFor(() => expect((input as HTMLInputElement).value).toBe(""));
});

test("Turn off calls the supplied handler", () => {
  let count = 0;
  const view = render(<CompanionPreview name="Mimi" trigger={<button type="button">Open Mimi</button>} askPlaceholder="Ask Mimi..." onAsk={() => {}} open listeningLine="Listening" onTurnOff={() => count++} />);
  fireEvent.click(view.getByRole("button", { name: "Turn off" }));
  expect(count).toBe(1);
});
