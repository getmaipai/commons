import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { StoppedRun } from "./stopped-run";

afterEach(cleanup);

describe("StoppedRun", () => {
  test("omits Discard unless a handler is supplied", () => {
    const view = render(<StoppedRun words={["Partial answer"]} reason="Stopped" />);

    expect(view.getByRole("button", { name: "Continue" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Discard" })).toBeNull();
  });

  test("renders Discard when a handler is supplied", () => {
    const onDiscard = () => {};
    const view = render(
      <StoppedRun words={["Partial answer"]} reason="Stopped" onDiscard={onDiscard} />,
    );

    expect(view.getByRole("button", { name: "Discard" })).toBeTruthy();
  });
});
