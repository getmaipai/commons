"use client";

import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type RemoteThreadListAdapter,
} from "@assistant-ui/react";
import { ThreadListSidebar } from "./thread-list-sidebar.aui";

const model: ChatModelAdapter = { async *run() { yield { content: [] }; } };
const chats = [
  { remoteId: "orchard", title: "Plan the spring garden", folder_id: "home" },
  { remoteId: "weekend", title: "Weekend ideas", folder_id: null },
];
const adapter = {
  list: async () => ({
    threads: chats.map((chat) => ({
      status: "regular" as const,
      remoteId: chat.remoteId,
      title: chat.title,
      lastMessageAt: new Date(),
      custom: { folder_id: chat.folder_id, pinned: chat.remoteId === "weekend" },
    })),
  }),
  rename: async () => {},
  updateCustom: async () => {},
  archive: async () => {},
  unarchive: async () => {},
  delete: async () => {},
  initialize: async (threadId: string) => ({ remoteId: threadId, externalId: undefined }),
  generateTitle: async () => new ReadableStream(),
} as unknown as RemoteThreadListAdapter;
const useChatRuntime = () => useLocalRuntime(model);

export function ThreadListSidebarShowcase() {
  const runtime = useRemoteThreadListRuntime({ runtimeHook: useChatRuntime, adapter });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Fine pointer: 36px rows with 48px targets; touch: 48px rows</p>
        <div className="flex h-[36rem] w-[18rem] overflow-hidden rounded-xl border">
          <ThreadListSidebar
            variant="compact"
            header={<div className="px-2.5 pt-2 text-sm font-semibold">History</div>}
            footer={<div className="px-2.5 py-2 text-xs text-muted-foreground">Local chat history</div>}
            pinnable
            projects={{ folders: [{ id: "home", name: "Home" }] }}
          />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
