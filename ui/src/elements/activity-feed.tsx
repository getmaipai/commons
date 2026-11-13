import type { ReactNode } from "react";
import { DayDivider } from "./day-separator";
import { cn } from "@/kit/utils";
import { i18n } from "@/kit/i18n"
import { useInsertedKeys } from "@/kit/hooks/useInsertedKeys";

export type ActivityTone = "needs_you" | "working" | "done" | "plain";

export interface ActivityFeedItem {
  id: string;
  title: string;
  line?: ReactNode;
  meta?: ReactNode;
  tone?: ActivityTone;
  action?: ReactNode;
}

export interface ActivityFeedGroup {
  id: string;
  label: string;
  items: ActivityFeedItem[];
}

export interface ActivityFeedProps {
  groups: ActivityFeedGroup[];
  aside?: ReactNode;
  empty?: ReactNode;
  label: string;
}

const toneText = (): Record<ActivityTone, string> => ({
  needs_you: i18n._({ id: "ui.Needs you", message: "Needs you" }),
  working: i18n._({ id: "ui.Working", message: "Working" }),
  done: i18n._({ id: "ui.Done", message: "Done" }),
  plain: "",
});

export function ActivityFeed({ groups, aside, empty, label }: ActivityFeedProps) {
  const inserted = useInsertedKeys(groups.flatMap((group) => group.items.map((item) => item.id)));
  return (
    <section aria-label={label} data-slot="activity-feed">
      {groups.length === 0 ? empty : (
        <div className={cn("grid gap-8", aside && "lg:grid-cols-[minmax(0,1fr)_20rem]")}>
          {aside ? <aside className="order-first min-w-0 lg:sticky lg:top-6 lg:order-last lg:self-start">{aside}</aside> : null}
          <div className="min-w-0">
            {groups.map((group) => (
              <section key={group.id} aria-label={group.label} className="mb-7 last:mb-0">
                <DayDivider label={group.label} className="mb-3" />
                <ul className="divide-y divide-border">
                  {group.items.map((item) => {
                    const tone = item.tone ?? "plain";
                    return (
                      <li key={item.id} className={cn("flex min-w-0 items-center gap-3 py-4", inserted.has(item.id) && "motion-list")}>
                        <span aria-hidden="true" className={cn(
                          "size-2 shrink-0 rounded-full bg-muted-foreground",
                          tone === "needs_you" && "bg-primary",
                          tone === "working" && "animate-pulse motion-reduce:animate-none",
                        )} />
                        <span className="sr-only">{toneText()[tone]}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{item.title}</div>
                          {item.line != null ? <div className="text-muted-foreground">{item.line}</div> : null}
                          {item.meta != null ? <div className="text-xs text-muted-foreground">{item.meta}</div> : null}
                        </div>
                        {item.action ? <div className="shrink-0">{item.action}</div> : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
