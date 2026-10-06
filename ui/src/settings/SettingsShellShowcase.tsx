// Showcase of the settings shell (KIT-SET-02): a demo area with the three
// kinds of section (keys, view, arrow row), a pill search that works on the
// demo rows, and the content pane. No props, no data; Home's UI showcase page
// mounts it.
import { useState, type CSSProperties } from "react";
import { SettingsShell } from "./SettingsShell";
import { SettingsShowcase } from "./SettingsShowcase";
import type { SettingsAreaDef, SettingsViewer } from "./settingsAudience";

const DEMO_AREA: SettingsAreaDef = {
  id: "demo",
  title: "Settings",
  audience: { min_role: "guest" },
  groups: [
    { label: "Personal", sections: ["general", "notifications", "profile", "appearance"] },
    { label: "Integrations", sections: ["plugins", "account"] },
  ],
  sections: [
    { id: "general", label: "General", icon: "settings", kind: "keys", cards: [{ label: "Chat", group: "demo.chat", scope: "person" }] },
    { id: "notifications", label: "Notifications", icon: "bell", kind: "keys", cards: [{ label: "Alerts", group: "demo.alerts", scope: "person" }] },
    { id: "profile", label: "Profile", icon: "user", kind: "link", href: "/profile" },
    { id: "appearance", label: "Appearance", icon: "palette", kind: "keys", cards: [{ label: "Look", group: "demo.look", scope: "person" }] },
    { id: "plugins", label: "Plugins", icon: "plug", kind: "keys", cards: [{ label: "Plugins", group: "demo.plugins", scope: "person" }] },
    { id: "account", label: "Account", icon: "user-round", kind: "link", href: "/account" },
  ],
};

const VIEWER: SettingsViewer = { role: "adult", band: "adult" };

export function SettingsShellShowcase() {
  const [active, setActive] = useState("general");
  const [query, setQuery] = useState("");
  return (
    <div className="h-[640px] overflow-hidden rounded-xl border border-settings-column-divider" style={{ "--settings-shell-min-height": "0px" } as CSSProperties}>
      <SettingsShell
        area={DEMO_AREA}
        viewer={VIEWER}
        activeSection={active}
        onNavigate={(to) => to.kind === "section" && setActive(to.sectionId)}
        searchQuery={query}
        onSearchChange={setQuery}
        contentAs="section"
        onBack={() => setActive("")}
      >
        <SettingsShowcase />
      </SettingsShell>
    </div>
  );
}
