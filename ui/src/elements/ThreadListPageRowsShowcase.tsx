"use client";

// PROJECTS-KIT-02 story: the opt-in page row with title, one-line preview,
// relative date, and project mark. This mounts the same ThreadList Elements
// used by consumers while keeping the default compact row unchanged.
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type RemoteThreadListAdapter,
} from "@assistant-ui/react";
import { ThreadListItems, ThreadListRoot } from "./thread-list.aui";

const model: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

const items = [
  { remoteId: "design-review", title: "Design Review Prompt", lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { remoteId: "splash-intro", title: "Splash introduction", lastMessageAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
  { remoteId: "podcast-generator", title: "Local podcast generator comparison", lastMessageAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000) },
];

const adapter = {
  list: async () => ({ threads: items.map((item) => ({ ...item, status: "regular" as const, custom: {} })) }),
  rename: async () => {},
  updateCustom: async () => {},
  archive: async () => {},
  unarchive: async () => {},
  delete: async () => {},
  initialize: async (threadId: string) => ({ remoteId: threadId, externalId: undefined }),
  generateTitle: async () => new ReadableStream(),
} as unknown as RemoteThreadListAdapter;

const useChatRuntime = () => useLocalRuntime(model);

export function ThreadListPageRowsShowcase() {
  const runtime = useRemoteThreadListRuntime({ runtimeHook: useChatRuntime, adapter });
  const date = (item: (typeof items)[number]) => item.lastMessageAt.toISOString();
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadListRoot>
        <ThreadListItems
          projects={{
            folders: [],
            canMove: false,
            rowVariant: "page",
            pageRows: {
              "design-review": {
                preview: "Make sure you are detailed on the prompt bar too — then give me one prompt containing…",
                date: date(items[0]!),
                projectIcon: { icon: "sparkles", color: "violet" },
              },
              "splash-intro": { date: date(items[1]!) },
              "podcast-generator": {
                preview: "Forget the voice — I’m using pocket TTS for now and when we get ETH Studio I have a…",
                date: date(items[2]!),
              },
            },
          }}
        />
      </ThreadListRoot>
    </AssistantRuntimeProvider>
  );
}
