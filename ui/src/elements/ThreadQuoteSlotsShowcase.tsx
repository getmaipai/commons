"use client";

// ELT-T1-K07 story: a selected message exposes quote actions and a quote preview above the input.
import { useEffect, useState } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { QuoteReply } from "./quote-reply";
import { Thread } from "./thread.aui";

const adapter: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

const messages: ThreadMessageLike[] = [
  {
    id: "quote-story-message",
    role: "user",
    content: [{ type: "text", text: "Could we move the appointment to Tuesday?" }],
  },
];

function QuoteSelectionToolbar() {
  const [quoted, setQuoted] = useState(false);
  return (
    <QuoteReply
      before="Could we move the appointment to "
      selection="Tuesday"
      after="?"
      actions={[{ key: "quote", label: "Quote", icon: "quote" }]}
      toolbarVisible
      quoted={quoted ? "Could we move the appointment to Tuesday?" : undefined}
      onAction={() => setQuoted(true)}
    />
  );
}

function ComposerQuotePreview() {
  return (
    <QuoteReply
      before=""
      selection=""
      after=""
      actions={[]}
      toolbarVisible={false}
      quoted="Could we move the appointment to Tuesday?"
    />
  );
}

const components = { SelectionToolbar: QuoteSelectionToolbar, ComposerQuotePreview };

export function ThreadQuoteSlotsShowcase() {
  const runtime = useLocalRuntime(adapter);
  useEffect(() => {
    runtime.thread.reset(messages);
  }, [runtime]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread components={components} autoFocus={false} />
    </AssistantRuntimeProvider>
  );
}
