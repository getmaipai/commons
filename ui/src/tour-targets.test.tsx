import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { Composer } from "./elements/composer";
import { ThreadListRoot, ThreadListNew } from "./elements/thread-list.aui";

afterEach(cleanup);

const adapter: ChatModelAdapter = { async *run() { yield { content: [] }; } };
function ThreadListHarness({ children }: { children: React.ReactNode }) {
  const runtime = useLocalRuntime(adapter);
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}

test("chat composer renders data-tour when tourId is set; renders no data-tour attribute otherwise", () => {
  const view = render(<><Composer tourId="chat.composer" /><Composer data-testid="plain" /></>);
  expect(view.container.querySelector("[data-slot='composer']")?.getAttribute("data-tour")).toBe("chat.composer");
  expect(view.getByTestId("plain").hasAttribute("data-tour")).toBe(false);
});

test("chat thread list and add-chat button render data-tour when tourId is set; render no data-tour attribute otherwise", () => {
  const view = render(<ThreadListHarness><ThreadListRoot tourId="chat.thread-list" /><ThreadListNew tourId="chat.new-chat" /><ThreadListNew aria-label="plain" /></ThreadListHarness>);
  expect(view.container.querySelector("[data-slot='aui_thread-list-root']")?.getAttribute("data-tour")).toBe("chat.thread-list");
  expect(view.container.querySelector("[data-slot='aui_thread-list-new']")?.getAttribute("data-tour")).toBe("chat.new-chat");
  expect(view.getByRole("button", { name: "plain" }).hasAttribute("data-tour")).toBe(false);
});
