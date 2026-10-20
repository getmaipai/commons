import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "../../../../components/ui/tooltip";
import AppRail from "./AppRail";

/** Fixed host destination example: Media sits below Chat and is absent from pin management. */
export default function AppRailShowcase() {
  return (
    <MemoryRouter initialEntries={["/media"]}>
      <TooltipProvider>
        <div className="h-96 overflow-hidden rounded-lg border border-border">
          <AppRail coreDestinations={[{ name: "Media", url: "/media", icon: "film" }]} />
        </div>
      </TooltipProvider>
    </MemoryRouter>
  );
}
