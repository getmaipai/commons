import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { Thread, type ThreadComponents } from "./thread.aui";
import { Textarea } from "../ui/textarea";

afterEach(cleanup);

const adapter: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

function Harness({ components }: { components?: ThreadComponents }) {
  const runtime = useLocalRuntime(adapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread components={components} />
    </AssistantRuntimeProvider>
  );
}

// PROJECTS-KIT-01: the page layout a project page uses.
describe("Thread page layout", () => {
  test("defaults are unchanged: centred, 'Send a message...', suggestions slot not replaced", () => {
    const view = render(<Harness />);
    expect(view.getByRole("textbox", { name: "Message input" }).getAttribute("placeholder")).toBe("Send a message...");
    expect(view.container.querySelector("[data-testid=below]")).toBeNull();
    expect(view.container.querySelector(".justify-center")).not.toBeNull();
  });

  test("composerPlaceholder, BelowComposer and emptyLayout top", () => {
    const view = render(
      <Harness components={{ composerPlaceholder: "New chat in Garden", BelowComposer: () => <div data-testid="below">tabs</div>, emptyLayout: "top", Welcome: () => <h2>Garden</h2> }} />,
    );
    expect(view.getByRole("textbox", { name: "Message input" }).getAttribute("placeholder")).toBe("New chat in Garden");
    expect(view.getByTestId("below").textContent).toBe("tabs");
    expect(view.getByText("Garden")).not.toBeNull();
    expect(view.container.querySelector("[data-slot=aui_thread-viewport] > div.justify-center")).toBeNull();
  });
});

describe("Textarea showCount", () => {
  test("off by default: no counter", () => {
    const view = render(<Textarea value="abc" maxLength={10} onChange={() => {}} />);
    expect(view.container.querySelector("[data-slot=textarea-count]")).toBeNull();
  });
  test("on: shows length over maxLength", () => {
    const view = render(<Textarea showCount value="abc" maxLength={1500} onChange={() => {}} />);
    expect(view.container.querySelector("[data-slot=textarea-count]")?.textContent).toBe("3/1500");
  });
});
