"use client";

// GENUI-03a story: every v1 AnswerBlock kind rendered from the spec's own
// valid fixtures, plus the two fallback paths (unknown kind, invalid props).
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
