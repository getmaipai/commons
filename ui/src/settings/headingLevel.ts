import { createContext, useContext } from "react";

/** The heading level a settings card title uses. SettingsShell sets 2 (its
 * page title is the h1, so card titles are h2 with no skipped level); with
 * no shell around a SettingsRenderer the level stays 3, as it always was. */
export const SettingsHeadingLevelContext = createContext<2 | 3 | undefined>(undefined);

export function useSettingsHeadingLevel(override?: 2 | 3): 2 | 3 {
  const fromShell = useContext(SettingsHeadingLevelContext);
  return override ?? fromShell ?? 3;
}
