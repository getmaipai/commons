import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { ThreadList, ThreadListSearch } from "./thread-list.aui";

afterEach(cleanup);

const adapter: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

function Harness({ labels }: { labels?: { newChat?: string; searchChats?: string } }) {
  const runtime = useLocalRuntime(adapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadList labels={labels} />
      <ThreadListSearch value="" onValueChange={() => {}} label={labels?.searchChats} />
    </AssistantRuntimeProvider>
  );
}

describe("ThreadList labels", () => {
  test("uses today's words as visible and accessible names by default", () => {
    const { getByRole } = render(<Harness />);
    expect(getByRole("button", { name: "New chat" })).toBeTruthy();
    expect(getByRole("searchbox", { name: "Search chats" })).toBeTruthy();
  });

  test("accepts custom visible and accessible names", () => {
    const { getByRole } = render(<Harness labels={{ newChat: "Start one", searchChats: "Find one" }} />);
    expect(getByRole("button", { name: "Start one" })).toBeTruthy();
    expect(getByRole("searchbox", { name: "Find one" })).toBeTruthy();
  });
});
