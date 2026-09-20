import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, test } from "bun:test";
import { DetailsPane, type DetailsPaneProps } from "@/kit/blocks/pane/DetailsPane";

afterEach(cleanup);

// A Radix Sheet/Dialog portal outlives testing-library's own container,
// and this environment's waitFor (MutationObserver-based) stops
// noticing DOM changes once a few Sheets have mounted and unmounted in
// the same file. A short real delay settles Radix's own effects just
// as reliably and doesn't depend on that observer.
function settle(ms = 30): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("renders the header (icon tile, name, identifier, status pill) and focuses the heading on open", async () => {
  render(<DetailsPane open onClose={() => undefined} icon="box" hue="--cat-models" name="Qwen3 27B Instruct" identifier="qwen3-27b-instruct" status="running" />);
  await settle();
  expect(document.body.textContent).toContain("Qwen3 27B Instruct");
  expect(document.body.textContent).toContain("qwen3-27b-instruct");
  expect(document.body.textContent).toContain("Running");
  expect(document.activeElement?.tagName).toBe("H2");
});

test("shows no tab list when no tabs are passed", async () => {
  render(<DetailsPane open onClose={() => undefined} icon="box" hue="--cat-models" name="Qwen3" identifier="qwen3" status="running" />);
  await settle();
  expect(document.body.textContent).toContain("Qwen3");
  expect(Array.from(document.querySelectorAll("button")).some((button) => button.textContent === "Overview")).toBe(false);
});

test("renders tabs only when content is passed for them, and switches between them", async () => {
  render(<DetailsPane open onClose={() => undefined} icon="box" hue="--cat-models" name="Qwen3" identifier="qwen3" status="running" tabs={[{ id: "overview", label: "Overview", content: <p>Overview body</p> }, { id: "logs", label: "Logs", content: <p>Logs body</p> }]} />);
  await settle();
  expect(document.body.textContent).toContain("Overview body");
  const logsTab = Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Logs") as HTMLButtonElement;
  expect(logsTab).toBeTruthy();
  // Radix Tabs switches on focus (its "automatic" activation mode); a
  // real click moves focus natively, but happy-dom's synthetic click
  // does not, so the test drives focus explicitly.
  logsTab.focus();
  fireEvent.click(logsTab);
  await settle();
  expect(document.body.textContent).toContain("Logs body");
});

test("a destructive action is visually separated and still fires onClick", async () => {
  let removed = false;
  render(<DetailsPane open onClose={() => undefined} icon="box" hue="--cat-models" name="Qwen3" identifier="qwen3" status="running" actions={[{ label: "Restart", onClick: () => undefined }, { label: "Remove", destructive: true, onClick: () => { removed = true; } }]} />);
  await settle();
  expect(document.body.textContent).toContain("Restart");
  const removeButton = Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Remove")!;
  expect(removeButton.getAttribute("data-variant")).toBe("destructive");
  fireEvent.click(removeButton);
  expect(removed).toBe(true);
});

test("a destructive action with a confirmLabel asks before firing onClick", async () => {
  let removed = false;
  render(<DetailsPane open onClose={() => undefined} icon="box" hue="--cat-models" name="Qwen3" identifier="qwen3" status="running" actions={[{ label: "Remove", destructive: true, confirmLabel: "Remove Qwen3?", onClick: () => { removed = true; } }]} />);
  await settle();
  const removeButton = Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Remove")!;
  fireEvent.click(removeButton);
  expect(removed).toBe(false);
  expect(document.body.textContent).toContain("Remove Qwen3?");
  const cancelButton = Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Cancel")!;
  fireEvent.click(cancelButton);
  expect(document.body.textContent).not.toContain("Remove Qwen3?");
  expect(removed).toBe(false);
  fireEvent.click(removeButton);
  const confirmButton = Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Confirm")!;
  fireEvent.click(confirmButton);
  await settle();
  expect(removed).toBe(true);
  expect(document.body.textContent).not.toContain("Remove Qwen3?");
});

