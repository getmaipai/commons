import { useState } from "react";
import { Switch } from "@/kit/ui/switch";
import { SettingsPage } from "./SettingsPage";
import { SettingsRow } from "./SettingsRow";
import { SettingsSection } from "./SettingsSection";
import { SettingsSelect } from "./SettingsSelect";

const SECTIONS = [
  { id: "general", title: "General" },
  { id: "notifications", title: "Notifications" },
];

/** The showcase for the ChatGPT-style settings parts, with local state only. */
export function SettingsPartsShowcase() {
  const [active, setActive] = useState("general");
  const [theme, setTheme] = useState("system");
  const [sounds, setSounds] = useState(true);
  return (
    <SettingsPage sections={SECTIONS} activeId={active} onNavigate={setActive}>
      {active === "general" ? (
        <SettingsSection title="General">
          <SettingsRow
            label="Appearance"
            description="Pick light, dark, or match this device."
            control={
              <SettingsSelect
                aria-label="Appearance"
                value={theme}
                onValueChange={setTheme}
                options={[
                  { value: "system", label: "System" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
              />
            }
          />
          <SettingsRow
            label="Show reply timing"
            description="Adds how long each reply took under it."
            disabled
            disabledNote="Disabled by Dad"
            control={<Switch disabled aria-label="Show reply timing" />}
          />
        </SettingsSection>
      ) : (
        <SettingsSection title="Notifications">
          <SettingsRow
            label="Sounds"
            description="Plays a short sound when a reply arrives."
            control={<Switch checked={sounds} onCheckedChange={setSounds} aria-label="Sounds" />}
          />
        </SettingsSection>
      )}
    </SettingsPage>
  );
}
