import { afterEach, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { FeedbackDialog } from "./feedback-dialog";

afterEach(cleanup);

const base = { reasons: ["Wrong", "Too long"], selected: [] as string[], note: "", sent: false };

test("a Cancel button calls onCancel and never onSubmit", () => {
  const onCancel = mock(() => {});
  const onSubmit = mock(() => {});
  const view = render(<FeedbackDialog {...base} onSubmit={onSubmit} onCancel={onCancel} />);
  fireEvent.click(view.getByRole("button", { name: "Cancel" }));
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onSubmit).not.toHaveBeenCalled();
});

test("Escape inside the dialog calls onCancel", () => {
  const onCancel = mock(() => {});
  const view = render(<FeedbackDialog {...base} onSubmit={() => {}} onCancel={onCancel} />);
  fireEvent.keyDown(view.getByLabelText("Anything else?"), { key: "Escape" });
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("a press outside calls onCancel, a press inside does not", () => {
  const onCancel = mock(() => {});
  const view = render(<FeedbackDialog {...base} onSubmit={() => {}} onCancel={onCancel} />);
  fireEvent.pointerDown(view.getByLabelText("Anything else?"));
  expect(onCancel).not.toHaveBeenCalled();
  fireEvent.pointerDown(document.body);
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("without onCancel there is no Cancel button and Escape does nothing", () => {
  const view = render(<FeedbackDialog {...base} onSubmit={() => {}} />);
  expect(view.queryByRole("button", { name: "Cancel" })).toBeNull();
  fireEvent.keyDown(view.getByLabelText("Anything else?"), { key: "Escape" });
  fireEvent.pointerDown(document.body);
});

test("once sent, the thanks line has no Cancel and an outside press does not call onCancel", () => {
  const onCancel = mock(() => {});
  const view = render(<FeedbackDialog {...base} sent onCancel={onCancel} />);
  expect(view.queryByRole("button", { name: "Cancel" })).toBeNull();
  fireEvent.pointerDown(document.body);
  expect(onCancel).not.toHaveBeenCalled();
});
