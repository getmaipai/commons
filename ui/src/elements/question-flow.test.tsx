import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { QuestionFlow } from "./question-flow";

afterEach(cleanup);

const steps = [
  { id: "size", question: "How big?", options: [{ id: "s", label: "Small" }, { id: "l", label: "Large" }] },
  { id: "color", question: "Which color?", options: [{ id: "r", label: "Red" }, { id: "g", label: "Green" }] },
];

describe("QuestionFlow", () => {
  test("without onComplete every question is shown at once, read only", () => {
    const view = render(<QuestionFlow steps={steps} />);
    expect(view.getByText("How big?")).toBeTruthy();
    expect(view.getByText("Which color?")).toBeTruthy();
    expect(view.queryByRole("button")).toBeNull();
  });

  test("steps advance, Back returns with the answer kept, and the last step completes into a receipt", async () => {
    const done: Record<string, string[]>[] = [];
    const view = render(
      <QuestionFlow
        steps={steps}
        onComplete={(answers) => void done.push(answers)}
        progressLabel={(n, total) => `Step ${n} of ${total}`}
        backLabel="Previous"
        completeLabel="Send"
      />,
    );
    expect(view.getByText("Step 1 of 2")).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: /Large/ }));
    await waitFor(() => expect(view.getByText("Which color?")).toBeTruthy());
    expect(view.getByText("Step 2 of 2")).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Previous" }));
    await waitFor(() => expect(view.getByText("How big?")).toBeTruthy());
    fireEvent.click(view.getByRole("button", { name: /Large/ }));
    await waitFor(() => expect(view.getByText("Which color?")).toBeTruthy());
    fireEvent.click(view.getByRole("button", { name: /Green/ }));
    await waitFor(() => expect(view.container.querySelector("[data-state='receipt']")).toBeTruthy());
    expect(done).toEqual([{ size: ["l"], color: ["g"] }]);
    expect(view.getByText("Large")).toBeTruthy();
    expect(view.getByText("Green")).toBeTruthy();
  });

  test("a given choice renders only the receipt", () => {
    const view = render(<QuestionFlow steps={steps} choice={{ size: ["s"] }} />);
    expect(view.getByText("Small")).toBeTruthy();
    expect(view.queryByText("Which color?")).toBeNull();
  });
});
