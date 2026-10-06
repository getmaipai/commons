"use client";

import type { ComponentProps } from "react";
import { HeartHandshakeIcon, ShieldIcon } from "lucide-react";
import { cn } from "cn";
import { mono, paper } from "./surfaces";

/** A link the notice offers as a next step (a crisis line to call or text,
 * a page to open), drawn as a plain link in the notice's own row. */
export type GuardrailNoticeAction = { label: string; href: string };

/** Only a call, a text or a web page; anything else is not drawn. */
const SAFE_ACTION_HREF = /^(?:tel|sms|https?):/i;

/**
 * Optional, additive props (unset keeps the notice exactly as before):
 * `tone: "support"` draws a calm support notice (a helping-hands glyph on
 * the neutral field, never the amber shield) for someone who may be in
 * distress; `policy` may be left out, and the small mono tag is then not
 * drawn; `explanation` may be left out, and the title then wraps as the
 * one sentence of the notice instead of truncating; `actions` draws links
 * the person can follow (tel:, sms:, https:) under the text.
 */
export function GuardrailNotice({
  title,
  explanation,
  policy,
  alternatives,
  onPick,
  tone = "refusal",
  actions,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "title" | "explanation" | "policy" | "alternatives" | "onPick"
> & {
  title: string;
  explanation?: string | undefined;
  policy?: string | undefined;
  alternatives: readonly string[];
  onPick?: (alternative: string) => void;
  tone?: "refusal" | "support";
  actions?: readonly GuardrailNoticeAction[] | undefined;
}) {
  const hasExplanation = explanation !== undefined && explanation !== "";
  return (
    <div
      data-slot="guardrail-notice"
      data-tone={tone}
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-[20px] p-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2.5">
        {tone === "support" ? (
          <span className="bg-foreground/[0.05] text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-lg">
            <HeartHandshakeIcon className="size-3.5" />
          </span>
        ) : (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-400">
            <ShieldIcon className="size-3.5" />
          </span>
        )}
        <span
          className={cn(
            "min-w-0 flex-1 text-[13.5px] font-medium",
            hasExplanation ? "truncate" : "leading-snug",
          )}
        >
          {title}
        </span>
        {policy ? (
          <span className={cn(mono, "text-muted-foreground shrink-0")}>
            {policy}
          </span>
        ) : null}
      </div>

      {hasExplanation && (
        <p className="text-muted-foreground text-xs leading-relaxed">
          {explanation}
        </p>
      )}

      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {actions
            .filter((action) => SAFE_ACTION_HREF.test(action.href))
            .map((action) => (
              <a
                key={`${action.href} ${action.label}`}
                href={action.href}
                {...(/^https?:/i.test(action.href)
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="text-foreground text-[13px] font-medium underline underline-offset-4"
              >
                {action.label}
              </a>
            ))}
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className={cn(mono, "text-muted-foreground")}>try instead</span>
          {alternatives.map((alternative) =>
            onPick ? (
              <button
                key={alternative}
                type="button"
                onClick={() => onPick(alternative)}
                className="hover:bg-foreground/[0.04] text-foreground/70 hover:text-foreground/95 -mx-1.5 rounded-lg px-1.5 py-1 text-start text-[13px] transition-colors"
              >
                {alternative}
              </button>
            ) : (
              <span
                key={alternative}
                className="text-foreground/70 -mx-1.5 rounded-lg px-1.5 py-1 text-start text-[13px]"
              >
                {alternative}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}
