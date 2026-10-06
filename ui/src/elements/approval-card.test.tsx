import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ApprovalCard } from "./approval-card";

afterEach(cleanup);

describe("ApprovalCard", () => {
  test("unset optional props keep today's card: terminal glyph, command box, the card's own words", () => {
    const view = render(
      <ApprovalCard
        state="done"
        command="rm -rf build"
        title="Run a command"
        subtitle="In the project folder"
      />,
    );
    expect(view.getByText("rm -rf build")).toBeTruthy();
    expect(view.getByText("Finished with exit 0")).toBeTruthy();
    expect(view.container.querySelector("svg.lucide-terminal")).toBeTruthy();
  });

  test("a request offers Deny, Always allow and Allow once only for the handlers given", () => {
    const calls: string[] = [];
    const view = render(
      <ApprovalCard
        state="request"
        title="Go ahead?"
        subtitle="Nothing happens until you choose."
        onAllowOnce={() => calls.push("once")}
        onDeny={() => calls.push("deny")}
      />,
    );
    expect(view.queryByRole("button", { name: "Always allow" })).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Allow once" }));
    fireEvent.click(view.getByRole("button", { name: "Deny" }));
    expect(calls).toEqual(["once", "deny"]);
  });

  test("without a command no monospace box is drawn, and a custom icon replaces the terminal glyph", () => {
    const view = render(
      <ApprovalCard
        state="request"
        title="Go ahead?"
        subtitle="Detail"
        icon={<span data-testid="ask-icon" />}
        onAllowOnce={() => {}}
      />,
    );
    expect(view.container.querySelector(".font-mono")).toBeNull();
    expect(view.getByTestId("ask-icon")).toBeTruthy();
    expect(view.container.querySelector("svg.lucide-terminal")).toBeNull();
  });

  test("a request with no handlers draws no empty button row", () => {
    const view = render(
      <ApprovalCard
        state="request"
        title="Go ahead?"
        subtitle="Asked a parent"
      />,
    );
    expect(view.queryAllByRole("button")).toHaveLength(0);
    expect(view.container.querySelector(".justify-end")).toBeNull();
  });

  test("statusLabels word the settled states, and allowHint renders inside Allow once", () => {
    const labels = {
      running: "Approved, working on it",
      done: "Done",
      denied: "You said no",
    };
    for (const [state, text] of [
      ["running", labels.running],
      ["done", labels.done],
      ["denied", labels.denied],
    ] as const) {
      const view = render(
        <ApprovalCard
          state={state}
          title="Go ahead?"
          subtitle="Detail"
          statusLabels={labels}
        />,
      );
      expect(view.getByText(text)).toBeTruthy();
      cleanup();
    }
    const view = render(
      <ApprovalCard
        state="request"
        title="Go ahead?"
        subtitle="Detail"
        allowHint={<kbd>Ctrl Enter</kbd>}
        onAllowOnce={() => {}}
      />,
    );
    expect(
      view.getByRole("button", { name: /Allow once/ }).querySelector("kbd")
        ?.textContent,
    ).toBe("Ctrl Enter");
  });
});
