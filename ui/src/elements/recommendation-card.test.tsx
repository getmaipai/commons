// ELT-T1-K05: the card is usable without a fabricated confidence figure.
import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { RecommendationCard } from "./recommendation-card";

afterEach(cleanup);

describe("RecommendationCard optional parts", () => {
  test("with no optional props it draws only the question and the body", () => {
    const { container, queryByRole, getByText } = render(
      <RecommendationCard state="idle" question="Which?">Because.</RecommendationCard>,
    );
    expect(getByText("Which?")).toBeTruthy();
    expect(getByText("Because.")).toBeTruthy();
    expect(queryByRole("button")).toBeNull();
    expect(container.querySelector("[aria-hidden]")).toBeNull();
  });

  test("confidenceLabel draws the bars and the label", () => {
    const { container, getByText } = render(
      <RecommendationCard state="idle" question="Q" confidenceLabel="High">b</RecommendationCard>,
    );
    expect(getByText("High")).toBeTruthy();
    expect(container.querySelectorAll("[aria-hidden] > span").length).toBe(3);
  });

  test("each button draws only with its own handler and calls it", () => {
    const onAccept = mock(() => {});
    const onAlternatives = mock(() => {});
    const only = render(
      <RecommendationCard state="idle" question="Q" onAccept={onAccept}>b</RecommendationCard>,
    );
    expect(only.queryByRole("button", { name: "Alternatives" })).toBeNull();
    fireEvent.click(only.getByRole("button", { name: "Accept" }));
    expect(onAccept).toHaveBeenCalledTimes(1);
    cleanup();
    const alt = render(
      <RecommendationCard state="idle" question="Q" onAlternatives={onAlternatives}>b</RecommendationCard>,
    );
    expect(alt.queryByRole("button", { name: "Accept" })).toBeNull();
    fireEvent.click(alt.getByRole("button", { name: "Alternatives" }));
    expect(onAlternatives).toHaveBeenCalledTimes(1);
  });

  test("accepted shows acceptedLabel when given and nothing extra when not", () => {
    const withLabel = render(
      <RecommendationCard state="accepted" question="Q" acceptedLabel="Done">b</RecommendationCard>,
    );
    expect(withLabel.getByText("Done")).toBeTruthy();
    cleanup();
    const without = render(<RecommendationCard state="accepted" question="Q">b</RecommendationCard>);
    expect(without.container.querySelector("svg")).toBeNull();
  });

  test("the full set still renders as before", () => {
    const { getByText, getByRole } = render(
      <RecommendationCard
        state="idle"
        question="Q"
        confidenceLabel="Likely"
        acceptedLabel="ok"
        onAccept={() => {}}
        onAlternatives={() => {}}
      >b</RecommendationCard>,
    );
    expect(getByText("Likely")).toBeTruthy();
    expect(getByRole("button", { name: "Accept" })).toBeTruthy();
    expect(getByRole("button", { name: "Alternatives" })).toBeTruthy();
  });
});
