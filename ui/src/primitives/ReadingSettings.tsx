import { useState } from "react";
import { getIcon } from "@/kit/icons";
import { Button } from "@/kit/dashboard/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/kit/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/kit/ui/toggle-group";
import { i18n } from "@/kit/i18n";

const TypeIcon = getIcon("a-large-small");

/** How a person likes to read: per person in this browser, applied to the body of every article (the encyclopedia, the news, any host that
 * draws the kit's reader). Colours are never part of it: the page follows the person's own theme. */
export interface ReadingPrefs {
  size: "small" | "medium" | "large" | "xlarge";
  font: "serif" | "sans";
  spacing: "tight" | "normal" | "relaxed";
  width: "narrow" | "normal";
}

export const DEFAULT_READING: ReadingPrefs = { size: "medium", font: "serif", spacing: "normal", width: "normal" };

const KEYS = { size: "maipai.article.text-size", font: "maipai.article.font", spacing: "maipai.article.spacing", width: "maipai.article.width" } as const;
const CHOICES: { [K in keyof ReadingPrefs]: readonly ReadingPrefs[K][] } = {
  size: ["small", "medium", "large", "xlarge"], font: ["serif", "sans"], spacing: ["tight", "normal", "relaxed"], width: ["normal", "narrow"],
};

function readPref<K extends keyof ReadingPrefs>(key: K): ReadingPrefs[K] {
  try {
    const stored = window.localStorage.getItem(KEYS[key]);
    const found = CHOICES[key].find((choice) => choice === stored);
    if (found) return found;
  } catch { /* storage can be blocked: the default is fine */ }
  return DEFAULT_READING[key];
}

export function readReadingPrefs(): ReadingPrefs {
  return { size: readPref("size"), font: readPref("font"), spacing: readPref("spacing"), width: readPref("width") };
}

export function useReadingPrefs(): [ReadingPrefs, <K extends keyof ReadingPrefs>(key: K, value: ReadingPrefs[K]) => void] {
  const [prefs, setPrefs] = useState<ReadingPrefs>(readReadingPrefs);
  const set = <K extends keyof ReadingPrefs>(key: K, value: ReadingPrefs[K]) => {
    setPrefs((now) => ({ ...now, [key]: value }));
    try { window.localStorage.setItem(KEYS[key], value); } catch { /* not kept this time */ }
  };
  return [prefs, set];
}

/** Whole class names, written out so the style sheet keeps every one of them. */
export const READING_CLASSES = {
  font: { serif: "font-serif", sans: "font-sans" },
  size: { small: "text-base", medium: "text-lg", large: "text-xl", xlarge: "text-2xl" },
  spacing: { tight: "leading-[1.4]", normal: "leading-[1.6]", relaxed: "leading-[1.9]" },
  width: { narrow: "max-w-[52ch]", normal: "" },
} as const;

const labels = (): Record<keyof ReadingPrefs, Record<string, string>> => ({
  size: { small: i18n._({ id: "ui.Small", message: "Small" }), medium: i18n._({ id: "ui.Default", message: "Default" }), large: i18n._({ id: "ui.Large", message: "Large" }), xlarge: i18n._({ id: "ui.Largest", message: "Largest" }) },
  font: { serif: i18n._({ id: "ui.Serif", message: "Serif" }), sans: i18n._({ id: "ui.Sans", message: "Sans" }) },
  spacing: { tight: i18n._({ id: "ui.Tight", message: "Tight" }), normal: i18n._({ id: "ui.Normal", message: "Normal" }), relaxed: i18n._({ id: "ui.Roomy", message: "Roomy" }) },
  width: { narrow: i18n._({ id: "ui.Narrow", message: "Narrow" }), normal: i18n._({ id: "ui.Normal", message: "Normal" }) },
});
const titles = () => ({ font: i18n._({ id: "ui.Typeface", message: "Typeface" }), size: i18n._({ id: "ui.Text size", message: "Text size" }), spacing: i18n._({ id: "ui.Line spacing", message: "Line spacing" }), width: i18n._({ id: "ui.Page width", message: "Page width" }) }) as const;

function Row<K extends keyof ReadingPrefs>({ field, prefs, onChange }: { field: K; prefs: ReadingPrefs; onChange: <J extends keyof ReadingPrefs>(key: J, value: ReadingPrefs[J]) => void }) {
  const title = titles()[field];
  const choiceLabels = labels()[field];
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{title}</p>
      <ToggleGroup type="single" variant="segmented" fill value={prefs[field]} aria-label={title}
        onValueChange={(value) => { const next = CHOICES[field].find((choice) => choice === value); if (next) onChange(field, next); }}>
        {CHOICES[field].map((choice) => <ToggleGroupItem key={choice} value={choice} aria-label={i18n._({ id: "ui.{title}: {label}", message: "{title}: {label}", values: { title, label: choiceLabels[choice] ?? "" } })}>{choiceLabels[choice]}</ToggleGroupItem>)}
      </ToggleGroup>
    </div>
  );
}

/** The "Aa" button of the reader's toolbar: opens the reading settings. */
export function ReadingSettingsButton({ prefs, onChange }: { prefs: ReadingPrefs; onChange: <K extends keyof ReadingPrefs>(key: K, value: ReadingPrefs[K]) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label={i18n._({ id: "ui.Reading settings", message: "Reading settings" })} title={i18n._({ id: "ui.Reading settings", message: "Reading settings" })}><TypeIcon aria-hidden /></Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-80 flex-col gap-4">
        <Row field="font" prefs={prefs} onChange={onChange} />
        <Row field="size" prefs={prefs} onChange={onChange} />
        <Row field="spacing" prefs={prefs} onChange={onChange} />
        <Row field="width" prefs={prefs} onChange={onChange} />
        <Button variant="ghost" size="sm" onClick={() => (Object.keys(DEFAULT_READING) as (keyof ReadingPrefs)[]).forEach((key) => onChange(key, DEFAULT_READING[key] as never))}>{i18n._({ id: "ui.Reset to default", message: "Reset to default" })}</Button>
      </PopoverContent>
    </Popover>
  );
}
