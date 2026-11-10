/** A same-origin picture or clip path, or nothing: an address with a scheme or a host is never loaded (RowMedia's rule). */
export function localPicture(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return isOwnBlobUrl(value) ? value : null;
}

/** ADULT-LOCK-03b: a `blob:` object URL this page made for its own origin. An unlocked adult-only picture or clip cannot ride on a plain path (the proof is a
 * header, and a `<img src>` or `<video src>` cannot send one), so the host fetches it with the header into a Blob and hands the row that object URL. A page can
 * only make blob URLs for its own origin, so this loads nothing from elsewhere; any other scheme or host is still refused. */
export function isOwnBlobUrl(value: string): boolean {
  return typeof location !== "undefined" && location.origin !== "null" && value.startsWith(`blob:${location.origin}/`);
}
