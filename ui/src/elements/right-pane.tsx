import { useEffect, type ReactNode } from "react";
import { useBreakpoint } from "@/kit/hooks/useBreakpoint";
import { Pin, X } from "lucide-react";
import { Button } from "@/kit/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/kit/ui/sheet";
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
  const body = <aside aria-label={label} className="flex h-full w-[22rem] max-w-[100vw] flex-col overflow-hidden border-l border-sidebar-border bg-sidebar text-sidebar-foreground">{panel}</aside>;
  // A pinned pane takes its own width beside the page; an unpinned one floats over it and closes on outside click or Escape. On a phone it is the kit sheet.
  if (phone) return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" showCloseButton={false} className="w-[22rem] max-w-[100vw] gap-0 p-0">
      <SheetTitle className="sr-only">{label}</SheetTitle>
      <SheetDescription className="sr-only">{label}</SheetDescription>
      {body}
    </SheetContent>
  </Sheet>;
  if (!open) return null;
  if (pinned) return <div data-slot="right-pane" data-pinned="" className="h-full">{body}</div>;
  return <>
    <div aria-hidden="true" data-slot="right-pane-backdrop" className="fixed inset-0 z-30" onClick={() => onOpenChange(false)} />
    <div data-slot="right-pane" className="fixed inset-y-0 right-0 z-40 shadow-xl">{body}</div>
  </>;
}
