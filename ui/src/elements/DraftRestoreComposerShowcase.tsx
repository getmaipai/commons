"use client";

import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { DraftRestore } from "./draft-restore";
import { ComposerInputField, Thread } from "./thread.aui";

const adapter: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

function ComposerInput() {
  return (
    <>
      <DraftRestore
        draft="A long unsent draft preview demonstrates truncation on a phone width without crowding the message field"
        savedAt="2 min ago"
        onRestore={() => undefined}
        onDiscard={() => undefined}
      />
      <ComposerInputField placeholder="Send a message..." />
    </>
  );
}

export function DraftRestoreComposerShowcase() {
  const runtime = useLocalRuntime(adapter);
  return (
    <div className="w-[360px] max-w-full">
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread components={{ composerDensity: "compact", ComposerInputOverride: ComposerInput }} autoFocus={false} />
      </AssistantRuntimeProvider>
    </div>
  );
}
