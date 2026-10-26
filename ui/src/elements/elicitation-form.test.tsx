import { afterEach, describe, expect, test, mock } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { ElicitationForm, type AskField } from "./elicitation-form";

afterEach(cleanup);

const fields: AskField[] = [
  { name: "title", label: "Title", kind: "text", required: true, placeholder: "A title", max_length: 500 },
  { name: "count", label: "Count", kind: "number", required: true, min: 1, max: 8 },
  { name: "when", label: "When", kind: "date_time", required: false, inputType: "time" },
  { name: "color", label: "Color", kind: "choice", required: false, options: ["Amber", "Blue"] },
  { name: "notify", label: "Notify", kind: "yes_no", required: true },
];

describe("ElicitationForm", () => {
  test("renders each typed field with its shipped control", () => {
    const view = render(<ElicitationForm server="Reminder" message="A few details" fields={fields} state="request" onSubmit={() => {}} />);
    expect(view.getByPlaceholderText("A title")).toBeTruthy();
    expect((view.container.querySelector("#elicitation-count") as HTMLInputElement).getAttribute("type")).toBe("number");
    expect((view.container.querySelector("#elicitation-when") as HTMLInputElement).getAttribute("type")).toBe("time");
    expect(view.getByText("Amber")).toBeTruthy();
    expect(view.getByText("Yes")).toBeTruthy();
    expect(view.getByRole("button", { name: "Submit" })).toBeTruthy();
  });

  test("keeps submit disabled until required fields are populated and reports validation", async () => {
    const onSubmit = mock(() => {});
    const view = render(<ElicitationForm server="Reminder" message="Details" fields={fields} state="request" onSubmit={onSubmit} />);
    const submit = view.getByRole("button", { name: "Submit" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(view.getByPlaceholderText("A title"), { target: { value: "Call" } });
    fireEvent.change(view.container.querySelector("#elicitation-count") as HTMLInputElement, { target: { value: "0" } });
    fireEvent.click(view.getByRole("button", { name: /Yes/ }));
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    expect(await view.findByText("Enter a number at least 1.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("submits typed values and shows route errors and submitting state", async () => {
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = mock((values: Record<string, string | number | boolean>) => {
      expect(values).toEqual({ title: "Call", count: 3, when: "09:30", notify: true });
      return new Promise<void>((resolve) => { resolveSubmit = resolve; });
    });
    const view = render(<ElicitationForm server="Reminder" message="Details" fields={fields} state="request" onSubmit={onSubmit} error="Please try again." />);
    fireEvent.change(view.getByPlaceholderText("A title"), { target: { value: "Call" } });
    fireEvent.change(view.container.querySelector("#elicitation-count") as HTMLInputElement, { target: { value: "3" } });
    fireEvent.change(view.container.querySelector("#elicitation-when") as HTMLInputElement, { target: { value: "09:30" } });
    fireEvent.click(view.getByRole("button", { name: /Yes/ }));
    fireEvent.click(view.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(view.getByRole("button", { name: "Submitting…" })).toBeTruthy();
    expect(view.getByText("Please try again.")).toBeTruthy();
    resolveSubmit?.();
    await waitFor(() => expect(view.getByRole("button", { name: "Submit" })).toBeTruthy());
  });

  test("renders accepted and declined states", () => {
    const accepted = render(<ElicitationForm server="Reminder" message="Done" fields={[]} state="accepted" />);
    expect(accepted.getByText("Sent to Reminder")).toBeTruthy();
    accepted.unmount();
    const declined = render(<ElicitationForm server="Reminder" message="Done" fields={[]} state="declined" />);
    expect(declined.getByText("Declined")).toBeTruthy();
  });

  test("date_time date presentation uses the shipped single date calendar", () => {
    const view = render(<ElicitationForm server="Reminder" message="Choose a date" fields={[{ name: "date", label: "Date", kind: "date_time", required: false, inputType: "date" }]} state="request" />);
    expect(view.container.querySelector('[data-slot="calendar"]')).toBeTruthy();
  });
});
