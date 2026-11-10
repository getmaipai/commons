// ADULT-LOCK-01: the Adult lock kit pattern: one identical tile per list with no metadata, the passcode dialog, the
// page-scoped in-memory proof, accessible announcements, and a leak test over every locked-capable part.
import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { MediaShelf } from "@/kit/primitives/MediaShelf";
import { LockedSettingRow } from "@/kit/settings/LockedSettingRow";
import { ResultFeed, type ResultFeedEntry } from "./result-feed";
import { VideoPlayer } from "./video-player";
import { OptionCards } from "./option-cards";
import { PromptBar } from "./prompt-bar";
import {
  AdultLockDialog,
  AdultLockProvider,
  LOCK_TILE_NAME,
  LockTile,
  collapseLocked,
  isLockedRow,
  useLockProof,
  type UnlockResult,
} from "./adult-lock";

const realMatchMedia = window.matchMedia;
beforeEach(() => stubMatchMedia({}));
afterEach(() => { cleanup(); mock.restore(); window.matchMedia = realMatchMedia; });

const NAME = "Locked items. Press to enter your passcode.";

/** Strings of an adult item that must never reach the page while it is locked. */
const SECRET = {
  id: "clip-secret-77",
  title: "Zorblax Nightshade",
  prompt: "zorblax secret prompt words",
  tag: "zorblaxtag",
  trigger: "zorblax_trigger",
  poster: "/api/videos/zorblax-poster.jpg",
  src: "/api/videos/zorblax.mp4",
  description: "zorblax description",
  owner: "Zorblax Owner",
};
const SECRET_STRINGS = Object.values(SECRET);

function expectNoLeak(root: ParentNode = document.body) {
  const html = (root instanceof Document ? root.documentElement : (root as HTMLElement)).outerHTML.toLowerCase();
  for (const s of SECRET_STRINGS) expect(html.includes(s.toLowerCase())).toBe(false);
  expect(html.includes("zorblax")).toBe(false);
}

/** What a host that forgot to redact would send: the locked flag plus every secret field. The kit must still draw none. */
const leakyRow = { locked: true, ...SECRET };

function Probe({ onState }: { onState: (s: ReturnType<typeof useLockProof>) => void }) {
  const s = useLockProof();
  onState(s);
  return <LockTile shape="row" />;
}

function setup(unlock: (code: string) => Promise<UnlockResult>, extra: Partial<React.ComponentProps<typeof AdultLockProvider>> = {}) {
  let latest!: ReturnType<typeof useLockProof>;
  const view = render(
    <AdultLockProvider unlock={unlock} digits={4} {...extra}>
      <Probe onState={(s) => { latest = s; }} />
    </AdultLockProvider>,
  );
  return { view, state: () => latest };
}

const dialog = () => document.querySelector<HTMLElement>('[data-slot="adult-lock-dialog"]');
const codeInput = () => document.querySelector<HTMLInputElement>('[data-slot="adult-lock-dialog"] input')!;
const status = () => document.querySelector('[data-slot="adult-lock-status"]')!.textContent;

