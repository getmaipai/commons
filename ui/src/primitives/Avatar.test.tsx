import { describe, expect, test, afterEach } from "bun:test";
import { render, cleanup } from "@testing-library/react";
import { Avatar } from "@/kit/primitives/Avatar";

afterEach(cleanup);

describe("Avatar", () => {
  // Radix's own Fallback mounts on a timer even with `delayMs={0}` (an
  // implementation detail, not a real loading delay - there's no
  // `AvatarImage` anywhere in this kit to wait on) - `findByText`, which
  // retries, not the synchronous `getByText`, the same way every other
  // Radix-backed primitive in this kit is tested.
  test("shows the name's first initial", async () => {
    const { findByText } = render(<Avatar name="Sage" />);
    expect(await findByText("S")).toBeTruthy();
  });

  // A screen-reader read-through (2026-09-06) found this initial
  // announced as real text right next to the adjacent visible name
  // everywhere Avatar is used ("S Sage" on People, "S You" on Home's
  // Who's Here strip) - it stands in for a real picture and carries no
  // information a screen reader needs to hear twice, once fixed with
  // `aria-hidden`. A regression test, not just the fix: a code review
  // (2026-09-06) found no test guarded this at all.
  test("the initial is hidden from assistive tech, not announced as real text", async () => {
    const { findByText } = render(<Avatar name="Sage" />);
    expect(await findByText("S")).toHaveAttribute("aria-hidden", "true");
  });

  // The phone header fold's own stand-in for a separate notification
  // badge (owner reference, "The phone composition," 2026-09-20) - the
  // menu this avatar opens already shows the real count in text, so the
  // dot itself is aria-hidden, same reasoning as the initial above.
  test("dot renders a badge on the avatar, hidden from assistive tech", async () => {
    const { container, findByText } = render(<Avatar name="Sage" dot />);
    await findByText("S");
    const badge = container.querySelector('[data-slot="avatar-badge"]');
    expect(badge).not.toBeNull();
    expect(badge).toHaveAttribute("aria-hidden", "true");
  });

  test("without dot, no badge renders", async () => {
    const { container, findByText } = render(<Avatar name="Sage" />);
    await findByText("S");
    expect(container.querySelector('[data-slot="avatar-badge"]')).toBeNull();
  });
});
