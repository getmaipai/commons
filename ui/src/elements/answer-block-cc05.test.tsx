import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { AnswerBlockView } from "./answer-block";
import mediaCard from "@maipai/spec/fixtures/answer-block/valid-media_card.json";
import confirmation from "@maipai/spec/fixtures/answer-block/valid-confirmation.json";
import countdown from "@maipai/spec/fixtures/answer-block/valid-countdown.json";

afterEach(cleanup);
const html = (block: unknown) => render(<div style={{ width: 360 }}><AnswerBlockView block={block} /></div>).container.innerHTML;

describe("CHAT-CARDS-05 phone render snapshots", () => {
  test("media_card", () => expect(html(mediaCard)).toMatchSnapshot());
  test("confirmation", () => expect(html(confirmation)).toMatchSnapshot());
  test("countdown", () => expect(html({ ...countdown, props: { ...countdown.props, endsAt: "2000-01-01T00:00:00Z" } })).toMatchSnapshot());
});
