import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { AnswerBlock, type AnswerBlockRecord } from "./answer-block";
import { answerBlockFixtures } from "./AnswerBlockShowcase";

afterEach(cleanup);

const slots: Record<string, string> = {
  spec_sheet: "spec-sheet",
  data_table: "data-table",
  chart: "chart",
  timeline: "timeline",
  todo_list: "todo-list",
  image_gallery: "image-gallery",
  schedule_card: "schedule-card",
  comparison: "comparison-card",
};

const bad = (value: unknown) => value as AnswerBlockRecord;

describe("AnswerBlock", () => {
  test("fixtures cover every v1 kind", () => {
    expect(Object.keys(answerBlockFixtures).sort()).toEqual(
      Object.keys(slots).sort(),
    );
  });

  for (const [kind, slot] of Object.entries(slots)) {
    test(`renders ${kind} with its Element`, () => {
      const block = answerBlockFixtures[kind]!;
      const { container } = render(<AnswerBlock block={block} />);
      expect(container.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
      expect(
        container.querySelector('[data-slot="answer-block-fallback"]'),
      ).toBeNull();
    });
  }

  test("spec_sheet shows every row", () => {
    const { getByText } = render(
      <AnswerBlock block={answerBlockFixtures.spec_sheet!} />,
    );
    expect(getByText("Battery")).toBeTruthy();
  });

  test("image_gallery resolves references and reports opens", () => {
    const opened: string[] = [];
    const resolved: string[] = [];
    const { getByRole } = render(
      <AnswerBlock
        block={answerBlockFixtures.image_gallery!}
        resolveImageSrc={(src) => (resolved.push(src), `/hub/${src}`)}
        onOpenImage={(blockId, imageId) => opened.push(`${blockId}:${imageId}`)}
      />,
    );
    expect(resolved).toEqual(["hubimg-4f2a9c01", "hubimg-77b0e3d2"]);
    fireEvent.click(
      getByRole("button", { name: /Open image: The bridge glowing/ }),
    );
    expect(opened).toEqual([`${answerBlockFixtures.image_gallery!.id}:p1`]);
  });

  test("schedule_card toggle reports the block id", () => {
    const toggled: string[] = [];
    const block = answerBlockFixtures.schedule_card!;
    const { getByRole } = render(
      <AnswerBlock block={block} onToggleSchedule={(id) => toggled.push(id)} />,
    );
    fireEvent.click(getByRole("switch"));
    expect(toggled).toEqual([block.id]);
  });

  test("an unknown kind renders the alt text and does not throw", () => {
    const block = bad({
      ...answerBlockFixtures.spec_sheet,
      kind: "hologram",
      alt: "A hologram.",
    });
    const { getByText, container } = render(<AnswerBlock block={block} />);
    expect(getByText("A hologram.")).toBeTruthy();
    expect(
      container.querySelector('[data-slot="answer-block-fallback"]'),
    ).not.toBeNull();
  });

  test("invalid props render the alt text and do not throw", () => {
    const block = bad({
      ...answerBlockFixtures.chart,
      alt: "A broken chart.",
      props: { label: "x" },
    });
    const { getByText, container } = render(<AnswerBlock block={block} />);
    expect(getByText("A broken chart.")).toBeTruthy();
    expect(container.querySelector('[data-slot="chart"]')).toBeNull();
  });

  test("a non-object block renders nothing and does not throw", () => {
    expect(render(<AnswerBlock block={bad(null)} />).container.innerHTML).toBe("");
    expect(render(<AnswerBlock block={bad("x")} />).container.innerHTML).toBe("");
  });

  test("a block with no alt renders nothing", () => {
    const rest = { ...answerBlockFixtures.chart, alt: undefined };
    const { container } = render(
      <AnswerBlock block={bad({ ...rest, props: {} })} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
