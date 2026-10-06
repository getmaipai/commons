"use client";

import { useAuiState } from "@assistant-ui/react";
import { ComposerContext, type ComposerUsage } from "./composer";

/**
 * Runtime form of the composer's context ring, vendored from assistant-ui's
 * `composer-context` Element. The runtime reports per-turn token usage and
 * nothing else, so the system and tool figures and the model's window are
 * props you already know; the thread supplies only the conversation total.
 * Reads state, sends nothing.
 */
export function useThreadTokensUsed(): number {
  return useAuiState((s) =>
    s.thread.messages.reduce((sum, message) => {
      const steps = message.metadata.steps ?? [];
      return (
        sum +
        steps.reduce(
          (stepSum, step) =>
            stepSum +
            (step.usage?.inputTokens ?? 0) +
            (step.usage?.outputTokens ?? 0),
          0,
        )
      );
    }, 0),
  );
}

export function ComposerContextRail({
  systemTokens = 0,
  toolTokens = 0,
  contextWindow,
  className,
}: {
  /** Fixed system-prompt cost, in thousands of tokens. */
  systemTokens?: number;
  /** Fixed tool-schema cost, in thousands of tokens. */
  toolTokens?: number;
  /** The active model's window, in thousands of tokens. */
  contextWindow: number;
  className?: string;
}) {
  const used = useThreadTokensUsed();
  const usage: ComposerUsage = {
    system: systemTokens,
    tools: toolTokens,
    messages: Math.round(used / 1000),
    total: contextWindow,
  };
  return <ComposerContext usage={usage} {...(className ? { className } : {})} />;
}
