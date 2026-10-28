import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { CompanionStage, type StageMode } from "@/kit/elements/companion-stage";

afterEach(cleanup);

const modes: StageMode[] = ["idle", "listening", "thinking", "speaking", "working"];

describe("CompanionStage", () => {
  test("renders every mode marker and a text-only state word", () => {
    for (const mode of modes) {
      const view = render(<CompanionStage name="Rivet" mode={mode} stateWord="Listening" character={<img alt="Rivet" />} talk={<button type="button">Talk</button>} workingLine="Finding photos" />);
      const root = view.container.querySelector('[data-slot="companion-stage"]');
      expect(root?.getAttribute("data-mode")).toBe(mode);
      const status = view.getByRole("status");
      expect(status.textContent).toBe("Listening");
      expect(status.querySelector("*" )).toBeNull();
      expect(root?.querySelector('header span.rounded-full[class*="bg-"]')).toBeNull();
      cleanup();
    }
  });

  test("character and its ancestors through the stage root have no background utility", () => {
    const view = render(<CompanionStage name="Rivet" mode="idle" character={<img data-testid="character" alt="Rivet" />} talk={<span />} />);
    let node: HTMLElement | null = view.getByTestId("character");
    while (node) {
      expect(node.className).not.toMatch(/(?:^|\s)bg-[^\s]+/);
      if (node.matches('[data-slot="companion-stage"]')) break;
      node = node.parentElement;
    }
    expect(node?.getAttribute("data-slot")).toBe("companion-stage");
  });

  test("actions call handlers and bubble dismissal is controlled by the host", () => {
    let selected = 0;
    let dismissed = 0;
    const view = render(<CompanionStage name="Rivet" mode="speaking" character={<span />} bubble={<p>Welcome back</p>} onDismissBubble={() => dismissed++} actions={[{ id: "review", label: "Review", onSelect: () => selected++ }]} talk={<span />} />);
    fireEvent.click(view.getByRole("button", { name: "Review" }));
    fireEvent.click(view.getByRole("button", { name: "Dismiss message" }));
    expect(selected).toBe(1);
    expect(dismissed).toBe(1);
    expect(view.getByText("Welcome back")).toBeTruthy();
  });

  test("bubble is absent unless provided and motion utilities are reduced-motion safe", () => {
    const view = render(<CompanionStage name="Rivet" mode="listening" character={<span />} talk={<span />} />);
    expect(view.container.querySelector('[data-slot="companion-stage-bubble"]')).toBeNull();
    expect(view.container.querySelector('[data-slot="companion-stage-listening-ring"]')).toBeNull();
    expect(view.container.querySelector('[data-slot="companion-stage-character"]')?.className).toContain("pt-6");
    expect(view.container.querySelector('[data-slot="companion-stage-wave"] span')?.className).toContain("motion-safe:animate-pulse");
  });
});

describe("CompanionStage heard and showHeader", () => {
  test("shows what was heard above the bubble, and hides the header visually without removing it", () => {
    const view = render(<CompanionStage name="Tessa" stateWord="Ready" mode="idle" character={<span>c</span>} talk={<span>t</span>} heard="Hi Tessa" bubble={<p>Hello</p>} showHeader={false} />);
    expect(view.container.querySelector('[data-slot="companion-stage-heard"]')?.textContent).toBe("Hi Tessa");
    expect(view.getByText("Hello")).toBeTruthy();
    const header = view.container.querySelector("header")!;
    expect(header.className).toContain("sr-only");
    expect(view.getByRole("status").textContent).toBe("Ready");
  });
  test("the header is visible by default and heard is absent without it", () => {
    const view = render(<CompanionStage name="Tessa" mode="idle" character={<span>c</span>} talk={<span>t</span>} />);
    expect(view.container.querySelector("header")!.className).not.toContain("sr-only");
    expect(view.container.querySelector('[data-slot="companion-stage-heard"]')).toBeNull();
  });
});

describe("CompanionStage history and thinking", () => {
  test("history draws both roles as bubbles in a log that starts at the newest message, and replaces the floating bubble", () => {
    const view = render(<CompanionStage name="Tessa" mode="idle" character={<span />} talk={<span />} bubble={<p>Floating</p>} history={[{ id: "1", role: "user", content: "Hi Tessa", time: "2:14 PM" }, { id: "2", role: "companion", content: <p>Hello there</p> }]} />);
    const log = view.getByRole("log", { name: "Conversation" });
    expect(log.className).toContain("flex-col-reverse");
    expect(log.className).toContain("mask-image");
    const items = log.querySelectorAll("li");
    expect(items[0]?.getAttribute("data-role")).toBe("user");
    expect(items[1]?.getAttribute("data-role")).toBe("companion");
    expect(view.getByText("2:14 PM")).toBeTruthy();
    expect(view.queryByText("Floating")).toBeNull();
  });

  test("no history means no log and the floating bubble still shows", () => {
    const view = render(<CompanionStage name="Tessa" mode="idle" character={<span />} talk={<span />} bubble={<p>Floating</p>} />);
    expect(view.queryByRole("log")).toBeNull();
    expect(view.getByText("Floating")).toBeTruthy();
  });

  test("the thought cloud holds three dots that only animate when motion is allowed", () => {
    const view = render(<CompanionStage name="Tessa" mode="thinking" character={<span />} talk={<span />} />);
    const dots = view.container.querySelectorAll('[data-slot="companion-stage-thought-dot"]');
    expect(dots.length).toBe(3);
    for (const dot of dots) expect(dot.className).toContain("motion-safe:animate-bounce");
    cleanup();
    const idle = render(<CompanionStage name="Tessa" mode="idle" character={<span />} talk={<span />} />);
    expect(idle.container.querySelector('[data-slot="companion-stage-thought-cloud"]')).toBeNull();
  });
});
