"use client";

// GENUI-03a story: every v1 AnswerBlock kind rendered from the spec's own
// valid fixtures, plus the two fallback paths (unknown kind, invalid props).
// GENUI-13b adds one story: a block between two paragraphs of reply text.
import { splitAfterParagraph } from "@maipai/spec/interpreters/ts/paragraphs.js";
import afterParagraph from "@maipai/spec/fixtures/answer-block/valid-after-paragraph.json";
import chart from "@maipai/spec/fixtures/answer-block/valid-chart.json";
import comparison from "@maipai/spec/fixtures/answer-block/valid-comparison.json";
import dataTable from "@maipai/spec/fixtures/answer-block/valid-data_table.json";
import imageGallery from "@maipai/spec/fixtures/answer-block/valid-image_gallery.json";
import scheduleCard from "@maipai/spec/fixtures/answer-block/valid-schedule_card.json";
import specSheet from "@maipai/spec/fixtures/answer-block/valid-spec_sheet.json";
import timeline from "@maipai/spec/fixtures/answer-block/valid-timeline.json";
import todoList from "@maipai/spec/fixtures/answer-block/valid-todo_list.json";
import { AnswerBlockView } from "./answer-block";

export const ANSWER_BLOCK_FIXTURES = {
  spec_sheet: specSheet,
  data_table: dataTable,
  chart,
  timeline,
  todo_list: todoList,
  image_gallery: imageGallery,
  schedule_card: scheduleCard,
  comparison,
} as const;

const unknownKind = {
  ...specSheet,
  kind: "hologram",
  alt: "A hologram this screen cannot show.",
};
const invalidProps = {
  ...chart,
  alt: "The chart could not be drawn, but use was steady.",
  props: { ...chart.props, points: [] },
};

export function AnswerBlockShowcase() {
  return (
    <div className="flex flex-col gap-4">
      {Object.entries(ANSWER_BLOCK_FIXTURES).map(([kind, block]) => (
        <AnswerBlockView key={kind} block={block} />
      ))}
      <AnswerBlockView block={unknownKind} />
      <AnswerBlockView block={invalidProps} />
    </div>
  );
}

// GENUI-13b: placement is message-part order, which assistant-ui already renders (a text part, the block part,
// a text part). The kit adds no layout or splitting logic: this story cuts the reply text at the block's own
// `after_paragraph` with the spec's one paragraph helper, the way a client builds its parts, and renders the three
// parts in order. `AnswerBlockView` itself ignores `after_paragraph` (see answer-block.test.tsx).
export const INLINE_REPLY = [
  "Here is how the two phones compare on what you asked about.",
  "The details are in the sheet below, then a note on price.",
  "Both are on sale this week, so the gap in price is small.",
].join("\n\n");

export function AnswerBlockInlineShowcase() {
  const [before, after] = splitAfterParagraph(INLINE_REPLY, afterParagraph.after_paragraph);
  return (
    <div data-story="inline-block" className="flex flex-col gap-4">
      <p>{before.trim()}</p>
      <AnswerBlockView block={afterParagraph} />
      {after.trim() ? <p>{after.trim()}</p> : null}
    </div>
  );
}
