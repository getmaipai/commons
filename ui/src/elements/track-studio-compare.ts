// MP-04 follow-up: Compare for TrackStudio kind="audio". The same rule as the ImageEditor's Compare (compareBase in image-editor-state.ts): the
// "before" is the newest version earlier than the current one; with none there is nothing to compare and the control says why. Pure, no DOM.

export interface StudioCompareVersion { id: string; url: string; label?: string }
/** Two sources, or the song's versions oldest first with the current one named; the Element picks the newest earlier version. */
export type StudioCompare =
  | { before_url: string; after_url: string; label?: string }
  | { versions: readonly StudioCompareVersion[]; current_id: string; label?: string };
export interface StudioComparePair { before_url: string; after_url: string; label?: string }

export function resolveCompare(compare: StudioCompare | undefined | null): StudioComparePair | null {
  if (!compare) return null;
  if ("versions" in compare) {
    const at = compare.versions.findIndex((v) => v.id === compare.current_id);
    const current = at >= 0 ? compare.versions[at] : undefined;
    const before = at > 0 ? compare.versions[at - 1] : undefined;
    if (!current || !before || !current.url || !before.url || current.url === before.url) return null;
    return { before_url: before.url, after_url: current.url, label: compare.label ?? before.label };
  }
  if (!compare.before_url || !compare.after_url || compare.before_url === compare.after_url) return null;
  return { before_url: compare.before_url, after_url: compare.after_url, label: compare.label };
}
