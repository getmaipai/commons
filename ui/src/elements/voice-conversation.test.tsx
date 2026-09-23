import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { VoiceConversation } from "./voice-conversation";

afterEach(cleanup);

describe("VoiceConversation's per-mode ring styling", () => {
  // VOICE-LIVE-05 (2026-09-23): --primary alone wasn't safe - the
  // vendored template's own competing :root --primary won the cascade
  // in light theme, rendering the orb near-black instead of blue.
  // --voice-accent (tokens.css) is dedicated and never touched by a
  // template style-preset; asserted here so this can't slip back.
  test("speaking reads the dedicated voice-accent token, never --primary or a hard-coded blue utility", () => {
    const { container } = render(<VoiceConversation mode="speaking" amplitude={0.5} transcript={[]} />);
    const html = container.innerHTML;
    expect(html).not.toContain("blue-500");
    expect(html).not.toContain("blue-400");
    expect(html).not.toContain("bg-primary");
    expect(html).not.toContain("--color-primary");
    expect(html).toContain("bg-voice-accent");
    expect(html).toContain("--color-voice-accent");
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

  test("the AI transcript label reads the voice-accent token too, never --primary", () => {
    const { getByText } = render(<VoiceConversation mode="listening" amplitude={0} transcript={[{ id: "1", role: "assistant", text: "hi" }]} />);
    const label = getByText("ai");
    expect(label.className).not.toContain("blue");
    expect(label.className).not.toContain("text-primary");
    expect(label.className).toContain("text-voice-accent");
  });

  test("the orb is ChatGPT's own scale (roughly 160-200px), the rings scaled proportionally with it", () => {
    const { container } = render(<VoiceConversation mode="listening" amplitude={0} transcript={[]} />);
    const button = container.querySelector("button[aria-label='Interrupt the assistant']");
    expect(button?.className).toContain("size-40");
    expect(button?.className).toContain("sm:size-48");
  });
});
