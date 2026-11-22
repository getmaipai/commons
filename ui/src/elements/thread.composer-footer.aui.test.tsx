import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { Thread } from "./thread.aui";
import type { ComposerModeData } from "./composer-parts";

afterEach(cleanup);
const adapter: ChatModelAdapter = { async *run() { yield { content: [] }; } };
const modes: ComposerModeData[] = [{ id: "ask", label: "Ask first", icon: "shield-check" }, { id: "plan", label: "Plan", icon: "square-pen" }];

function Harness({ placement }: { placement?: "footer" }) {
  const runtime = useLocalRuntime(adapter);
  const quality = { value: "standard", band: "adult" as const, onValueChange: () => {}, options: [{ value: "standard", label: "Standard" }, { value: "max", label: "Max" }], label: "Level" };
  return <AssistantRuntimeProvider runtime={runtime}><Thread components={{ composerDensity: "compact", ComposerNotice: () => <span>Ready</span>, ComposerFooterEnd: () => <span data-slot="ring">ring</span>, composerModes: { modes, mode: "ask", onModeChange: () => {}, quality, ...(placement ? { placement } : {}) } }} /></AssistantRuntimeProvider>;
}

test("placement footer moves the mode pill and level below the composer, quiet, with the notice and the footer end", () => {
  const view = render(<Harness placement="footer" />);
  const footer = view.container.querySelector('[data-slot="aui_composer-footer"]')!;
  expect(footer).not.toBeNull();
  expect(footer.querySelector('[data-slot="composer-mode-pill"]')).not.toBeNull();
  expect(footer.querySelector('[data-slot="composer-quality"]')?.textContent).toContain("Standard");
  expect(footer.querySelector('[data-slot="ring"]')).not.toBeNull();
  expect(footer.textContent).toContain("Ready");
  const shell = view.container.querySelector('[data-slot="aui_composer-shell"]')!;
  expect(shell.querySelector('[data-slot="composer-mode-pill"]')).toBeNull();
});

test("without placement the pill stays in the composer and there is no footer", () => {
  const view = render(<Harness />);
  expect(view.container.querySelector('[data-slot="aui_composer-footer"]')).toBeNull();
  expect(view.container.querySelector('[data-slot="aui_composer-shell"] [data-slot="composer-mode-pill"]')).not.toBeNull();
});
