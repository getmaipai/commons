"use client";

// GENUI-03a story: one fixture per v1 answer-block kind, each rendered by the
// dispatcher, then the two fallback paths (an unknown kind, invalid props).
import chart from "../../../spec/fixtures/answer-block/valid-chart.json";
import comparison from "../../../spec/fixtures/answer-block/valid-comparison.json";
import dataTable from "../../../spec/fixtures/answer-block/valid-data_table.json";
import imageGallery from "../../../spec/fixtures/answer-block/valid-image_gallery.json";
import scheduleCard from "../../../spec/fixtures/answer-block/valid-schedule_card.json";
import specSheet from "../../../spec/fixtures/answer-block/valid-spec_sheet.json";
import timeline from "../../../spec/fixtures/answer-block/valid-timeline.json";
import todoList from "../../../spec/fixtures/answer-block/valid-todo_list.json";
import { AnswerBlock, type AnswerBlockRecord } from "./answer-block";

export const answerBlockFixtures = {
  spec_sheet: specSheet,
  data_table: dataTable,
  chart,
  timeline,
  todo_list: todoList,
  image_gallery: imageGallery,
  schedule_card: scheduleCard,
  comparison,
} as unknown as Record<string, AnswerBlockRecord>;

const unknownKind = {
  ...specSheet,
  id: "blk-unknown1",
  kind: "hologram",
  alt: "A hologram this screen cannot draw.",
} as unknown as AnswerBlockRecord;

const badProps = {
  ...chart,
  id: "blk-badprops",
  alt: "A chart whose points were lost.",
  props: { label: "Broken" },
} as unknown as AnswerBlockRecord;

export function AnswerBlockShowcase() {
  return (
    <div className="flex flex-col gap-4">
      {Object.entries(answerBlockFixtures).map(([kind, block]) => (
        <AnswerBlock
          key={kind}
          block={block}
          resolveImageSrc={(src) => `/hub/images/${src}`}
          onToggleSchedule={() => {}}
        />
      ))}
      <AnswerBlock block={unknownKind} />
      <AnswerBlock block={badProps} />
    </div>
  );
}
