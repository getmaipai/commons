import { useIsPhoneLayout } from "../../../hooks/useIsPhoneLayout";
export { useIsPhoneLayout } from "../../../hooks/useIsPhoneLayout";
import MobileNavDrawer from "./vertical/rail/MobileNavDrawer";
import { FC, useState, type ReactNode } from 'react';
import AppRail, { type RailApp, type RailCoreDestination } from './vertical/rail/AppRail';
import { useHeaderExtraLeft } from './vertical/header/HeaderExtraContext';
import Sidebar from './vertical/sidebar/Sidebar';
import Header, { type HeaderProps } from './vertical/header/Header';
import { HeaderExtraProvider } from './vertical/header/HeaderExtraContext';
import { SidebarInset, SidebarProvider } from '../../components/ui/sidebar';
import { cn } from '../../lib/utils';
import Footer from './shared/footer/Footer';
import { Outlet } from 'react-router';

export interface FullLayoutProps {
  /** SHELL-SEARCH-02 (home, 2026-09-23): threaded straight through to
   * `Header`'s own `headerSearchRemote` prop. `FullLayout` is the one
   * component a caller actually instantiates itself (`<Route
   * element={<FullLayout />}>`, home's own `NextRoutes.tsx`) - passing
   * it here, rather than inventing a context, is how a value reaches
   * `Header`/`HeaderSearch` two vendored layers down with no fork. */
  headerSearchRemote?: HeaderProps["headerSearchRemote"];
  /** PROFILE-SHEET-01 (home, 2026-09-25): the signed-in person's real
   * name, threaded to the account sheet instead of its shipped demo
   * identity. */
  profileDisplayName?: HeaderProps["profileDisplayName"];
  /** INCOGNITO-08 slice 1 (home, 2026-09-25): the shared session-only
   * Incognito state and its change handler, threaded to the global header. */
  incognito?: HeaderProps["incognito"];
  onIncognitoChange?: HeaderProps["onIncognitoChange"];
  /** THEME-TOGGLE-01 (home, 2026-09-26): threaded straight through to
   * `Header`'s own `showThemeToggle` prop. */
  showThemeToggle?: HeaderProps["showThemeToggle"];
  /** STATUS-A1 (home, 2026-09-30): threaded straight through to
   * `Header`'s own `statusIndicator` prop. */
  statusIndicator?: HeaderProps["statusIndicator"];
  /** CHAT-CALM-ERRORS-01d (home, 2026-10-06): threaded straight through to
   * `Header`'s own `notifications` prop. */
  notifications?: HeaderProps["notifications"];
  /** Home can choose a first-run folded menu; existing consumers retain
   * the historical expanded default. A persisted sidebar_state cookie
   * always takes precedence. */
  defaultSidebarOpen?: boolean;
  /** Render the shipped sidebar trigger in the menu column. */
  showSidebarTriggerInMenu?: boolean;
  /** Keep the historical header trigger unless a consumer relocates it on desktop. */
  showHeaderSidebarTrigger?: boolean;
  /** Pass optional Home status markers to the menu entries. */
  sidebarItemStatus?: (item: { name: string; url?: string }) => { title: string; ariaLabel: string } | undefined;
  /** RAIL-01 (home, owner's layout 2026-10-06): the permanent 56px app
   * rail in place of the expanding sidebar and the global header. The
   * rail holds the brand, Search, the apps and `railProfile` at its
   * bottom; the header becomes a slim, page-only title bar drawn only
   * when a page places content in it. Off by default, so every other
   * consumer keeps the sidebar layout unchanged. */
  rail?: boolean;
  mobileSections?: ReactNode;
  settingsHref?: string;
  hideMobileMenu?: boolean;
  /** The profile control at the bottom of the rail (RailProfileMenu). */
  railProfile?: ReactNode;
  /** Stable tour target for the rail and its app entries. */
  railTourId?: string;
  railItemTourId?: (item: { name: string; url?: string }) => string | undefined;
  /** Tour target for the Incognito control. */
  incognitoTourId?: string;
  /** App destination to keep selected when the current route is outside that app (for example Settings). */
  activeAppHref?: string;
  /** Installed apps for the rail's pinned section and the launcher at its foot (see AppRailProps.apps). */
  railApps?: RailApp[];
  /** Fixed host-owned destinations, placed directly after Chat in the core rail. */
  railCoreDestinations?: RailCoreDestination[];
  onRailAppPinChange?: (url: string, pinned: boolean) => void;
  /** The host's All apps page; the rail's grid button opens it (see AppRailProps.allAppsHref). */
  railAllAppsHref?: string;
  /** The host's top-right control (the ambient companion): drawn once at the top right of the workspace, stays in view while the page scrolls, and the slim title bar leaves room for it. */
  topRight?: ReactNode;
}

/** The slim title bar of the rail layout: the page's own header content
 * only, 52px tall, one bottom divider. A page that draws its own header
 * (chat, beside its history column) places nothing and gets none. */
