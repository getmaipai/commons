import { useEffect, useRef, useState, type ReactNode } from "react";
import { getIcon, type IconName } from "@/kit/icons";
import { Button } from "@/kit/ui/button";
import { Sheet, SheetContent } from "@/kit/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/kit/ui/tabs";
import { StatusPill } from "@/kit/blocks/cards/StatusPill";
import type { StatusKind } from "@/kit/status";
import { cn } from "@/kit/utils";

const CloseIcon = getIcon("x");

export interface DetailsPaneAction {
  label: string;
  icon?: IconName;
  onClick: () => void | Promise<void>;
  destructive?: boolean;
  disabledReason?: string;
  /** A destructive action with no confirmLabel fires immediately on
   * click, the same as any other action - only a destructive action
   * that actually needs one (uninstalling a package, not merely
   * restarting it) should set this. ThingsTable's own row/group
   * actions already confirm this way; this pane had no confirm step
   * at all until a Home page found the gap wiring a real Remove. */
  confirmLabel?: string;
}

export interface DetailsPaneTab {
  id: string;
  label: string;
  content: ReactNode;
}

export interface DetailsPaneProps {
  open: boolean;
  onClose: () => void;
  icon: IconName;
  hue: string;
  name: string;
  identifier: string;
  status: StatusKind;
  tabs?: DetailsPaneTab[];
  actions?: DetailsPaneAction[];
}

// 560/480/640, 16-20 inset, 16 radius, thin blue border, the shadow
// token; open 200ms/24px translate, close 160ms, none under reduced
// motion (spec: "Component browser and details pane reference"). Built
// on the kit's Sheet (Radix Dialog under it) for the overlay, Escape
// and focus trap it already gives for free; this file adds the pane's
// own geometry, header, tabs and action rail on top.
export function DetailsPane({ open, onClose, icon, hue, name, identifier, status, tabs = [], actions = [] }: DetailsPaneProps) {
  const Icon = getIcon(icon);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [confirming, setConfirming] = useState<DetailsPaneAction | null>(null);
  const [busy, setBusy] = useState(false);

  // A confirm pending for one item must never survive onto a different
  // one, or a still-open pane re-rendered for a new selection: a review
  // caught this exact gap live - the parent swaps `identifier` as the
  // selected row changes (the pane's own master-detail contract), and
  // with no reset here a stale confirm banner (and its captured
  // `onClick` closure) stayed armed for the item that was open when the
  // user clicked, invisibly, under the new item's name.
  useEffect(() => {
    setConfirming(null);
    setBusy(false);
  }, [identifier, open]);

  function runAction(action: DetailsPaneAction) {
    if (action.confirmLabel) setConfirming(action);
    else void action.onClick();
  }

  // Radix's own AlertDialogAction closes on click before an async
  // action settles - the exact bug ConfirmDialog.tsx (the schema
  // renderer's own confirm) was built to avoid (2026-09-05: a batch
  // action that failed partway showed no error, the dialog already
  // gone). This confirm is a plain inline block, not that dialog (a
  // pane's own action rail, not a schema-driven `PendingConfirm`), but
  // the same rule applies: only `onClick` settling is allowed to close
  // it, `busy` blocks Cancel and the pane's own Close/Escape too.
  async function confirmAction() {
    if (!confirming) return;
    setBusy(true);
    try {
      await confirming.onClick();
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  function requestClose() {
    if (busy) return;
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) requestClose(); }}>
      <SheetContent
        showCloseButton={false}
        side="right"
        role="complementary"
        aria-label={`${name} details`}
        onOpenAutoFocus={(event) => { event.preventDefault(); headingRef.current?.focus(); }}
        onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}
        className={cn(
          "inset-y-4 right-4 h-auto w-[560px] min-w-[480px] max-w-[640px] rounded-2xl border border-[var(--primary)]/40 bg-[var(--surface-card)] shadow-[var(--shadow-panel)]",
          "duration-200 data-[state=closed]:duration-150 data-[state=closed]:slide-out-to-right-6 data-[state=open]:slide-in-from-right-6",
          "motion-reduce:transition-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
          "max-[959px]:inset-4 max-[959px]:w-auto max-[959px]:max-w-none",
          "max-[719px]:inset-0 max-[719px]:h-svh max-[719px]:w-full max-[719px]:min-w-0 max-[719px]:rounded-none max-[719px]:border-0",
        )}
      >
        <div className="flex items-center gap-3 border-b p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in srgb, var(${hue}) 16%, transparent)`, color: `var(${hue})` }}>
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 ref={headingRef} tabIndex={-1} className="truncate text-base font-semibold outline-none">{name}</h2>
            <p className="truncate text-xs text-muted-foreground">{identifier}</p>
          </div>
          <StatusPill status={status} />
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Close" disabled={busy} onClick={requestClose} className="max-[719px]:order-first"><CloseIcon className="size-4" aria-hidden="true" /></Button>
        </div>

        {tabs.length > 0 && (
          <Tabs defaultValue={tabs[0]!.id} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mx-4 mt-2 w-fit">
              {tabs.map((tab) => <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>)}
            </TabsList>
            {tabs.map((tab) => <TabsContent key={tab.id} value={tab.id} className="min-h-0 flex-1 overflow-y-auto p-4">{tab.content}</TabsContent>)}
          </Tabs>
        )}

        {actions.length > 0 && (
          <div className="mt-auto border-t p-4 max-[719px]:sticky max-[719px]:bottom-0 max-[719px]:bg-[var(--surface-card)]">
            <div className="flex flex-wrap gap-4">
              {actions.map((action) => {
                const ActionIcon = action.icon ? getIcon(action.icon) : null;
                return (
                  <Button key={action.label} type="button" variant={action.destructive ? "destructive" : "outline"} size="sm" disabled={!!action.disabledReason || busy} title={action.disabledReason} onClick={() => runAction(action)} className={cn(action.destructive && "ml-auto")}>
                    {ActionIcon && <ActionIcon className="size-4" aria-hidden="true" />}
                    {action.label}
                  </Button>
                );
              })}
            </div>
            {confirming && (
              <div className="mt-3 space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <p>{confirming.confirmLabel}</p>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(null)}>Cancel</Button>
                  <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => void confirmAction()}>{busy ? "Working…" : "Confirm"}</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
