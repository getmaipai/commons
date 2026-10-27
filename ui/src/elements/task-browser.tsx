import { useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/kit/ui/badge";
import { Button } from "@/kit/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/kit/ui/tabs";
import { cn } from "@/kit/utils";

export interface TaskBrowserTab { id: string; label: string; count?: number; }
export interface TaskBrowserItem { id: string; title: string; line?: ReactNode; meta?: ReactNode; badge?: ReactNode; }
export interface TaskBrowserProps {
  tabs: TaskBrowserTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  items: TaskBrowserItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  detail: ReactNode;
  empty: ReactNode;
  backLabel: string;
  label: string;
}

export function TaskBrowser({ tabs, activeTab, onTabChange, items, selectedId, onSelect, detail, empty, backLabel, label }: TaskBrowserProps) {
  const [showDetailOnPhone, setShowDetailOnPhone] = useState(false);

  // Changing tab or clearing the selection returns to the list. Selecting an item must not: it changes `selectedId` too.
  useEffect(() => {
    setShowDetailOnPhone(false);
  }, [activeTab]);
  useEffect(() => {
    if (selectedId === null) setShowDetailOnPhone(false);
  }, [selectedId]);

  const selectItem = (id: string) => {
    onSelect(id);
    setShowDetailOnPhone(true);
  };

  return (
    <section aria-label={label} data-slot="task-browser" className="min-w-0">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList aria-label={`${label} tabs`} className="max-w-full overflow-x-auto">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
              {tab.count != null && tab.count > 0 ? <Badge variant="secondary" className="ml-1 px-1.5 py-0">{tab.count}</Badge> : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="grid min-w-0 gap-6 md:grid-cols-[18rem_minmax(0,1fr)]">
        <div className={cn("min-w-0", showDetailOnPhone && "hidden md:block")}>
          {items.length === 0 ? empty : (
            <ul aria-label={`${label} items`} className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" aria-current={selectedId === item.id ? "true" : undefined} onClick={() => selectItem(item.id)} className={cn(
                    "min-h-12 w-full rounded-md px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedId === item.id ? "bg-primary/10" : "hover:bg-muted",
                  )}>
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0 font-medium">{item.title}</span>
                      {item.badge}
                    </span>
                    {item.line != null ? <span className="mt-1 block text-sm text-muted-foreground">{item.line}</span> : null}
                    {item.meta != null ? <span className="mt-1 block text-xs text-muted-foreground">{item.meta}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cn("min-w-0", !showDetailOnPhone && "hidden md:block")}>
          {showDetailOnPhone ? <Button type="button" variant="ghost" className="mb-3 md:hidden" onClick={() => setShowDetailOnPhone(false)}>{backLabel}</Button> : null}
          {detail}
        </div>
      </div>
    </section>
  );
}
