import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter, type DictationAdapter } from "@assistant-ui/react";
import { Thread } from "./thread.aui";

afterEach(cleanup);

const chat: ChatModelAdapter = { async *run() { yield { content: [] }; } };
const dictation: DictationAdapter = {
  listen() {
    return { status: { type: "running" }, stop: async () => {}, cancel: () => {}, onSpeechStart: () => () => {}, onSpeechEnd: () => () => {}, onSpeech: () => () => {} };
  },
};

function Harness() {
  const runtime = useLocalRuntime(chat, { adapters: { dictation } });
  return <AssistantRuntimeProvider runtime={runtime}><Thread /></AssistantRuntimeProvider>;
}

describe("composer dictation on-look", () => {
  test("idle is the quiet look with aria-pressed false; dictating is the filled look with aria-pressed true", async () => {
    const view = render(<Harness />);
    const start = view.getByRole("button", { name: "Start voice input" });
    expect(start.getAttribute("data-variant")).toBe("ghost");
    expect(start.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(start);
    const stop = await waitFor(() => view.getByRole("button", { name: "Stop voice input" }));
    expect(stop.getAttribute("data-variant")).toBe("default");
    expect(stop.getAttribute("aria-pressed")).toBe("true");
  });
});
