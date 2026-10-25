// The shell's nav contract (spec/ui/schema.json's `nav_entry` def is
// this same shape): a product's own pages register these, by hand or
// from a package manifest's `contributes.pages`; the shell never
// hardcodes what they are.
export interface NavEntry {
  to: string;
  icon: string;
  label: string;
  exact?: boolean;
}

/** Whether `pathname` is at or under the nav entry `to` - a real
 * segment boundary, not a bare string prefix: `/media` must not match
 * `/media-library`. The one definition every nav surface (the phone bar,
 * the desktop rail) highlights an active entry from. */
export function isActiveNavPath(pathname: string, to: string, exact = false): boolean {
  if (exact) return pathname === to;
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}
