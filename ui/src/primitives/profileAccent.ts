import type { CSSProperties } from "react";
import type { Person } from "@maipai/spec/gen/ts/person.js";

export type ProfileAccent = NonNullable<Person["accent"]>;

export function profileAccentStyle(accent: ProfileAccent): CSSProperties & { "--profile-accent-active": string } {
  return { "--profile-accent-active": `var(--profile-accent-${accent})` };
}