function RailPageHeader({ reserveBand, reserveEnd }: { reserveBand: boolean; reserveEnd: boolean }) {
  const Left = useHeaderExtraLeft();
  // On a phone with the floating menu button, the band is always drawn so the
  // button sits in it and no page content can start under the button.
  if (!Left && !reserveBand) return null;
  return (
    <header data-slot="rail-page-header" className={cn("sticky top-0 z-2 flex h-13 shrink-0 items-center gap-2 border-b border-border px-5", reserveEnd && "pe-16")}>
      {Left ? <Left /> : null}
    </header>
  );
}

function RailLayout({ headerSearchRemote, sidebarItemStatus, railProfile, activeAppHref, railTourId, railItemTourId, railApps, railCoreDestinations, onRailAppPinChange, railAllAppsHref, mobileSections, settingsHref, hideMobileMenu, topRight }: FullLayoutProps) {
  const phone = useIsPhoneLayout();
  const Navigation = phone ? MobileNavDrawer : AppRail;
  return (
    <HeaderExtraProvider>
      {/* The page scrolls as a document, as it did beside the sidebar;
          the rail stays put (sticky, full viewport height). A full-height
          page (a chat) bounds the workspace to the viewport itself. */}
      <div data-slot="rail-shell" className="flex min-h-svh w-full min-w-0 max-w-full overflow-x-clip">
        <Navigation mobileSections={mobileSections} settingsHref={settingsHref} hideMobileMenu={hideMobileMenu} searchRemote={headerSearchRemote} itemStatus={sidebarItemStatus} profile={railProfile} activeAppHref={activeAppHref} tourId={railTourId} itemTourId={railItemTourId} apps={railApps} coreDestinations={railCoreDestinations} onTogglePin={onRailAppPinChange} allAppsHref={railAllAppsHref} />
        <main data-slot="rail-workspace" data-phone-menu={phone && !hideMobileMenu ? "" : undefined} className="flex min-w-0 max-w-full flex-1 flex-col" style={{ background: "var(--page)" }}>
          {topRight ? <div data-slot="rail-top-right" className="pointer-events-none sticky top-2 z-30 h-0"><div className="flex h-9 justify-end pe-3 *:pointer-events-auto">{topRight}</div></div> : null}
          <RailPageHeader reserveBand={phone && !hideMobileMenu} reserveEnd={Boolean(topRight)} />
          <div data-slot="rail-body" className="min-w-0 max-w-full flex-1">
            <div className={cn("box-border min-w-0 max-w-full w-full mx-auto p-4", "container")}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </HeaderExtraProvider>
  );
}

export function resolveInitialSidebarOpen(cookie: string, defaultOpen: boolean): boolean {
  const stored = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("sidebar_state="))?.slice("sidebar_state=".length);
  return stored === "true" ? true : stored === "false" ? false : defaultOpen;
}

const FullLayout: FC<FullLayoutProps> = (props) => {
  if (props.rail) return <RailLayout {...props} />;
  return <SidebarFullLayout {...props} />;
};

const SidebarFullLayout: FC<FullLayoutProps> = ({ headerSearchRemote, profileDisplayName, incognito, onIncognitoChange, incognitoTourId, showThemeToggle, statusIndicator, notifications, defaultSidebarOpen = true, showSidebarTriggerInMenu = false, showHeaderSidebarTrigger = true, sidebarItemStatus }) => {
  const [initialSidebarOpen] = useState(() => {
    return resolveInitialSidebarOpen(typeof document === "undefined" ? "" : document.cookie, defaultSidebarOpen);
  });

  return (
    <SidebarProvider
           defaultOpen={initialSidebarOpen}
      style={{ "--sidebar-width-icon": "52px" } as React.CSSProperties}
    >
      <HeaderExtraProvider>
        <Sidebar showTrigger={showSidebarTriggerInMenu} sidebarItemStatus={sidebarItemStatus} />

      <SidebarInset className="outline outline-border m-2 rounded-none! overflow-hidden" style={{ background: "var(--page)" }}>
        {/* Top Header  */}
        <Header headerSearchRemote={headerSearchRemote} profileDisplayName={profileDisplayName} incognito={incognito} onIncognitoChange={onIncognitoChange} incognitoTourId={incognitoTourId} showThemeToggle={showThemeToggle} statusIndicator={statusIndicator} notifications={notifications} showSidebarTrigger={showHeaderSidebarTrigger ? true : showSidebarTriggerInMenu ? "mobile-only" : false} />

          {/* Body Content  */}
          <div className="flex flex-1 flex-col gap-4 p-4">
          <div className={cn("w-full mx-auto", "container")}>
            <div className=" min-h-[calc(100vh-140px)]"><Outlet /></div>
            <div className="pt-6">
              <Footer />
            </div>
          </div>
        </div>


      </SidebarInset>
      </HeaderExtraProvider>
    </SidebarProvider>
  );
};

export default FullLayout;
