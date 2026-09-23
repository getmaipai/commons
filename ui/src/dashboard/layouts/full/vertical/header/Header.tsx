


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
import { useHeaderExtraLeft } from "./HeaderExtraContext";


const Header = () => {

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
          <div className="mx-auto flex flex-wrap items-center p-2">
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
