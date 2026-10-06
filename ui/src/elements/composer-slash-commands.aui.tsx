"use client";

import {
  unstable_useSlashCommandAdapter,
  type Unstable_UseSlashCommandAdapterOptions,
} from "@assistant-ui/react";
import { ComposerTriggerPopover } from "./composer-trigger-popover.aui";

/**
 * Runtime form of slash commands, vendored from assistant-ui's
 * `composer-slash-commands` Element: the `/` the person types opens the
 * popover and a pick runs that command's own `execute`. The commands are
 * the caller's list; nothing is inferred from message text. Place inside
 * `ComposerPrimitive.TriggerPopoverRoot`.
 */
export function ComposerSlashCommands({
  char = "/",
  ...options
}: Unstable_UseSlashCommandAdapterOptions & {
  /** The trigger character. */
  char?: string;
}) {
  const slash = unstable_useSlashCommandAdapter(options);
  return <ComposerTriggerPopover char={char} {...slash} />;
}