// Regression: a review caught this live before it shipped - a confirm
// pending for one item stayed armed (and its captured `onClick` closure
// with it) when the pane re-rendered for a different one, the pane's
// own master-detail contract (a parent swaps `identifier`/`actions` as
// the selection changes, never unmounting the pane itself).
test("switching identifier clears a pending confirm for the previous item", async () => {
  let removedQwen = false;
  let removedLlama = false;
  const propsFor = (name: string, onClick: () => void): DetailsPaneProps => ({
    open: true,
    onClose: () => undefined,
    icon: "box",
    hue: "--cat-models",
    name,
    identifier: name.toLowerCase(),
    status: "running",
    actions: [{ label: "Remove", destructive: true, confirmLabel: `Remove ${name}?`, onClick }],
  });
  const { rerender } = render(<DetailsPane {...propsFor("Qwen3", () => { removedQwen = true; })} />);
  await settle();
  fireEvent.click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Remove")!);
  expect(document.body.textContent).toContain("Remove Qwen3?");
  rerender(<DetailsPane {...propsFor("Llama", () => { removedLlama = true; })} />);
  await settle();
  expect(document.body.textContent).not.toContain("Remove Qwen3?");
  expect(document.body.textContent).not.toContain("Remove Llama?");
  const confirmButtons = Array.from(document.querySelectorAll("button")).filter((button) => button.textContent === "Confirm");
  expect(confirmButtons.length).toBe(0);
  expect(removedQwen).toBe(false);
  expect(removedLlama).toBe(false);
});

// Regression: the schema renderer's own ConfirmDialog exists specifically
// because Radix's default confirm-action closes synchronously before an
// async action settles (2026-09-05: a batch action that failed partway
// showed no error, the dialog already gone) - this pane's own confirm
// banner had none of that guard until a review pointed at it living here
// unprotected. Close (and Cancel) must stay blocked until the confirmed
// action actually finishes.
test("a pending async confirm blocks Close until it settles", async () => {
  let resolveRemove: () => void = () => undefined;
  const removed = new Promise<void>((resolve) => { resolveRemove = resolve; });
  let closed = false;
  render(<DetailsPane open onClose={() => { closed = true; }} icon="box" hue="--cat-models" name="Qwen3" identifier="qwen3" status="running" actions={[{ label: "Remove", destructive: true, confirmLabel: "Remove Qwen3?", onClick: () => removed }]} />);
  await settle();
  fireEvent.click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Remove")!);
  fireEvent.click(Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Confirm")!);
  await settle();
  expect(document.body.textContent).toContain("Working…");
  const closeButton = document.querySelector('button[aria-label="Close"]') as HTMLButtonElement;
  expect(closeButton.disabled).toBe(true);
  fireEvent.click(closeButton);
  expect(closed).toBe(false);
  resolveRemove();
  await settle();
  expect(closeButton.disabled).toBe(false);
});

test("a disabled action carries its reason and cannot be clicked", async () => {
  let clicked = false;
  render(<DetailsPane open onClose={() => undefined} icon="box" hue="--cat-models" name="Qwen3" identifier="qwen3" status="running" actions={[{ label: "Chat", onClick: () => { clicked = true; }, disabledReason: "Load the model first." }]} />);
  await settle();
  const button = document.querySelector("button[title='Load the model first.']") as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.click(button);
  expect(clicked).toBe(false);
});

test("the phone-width sheet has no minimum width wider than the viewport", async () => {
  render(<DetailsPane open onClose={() => undefined} icon="box" hue="--cat-models" name="Qwen3" identifier="qwen3" status="running" />);
  await settle();
  const content = document.querySelector('[data-slot="sheet-content"]')!;
  expect(content.className).toContain("max-[719px]:w-full");
  expect(content.className).toContain("max-[719px]:min-w-0");
});

test("the close control fires onClose", async () => {
  let closed = false;
  render(<DetailsPane open onClose={() => { closed = true; }} icon="box" hue="--cat-models" name="Qwen3" identifier="qwen3" status="running" />);
  await settle();
  const closeButton = document.querySelector('button[aria-label="Close"]')!;
  fireEvent.click(closeButton);
  expect(closed).toBe(true);
});
