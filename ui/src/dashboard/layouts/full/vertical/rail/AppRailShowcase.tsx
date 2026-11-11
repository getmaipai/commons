import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "../../../../components/ui/tooltip";
import AppRail from "./AppRail";

/** Fixed host destination example: Media sits below Chat and is absent from pin management. */
export default function AppRailShowcase() {
  return (
    <MemoryRouter initialEntries={["/media"]}>
      <TooltipProvider>
        <div className="h-96 overflow-hidden rounded-lg border border-border">
          <AppRail expanded items={[
            { id: "home", label: "Home", icon: "house", href: "/" },
            { id: "chat", label: "Chat", icon: "message-circle", href: "/chat", group: "work" },
            { id: "media", label: "Media", icon: "film", href: "/media", group: "create" },
            { id: "settings", label: "Settings", icon: "settings", href: "/settings", group: "manage" },
          ]} groups={[{ id: "default" }, { id: "work", label: "Work" }, { id: "create", label: "Create" }, { id: "manage", label: "Manage" }]} />
        </div>
      </TooltipProvider>
    </MemoryRouter>
  );
}
