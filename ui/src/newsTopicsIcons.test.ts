// NEWS-00: every topic in spec/news/topics.json names a lucide icon the kit registry has, so a Following row's
// `item_media_field` never falls back to a missing icon.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { icons } from "@/kit/icons";

const SPEC_DIR = process.env.MAIPAI_SPEC_DIR ?? fileURLToPath(new URL("../../spec", import.meta.url));

describe("News topic icons", () => {
  test("each topic's icon is in the icon registry", () => {
    const { topics } = JSON.parse(readFileSync(join(SPEC_DIR, "news/topics.json"), "utf-8")) as { topics: Array<{ id: string; icon: string }> };
    expect(topics.length).toBe(10);
    for (const topic of topics) expect(Object.keys(icons), `${topic.id} -> ${topic.icon}`).toContain(topic.icon);
  });
});
