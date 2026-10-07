import { readFileSync } from "node:fs";
import { join } from "node:path";

export type SettingBand = "child" | "teen" | "adult";
export type SettingViewer = "self" | "guardian" | "admin";
export type SettingSource = "user" | "default" | "package" | "sync";

export interface SettingDefinition {
  key: string;
  label: string;
  level?: string;
  scope: "household" | "person" | "device";
  selector: string;
  range?: { options?: string[]; options_from?: string };
  default: unknown;
  copy?: { does: string; does_child?: string; does_teen?: string; options?: Record<string, string> };
  control?: Record<SettingBand, "self" | "guardian">;
  band_default?: Record<SettingBand, unknown>;
}

export interface DescribeSettingContext {
  subjectBand: SettingBand;
  viewer: SettingViewer;
  value: unknown;
  source: SettingSource;
  effective: unknown;
  adminName?: string;
  personName?: string;
}

export interface SettingDescription {
  does: string;
  state?: string;
  reason?: string;
}

type ReasonLine = { line?: string; on?: string; off?: string };
type ReasonVocabulary = Record<string, Partial<Record<SettingBand | "admin", ReasonLine>>>;

const VOCAB = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "vocab", "setting-reasons.json"), "utf8")) as ReasonVocabulary;

function stateText(value: unknown): string | undefined {
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return undefined;
}

function render(line: string, context: DescribeSettingContext): string {
  return line
    .replaceAll("{admin}", context.adminName ?? "{admin}")
    .replaceAll("{person}", context.personName ?? "{person}");
}

function reasonLine(code: string, context: DescribeSettingContext): string | undefined {
  const reader = context.viewer === "admin" || context.viewer === "guardian" ? "admin" : context.subjectBand;
  const entry = VOCAB[code]?.[reader];
  if (!entry) return undefined;
  const keyed = entry[context.effective === true ? "on" : "off"];
  return render(keyed ?? entry.line ?? "", context) || undefined;
}

/** Compose one setting description from its spec declaration and this reader's context. */
export function describeSetting(setting: SettingDefinition, context: DescribeSettingContext): SettingDescription {
  const does =
    (context.subjectBand === "child" ? setting.copy?.does_child : undefined) ??
    (context.subjectBand === "teen" ? setting.copy?.does_teen : undefined) ??
    setting.copy?.does ??
    setting.label;
  const result: SettingDescription = { does };

  if (context.subjectBand === "teen" && context.viewer !== "self") return result;
  if (context.effective !== context.value && context.value === true && context.effective === false) {
    result.state = stateText(context.effective);
    result.reason = reasonLine("stricter_robot", context);
    return result;
  }

  const locked = setting.control?.[context.subjectBand] !== "self";
  const viewingChild = context.subjectBand === "child" && context.viewer !== "self" && locked;
  if (context.viewer === "self" && !locked) return result;
  if (!viewingChild && context.viewer !== "self") return result;
  const baseline = setting.band_default?.[context.subjectBand];
  const reason =
    context.effective !== context.value && context.value === true && context.effective === false
      ? "stricter_robot"
      : locked && context.source === "default" && baseline === false && context.value === false
        ? "off_until_guardian"
        : locked && context.source === "user"
          ? "set_by_guardian"
          : undefined;
  if (locked || reason === "stricter_robot") {
    result.state = stateText(context.effective);
    if (reason) result.reason = reasonLine(reason, context);
  }
  return result;
}

export function lintSettingCopy(registry: SettingDefinition[], baseline: string[]): string[] {
  const errors: string[] = [];
  const missing = new Set(registry.filter((entry) => entry.level === "basic" && !entry.copy?.does).map((entry) => entry.key));
  const baselineSet = new Set(baseline);
  for (const key of missing) if (!baselineSet.has(key)) errors.push(`${key}: missing copy.does outside the baseline`);
  for (const key of baselineSet) if (!missing.has(key)) errors.push(`${key}: remove fixed entry from the shrink-only baseline`);

  for (const entry of registry) {
    if (!entry.copy) continue;
    const lines = [entry.copy.does, entry.copy.does_child, entry.copy.does_teen, ...Object.values(entry.copy.options ?? {})].filter(
      (line): line is string => typeof line === "string",
    );
    for (const line of lines) {
      if (line.length > 90) errors.push(`${entry.key}: copy line exceeds 90 characters`);
      if (line.includes(";") || (line.match(/[.!?]/g)?.length ?? 0) > 1) errors.push(`${entry.key}: copy line must be one sentence`);
      if (/\b(adults?|teens?|children|kids?|parents?|admins?|owners?|everyone|by default|on by default|off until)\b/i.test(line)) {
        errors.push(`${entry.key}: copy line names another audience or band default`);
      }
      if (/\b(settings_changed|hub|delivered by|override)\b|\b[a-z][a-z0-9]*\.[a-z][a-z0-9_]*\b/i.test(line)) {
        errors.push(`${entry.key}: copy line contains internal jargon`);
      }
      if (/[—–]/.test(line) || /\b(please|sorry|oops|invalid|forbidden|just|simply|basically|actually|currently)\b/i.test(line)) {
        errors.push(`${entry.key}: copy line breaks interface writing style`);
      }
      const label = entry.label.toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
      const content = line.toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
      if (content.startsWith(label) || label.split(/\s+/).filter((word) => content.split(/\s+/).includes(word)).length > label.split(/\s+/).length / 2) {
        errors.push(`${entry.key}: copy line repeats its label`);
      }
    }
    if (entry.selector === "select" && entry.range?.options_from !== "companion") {
      for (const option of entry.range?.options ?? []) {
        if (!entry.copy.options?.[option]) errors.push(`${entry.key}: option ${option} has no copy line`);
      }
    }
    if (entry.control && (!entry.band_default || ["child", "teen", "adult"].some((band) => !(band in entry.band_default!)))) {
      errors.push(`${entry.key}: control and band_default must declare all three bands`);
    }
  }
  return errors;
}
