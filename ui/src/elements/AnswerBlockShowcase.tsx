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
import weatherCard from "@maipai/spec/fixtures/answer-block/valid-weather_card.json";
import storyFeed from "@maipai/spec/fixtures/answer-block/valid-story_feed.json";
import article from "@maipai/spec/fixtures/answer-block/valid-article.json";
import mediaCard from "@maipai/spec/fixtures/answer-block/valid-media_card.json";
import confirmation from "@maipai/spec/fixtures/answer-block/valid-confirmation.json";
import countdown from "@maipai/spec/fixtures/answer-block/valid-countdown.json";
import { AnswerBlockView } from "./answer-block";
import { ImageGallery } from "./image-gallery";

export const ANSWER_BLOCK_FIXTURES = {
  spec_sheet: specSheet,
  data_table: dataTable,
  chart,
  timeline,
  todo_list: todoList,
  image_gallery: imageGallery,
  schedule_card: scheduleCard,
  comparison,
  weather_card: weatherCard,
  story_feed: storyFeed,
  article,
  media_card: mediaCard,
  confirmation,
  countdown,
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

// IMGGALLERY-ROW-01: the answer image gallery draws one row of square tiles (the default), with +N on the last
// tile; `layout="grid"` keeps the wrapping columns. Narrow the window to watch the row fit fewer tiles.
const rowDemo = Array.from({ length: 9 }, (_, index) => ({
  id: `row-${index + 1}`,
  src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="hsl(${index * 40} 45% 60%)"/></svg>`)}`,
  alt: `Sample picture ${index + 1}`,
}));

export function ImageGalleryRowShowcase() {
  return (
    <div className="flex flex-col gap-4">
      <ImageGallery images={rowDemo.slice(0, 5)} onEditImage={() => {}} editAlwaysVisible />
      <ImageGallery images={rowDemo} />
      <ImageGallery images={rowDemo} layout="grid" maxVisible={5} />
    </div>
  );
}
