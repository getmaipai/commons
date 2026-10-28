// Turns an exact value into the way a person says it ("72.4" -> "low
// seventies"). This is wording for the EVIDENCE the model sees, placed beside
// the exact value as `say`; it never rewrites or scans model output (chat
// rules 1-3). Every threshold is a fixed numeric band on a typed value, the
// functions are pure and deterministic (no state, no I/O, no randomness), and
// the wording is US English only for now. `exact: true` suppresses `say`.
//
// Bands (all on the value rounded to the nearest whole unit unless noted):
//   temperature: |r| <= 2 "around zero"; below zero "about minus <n>";
//     3-19 "about <n>"; 20+ by decade thirds: units 1-3 "low", 4-6 "mid",
//     7-9 "high" ("low seventies"), exact tens "about <tens>"; 100+ "about <n>".
//   money (USD): under $1 "under a dollar"; below $100 whole dollars, above
//     that two significant figures, "about" unless nothing was dropped;
//     1 "a buck", n "<n> bucks"; 1,000,000+ "<x> million bucks".
//     Other currencies: "about <n> <CODE>".
//   distance (miles): < 0.25 "a little ways"; < 0.75 "half a mile";
//     < 1.25 "about a mile"; < 1.75 "a mile and a half"; <= 2.5 "a couple
//     miles"; else "about <n> miles" (whole miles, two figures from 100).
//   minutes: see sayMinutes (table in the tests).
//   count: exact -> number words; else 0 "none", 1-3 words, 4-6 "a few",
//     7-9 "several", 10-30 "a bunch", over 30 "a lot".

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const TENS_PLURAL = ["", "", "twenties", "thirties", "forties", "fifties", "sixties", "seventies", "eighties", "nineties"];

function below100(n: number): string {
  if (n < 20) return ONES[n]!;
  const tens = TENS[Math.floor(n / 10)]!;
  return n % 10 === 0 ? tens : `${tens}-${ONES[n % 10]}`;
}

/** Whole number (0 to 999,999,999) in English words. */
function words(n: number): string {
  if (n < 100) return below100(n);
  if (n < 1000) {
    const rest = n % 100;
    return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` ${below100(rest)}` : ""}`;
  }
  const scales: [number, string][] = [[1_000_000, "million"], [1000, "thousand"]];
  for (const [size, name] of scales) {
    if (n >= size) {
      const rest = n % size;
      return `${words(Math.floor(n / size))} ${name}${rest ? ` ${words(rest)}` : ""}`;
    }
  }
  return String(n);
}

/** Two significant figures from 100 up, whole numbers below. */
function round2(n: number): number {
  if (n < 100) return Math.round(n);
  const step = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / step) * step;
}

export function sayTemperature(value: number, unit: "F" | "C" = "F"): string {
  void unit; // the same bands read naturally in either scale
  const r = Math.round(value);
  if (Math.abs(r) <= 2) return "around zero";
  if (r < 0) return `about minus ${words(-r)}`;
  if (r < 20 || r >= 100) return `about ${words(r)}`;
  const units = r % 10;
  const decade = Math.floor(r / 10);
  if (units === 0) return `about ${TENS[decade]}`;
  const third = units <= 3 ? "low" : units <= 6 ? "mid" : "high";
  return `${third} ${TENS_PLURAL[decade]}`;
}

export function sayMoney(amount: number, currency = "USD"): string {
  const code = currency.toUpperCase();
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "minus " : "";
  const rounded = abs >= 1_000_000 ? Math.round(abs / 100_000) * 100_000 : round2(abs);
  let spoken: string;
  if (abs >= 1_000_000) {
    const millions = rounded / 1_000_000;
    spoken = `${Number.isInteger(millions) ? millions : millions.toFixed(1)} million`;
  } else if (rounded >= 1100 && rounded < 10_000 && rounded % 100 === 0 && rounded % 1000 !== 0) {
    spoken = `${words(rounded / 100)} hundred`;
  } else {
    spoken = words(rounded);
  }
  if (code !== "USD") return `${sign}about ${spoken} ${code}`;
  if (abs === 0) return "nothing";
  if (abs < 1) return "under a dollar";
  const hedge = rounded === abs ? "" : "about ";
  if (rounded === 1) return `${sign}${hedge}a buck`;
  return `${sign}${hedge}${spoken} bucks`;
}

export function sayDistance(miles: number): string {
  const m = Math.abs(miles);
  if (m < 0.25) return "a little ways";
  if (m < 0.75) return "half a mile";
  if (m < 1.25) return "about a mile";
  if (m < 1.75) return "a mile and a half";
  if (m <= 2.5) return "a couple miles";
  return `about ${words(round2(m))} miles`;
}

export function sayMinutes(minutes: number): string {
  const m = Math.abs(minutes);
  if (m < 1) return "under a minute";
  const r = Math.round(m);
  if (r === 1) return "a minute";
  if (r === 2) return "a couple minutes";
  if (r <= 4) return "three, four minutes";
  if (r <= 9) return "five, ten minutes";
  if (r <= 12) return "about ten minutes";
  if (r <= 17) return "about fifteen minutes";
  if (r <= 24) return "about twenty minutes";
  if (r <= 37) return "half an hour";
  if (r <= 52) return "forty-five minutes or so";
  if (r <= 67) return "about an hour";
  if (r <= 82) return "about an hour and a quarter";
  if (r <= 105) return "an hour and a half";
  if (r < 120) return "almost two hours";
  const hours = m / 60;
  if (hours <= 2.5) return "a couple hours";
  if (hours < 36) return `about ${words(Math.round(hours))} hours`;
  return `about ${words(Math.round(hours / 24))} days`;
}

export function sayCount(n: number, exact: boolean): string {
  const r = Math.round(Math.abs(n));
  const sign = n < 0 ? "minus " : "";
  if (exact) return `${sign}${words(r)}`;
  if (r === 0) return "none";
  if (r <= 3) return `${sign}${words(r)}`;
  if (r <= 6) return "a few";
  if (r <= 9) return "several";
  if (r <= 30) return "a bunch";
  return "a lot";
}

export type SayKind = "temperature" | "money" | "distance" | "minutes" | "count";

/**
 * The one dispatcher Home calls. Returns null when the caller marked the value
 * exact (exact suppresses say), when the value is not a finite number, or for
 * an unknown kind, so the caller simply omits `say`.
 */
export function sayFor(
  kind: SayKind,
  value: number,
  opts: { exact?: boolean; unit?: string; currency?: string } = {},
): string | null {
  if (opts.exact === true) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  switch (kind) {
    case "temperature":
      return sayTemperature(value, opts.unit?.toUpperCase() === "C" ? "C" : "F");
    case "money":
      return sayMoney(value, opts.currency);
    case "distance":
      return sayDistance(value);
    case "minutes":
      return sayMinutes(value);
    case "count":
      return sayCount(value, false);
    default:
      return null;
  }
}
