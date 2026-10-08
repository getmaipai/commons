import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { AnswerBlockView } from "./answer-block";
import { ANSWER_BLOCK_FIXTURES } from "./AnswerBlockShowcase";

afterEach(cleanup);

const fixture = (kind: keyof typeof ANSWER_BLOCK_FIXTURES) => ANSWER_BLOCK_FIXTURES[kind];

describe("AnswerBlockView renders each v1 kind with its Element", () => {
  test("spec_sheet", () => {
    const { container, getByText } = render(<AnswerBlockView block={fixture("spec_sheet")} />);
    expect(container.querySelector('[data-slot="spec-sheet"]')).not.toBeNull();
    expect(getByText("6.3 in OLED")).toBeTruthy();
    expect(getByText("4700 mAh")).toBeTruthy();
  });

  test("data_table", () => {
    const { container, getAllByText } = render(<AnswerBlockView block={fixture("data_table")} />);
    expect(container.querySelector('[data-slot="data-table"]')).not.toBeNull();
    expect(getAllByText("Chana masala").length).toBeGreaterThan(0);
    expect(getAllByText("$14.50").length).toBeGreaterThan(0);
  });

  test("chart", () => {
    const { container, getByText } = render(<AnswerBlockView block={fixture("chart")} />);
    expect(container.querySelector('[data-slot="chart"]')).not.toBeNull();
    expect(getByText("12.4 kWh")).toBeTruthy();
    expect(container.querySelector("polyline")?.getAttribute("points")?.split(" ")).toHaveLength(7);
  });

  test("timeline shows every event", () => {
    const { container, getByText } = render(<AnswerBlockView block={fixture("timeline")} />);
    expect(container.querySelector('[data-slot="timeline"]')).not.toBeNull();
    expect(getByText("Left the depot")).toBeTruthy();
    expect(getByText("Due at the door")).toBeTruthy();
  });

  test("todo_list", () => {
    const { container, getByText } = render(<AnswerBlockView block={fixture("todo_list")} />);
    expect(container.querySelector('[data-slot="todo-list"]')).not.toBeNull();
    expect(getByText("Before we leave")).toBeTruthy();
    expect(getByText("Book taxi")).toBeTruthy();
  });

  test("image_gallery resolves hub image ids and reports opens", () => {
    const opened: string[][] = [];
    const { container } = render(
      <AnswerBlockView
        block={fixture("image_gallery")}
        resolveImageSrc={(src) => `data:image/gif;base64,R0lGODlhAQABAAAAACw=#${src}`}
        onImageOpen={(blockId, imageId) => opened.push([blockId, imageId])}
      />,
    );
    expect(container.querySelector('[data-slot="image-gallery"]')).not.toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toEndWith("#hubimg-4f2a9c01");
    fireEvent.click(container.querySelector("button")!);
    expect(opened).toEqual([["blk-g8h9i0", "p1"]]);
  });

  test("schedule_card reports toggles with the block id", () => {
    const toggled: string[] = [];
    const { container } = render(
      <AnswerBlockView block={fixture("schedule_card")} onScheduleToggle={(id) => toggled.push(id)} />,
    );
    expect(container.querySelector('[data-slot="schedule-card"]')).not.toBeNull();
    fireEvent.click(container.querySelector("button")!);
    expect(toggled).toEqual(["blk-s2c3h4"]);
  });

  test("comparison", () => {
    const { container, getByText } = render(<AnswerBlockView block={fixture("comparison")} />);
    expect(container.querySelector('[data-slot="comparison-card"]')).not.toBeNull();
    expect(getByText("Smaller home, mostly floors.")).toBeTruthy();
  });
});

describe("AnswerBlockView fallback", () => {
  test("an unknown kind renders alt, not an Element", () => {
    const block = { ...fixture("spec_sheet"), kind: "hologram", alt: "A hologram." };
    const { container, getByText } = render(<AnswerBlockView block={block} />);
    expect(getByText("A hologram.")).toBeTruthy();
    expect(container.querySelector("[data-fallback]")).not.toBeNull();
    expect(container.querySelector('[data-slot="spec-sheet"]')).toBeNull();
  });

  test("invalid props render alt", () => {
    const block = { ...fixture("chart"), alt: "Use was steady.", props: { label: "x" } };
    const { container, getByText } = render(<AnswerBlockView block={block} />);
    expect(getByText("Use was steady.")).toBeTruthy();
    expect(container.querySelector('[data-slot="chart"]')).toBeNull();
  });

  test("never throws on junk, and shows nothing when there is no alt", () => {
    for (const junk of [null, undefined, 7, "x", [], {}, { kind: "chart", props: null }]) {
      const { container } = render(<AnswerBlockView block={junk} />);
      expect(container.textContent).toBe("");
      cleanup();
    }
  });

  test("a block that throws while read falls back to alt", () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      // A hostile getter: validation itself throws, and that must still fall back.
      const block = {
        ...fixture("spec_sheet"),
        alt: "Specs.",
        get props(): never {
          throw new Error("boom");
        },
      };
      const { getByText } = render(<AnswerBlockView block={block} />);
      expect(getByText("Specs.")).toBeTruthy();
    } finally {
      console.error = originalError;
    }
  });
});
