// Compatibility shim (KIT-SET-03). The settings row moved to SettingRow.tsx
// and the label helpers to optionLabels.ts; Home still imports this path
// until APP-SET-05 re-points its callers and deletes this file.
export { titleCaseOption, localeDisplayName } from "./optionLabels";
export { SettingRow as SettingField } from "./SettingRow";
