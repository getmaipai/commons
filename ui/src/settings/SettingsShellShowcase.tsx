// Showcase of the settings shell (KIT-SET-02): a demo area with the three
// kinds of section (keys, view, arrow row), a pill search that works on the
// demo rows, and the content pane. No props, no data; Home's UI showcase page
// mounts it.
import { useState, type CSSProperties } from "react";
import { SettingsShell } from "./SettingsShell";
import { SettingsShowcase } from "./SettingsShowcase";
import type { SettingsAreaDef, SettingsViewer } from "./settingsAudience";
import { i18n } from "@/kit/i18n"

const demoArea = (): SettingsAreaDef => ({
  id: "demo",
  title: i18n._({ id: "ui.Settings", message: "Settings" }),
  audience: { min_role: "guest" },
  groups: [
    { label: i18n._({ id: "ui.Personal", message: "Personal" }), sections: ["general", "notifications", "profile", "appearance"] },
    { label: i18n._({ id: "ui.Integrations", message: "Integrations" }), sections: ["plugins", "account"] },
  ],
  sections: [
    { id: "general", label: i18n._({ id: "ui.General", message: "General" }), icon: "settings", kind: "keys", cards: [{ label: i18n._({ id: "ui.Chat", message: "Chat" }), group: "demo.chat", scope: "person" }] },
    { id: "notifications", label: i18n._({ id: "ui.Notifications", message: "Notifications" }), icon: "bell", kind: "keys", cards: [{ label: i18n._({ id: "ui.Alerts", message: "Alerts" }), group: "demo.alerts", scope: "person" }] },
    { id: "profile", label: i18n._({ id: "ui.Profile", message: "Profile" }), icon: "user", kind: "link", href: "/profile" },
    { id: "appearance", label: i18n._({ id: "ui.Appearance", message: "Appearance" }), icon: "palette", kind: "keys", cards: [{ label: i18n._({ id: "ui.Look", message: "Look" }), group: "demo.look", scope: "person" }] },
    { id: "plugins", label: i18n._({ id: "ui.Plugins", message: "Plugins" }), icon: "plug", kind: "keys", cards: [{ label: i18n._({ id: "ui.Plugins", message: "Plugins" }), group: "demo.plugins", scope: "person" }] },
    { id: "account", label: i18n._({ id: "ui.Account", message: "Account" }), icon: "user-round", kind: "link", href: "/account" },
  ],
});

const VIEWER: SettingsViewer = { role: "adult", band: "adult" };

export function SettingsShellShowcase() {
  const [active, setActive] = useState("general");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("overview");
  return (
    <div className="h-[640px] overflow-hidden rounded-xl border border-settings-column-divider" style={{ "--settings-shell-min-height": "0px" } as CSSProperties}>
      <SettingsShell
        area={demoArea()}
        viewer={VIEWER}
        activeSection={active}
        onNavigate={(to) => to.kind === "section" && setActive(to.sectionId)}
        searchQuery={query}
        onSearchChange={setQuery}
        contentAs="section"
        onBack={() => setActive("")}
        sides={{ value: "mine", label: i18n._({ id: "ui.Settings scope", message: "Settings scope" }), options: [{ id: "mine", label: i18n._({ id: "ui.Mine", message: "Mine" }) }, { id: "household", label: i18n._({ id: "ui.Household", message: "Household" }) }], onChange: () => {} }}
        trail={[{ label: i18n._({ id: "ui.Settings", message: "Settings" }), href: "/settings" }, { label: i18n._({ id: "ui.Chat", message: "Chat" }) }, { label: i18n._({ id: "ui.General", message: "General" }) }]}
        tabs={[{ id: "overview", label: i18n._({ id: "ui.Overview", message: "Overview" }) }, { id: "models", label: i18n._({ id: "ui.Models", message: "Models" }) }, { id: "advanced", label: i18n._({ id: "ui.Advanced", message: "Advanced" }) }]}
        tab={tab}
        onTabChange={setTab}
      >
        <SettingsShowcase />
      </SettingsShell>
    </div>
  );
}
