"use client";

import {
  unstable_useMentionAdapter,
  type Unstable_UseMentionAdapterOptions,
} from "@assistant-ui/react";
import { ComposerTriggerPopover } from "./composer-trigger-popover.aui";

/**
 * Runtime form of `@` mentions, vendored from assistant-ui's
 * `composer-mentions` Element: the `@` character the person types opens the
 * popover (an explicit trigger, never a guess from the words of a message),
 * and a pick writes directive text into the composer. Place inside
 * `ComposerPrimitive.TriggerPopoverRoot`. What `@` may name (people,
 * agents, tools) is the `items` the caller passes; with none, the thread's
 * registered tools are listed.
 */
export function ComposerMentions({
  char = "@",
  ...options
}: Unstable_UseMentionAdapterOptions & {
  /** The trigger character. */
  char?: string;
}) {
  const mention = unstable_useMentionAdapter(options);
  return <ComposerTriggerPopover char={char} {...mention} />;
}
