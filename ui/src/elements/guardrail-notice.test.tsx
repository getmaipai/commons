import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { GuardrailNotice } from "./guardrail-notice";

afterEach(cleanup);

describe("GuardrailNotice", () => {
  test("unset optional props keep today's refusal: shield, policy tag, explanation, truncating title", () => {
    const view = render(
      <GuardrailNotice
        title="I can't help with that"
        explanation="That reply was cut."
        policy="safety"
        alternatives={[]}
      />,
    );
    expect(view.getByText("safety")).toBeTruthy();
    expect(view.getByText("That reply was cut.")).toBeTruthy();
    expect(view.container.querySelector("svg.lucide-shield")).toBeTruthy();
    expect(view.getByText("I can't help with that").className).toContain(
      "truncate",
    );
    expect(
      view.container
        .querySelector("[data-slot='guardrail-notice']")
        ?.getAttribute("data-tone"),
    ).toBe("refusal");
  });

  test("support tone: no shield, no policy tag when left out, and actions are real links", () => {
    const view = render(
      <GuardrailNotice
        tone="support"
        title="Support is available"
        explanation="You can call or text 988 at any time."
        alternatives={[]}
        actions={[
          { label: "Call 988", href: "tel:988" },
          { label: "Chat online", href: "https://example.com/chat" },
        ]}
      />,
    );
    expect(view.container.querySelector("svg.lucide-shield")).toBeNull();
    expect(
      view.container.querySelector("svg.lucide-heart-handshake"),
    ).toBeTruthy();
    expect(view.container.querySelector(".font-mono")).toBeNull();
    const call = view.getByRole("link", { name: "Call 988" });
    expect(call.getAttribute("href")).toBe("tel:988");
    expect(call.getAttribute("target")).toBeNull();
    const chat = view.getByRole("link", { name: "Chat online" });
    expect(chat.getAttribute("target")).toBe("_blank");
    expect(chat.getAttribute("rel")).toBe("noopener noreferrer");
  });

  test("an action that is not a call, a text or a web page is never drawn", () => {
    const view = render(
      <GuardrailNotice
        tone="support"
        title="Support is available"
        alternatives={[]}
        actions={[
          { label: "Bad", href: "javascript:alert(1)" },
          { label: "Open", href: "HTTPS://example.com" },
        ]}
      />,
    );
    expect(view.queryByRole("link", { name: "Bad" })).toBeNull();
    expect(view.getByRole("link", { name: "Open" }).getAttribute("rel")).toBe(
      "noopener noreferrer",
    );
  });

  test("without an explanation the title is the one sentence and wraps instead of truncating", () => {
    const view = render(
      <GuardrailNotice
        title="I stopped that reply because it wasn't safe to finish."
        alternatives={[]}
      />,
    );
    const title = view.getByText(
      "I stopped that reply because it wasn't safe to finish.",
    );
    expect(title.className).not.toContain("truncate");
    expect(view.container.querySelector("p")).toBeNull();
  });
});
