"use client";

import type { ComponentType } from "react";
import { Button } from "@/elements/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";

export type AnswerStyleChoice = {
  id: string;
  /** The short word: shown in the open menu and in the closed control's accessible name. */
  label: string;
  /** One plain line under the word in the open menu. */
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  /** A small mark drawn on the icon's corner in the accent token (a glow or sparkle). */
  accent?: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  disabled?: boolean;
  /** This choice is a switched-on state (Thinking, Max): the closed control then wears the filled look. Unset or false: the quiet look. */
  on?: boolean;
};

export type AnswerStyleSelectProps = {
  choices: readonly AnswerStyleChoice[];
  value: string;
  onValueChange: (id: string) => void;
  /** The control's name; the closed control reads "<name>: <current word>". */
  name?: string;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
};

function ChoiceIcon({ choice, filled = false }: { choice: AnswerStyleChoice; filled?: boolean }) {
  const Icon = choice.icon;
  const Accent = choice.accent;
  return (
    <span className="relative inline-flex shrink-0">
      <Icon aria-hidden="true" />
      {Accent ? <Accent aria-hidden="true" className={(filled ? "text-primary-foreground" : "text-primary") + " absolute -top-1 -right-1 size-2.5"} /> : null}
    </span>
  );
}

/**
 * A composer dropdown for how the next answer is made (for example Instant, Thinking, Max). The closed control is an icon only,
 * 44 px square, named for screen readers by its current word; the open menu shows icon, word and one plain line per choice.
 * Quiet when the current choice is off, filled (the primary token, like Send) when it is on. Colors come from theme tokens only.
 */
export function AnswerStyleSelect({ choices, value, onValueChange, name = "Answer style", side = "top", align = "start" }: AnswerStyleSelectProps) {
  const current = choices.find((choice) => choice.id === value) ?? choices[0];
  if (!current) return null;
  const label = `${name}: ${current.label}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={current.on ? "default" : "ghost"} size="icon-lg" className="size-11" role="combobox" aria-haspopup="menu" aria-label={label} title={label} data-on={current.on ? "true" : "false"} data-slot="answer-style-select-trigger">
          <ChoiceIcon choice={current} filled={current.on === true} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} data-slot="answer-style-select-content">
        <DropdownMenuRadioGroup value={current.id} onValueChange={onValueChange}>
          {choices.map((choice) => (
            <DropdownMenuRadioItem key={choice.id} value={choice.id} disabled={choice.disabled}>
              <ChoiceIcon choice={choice} />
              <span className="flex flex-col">
                <span className="font-medium">{choice.label}</span>
                <span className="text-muted-foreground text-sm">{choice.description}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
