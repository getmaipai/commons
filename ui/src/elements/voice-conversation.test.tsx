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
    const { container } = render(<VoiceConversation mode="speaking" amplitude={0.5} />);
    const html = container.innerHTML;
    expect(html).not.toContain("blue-500");
    expect(html).not.toContain("blue-400");
    expect(html).not.toContain("bg-primary");
    expect(html).not.toContain("--color-primary");
    expect(html).toContain("bg-voice-accent");
    expect(html).toContain("--color-voice-accent");
  });

  test("the first-spoken-word ripple renders only while speaking", () => {
    const speaking = render(<VoiceConversation mode="speaking" amplitude={0} />);
    expect(speaking.container.innerHTML).toContain("voice-ripple");
    speaking.unmount();

    const listening = render(<VoiceConversation mode="listening" amplitude={0} />);
    expect(listening.container.innerHTML).not.toContain("voice-ripple");
  });

  test("thinking gets the slow hue-drift animation, other modes don't", () => {
    const thinking = render(<VoiceConversation mode="thinking" amplitude={0} />);
    expect(thinking.container.innerHTML).toContain("voice-hue-drift");
    thinking.unmount();

    const listening = render(<VoiceConversation mode="listening" amplitude={0} />);
    expect(listening.container.innerHTML).not.toContain("voice-hue-drift");
  });

  test("the orb is ChatGPT's own scale (roughly 160-200px), the rings scaled proportionally with it", () => {
    const { container } = render(<VoiceConversation mode="listening" amplitude={0} />);
    const button = container.querySelector("button[aria-label='Interrupt the assistant']");
    expect(button?.className).toContain("size-40");
    expect(button?.className).toContain("sm:size-48");
  });
});

// VOICE-LIVE-05 follow-up (Jesse's own live read, 2026-09-23): "the
// phone call look instead of the visualizer" - a call screen, never a
// floating card with a running transcript underneath it.
describe("VoiceConversation is a call screen, not a transcript card", () => {
  test("carries no transcript prop or rendering at all - not 'ai'/'you', not any turn text", () => {
    const { container } = render(<VoiceConversation mode="listening" amplitude={0} />);
    const html = container.innerHTML;
    expect(html).not.toContain(">ai<");
    expect(html).not.toContain(">you<");
    // The old transcript list's own gap/animation class, gone with it.
    expect(html).not.toContain("slide-in-from-bottom-1");
  });

  test("the surface fills its container on the phone (h-full w-full, no rounding, no border) and stays the small floating card at sm and up", () => {
    const { container } = render(<VoiceConversation mode="listening" amplitude={0} />);
    const root = container.querySelector("[data-slot='voice-conversation']");
    expect(root?.className).toContain("h-full");
    expect(root?.className).toContain("w-full");
    expect(root?.className).toContain("border-0");
    expect(root?.className).toContain("sm:max-w-xs");
    expect(root?.className).toContain("sm:rounded-[28px]");
    expect(root?.className).toContain("sm:border");
  });

  test("mute and end are the kit's own TooltipIconButton, never a hand-styled button", () => {
    const { getByRole } = render(<VoiceConversation mode="listening" amplitude={0} muted={false} onToggleMute={() => {}} onEnd={() => {}} />);
    const mute = getByRole("button", { name: "Turn the microphone off" });
    const end = getByRole("button", { name: "End the call" });
    // TooltipIconButton's own base class, present on both.
    expect(mute.className).toContain("aui-button-icon");
    expect(end.className).toContain("aui-button-icon");
    expect(end.className).toContain("bg-destructive");
  });
});
