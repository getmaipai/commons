import { FC } from 'react';
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
}

const FullLayout: FC<FullLayoutProps> = ({ headerSearchRemote }) => {

  return (
    <SidebarProvider
           defaultOpen={true}
      style={{ "--sidebar-width-icon": "52px" } as React.CSSProperties}
    >
      <HeaderExtraProvider>
        <Sidebar />

      <SidebarInset className="outline outline-border m-2 rounded-none! overflow-hidden">
        {/* Top Header  */}
       <Header headerSearchRemote={headerSearchRemote} />

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
