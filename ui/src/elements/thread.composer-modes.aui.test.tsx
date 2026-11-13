import { afterEach, describe, expect, test } from "bun:test";
import { useState } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { Thread, type ThreadComposerModes } from "./thread.aui";
import type { ComposerModeData, ComposerQualityData } from "./composer-parts";

afterEach(cleanup);

const adapter: ChatModelAdapter = { async *run() { yield { content: [] }; } };

const modes: ComposerModeData[] = [
  { id: "chat", label: "Chat", icon: "message-circle" },
  { id: "image", label: "Image", icon: "image", placeholder: "Describe the picture you want.", references: [{ id: "pic", label: "Picture", kind: "picture" }], chips: [{ id: "shape", label: "Shape", group: "Settings", value: "landscape", onValueChange: () => {}, options: [{ value: "landscape", label: "Landscape" }, { value: "portrait", label: "Portrait" }] }], tools: ["clear"] },
];

const quality = (band: ComposerQualityData["band"]): ComposerQualityData => ({ value: "standard", band, onValueChange: () => {}, options: [{ value: "standard", label: "Standard" }, { value: "max", label: "Max" }, { value: "thinking", label: "Thinking", kind: "thinking" }] });

function Harness({ band, withModes = true, compact = false }: { band?: ComposerQualityData["band"]; withModes?: boolean; compact?: boolean }) {
  const runtime = useLocalRuntime(adapter);
  const [mode, setMode] = useState("chat");
  const composerModes: ThreadComposerModes | undefined = withModes ? { modes, mode, onModeChange: setMode, quality: quality(band) } : undefined;
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread components={{ composerModes, ...(compact ? { composerDensity: "compact" as const } : {}) }} />
    </AssistantRuntimeProvider>
  );
}

describe("Thread composerModes (COMPOSER-02)", () => {
  test("without it nothing changes: no pill, no mode row", () => {
    const view = render(<Harness withModes={false} />);
    expect(view.container.querySelector('[data-slot="composer-mode-pill"]')).toBeNull();
    expect(view.container.querySelector('[data-slot="composer-mode-row"]')).toBeNull();
    expect(view.getByRole("textbox", { name: "Message input" }).getAttribute("placeholder")).toBe("Send a message...");
  });

  test("the default mode draws today's field plus the pill, with the slot row closed", () => {
    const view = render(<Harness />);
    expect(view.getByRole("button", { name: "Mode: Chat" })).not.toBeNull();
    expect(view.getByRole("textbox", { name: "Message input" }).getAttribute("placeholder")).toBe("Send a message...");
    expect(view.container.querySelector('[data-slot="composer-mode-zone"]')!.getAttribute("data-open")).toBe("false");
    expect(view.container.querySelector('[data-slot="composer-field-tools"]')).toBeNull();
  });

  test("the Thread draws the same unified panel: large radius, chips in the bottom row with no select box", () => {
    const view = render(<Harness />);
    fireEvent.click(view.getByRole("button", { name: "Mode: Chat" }));
    fireEvent.click(view.getByRole("option", { name: "Image" }));
    const shell = view.container.querySelector('[data-slot="aui_composer-shell"]') as HTMLElement;
    expect(shell.getAttribute("data-unified")).toBe("true");
    expect(shell.style.getPropertyValue("--composer-radius")).toBe("30px");
    const chip = view.getByRole("button", { name: "Settings: Landscape" });
    expect(chip.className).not.toMatch(/\bborder\b/);
    expect(chip.closest(".aui-composer-action-wrapper")).not.toBeNull();
  });

  test("the unified panel replaces the compact density when modes are set", () => {
    const view = render(<Harness compact />);
    expect((view.container.querySelector('[data-slot="aui_composer-shell"]') as HTMLElement).getAttribute("data-density")).toBeNull();
    cleanup();
    const plain = render(<Harness compact withModes={false} />);
    expect((plain.container.querySelector('[data-slot="aui_composer-shell"]') as HTMLElement).getAttribute("data-density")).toBe("compact");
  });

  test("picking Image shows its slots, chips and tools inside the Thread and changes the placeholder", () => {
    const view = render(<Harness />);
    fireEvent.click(view.getByRole("button", { name: "Mode: Chat" }));
    fireEvent.click(view.getByRole("option", { name: "Image" }));
    expect(view.getByRole("textbox", { name: "Message input" }).getAttribute("placeholder")).toBe("Describe the picture you want.");
    expect(view.container.querySelector('[data-slot="composer-mode-zone"]')!.getAttribute("data-open")).toBe("true");
    expect(view.getByRole("button", { name: "Add Picture" })).not.toBeNull();
    expect(view.getByRole("button", { name: "Settings: Landscape" })).not.toBeNull();
    expect(view.getByRole("button", { name: "Clear" })).not.toBeNull();
    // The parts live in the composer shell the kit draws; no input override is involved.
    expect(view.container.querySelector('[data-slot="aui_composer-shell"] [data-slot="composer-mode-row"]')).not.toBeNull();
  });

  test("the Quality chip never offers Thinking to a child or teen, and does to an adult", () => {
    for (const band of ["child", "teen", undefined] as const) {
      const view = render(<Harness band={band} />);
      fireEvent.click(view.getByRole("button", { name: /^Quality/ }));
      expect(view.queryByRole("radio", { name: /Thinking/ })).toBeNull();
      expect(view.getByRole("radio", { name: /Max/ })).not.toBeNull();
      cleanup();
    }
    const adult = render(<Harness band="adult" />);
    fireEvent.click(adult.getByRole("button", { name: /^Quality/ }));
    expect(adult.getByRole("radio", { name: /Thinking/ })).not.toBeNull();
  });
});
