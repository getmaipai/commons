"use client";

import type { ComponentProps } from "react";
import { cn } from "cn";
import { mono } from "./surfaces";

export interface DatedMessage {
  id: string;
  day: string;
  time: string;
  role: "user" | "assistant";
  text: string;
}

/**
 * The day line on its own: a centred label between two hairlines. Exported
 * so a host that already renders its messages (the kit Thread, through its
 * `MessageBefore` slot) can draw the same divider without a second list.
 */
export function DayDivider({
  label,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & { label: string }) {
  return (
    <div
      data-slot="day-divider"
      role="separator"
      aria-label={label}
      className={cn("flex items-center gap-2.5 py-1", className)}
      {...props}
    >
      <span className="bg-foreground/[0.08] h-px flex-1" />
      <span className={cn(mono, "text-foreground/30")}>{label}</span>
      <span className="bg-foreground/[0.08] h-px flex-1" />
    </div>
  );
}

export function DaySeparator({
  messages,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "messages"> & {
  messages: readonly DatedMessage[];
}) {
  let lastDay = "";

  return (
    <div
      data-slot="day-separator"
      className={cn("flex w-full max-w-sm flex-col gap-2", className)}

      {...props}
    >
      {messages.map((message) => {
        const newDay = message.day !== lastDay;
        lastDay = message.day;

        return (
          <div key={message.id} className="flex flex-col gap-2">
            {newDay && <DayDivider label={message.day} />}
            <div
              className={cn(
                "group flex items-baseline gap-2",
                message.role === "user" && "flex-row-reverse",
              )}
            >
              <span
                className={cn(
                  "max-w-[80%] text-[13.5px] leading-relaxed break-words",
                  message.role === "user"
                    ? "bg-foreground/[0.05] rounded-2xl px-3.5 py-2"
                    : "text-foreground/75",
                )}
              >
                {message.text}
              </span>
              <span
                className={cn(
                  mono,
                  "text-foreground/0 group-hover:text-foreground/30 shrink-0 tabular-nums transition-colors",
                )}
              >
                {message.time}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
