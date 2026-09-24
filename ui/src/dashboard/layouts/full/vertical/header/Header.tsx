


import { useSidebar } from "../../../../components/ui/sidebar";
import { Button } from "../../../../components/ui/button";
import { PanelLeft } from 'lucide-react';
import { Separator } from "../../../../components/ui/separator";

import { cn } from "../../../../lib/utils";
import FullLogo from "../../shared/logo/FullLogo";
import Search from "./Search";

import Profile from "./Profile";
import LightDark from "./Light-Dark";

import Notifications from "./Notifications";
import HeaderSearch, { type HeaderSearchProps } from "./HeaderSearch";
import { useHeaderExtraLeft } from "./HeaderExtraContext";

export interface HeaderProps {
  /** SHELL-SEARCH-02 (home, 2026-09-23): threaded straight through to
   * `HeaderSearch`'s own `remote` prop - `Header.tsx` has no logic of
   * its own here, it just passes the value along, the same as
   * `FullLayout.tsx` does one level up. */
  headerSearchRemote?: HeaderSearchProps["remote"];
}

const Header = ({ headerSearchRemote }: HeaderProps = {}) => {

  const { toggleSidebar } = useSidebar();
  const HeaderExtraLeft = useHeaderExtraLeft();

  return (
    <>
      <header className={cn(`sticky top-0 z-2 bg-background border-b border-border`)}>
        <nav>
          {/* justify-between left off on purpose: with the left group
           * below given flex-grow, it always claims 100% of this row's
           * free space by construction, so there is never anything
           * left for justify-content to distribute (a review, 2026-09-23:
           * a class that does nothing is worse than no class, for the
           * next person reading this). */}
          {/* flex-nowrap below sm, flex-wrap at sm and up - found live
           * (CHAT-HEADER-03, home, 2026-09-23) capturing the chat
           * page's own title at 390px: flex-wrap's line-breaking
           * decision uses each item's un-shrunk natural size, computed
           * from `white-space: nowrap` text's own full, un-truncated
           * width (truncate's min-w-0 only affects the later shrink
           * step, never this one) - so a long chat title, exactly the
           * content `truncate` exists to handle, forced the whole row
           * to wrap instead of the title alone truncating on one line,
           * the same way plain non-wrapping text with an ellipsis is
           * supposed to. Below sm (640px, `Search`'s own wrapper below
           * hides it entirely - `sm:block hidden`), there is nothing
           * on the left group heavy enough to ever need the wrap
           * escape valve, so nowrap there costs nothing and fixes the
           * chat title; at sm and up, flex-wrap comes back to keep the
           * Search-overflow fix below intact for that band. */}
          <div className="mx-auto flex flex-nowrap sm:flex-wrap items-center p-2">
            {/* flex-auto (flex-basis: auto), not flex-1 (flex-basis: 0%)
             * - a review (2026-09-23) caught flex-1 zeroing this group's
             * own hypothetical size for flex-wrap's line-breaking
             * decision, so on every page that renders the default
             * Search fallback below (no HeaderExtraLeft set) instead of
             * wrapping the icon group to a second line at a narrow
             * width, the fixed-width Search box just overflowed and
             * overlapped it. flex-auto still grows into free space
             * (flex-grow is independent of flex-basis) and still
             * shrinks with min-w-0 once space is genuinely short, but
             * its own real content width - not zero - is what the wrap
             * decision sees first. */}
            <div className="flex min-w-0 flex-auto gap-2 items-center">
              <div className="block lg:hidden">
                <FullLogo />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="p-2 hover:bg-primary/5 rounded-full transition cursor-pointer"
                onClick={toggleSidebar}
              >
                <PanelLeft size={21}
                />
                {/* CHAT-FIND-0923-02, adjacent gap found live: this
                    trigger had no accessible name at all - the kit's own
                    SidebarTrigger (sidebar.tsx, not actually used here)
                    already has exactly this sr-only span and nothing
                    else (no aria-label alongside it); mirrored, not
                    invented. */}
                <span className="sr-only">Toggle Sidebar</span>
              </Button>




               {/* <Separator
                orientation="vertical"
                className="w-px h-5 mx-2 bg-border self-center max-lg:hidden"
              /> */}

 <Separator
                orientation="vertical"
                className="h-4 mr-4 w-px  ml-2   bg-border self-center max-lg:hidden"
              />


              {HeaderExtraLeft ? (
                <HeaderExtraLeft />
              ) : (
                <div className="sm:block hidden">
                  <Search />
                </div>
              )}
            </div>

            <div className="flex shrink-0 sm:gap-1 gap-0 items-center">
              {/* SHELL-SEARCH-01: the one global search, left of the
               * theme toggle on every page - see HeaderSearch.tsx's own
               * comment for why this is a plain unconditional render,
               * not a slot. SHELL-SEARCH-02: `headerSearchRemote` (a
               * caller's own optional prop, undefined by default) rides
               * straight through as `remote`. */}
              <HeaderSearch remote={headerSearchRemote} />

              {/* Theme Toggle */}
              <LightDark />
            

             

              {/* Notifications Dropdown */}
              <Notifications className="sm:block hidden" />

           

              {/* Profile Dropdown */}
              <Profile />
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Header;
