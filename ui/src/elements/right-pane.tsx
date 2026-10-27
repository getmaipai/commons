import { useEffect, useRef, type ReactNode } from "react";
import { Pin, X } from "lucide-react";
import { Button } from "@/kit/ui/button";
import { Sidebar, SidebarContent, SidebarProvider, useSidebar } from "@/kit/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/kit/ui/tabs";

export interface RightPaneTab { id: string; label: string; content: ReactNode; }

export interface RightPaneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
  companionTab: RightPaneTab;
  tabs?: RightPaneTab[];
  activeTab: string;
  onActiveTabChange: (id: string) => void;
  title?: ReactNode;
  headerActions?: ReactNode;
  avatar: ReactNode;
  pinLabel: string;
  closeLabel: string;
  label: string;
}

export function RightPane({ open, onOpenChange, pinned, onPinnedChange, companionTab, tabs = [], activeTab, onActiveTabChange, title, headerActions, avatar, pinLabel, closeLabel, label }: RightPaneProps) {
  const allTabs = [companionTab, ...tabs];
  const selected = allTabs.some((tab) => tab.id === activeTab) ? activeTab : companionTab.id;
  useEffect(() => {
    if (selected !== activeTab) onActiveTabChange(companionTab.id);
  }, [activeTab, companionTab.id, onActiveTabChange, selected]);
  const panel = <>
    <header className="flex min-h-14 items-center gap-2 border-b border-sidebar-border px-3">
      <div className="min-w-0 flex-1 truncate font-medium">{title ?? allTabs.find((tab) => tab.id === selected)?.label}</div>
      {headerActions ? <div className="flex shrink-0 items-center gap-1">{headerActions}</div> : null}
      <div className="shrink-0">{avatar}</div>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={pinLabel} aria-pressed={pinned} onClick={() => onPinnedChange(!pinned)}><Pin aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={closeLabel} onClick={() => onOpenChange(false)}><X aria-hidden="true" /></Button>
    </header>
    <Tabs value={selected} onValueChange={onActiveTabChange} className="min-h-0 flex-1 gap-0">
      <TabsList aria-label={`${label} tabs`} variant="line" className="w-full justify-start overflow-x-auto rounded-none border-b border-sidebar-border px-2">
        {allTabs.map((tab) => <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>)}
      </TabsList>
      {allTabs.map((tab) => <TabsContent key={tab.id} value={tab.id} className="min-h-0 flex-1 overflow-y-auto p-3">{tab.content}</TabsContent>)}
    </Tabs>
  </>;

  return <SidebarProvider open={open} onOpenChange={onOpenChange} className="pointer-events-none z-40 justify-end">
    <MobileOpenSync open={open} />
    <Sidebar side="right" collapsible={pinned ? "none" : "offcanvas"} aria-label={label} className={pinned ? "pointer-events-auto ml-auto h-full border-l border-sidebar-border" : "pointer-events-auto"}>
      <SidebarContent className="gap-0 overflow-hidden p-0">{panel}</SidebarContent>
    </Sidebar>
  </SidebarProvider>;
}

function MobileOpenSync({ open }: { open: boolean }) {
  const { isMobile, openMobile, setOpenMobile, setOpen } = useSidebar();
  const initialized = useRef(false);
  const lastOpen = useRef(open);
  useEffect(() => {
    if (!isMobile) { initialized.current = false; return; }
    if (!initialized.current) {
      initialized.current = true;
      lastOpen.current = open;
      setOpenMobile(open);
      return;
    }
    if (open !== lastOpen.current) {
      lastOpen.current = open;
      setOpenMobile(open);
    } else if (openMobile !== open) {
      lastOpen.current = openMobile;
      setOpen(openMobile);
    }
  }, [isMobile, open, openMobile, setOpen, setOpenMobile]);
  return null;
}
