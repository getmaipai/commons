"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { CheckIcon, ThumbsDownIcon } from "lucide-react";
import { cn } from "cn";
import { field, ghostButton, inkButton, mono, paper } from "./surfaces";

export function FeedbackDialog({
  reasons,
  selected,
  note,
  sent,
  onToggleReason,
  onNoteChange,
  onSubmit,
  onCancel,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "reasons"
  | "selected"
  | "note"
  | "sent"
  | "onToggleReason"
  | "onNoteChange"
  | "onSubmit"
  | "onCancel"
> & {
  reasons: readonly string[];
  selected: readonly string[];
  note: string;
  sent: boolean;
  onToggleReason?: (reason: string) => void;
  onNoteChange?: (note: string) => void;
  onSubmit?: () => void;
  /**
   * Dismiss without sending. When given, the dialog shows a Cancel button and
   * also calls it on Escape and on a press outside the dialog (the same three
   * ways ChatGPT's "Tell us more" closes). The rating itself is the host's to
   * keep or clear; this only closes the form.
   */
  onCancel?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const cancel = useRef(onCancel);
  cancel.current = onCancel;
  const dismissible = onCancel !== undefined && !sent;
  useEffect(() => {
    if (!dismissible) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      cancel.current?.();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [dismissible]);
  return (
    <div
      data-slot="feedback-dialog"
      className={cn(
        paper,
        "flex w-full max-w-sm rounded-[20px] p-4",
        sent ? "items-center gap-2.5 text-[13.5px]" : "flex-col gap-3",
        className,
      )}

      {...props}
      ref={root}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        if (dismissible && event.key === "Escape") {
          event.stopPropagation();
          onCancel?.();
        }
      }}
    >
      {/*
        Mounted whether or not the feedback has been sent, because a live region
        only announces a change that happens after it is already in the tree; a
        region created together with its text is the case AT is free to miss.
      */}
      <div
        role="status"
        className={
          sent
            ? "fade-in animate-in flex items-center gap-2.5 duration-300"
            : "sr-only"
        }
      >
        {sent && (
          <>
            <CheckIcon className="size-4 shrink-0 text-emerald-500" />
            Thanks. That helps us tune the model.
          </>
        )}
      </div>

      {sent ? null : (
        <>
          <div className="flex items-center gap-2.5">
            <span className="bg-foreground/[0.05] text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-lg">
              <ThumbsDownIcon className="size-3.5" />
            </span>
            <span className="text-[13.5px] font-medium">What went wrong?</span>
            <span className={cn(mono, "text-muted-foreground ms-auto")}>
              optional
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {reasons.map((reason) => {
              const active = selected.includes(reason);
              const className = cn(
                "rounded-full px-2.5 py-1 text-xs transition-[background-color,color,scale] duration-150",
                onToggleReason && "active:scale-[0.96]",
                active
                  ? "bg-foreground text-background"
                  : cn(
                      field,
                      "text-muted-foreground",
                      onToggleReason && "hover:text-foreground/90",
                    ),
              );
              return onToggleReason ? (
                <button
                  key={reason}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleReason(reason)}
                  className={className}
                >
                  {reason}
                </button>
              ) : (
                <span
                  key={reason}
                  role="button"
                  aria-disabled="true"
                  aria-pressed={active}
                  className={className}
                >
                  {reason}
                </span>
              );
            })}
          </div>

          <textarea
            value={note}
            onChange={(event) => onNoteChange?.(event.target.value)}
            rows={2}
            placeholder="Anything else?"
            aria-label="Anything else?"
            className={cn(
              field,
              "text-foreground/80 placeholder:text-muted-foreground focus-visible:ring-foreground/20 resize-none rounded-xl px-3 py-2 text-xs outline-none focus-visible:ring-1",
            )}
          />

          {(onSubmit || onCancel) && (
            <div className="flex items-center justify-end gap-1.5">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className={cn(
                    ghostButton,
                    "h-8 px-3.5 text-xs font-medium",
                  )}
                >
                  Cancel
                </button>
              )}
              {onSubmit && (
                <button
                  type="button"
                  onClick={onSubmit}
                  className={cn(
                    inkButton,
                    "flex h-8 items-center justify-center rounded-full px-3.5 text-xs font-medium",
                  )}
                >
                  Send feedback
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
