// Feed actions take up to 8 entries and Studio export actions up to 3.
import { describe, expect, test } from "bun:test";
import { ResultFeedNodeSchema, StudioNodeSchema } from "@/kit/schema/types";

const call = (label: string, args?: Record<string, unknown>) => ({ label, action: { call: { target: "/api/plugins/videos/actions/spatial-sound", args } } });
const many = (n: number) => Array.from({ length: n }, (_, i) => call(`Action ${i + 1}`, { id: "{id}" }));

const poll = { statuses: ["queued"], record: { path: "job", params: { id: "{id}" } } };
const feed = (actions: unknown[]) => ({
  type: "result_feed",
  bind: { source: "package", path: "feed" },
  fields: { words: "prompt", status: "status" },
  poll_while: poll,
  actions,
});
const studio = (actions: unknown[]) => ({
  type: "studio",
  bind: { source: "package", path: "studio" },
  export_result: {
    bind: { source: "package", path: "job" },
    fields: { status: "status" },
    poll_while: poll,
    actions,
  },
});

describe("action caps", () => {
  test("a feed takes 8 actions, not 9", () => {
    expect(ResultFeedNodeSchema.safeParse(feed(many(8))).success).toBe(true);
    expect(ResultFeedNodeSchema.safeParse(feed(many(9))).success).toBe(false);
  });
  test("the Studio export card takes 3 actions, not 4", () => {
    expect(StudioNodeSchema.safeParse(studio(many(3))).success).toBe(true);
    expect(StudioNodeSchema.safeParse(studio(many(4))).success).toBe(false);
  });
  test("an action carries its own body through call.args", () => {
    const parsed = ResultFeedNodeSchema.parse(feed([call("Spatial sound with 5.1 file", { id: "{id}", surround: true })]));
    expect((parsed.actions![0]!.action as { call: { args: Record<string, unknown> } }).call.args).toEqual({ id: "{id}", surround: true });
  });
  test("fresh_confirm and show_when are accepted and validated", () => {
    const parsed = ResultFeedNodeSchema.parse(feed([{ label: "Unmark", show_when: "adult.nsfw", action: { call: { target: "/unmark", args: { id: "{id}", ticket: "{ticket}" }, fresh_confirm: { title: "Confirm", description: "Fresh check", action_label: "Continue" } } } }]));
    expect(parsed.actions?.[0]?.show_when).toBe("adult.nsfw");
    expect(ResultFeedNodeSchema.safeParse(feed([{ label: "Unmark", show_when: "", action: { call: { target: "/unmark" } } }])).success).toBe(false);
  });
});