describe("LockTile", () => {
  test("is one button with the same fixed name for every instance, the text Locked items, and nothing else", () => {
    const view = render(<><LockTile making /><LockTile shape="row" /><LockTile shape="fill" making /></>);
    const tiles = view.getAllByRole("button", { name: NAME });
    expect(tiles.length).toBe(3);
    expect(LOCK_TILE_NAME).toBe(NAME);
    for (const tile of tiles) {
      expect(tile.textContent).toBe("Locked items");
      expect(tile.getAttribute("aria-label")).toBe(NAME);
      expect(tile.querySelector("img, video, picture")).toBeNull();
      expect(tile.getAttribute("title")).toBeNull();
      expect(Array.from(tile.attributes).map((a) => a.name).filter((n) => n.startsWith("data-"))).toEqual(["data-slot"]);
    }
    // The spinner is decorative and says nothing.
    expect(tiles[0]!.querySelector("svg[aria-hidden='true'].animate-spin, svg[aria-hidden='true'][class*='animate-spin']")).toBeTruthy();
    expect(tiles[1]!.querySelectorAll("svg").length).toBe(1);
  });

  test("pressing it calls onUnlock when given", () => {
    const onUnlock = mock(() => {});
    const view = render(<LockTile onUnlock={onUnlock} />);
    fireEvent.click(view.getByRole("button", { name: NAME }));
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  test("uses only theme tokens: no fixed colour classes", () => {
    const html = render(<LockTile making />).container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b|\b(?:bg|text|border)-(?:red|blue|green|gray|slate|zinc|neutral|stone|black|white)\b/i);
  });
});

describe("collapseLocked and isLockedRow", () => {
  test("drops locked items unread and reports one flag, never a count", () => {
    const rows = [{ id: "a" }, { locked: true, making: true }, { id: "b" }, { locked: true }];
    const out = collapseLocked(rows, (r) => isLockedRow(r), (r) => (r as { making?: boolean }).making === true);
    expect(out.open).toEqual([{ id: "a" }, { id: "b" }]);
    expect(out.hasLocked).toBe(true);
    expect(out.making).toBe(true);
    expect(Object.keys(out).sort()).toEqual(["hasLocked", "making", "open"]);
  });
  test("only a literal true locks", () => {
    expect(isLockedRow({ locked: "true" })).toBe(false);
    expect(isLockedRow({ locked: 1 })).toBe(false);
    expect(isLockedRow({ locked: true })).toBe(true);
    expect(isLockedRow(null)).toBe(false);
    expect(isLockedRow({ hidden: true }, "hidden")).toBe(true);
  });
});

describe("AdultLockProvider and the dialog", () => {
  test("opens a modal with focus on the first box, asks for the person's own passcode and names no item", async () => {
    const { view } = setup(async () => ({ status: "ok" }));
    fireEvent.click(view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(dialog()).toBeTruthy());
    expect(dialog()!.getAttribute("role")).toBe("dialog");
    expect(dialog()!.textContent).toContain("Enter your passcode");
    await waitFor(() => expect(document.activeElement).toBe(codeInput()));
    expect(codeInput().getAttribute("autocomplete")).toBe("off");
  });

  test("a right code unlocks: the host got the code once, the page holds the proof in memory, a polite status says Unlocked", async () => {
    const unlock = mock(async (_c: string): Promise<UnlockResult> => ({ status: "ok", proof: "opaque-proof" }));
    const onUnlocked = mock((_p: string | null) => {});
    const { view, state } = setup(unlock, { onUnlocked });
    const setItem = spyOn(Storage.prototype, "setItem");
    const cookies = document.cookie;
    expect(state().unlocked).toBe(false);
    fireEvent.click(view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(codeInput()).toBeTruthy());
    fireEvent.change(codeInput(), { target: { value: "1234" } });
    await waitFor(() => expect(state().unlocked).toBe(true));
    expect(unlock).toHaveBeenCalledTimes(1);
    expect(unlock.mock.calls[0]![0]).toBe("1234");
    expect(onUnlocked).toHaveBeenCalledWith("opaque-proof");
    expect(state().proof).toBe("opaque-proof");
    expect(status()).toBe("Unlocked");
    await waitFor(() => expect(dialog()).toBeNull());
    // Never storage, never a cookie.
    expect(setItem).not.toHaveBeenCalled();
    expect(document.cookie).toBe(cookies);
    expect(JSON.stringify(window.localStorage)).not.toContain("opaque-proof");
    expect(JSON.stringify(window.sessionStorage)).not.toContain("opaque-proof");
  });

  test("a wrong code says what went wrong and what to do, clears the boxes and keeps the page locked", async () => {
    const unlock = mock(async (_c: string): Promise<UnlockResult> => ({ status: "failed", attemptsLeft: 2 }));
    const { view, state } = setup(unlock);
    fireEvent.click(view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(codeInput()).toBeTruthy());
    fireEvent.change(codeInput(), { target: { value: "0000" } });
    const alert = await waitFor(() => { const a = document.querySelector('[role="alert"]'); expect(a).toBeTruthy(); return a!; });
    expect(alert.textContent).toBe("That passcode was not right. Check it and try again. 2 tries left.");
    expect(state().unlocked).toBe(false);
    expect(codeInput().value).toBe("");
    expect(dialog()).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(codeInput()));
  });

  test("a lockout pauses the field, shows a countdown and re-enables when it ends", async () => {
    const unlock = mock(async (_c: string): Promise<UnlockResult> => ({ status: "locked_out", retryAfterSeconds: 1 }));
    const { view } = setup(unlock);
    fireEvent.click(view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(codeInput()).toBeTruthy());
    fireEvent.change(codeInput(), { target: { value: "1111" } });
    await waitFor(() => expect(document.querySelector('[role="alert"]')).toBeTruthy());
    expect(document.querySelector('[role="alert"]')!.textContent).toBe("Too many wrong tries. Unlocking is paused: wait for the timer, then try again.");
    expect(document.querySelector('[data-slot="adult-lock-wait"]')!.textContent).toBe("Try again in 1 second.");
    expect(codeInput().disabled).toBe(true);
    await act(async () => { await new Promise((r) => setTimeout(r, 1300)); });
    expect(document.querySelector('[data-slot="adult-lock-wait"]')).toBeNull();
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(codeInput().disabled).toBe(false);
  });

  test("a host that cannot be reached is a plain line, not a wrong code", async () => {
    const { view } = setup(async () => { throw new Error("network"); });
    fireEvent.click(view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(codeInput()).toBeTruthy());
    fireEvent.change(codeInput(), { target: { value: "1234" } });
    const alert = await waitFor(() => { const a = document.querySelector('[role="alert"]'); expect(a).toBeTruthy(); return a!; });
    expect(alert.textContent).toBe("We could not check your passcode. Check your connection and try again.");
  });

  test("with no passcode set the dialog says where to set one and has no field", async () => {
    const unlock = mock(async (_c: string): Promise<UnlockResult> => ({ status: "ok" }));
    const { view } = setup(unlock, { hasCredential: false });
    fireEvent.click(view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(dialog()).toBeTruthy());
    expect(dialog()!.textContent).toContain("Set a passcode in Account to open these.");
    expect(codeInput()).toBeNull();
  });

  test("the credential word follows the person's own (PIN)", async () => {
    const { view } = setup(async () => ({ status: "failed" }), { credentialWord: "PIN" });
    fireEvent.click(view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(codeInput()).toBeTruthy());
    expect(dialog()!.textContent).toContain("Enter your PIN");
    fireEvent.change(codeInput(), { target: { value: "1234" } });
    await waitFor(() => expect(document.querySelector('[role="alert"]')!.textContent).toContain("That PIN was not right."));
  });

  test("a password person gets a masked password field with show/hide, not digit boxes; Enter submits the whole password", async () => {
    const unlock = mock(async (_c: string): Promise<UnlockResult> => ({ status: "ok", proof: "p" }));
    const { view, state } = setup(unlock, { credentialKind: "password" });
    fireEvent.click(view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(codeInput()).toBeTruthy());
    expect(codeInput().type).toBe("password");
    expect(codeInput().getAttribute("autocomplete")).toBe("off");
    expect(dialog()!.textContent).toContain("Enter your password");
    expect(dialog()!.textContent).not.toContain("passcode");
    expect(dialog()!.querySelector('[data-slot="passcode-input"]')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(codeInput()));
    const submitButton = view.getByRole("button", { name: "Unlock" }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
    const reveal = view.getByRole("button", { name: "Show password" });
    fireEvent.click(reveal);
    expect(codeInput().type).toBe("text");
    expect(view.getByRole("button", { name: "Hide password" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(view.getByRole("button", { name: "Hide password" }));
    expect(codeInput().type).toBe("password");
    fireEvent.change(codeInput(), { target: { value: "correct horse 9!" } });
    expect(unlock).not.toHaveBeenCalled();
    expect(submitButton.disabled).toBe(false);
    fireEvent.submit(codeInput().closest("form")!);
    await waitFor(() => expect(state().unlocked).toBe(true));
    expect(unlock).toHaveBeenCalledTimes(1);
    expect(unlock.mock.calls[0]![0]).toBe("correct horse 9!");
    await waitFor(() => expect(dialog()).toBeNull());
  });

  test("a wrong password says the plain line with the word password, clears the field and refocuses it", async () => {
    const unlock = mock(async (_c: string): Promise<UnlockResult> => ({ status: "failed", attemptsLeft: 1 }));
    const { view, state } = setup(unlock, { credentialKind: "password" });
    fireEvent.click(view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(codeInput()).toBeTruthy());
    fireEvent.click(view.getByRole("button", { name: "Show password" }));
    expect(codeInput().type).toBe("text");
    fireEvent.change(codeInput(), { target: { value: "nope" } });
    fireEvent.submit(codeInput().closest("form")!);
    const alert = await waitFor(() => { const a = document.querySelector('[role="alert"]'); expect(a).toBeTruthy(); return a!; });
    expect(alert.textContent).toBe("That password was not right. Check it and try again. 1 try left.");
    expect(state().unlocked).toBe(false);
    expect(codeInput().value).toBe("");
    expect(codeInput().getAttribute("aria-invalid")).toBe("true");
    // The next try is masked again, not typed in plain sight.
    expect(codeInput().type).toBe("password");
    await waitFor(() => expect(document.activeElement).toBe(codeInput()));
  });

  test("a password lockout shows the same countdown and disables the field and the toggle", async () => {
    const unlock = mock(async (_c: string): Promise<UnlockResult> => ({ status: "locked_out", retryAfterSeconds: 1 }));
    const { view } = setup(unlock, { credentialKind: "password" });
    fireEvent.click(view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(codeInput()).toBeTruthy());
    fireEvent.change(codeInput(), { target: { value: "x" } });
    fireEvent.submit(codeInput().closest("form")!);
    await waitFor(() => expect(document.querySelector('[data-slot="adult-lock-wait"]')).toBeTruthy());
    expect(document.querySelector('[data-slot="adult-lock-wait"]')!.textContent).toBe("Try again in 1 second.");
    expect(codeInput().disabled).toBe(true);
    await act(async () => { await new Promise((r) => setTimeout(r, 1300)); });
    expect(codeInput().disabled).toBe(false);
  });

  test("a password person with none set sees where to set a password; a passcode kind still gets the digit boxes", async () => {
    const a = setup(async () => ({ status: "ok" }), { credentialKind: "password", hasCredential: false });
    fireEvent.click(a.view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(dialog()).toBeTruthy());
    expect(dialog()!.textContent).toContain("Set a password in Account to open these.");
    expect(codeInput()).toBeNull();
    cleanup();
    const b = setup(async () => ({ status: "ok" }), { credentialKind: "passcode" });
    fireEvent.click(b.view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(codeInput()).toBeTruthy());
    expect(codeInput().type).not.toBe("password");
    expect(dialog()!.textContent).toContain("Enter your passcode");
  });

  test("Cancel and Escape close it and return focus to the tile", async () => {
    const { view } = setup(async () => ({ status: "ok" }));
    const tile = view.getByRole("button", { name: NAME });
    tile.focus();
    fireEvent.click(tile);
    await waitFor(() => expect(dialog()).toBeTruthy());
    fireEvent.click(view.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(dialog()).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(tile));
  });

  test("relock drops the proof, announces Locked items hidden and tells the host; a second relock does nothing", async () => {
    const onRelock = mock(() => {});
    const { view, state } = setup(async () => ({ status: "ok", proof: "p" }), { onRelock });
    fireEvent.click(view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(codeInput()).toBeTruthy());
    fireEvent.change(codeInput(), { target: { value: "1234" } });
    await waitFor(() => expect(state().unlocked).toBe(true));
    act(() => state().relock());
    expect(state().unlocked).toBe(false);
    expect(state().proof).toBeNull();
    expect(status()).toBe("Locked items hidden");
    expect(onRelock).toHaveBeenCalledTimes(1);
    act(() => state().relock());
    expect(onRelock).toHaveBeenCalledTimes(1);
  });

  test("leaving the page while unlocked tells the host to revoke its side", async () => {
    const onRelock = mock(() => {});
    const { view, state } = setup(async () => ({ status: "ok", proof: "p" }), { onRelock });
    fireEvent.click(view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(codeInput()).toBeTruthy());
    fireEvent.change(codeInput(), { target: { value: "1234" } });
    await waitFor(() => expect(state().unlocked).toBe(true));
    view.unmount();
    expect(onRelock).toHaveBeenCalledTimes(1);
  });

  test("a fresh provider (a new page visit) starts locked, with no memory of the last", async () => {
    const first = setup(async () => ({ status: "ok", proof: "p" }));
    fireEvent.click(first.view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(codeInput()).toBeTruthy());
    fireEvent.change(codeInput(), { target: { value: "1234" } });
    await waitFor(() => expect(first.state().unlocked).toBe(true));
    first.view.unmount();
    const second = setup(async () => ({ status: "ok" }));
    expect(second.state().unlocked).toBe(false);
    expect(second.state().proof).toBeNull();
  });

  test("no announcement or status text ever holds a digit or a name", async () => {
    const { view, state } = setup(async () => ({ status: "ok", proof: "p" }));
    fireEvent.click(view.getByRole("button", { name: NAME }));
    await waitFor(() => expect(codeInput()).toBeTruthy());
    fireEvent.change(codeInput(), { target: { value: "1234" } });
    await waitFor(() => expect(state().unlocked).toBe(true));
    expect(status()).not.toMatch(/\d/);
    act(() => state().relock());
    expect(status()).not.toMatch(/\d/);
  });
});

describe("the locked state on every list part", () => {
  const clipRow = (n: string) => ({ id: `ok-${n}`, title: `Open ${n}`, thumb: `/t/${n}.jpg` });

  test("MediaShelf: one tile for any number of locked items, in every layout; no locked field is read", () => {
    const getKey = mock((r: { id: string }) => r.id);
    const getLabel = mock((r: { title: string }) => r.title);
    const renderItem = mock((r: { title: string }) => <span>{r.title}</span>);
    const items = [clipRow("1"), leakyRow, clipRow("2"), { ...leakyRow, id: "other-secret" }, leakyRow] as unknown as { id: string; title: string }[];
    const base = { items, getKey, getLabel, renderItem, isLocked: (r: unknown) => isLockedRow(r), heading: "My clips" };
    for (const props of [
      { },
      { layout: "grid" as const },
      { orientation: "vertical" as const },
      { variant: "plain" as const },
      { layout: "grid" as const, groupBy: { getKey: () => "d", label: (k: string) => k } },
    ]) {
      const view = render(<MediaShelf {...base} {...props} />);
      expect(view.getAllByRole("button", { name: NAME }).length).toBe(1);
      expect(view.getByText("Open 1")).toBeTruthy();
      expect(view.getByText("Open 2")).toBeTruthy();
      expectNoLeak(view.container);
      cleanup();
    }
    // The locked rows never reached the caller's callbacks.
    expect(getKey.mock.calls.every(([r]) => r.id.startsWith("ok-"))).toBe(true);
    expect(getLabel.mock.calls.every(([r]) => r.title.startsWith("Open"))).toBe(true);
    expect(renderItem.mock.calls.every(([r]) => r.title.startsWith("Open"))).toBe(true);
  });

  test("MediaShelf: only locked items still shows the tile (not the empty state); none locked shows no tile; spinner while making", () => {
    const only = render(<MediaShelf items={[{ locked: true, making: true }]} getKey={() => "x"} renderItem={() => null} isLocked={(r) => isLockedRow(r)} isMaking={(r) => (r as { making?: boolean }).making === true} emptyState={{ icon: "film", text: "Nothing yet." }} />);
    expect(only.getByRole("button", { name: NAME })).toBeTruthy();
    expect(only.queryByText("Nothing yet.")).toBeNull();
    expect(only.getByRole("button", { name: NAME }).querySelector("svg[class*='animate-spin']")).toBeTruthy();
    cleanup();
    const none = render(<MediaShelf items={[clipRow("1")]} getKey={(r) => r.id} renderItem={() => null} isLocked={(r) => isLockedRow(r)} />);
    expect(none.queryByRole("button", { name: NAME })).toBeNull();
    cleanup();
    const hidden = render(<MediaShelf items={[] as unknown[]} getKey={() => "x"} renderItem={() => null} isLocked={(r) => isLockedRow(r)} hideWhenEmpty />);
    expect(hidden.container.innerHTML).toBe("");
  });

  test("MediaShelf: a shelf without isLocked is unchanged", () => {
    const props = { items: [clipRow("1"), clipRow("2")], getKey: (r: { id: string }) => r.id, renderItem: (r: { title: string }) => <span>{r.title}</span>, heading: "Music" };
    const a = render(<MediaShelf {...props} />).container.innerHTML;
    cleanup();
    const b = render(<MediaShelf {...props} isLocked={() => false} />).container.innerHTML;
    expect(b).toBe(a);
  });

  test("ResultFeed: one tile after the open entries; a locked entry's strings are never read or drawn", () => {
    const open: ResultFeedEntry = { key: "o", words: "an open fox", day: "Today", player: { status: "ready", prompt: "an open fox", src: "/open.mp4" } as ResultFeedEntry["player"] };
    const view = render(<ResultFeed entries={[open, leakyRow as never, { key: "l2", locked: true, making: true }, leakyRow as never]} />);
    expect(view.getAllByRole("button", { name: NAME }).length).toBe(1);
    expect(view.getAllByRole("article").length).toBe(1);
    expect(view.getAllByText("an open fox").length).toBeGreaterThan(0);
    expect(view.container.querySelectorAll("video").length).toBe(1);
    expectNoLeak(view.container);
    expect(view.getByRole("separator").getAttribute("aria-label")).toBe("Today, 1 clip");
  });

  test("ResultFeed: only locked entries is not the empty state", () => {
    const view = render(<ResultFeed entries={[{ key: "l", locked: true }]} empty={<p>Nothing here yet.</p>} />);
    expect(view.getByRole("button", { name: NAME })).toBeTruthy();
    expect(view.queryByText("Nothing here yet.")).toBeNull();
  });

  test("VideoPlayer: locked renders the tile and loads nothing", () => {
    const view = render(<VideoPlayer {...({ locked: true, ...SECRET } as unknown as { locked: true })} size="lg" />);
    expect(view.getByRole("button", { name: NAME })).toBeTruthy();
    expect(view.container.querySelector("video, img, source, a, [src], [href], [poster]")).toBeNull();
    expect(view.container.querySelectorAll("button").length).toBe(1);
    expectNoLeak(view.container);
  });

  test("VideoPlayer: an unlocked player is unchanged", () => {
    const view = render(<VideoPlayer status="ready" prompt="a fox" src="/a.mp4" />);
    expect(view.container.querySelector("video")).toBeTruthy();
    expect(view.queryByRole("button", { name: NAME })).toBeNull();
  });

  test("OptionCards: locked cards collapse into one tile outside the radio group and are never a choice", () => {
    const onValueChange = mock((_v: string | number) => {});
    const options = [{ value: "a", label: "Anime" }, leakyRow, { value: "b", label: "Film" }, leakyRow] as never[];
    const view = render(<OptionCards label="Look" options={options} value="a" onValueChange={onValueChange} />);
    expect(view.getAllByRole("radio").length).toBe(2);
    expect(view.getAllByRole("button", { name: NAME }).length).toBe(1);
    expect(view.getByRole("radiogroup").contains(view.getByRole("button", { name: NAME }))).toBe(false);
    expectNoLeak(view.container);
    fireEvent.click(view.getByRole("button", { name: NAME }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("OptionCards: no locked card, the same markup as before", () => {
    const options = [{ value: "a", label: "Anime" }, { value: "b", label: "Film" }];
    const view = render(<OptionCards label="Look" options={options} value="a" onValueChange={() => {}} />);
    expect(view.container.querySelector('[data-slot="option-cards-with-lock"]')).toBeNull();
    expect(view.container.firstElementChild!.getAttribute("data-slot")).toBe("option-cards");
  });

  test("PromptBar: a locked picker option is one tile in the cards and absent from a dropdown", () => {
    const chips = [
      { id: "look", label: "Look", variant: "cards" as const, value: "a", onValueChange: () => {}, options: [{ value: "a", label: "Anime" }, leakyRow as never] },
      { id: "len", label: "Length", value: "5", onValueChange: () => {}, options: [{ value: "5", label: "5 seconds" }, leakyRow as never] },
    ];
    const view = render(<PromptBar label="Describe" value="" onValueChange={() => {}} onSubmit={() => {}} chips={chips} />);
    expect(view.getAllByRole("button", { name: NAME }).length).toBe(1);
    fireEvent.click(view.getByRole("combobox", { name: "Length" }));
    expect(document.querySelectorAll('[role="option"]').length).toBe(1);
    expectNoLeak(document.body);
  });

  test("LockedSettingRow: one row with the tile and no label, help or value", () => {
    const view = render(<LockedSettingRow making />);
    const row = view.container.querySelector('[data-slot="locked-setting-row"]')!;
    expect(row.textContent).toBe("Locked items");
    expect(view.getAllByRole("button", { name: NAME }).length).toBe(1);
  });

  test("a locked list with an adult item draws none of its strings anywhere in the DOM, dialog open or not", async () => {
    const entries = [leakyRow as never];
    const view = render(
      <AdultLockProvider unlock={async () => ({ status: "failed" })} digits={4}>
        <MediaShelf items={[leakyRow] as unknown[]} getKey={() => "k"} renderItem={() => null} isLocked={(r) => isLockedRow(r)} heading="My clips" />
        <ResultFeed entries={entries} />
        <VideoPlayer {...({ locked: true, ...SECRET } as unknown as { locked: true })} />
        <OptionCards label="Look" options={[leakyRow as never]} value="x" onValueChange={() => {}} />
        <LockedSettingRow />
      </AdultLockProvider>,
    );
    expectNoLeak(document.body);
    expect(view.getAllByRole("button", { name: NAME }).length).toBe(5);
    fireEvent.click(view.getAllByRole("button", { name: NAME })[0]!);
    await waitFor(() => expect(codeInput()).toBeTruthy());
    fireEvent.change(codeInput(), { target: { value: "9999" } });
    await waitFor(() => expect(document.querySelector('[role="alert"]')).toBeTruthy());
    expectNoLeak(document.body);
    // No attribute anywhere names or counts a locked item.
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      for (const attr of Array.from(el.attributes)) expect(attr.value.toLowerCase().includes("zorblax")).toBe(false);
    }
  });
});

describe("AdultLockDialog as a confirm (ADULT-LOCK-06)", () => {
  test("passkey is absent without a callback and uses the shared result handling when supplied", async () => {
    const base = render(<AdultLockDialog open onOpenChange={() => {}} unlock={async () => ({ status: "failed" })} onUnlocked={() => {}} />);
    expect(base.queryByRole("button", { name: "Use a passkey" })).toBeNull();
    cleanup();
    const onPasskey = mock(async () => ({ status: "failed" as const, attemptsLeft: 2 }));
    const view = render(<AdultLockDialog open onOpenChange={() => {}} unlock={async () => ({ status: "failed" })} onPasskey={onPasskey} onUnlocked={() => {}} />);
    fireEvent.click(view.getByRole("button", { name: "Use a passkey" }));
    await waitFor(() => expect(onPasskey).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("2 tries left"));
  });
  test("title, description and actionLabel replace the unlock words; the field, the check and the failure lines are the same", async () => {
    const unlock = mock(async (): Promise<UnlockResult> => ({ status: "failed" }));
    const view = render(<AdultLockDialog open onOpenChange={() => {}} unlock={unlock} onUnlocked={() => {}} digits={4} title="Remove the lock" description="This changes who can see it." actionLabel="Remove lock" />);
    const text = document.querySelector('[data-slot="adult-lock-dialog"]')!.textContent!;
    expect(text).toContain("Remove the lock");
    expect(text).toContain("This changes who can see it.");
    expect(text).not.toContain("Enter your passcode");
    expect(view.getByRole("button", { name: "Remove lock" })).toBeTruthy();
    fireEvent.change(codeInput(), { target: { value: "1234" } });
    await waitFor(() => expect(unlock).toHaveBeenCalledWith("1234"));
    await waitFor(() => expect(document.querySelector('[data-slot="adult-lock-error"]')?.textContent).toContain("was not right"));
  });

  test("with none of the three props the dialog reads as before", () => {
    const view = render(<AdultLockDialog open onOpenChange={() => {}} unlock={async () => ({ status: "ok" })} onUnlocked={() => {}} />);
    const text = document.querySelector('[data-slot="adult-lock-dialog"]')!.textContent!;
    expect(text).toContain("Enter your passcode");
    expect(text).toContain("Only your own code opens them.");
    expect(view.getByRole("button", { name: "Unlock" })).toBeTruthy();
  });
});
