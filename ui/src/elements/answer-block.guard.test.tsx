import { afterEach, expect, spyOn, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import * as chartModule from "./chart";
import { AnswerBlock } from "./answer-block";
import { answerBlockFixtures } from "./AnswerBlockShowcase";

afterEach(cleanup);

// The Element throws while rendering, though the block is schema-valid: the
// dispatcher shows the block's alt text rather than letting it propagate.
test("an Element that throws while rendering falls back to alt", () => {
  const chart = spyOn(chartModule, "Chart").mockImplementation(() => {
    throw new Error("boom");
  });
  const error = spyOn(console, "error").mockImplementation(() => {});
  try {
    const block = answerBlockFixtures.chart!;
    const { getByText, container } = render(<AnswerBlock block={block} />);
    expect(getByText(block.alt)).toBeTruthy();
    expect(
      container.querySelector('[data-slot="answer-block-fallback"]'),
    ).not.toBeNull();
  } finally {
    error.mockRestore();
    chart.mockRestore();
  }
});
