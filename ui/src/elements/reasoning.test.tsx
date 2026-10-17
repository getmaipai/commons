import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Collapsible } from "@/elements/ui/collapsible";
import { ReasoningTrigger, thoughtForLabel } from "./reasoning";

afterEach(cleanup);

function renderTrigger(props: React.ComponentProps<typeof ReasoningTrigger>) {
  return render(
    <Collapsible>
      <ReasoningTrigger {...props} />
    </Collapsible>,
  );
}

describe("ReasoningTrigger", () => {
  test("default label is unchanged", () => {
    const { container } = renderTrigger({ duration: 3 });
    expect(container.textContent).toContain("Reasoning (3s)");
  });

  test("label replaces the word while live, with the shimmer", () => {
    const { container } = renderTrigger({ active: true, label: "Pondering" });
    const wrap = container.querySelector("[data-slot=reasoning-trigger-label]");
    expect(wrap?.textContent).toBe("Pondering");
    expect(wrap?.className).toContain("shimmer");
  });

  test("doneLabel builds the finished label from the seconds", () => {
    const { container } = renderTrigger({ duration: 4, doneLabel: thoughtForLabel });
    expect(container.textContent).toContain("Thought for 4s");
  });

  test("thoughtForLabel rounds and never goes below 1", () => {
    expect(thoughtForLabel(0)).toBe("Thought for 1s");
    expect(thoughtForLabel(2.6)).toBe("Thought for 3s");
  });

  test("announce renders one polite status and hides the live word while active", () => {
    const { container } = renderTrigger({ active: true, label: "Mulling it over", announce: "Thinking" });
    const status = container.querySelector("[role=status]");
    expect(status?.getAttribute("aria-live")).toBe("polite");
    expect(status?.textContent).toBe("Thinking");
    expect(container.querySelector("span[aria-hidden=true]")?.textContent).toBe("Mulling it over");
  });
});
