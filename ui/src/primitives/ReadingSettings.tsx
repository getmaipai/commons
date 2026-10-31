import { useState } from "react";
import { getIcon } from "@/kit/icons";
import { Button } from "@/kit/dashboard/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/kit/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/kit/ui/toggle-group";

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

const LABELS: Record<keyof ReadingPrefs, Record<string, string>> = {
  size: { small: "Small", medium: "Default", large: "Large", xlarge: "Largest" },
  font: { serif: "Serif", sans: "Sans" },
  spacing: { tight: "Tight", normal: "Normal", relaxed: "Roomy" },
  width: { narrow: "Narrow", normal: "Normal" },
};
const TITLES = { font: "Typeface", size: "Text size", spacing: "Line spacing", width: "Page width" } as const;

function Row<K extends keyof ReadingPrefs>({ field, prefs, onChange }: { field: K; prefs: ReadingPrefs; onChange: <J extends keyof ReadingPrefs>(key: J, value: ReadingPrefs[J]) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{TITLES[field]}</p>
      <ToggleGroup type="single" variant="segmented" fill value={prefs[field]} aria-label={TITLES[field]}
        onValueChange={(value) => { const next = CHOICES[field].find((choice) => choice === value); if (next) onChange(field, next); }}>
        {CHOICES[field].map((choice) => <ToggleGroupItem key={choice} value={choice} aria-label={`${TITLES[field]}: ${LABELS[field][choice]}`}>{LABELS[field][choice]}</ToggleGroupItem>)}
      </ToggleGroup>
    </div>
  );
}

/** The "Aa" button of the reader's toolbar: opens the reading settings. */
export function ReadingSettingsButton({ prefs, onChange }: { prefs: ReadingPrefs; onChange: <K extends keyof ReadingPrefs>(key: K, value: ReadingPrefs[K]) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Reading settings" title="Reading settings"><TypeIcon aria-hidden /></Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-80 flex-col gap-4">
        <Row field="font" prefs={prefs} onChange={onChange} />
        <Row field="size" prefs={prefs} onChange={onChange} />
        <Row field="spacing" prefs={prefs} onChange={onChange} />
        <Row field="width" prefs={prefs} onChange={onChange} />
        <Button variant="ghost" size="sm" onClick={() => (Object.keys(DEFAULT_READING) as (keyof ReadingPrefs)[]).forEach((key) => onChange(key, DEFAULT_READING[key] as never))}>Reset to default</Button>
      </PopoverContent>
    </Popover>
  );
}
