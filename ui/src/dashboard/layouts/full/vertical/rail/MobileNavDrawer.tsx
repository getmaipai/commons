import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { Menu, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "../../../../components/ui/sheet";
import { RailEntries, type AppRailProps } from "./AppRail";

export default function MobileNavDrawer({ mobileSections, settingsHref, hideMobileMenu, ...props }: AppRailProps & { mobileSections?: ReactNode; settingsHref?: string; hideMobileMenu?: boolean }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); }, [location]);
  useEffect(() => {
    if (hideMobileMenu) return;
    let start: { x: number; y: number } | undefined;
    const begin = (event: TouchEvent) => {
      const touch = event.touches[0];
      start = touch && touch.clientX <= 20 && event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : undefined;
    };
    const move = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (start && touch && touch.clientX - start.x > 60 && Math.abs(touch.clientY - start.y) < 40) { setOpen(true); start = undefined; }
    };
    const end = () => { start = undefined; };
    document.addEventListener("touchstart", begin, { passive: true });
    document.addEventListener("touchmove", move, { passive: true });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
    return () => {
      document.removeEventListener("touchstart", begin);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
    };
  }, [hideMobileMenu]);
  return <Sheet open={open} onOpenChange={setOpen}>
    {!hideMobileMenu ? <SheetTrigger ref={trigger} aria-label="Open menu" data-slot="mobile-menu-button"
      className="fixed z-40 flex size-12 items-center justify-center rounded-full border border-border bg-sidebar text-sidebar-foreground shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)", left: "calc(env(safe-area-inset-left, 0px) + 8px)" }}><Menu aria-hidden className="size-5" /></SheetTrigger> : null}
    <SheetContent side="left" data-slot="mobile-nav-drawer" finalFocus={trigger} className="max-w-full gap-1 overflow-y-auto bg-sidebar p-4 text-sidebar-foreground"
      onClick={(event) => { if ((event.target as Element).closest("a")) setOpen(false); }}>
      <SheetTitle className="sr-only">App menu</SheetTitle>
      <RailEntries {...props} profile={undefined} mobile>
        {mobileSections ? <div className="mt-3 border-t border-border pt-3">{mobileSections}</div> : null}
      </RailEntries>
      <div className="mt-auto flex shrink-0 items-center justify-between border-t border-border pt-3">
        {props.profile}
        {settingsHref ? <Link to={settingsHref} aria-label="Settings" className="flex size-12 items-center justify-center rounded-lg hover:bg-foreground/5"><Settings aria-hidden className="size-5" /></Link> : null}
      </div>
    </SheetContent>
  </Sheet>;
}
