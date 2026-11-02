const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diffMs = now.getTime() - then;
  if (diffMs < 0) return shortDate(then, now);
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "now";
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 24) return `${diffH}h`;
  const dayDiff = calendarDayDiff(now, new Date(then));
  if (dayDiff === 1) return "Yesterday";
  const diffD = Math.floor(diffMs / 86_400_000);
  if (diffD < 7) return `${diffD}d`;
  return shortDate(then, now);
}

function calendarDayDiff(later: Date, earlier: Date): number {
  const local = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((local(later) - local(earlier)) / 86_400_000);
}

function shortDate(ms: number, now: Date): string {
  const date = new Date(ms);
  const year = date.getFullYear() === now.getFullYear() ? "" : ` ${date.getFullYear()}`;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}${year}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Milliseconds for a date field: an ISO string, or epoch seconds or milliseconds. Undefined when it is not a date. */
export function dateMs(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value < 1e11 ? value * 1000 : value;
  if (typeof value === "string" && value !== "") {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }
  return undefined;
}

/** The local calendar day of a date field as `YYYY-MM-DD`, the key a day group shares; undefined when it is not a date. */
export function dayKey(value: unknown): string | undefined {
  const ms = dateMs(value);
  if (ms === undefined) return undefined;
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A day group's words: "Today", "Yesterday", then "Mon, Oct 27" (the year too when it is not this year). */
export function dayHeading(key: string, now: Date = new Date()): string {
  const [y, m, d] = key.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) return key;
  const day = new Date(y, m - 1, d);
  const diff = calendarDayDiff(now, day);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const year = y === now.getFullYear() ? "" : `, ${y}`;
  return `${WEEKDAYS[day.getDay()]}, ${MONTHS[m - 1]} ${d}${year}`;
}
