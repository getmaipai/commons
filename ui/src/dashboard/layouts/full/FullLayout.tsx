import { FC, useState } from 'react';
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
}

export function resolveInitialSidebarOpen(cookie: string, defaultOpen: boolean): boolean {
  const stored = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("sidebar_state="))?.slice("sidebar_state=".length);
  return stored === "true" ? true : stored === "false" ? false : defaultOpen;
}

const FullLayout: FC<FullLayoutProps> = ({ headerSearchRemote, profileDisplayName, incognito, onIncognitoChange, showThemeToggle, statusIndicator, defaultSidebarOpen = true, showSidebarTriggerInMenu = false, showHeaderSidebarTrigger = true, sidebarItemStatus }) => {
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
        <Header headerSearchRemote={headerSearchRemote} profileDisplayName={profileDisplayName} incognito={incognito} onIncognitoChange={onIncognitoChange} showThemeToggle={showThemeToggle} statusIndicator={statusIndicator} showSidebarTrigger={showHeaderSidebarTrigger ? true : showSidebarTriggerInMenu ? "mobile-only" : false} />

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
