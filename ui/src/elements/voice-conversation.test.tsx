import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { VoiceConversation } from "./voice-conversation";

afterEach(cleanup);

describe("VoiceConversation's per-mode ring styling", () => {
  test("speaking reads the primary token, never a hard-coded blue utility", () => {
    const { container } = render(<VoiceConversation mode="speaking" amplitude={0.5} transcript={[]} />);
    const html = container.innerHTML;
    expect(html).not.toContain("blue-500");
    expect(html).not.toContain("blue-400");
    expect(html).toContain("bg-primary");
  });

  test("the first-spoken-word ripple renders only while speaking", () => {
    const speaking = render(<VoiceConversation mode="speaking" amplitude={0} transcript={[]} />);
    expect(speaking.container.innerHTML).toContain("voice-ripple");
    speaking.unmount();

    const listening = render(<VoiceConversation mode="listening" amplitude={0} transcript={[]} />);
    expect(listening.container.innerHTML).not.toContain("voice-ripple");
  });

  test("thinking gets the slow hue-drift animation, other modes don't", () => {
    const thinking = render(<VoiceConversation mode="thinking" amplitude={0} transcript={[]} />);
    expect(thinking.container.innerHTML).toContain("voice-hue-drift");
    thinking.unmount();

    const listening = render(<VoiceConversation mode="listening" amplitude={0} transcript={[]} />);
    expect(listening.container.innerHTML).not.toContain("voice-hue-drift");
  });

  test("the AI transcript label reads the primary token too", () => {
    const { getByText } = render(<VoiceConversation mode="listening" amplitude={0} transcript={[{ id: "1", role: "assistant", text: "hi" }]} />);
    const label = getByText("ai");
    expect(label.className).not.toContain("blue");
    expect(label.className).toContain("text-primary");
  });
});
