"use client";

import type { ComponentProps, ReactNode } from "react";
import { CheckIcon, Loader2Icon, TerminalIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { field, inkButton, paper } from "./surfaces";

export type ApprovalState = "request" | "running" | "done" | "denied";

/** The words beside the settled states' icons. Each is optional; an unset
 * one keeps the card's own words. */
export type ApprovalStatusLabels = {
  running?: ReactNode;
  done?: ReactNode;
  denied?: ReactNode;
};

/**
 * Optional, additive props (unset keeps the card exactly as before):
 * `icon` replaces the terminal glyph in the leading tile; `command` may be
 * left out, and the monospace box is then not drawn (an ask that is not a
 * command); `statusLabels` words the running, done and denied rows;
 * `allowHint` renders inside the Allow once button after its label (a
 * keyboard hint such as a Kbd). A request with no handlers draws no
 * empty button row (an ask someone else answers).
 */

export function ApprovalCard({
  state,
  command,
  title,
  subtitle,
  icon,
  statusLabels,
  allowHint,
  onAllowOnce,
  onAlwaysAllow,
  onDeny,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "state"
  | "command"
  | "title"
  | "subtitle"
  | "icon"
  | "statusLabels"
  | "allowHint"
  | "onAllowOnce"
  | "onAlwaysAllow"
  | "onDeny"
> & {
  state: ApprovalState;
  command?: string | undefined;
  title: string;
  subtitle: string;
  icon?: ReactNode;
  statusLabels?: ApprovalStatusLabels | undefined;
  allowHint?: ReactNode;
  onAllowOnce?: () => void;
  onAlwaysAllow?: () => void;
  onDeny?: () => void;
}) {
  const hasActions = Boolean(onDeny || onAlwaysAllow || onAllowOnce);
  return (
    <div
      data-slot="approval-card"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3.5 rounded-[20px] p-4",
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-3">
        <span className="bg-foreground/[0.05] text-foreground/45 flex size-9 shrink-0 items-center justify-center rounded-xl">
          {icon ?? <TerminalIcon className="size-4" />}
        </span>
        <div className="flex flex-col">
          <p className="text-[13.5px] font-medium">{title}</p>
          <p className="text-foreground/45 text-xs">{subtitle}</p>
        </div>
      </div>

      {command !== undefined && (
        <div
          className={cn(
            field,
            "text-foreground/70 rounded-xl px-3.5 py-2.5 font-mono text-xs",
          )}
        >
          {command}
        </div>
      )}

      {(state !== "request" || hasActions) && (
        <div className="flex h-8 items-center justify-end gap-2">
          {state === "request" ? (
            <>
              {onDeny && (
                <button
                  type="button"
                  onClick={onDeny}
                  className="text-foreground/55 hover:bg-foreground/[0.06] hover:text-foreground/90 h-8 rounded-full px-3.5 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96]"
                >
                  Deny
                </button>
              )}
              {onAlwaysAllow && (
                <button
                  type="button"
                  onClick={onAlwaysAllow}
                  className="text-foreground/55 hover:bg-foreground/[0.06] hover:text-foreground/90 h-8 rounded-full px-3.5 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96]"
                >
                  Always allow
                </button>
              )}
              {onAllowOnce && (
                <button
                  type="button"
                  onClick={onAllowOnce}
                  className={cn(
                    inkButton,
                    "flex h-8 items-center rounded-full px-3.5 text-xs font-medium",
                  )}
                >
                  Allow once
                  {allowHint}
                </button>
              )}
            </>
          ) : (
            <div
              key={state}
              className="fade-in animate-in text-foreground/55 flex items-center gap-2 text-xs duration-300"
            >
              {state === "running" ? (
                <>
                  <Loader2Icon className="text-foreground/45 size-3.5 animate-spin" />
                  {statusLabels?.running ?? "Approved, running"}
                </>
              ) : state === "denied" ? (
                <>
                  <XIcon className="text-foreground/45 size-3.5" />
                  {statusLabels?.denied ?? "Denied"}
                </>
              ) : (
                <>
                  <CheckIcon className="size-3.5 text-emerald-500" />
                  {statusLabels?.done ?? "Finished with exit 0"}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
