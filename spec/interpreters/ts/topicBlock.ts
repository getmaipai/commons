// MINOR-TOPICS-01: the one place a child's or teen's topic block is assembled. Pure text from the
// copy file (safety/topic-copy.json) and the stances the hub or robot resolved for this person;
// nothing here matches the person's words against anything, so no word list or classifier is
// involved. The caller (Home's resolveTopicStances, later the robot) decides which stance each
// family gets; this file only turns that decision into the sentences the model reads.
import copyFile from "../../safety/topic-copy.json" with { type: "json" };

export type TopicBand = "child" | "teen";
export type TopicFamily = "bodies" | "health" | "feelings" | "risk" | "violence" | "people" | "beliefs";
export type TopicStance = "informative" | "gentle" | "redirect" | "support" | "protect" | "neutral";

export const TOPIC_FAMILIES: readonly TopicFamily[] = [
  "bodies", "health", "feelings", "risk", "violence", "people", "beliefs",
];

export interface TopicCopyFile {
  emergency_default: string;
  header: Record<TopicBand, string>;
  families: Record<TopicFamily, Record<TopicBand, Partial<Record<TopicStance, string>>>>;
  family_stories: { line: string };
}

/** The part of a band's content-ceiling record the renderer reads. */
export interface TopicRecord {
  topics: Record<TopicFamily, { stance: TopicStance; allowed: readonly TopicStance[]; fixed: boolean }>;
}

export interface TopicBlockInput {
  band: TopicBand;
  /** The band's content-ceiling record: a stance it does not allow falls back to the record's own stance. */
  record: TopicRecord;
  stances: Partial<Record<TopicFamily, TopicStance>>;
  /** Child only: the story names to keep (never confirmed or denied). Omit or empty for none. */
  familyStoryNames?: readonly string[];
  /** The household's local emergency number; the copy file's default when omitted or not a phone number. */
  emergency?: string;
}

export const TOPIC_COPY = copyFile as TopicCopyFile;

const MAX_STORY_NAMES = 10;
const MAX_NAME_LENGTH = 40;

/** A parent types story names; only letters, digits and simple punctuation reach a child's prompt. */
export function cleanStoryNames(names: readonly string[] | undefined): string[] {
  return (names ?? [])
    .map((n) => n.replace(/[^\p{L}\p{N} '’.&!-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH).trim())
    .filter(Boolean)
    .slice(0, MAX_STORY_NAMES);
}

function cleanEmergency(value: string | undefined, fallback: string): string {
  const v = value?.trim() ?? "";
  return /^[0-9][0-9 +-]{1,10}$/.test(v) ? v : fallback;
}

/**
 * Assembles the block. Never throws on a bad stance: one the record does not allow (a stale or tampered
 * setting) is replaced by the record's own stance for that family, so a minor's prompt always carries the
 * full block. A copy file missing a line the record needs is a spec defect and does throw, with the fix.
 */
export function renderTopicBlock(input: TopicBlockInput, copy: TopicCopyFile = TOPIC_COPY): string {
  const emergency = cleanEmergency(input.emergency, copy.emergency_default);
  const lines = [copy.header[input.band].replaceAll("{emergency}", () => emergency)];
  for (const family of TOPIC_FAMILIES) {
    const entry = input.record.topics[family];
    const asked = input.stances[family];
    const stance = entry.fixed || !asked || !entry.allowed.includes(asked) ? entry.stance : asked;
    const line = copy.families[family][input.band][stance];
    if (!line) {
      throw new Error(
        `topic-copy.json has no ${family} sentence for the ${stance} stance at the ${input.band} band; add one in spec/safety/topic-copy.json.`,
      );
    }
    lines.push(line);
  }
  const names = input.band === "child" ? cleanStoryNames(input.familyStoryNames) : [];
  if (names.length > 0) lines.push(copy.family_stories.line.replaceAll("{names}", () => names.join(", ")));
  return lines.join("\n");
}
