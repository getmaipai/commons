import { describe, expect, test, mock, afterEach } from "bun:test";
import { render, cleanup } from "@testing-library/react";
import { Avatar, diceBearAvatarUri } from "@/kit/primitives/Avatar";

afterEach(cleanup);

describe("Avatar", () => {
  // Radix's own Fallback mounts on a timer even with `delayMs={0}` (an
  // implementation detail, not a real loading delay) - `findByText`, which
  // retries, not the synchronous `getByText`, the same way every other
  // Radix-backed primitive in this kit is tested. With no seed, no
  // `AvatarImage` mounts at all, so this is the initial's only path.
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

  // `diceBearAvatarUri` is the exact function `Avatar` calls for a seed -
  // asserted directly rather than through a full render because
  // happy-dom's image loading is off by default (this suite's own
  // deterministic, offline default), so a rendered `<img>` never reaches
  // Radix's "loaded" state for any src, real or fake, and the DOM never
  // shows one either way. This is the real seed-to-picture mapping, not a
  // reimplementation of it.
  test("a seed produces a DiceBear picture as a data URI", () => {
    const uri = diceBearAvatarUri("riff-household-1");
    expect(uri).toMatch(/^data:image\/svg\+xml/);
  });

  test("the same seed always produces the same picture", () => {
    expect(diceBearAvatarUri("riff-household-1")).toBe(diceBearAvatarUri("riff-household-1"));
  });

  test("different seeds produce different pictures", () => {
    expect(diceBearAvatarUri("riff-household-1")).not.toBe(diceBearAvatarUri("sage-household-1"));
  });

  // A generation failure (a future DiceBear bump, a malformed seed) is
  // never allowed to crash the avatar - `@dicebear/core` is the only
  // importer of this module in the whole kit, so mocking it here can't
  // leak into an unrelated file's tests.
  test("a DiceBear failure returns no picture, not a thrown error", () => {
    mock.module("@dicebear/core", () => ({
      createAvatar: () => {
        throw new Error("dicebear exploded");
      },
    }));
    expect(diceBearAvatarUri("riff-household-1")).toBeNull();
  });

  test("Avatar itself survives a DiceBear failure and still shows the initial", async () => {
    mock.module("@dicebear/core", () => ({
      createAvatar: () => {
        throw new Error("dicebear exploded");
      },
    }));
    const { findByText } = render(<Avatar name="Sage" seed="riff-household-1" />);
    expect(await findByText("S")).toBeTruthy();
  });
});
