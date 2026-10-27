import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useBreakpoint } from "@/kit/hooks/useBreakpoint";
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

  const phone = useBreakpoint().tier === "phone";
  useEffect(() => {
    if (!open || pinned || phone) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onOpenChange(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pinned, phone, onOpenChange]);
  const body = <Sidebar side="right" collapsible={phone ? "offcanvas" : "none"} aria-label={label} className="h-full border-l border-sidebar-border">
    <SidebarContent className="gap-0 overflow-hidden p-0">{panel}</SidebarContent>
  </Sidebar>;
  // A pinned pane takes its own width beside the page; an unpinned one floats over it and closes on outside click or Escape. On a phone the sidebar's own sheet does both.
  if (phone) return <SidebarProvider open={open} onOpenChange={onOpenChange} style={{ "--sidebar-width": "22rem" } as CSSProperties} className="pointer-events-none min-h-0 w-auto"><MobileOpenSync open={open} />{body}</SidebarProvider>;
  if (!open) return null;
  const provider = <SidebarProvider open style={{ "--sidebar-width": "22rem" } as CSSProperties} className="min-h-0 h-full w-auto">{body}</SidebarProvider>;
  if (pinned) return <div data-slot="right-pane" data-pinned="" className="h-full">{provider}</div>;
  return <>
    <div aria-hidden="true" data-slot="right-pane-backdrop" className="fixed inset-0 z-30" onClick={() => onOpenChange(false)} />
    <div data-slot="right-pane" className="fixed inset-y-0 right-0 z-40 shadow-xl">{provider}</div>
  </>;
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
