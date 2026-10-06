// Pure label helpers for the settings renderer. Moved here from the old
// SettingField.tsx (KIT-SET-03) unchanged in behaviour; SettingField.tsx
// re-exports them for callers that still import the old path.

// Every `select`-selector registry value is a raw machine token today
// ("auto", "quantized", "vera") - a code review on tts.voice_id
// (2026-09-04, "per user selection of voice") found a raw preset name
// like "bill_boerst" meaningless to a family member choosing a voice.
// A generic word-split title-case, not a per-key label table: nothing
// here is voice-specific, and it improves every select key for free.
export function titleCaseOption(value: string): string {
  if (!value) return value;
  return value
    .split("_")
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

// A code review, 2026-09-05, found `household.locale`'s BCP-47 values
// ("en-US", "en-GB") coming out "En-US" through `titleCaseOption`.
// `Intl.DisplayNames` (a browser-native API, not a hand-built table)
// renders the language a family recognises ("American English"). Scoped
// to the one key that is actually a locale, at the one call site that
// knows it, because `Intl.DisplayNames` is lenient enough to resolve
// non-locale dashed strings too.
export function localeDisplayName(value: string): string {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(value);
    if (name) return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    // Not a real BCP-47 tag Intl recognizes - fall through.
  }
  return titleCaseOption(value);
}

/** Shortens a long path or URL to `max` characters by cutting out the
 * middle ("/Users/jess...uments/Codex"), keeping both ends readable. */
export function middleEllipsis(value: string, max = 34): string {
  if (value.length <= max) return value;
  const keep = max - 1;
  const head = Math.ceil(keep / 2);
  const tail = Math.floor(keep / 2);
  return `${value.slice(0, head)}…${value.slice(value.length - tail)}`;
}
