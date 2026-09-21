import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, findByText, queryByText } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SettingsRenderer } from "@/kit/settings/SettingsRenderer";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import type { SettingsKey } from "@maipai/spec/gen/ts/settings-key.js";
import type { ResolvedSetting } from "@/kit/settings/resolvedSetting";

afterEach(cleanup);

function key(overrides: Partial<SettingsKey> = {}): SettingsKey {
  return {
    key: "household.locale",
    scope: "household",
    selector: "select",
    range: { options: ["en-US", "en-GB"] },
    default: "en-US",
    label: "Language and region",
    level: "basic",
    secret: false,
    lives_in: "household.system",
    honoured_by: ["home"],
    ...overrides,
  };
}

function value(overrides: Partial<ResolvedSetting> = {}): ResolvedSetting {
  return {
    key: "household.locale",
    value: "en-US",
    source: "default",
    label: "Language and region",
    level: "basic",
    secret: false,
    ...overrides,
  };
}

function stubSettings(registry: SettingsKey[], values: ResolvedSetting[]): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = mock((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/api/settings/registry")) return Promise.resolve(new Response(JSON.stringify(registry), { status: 200 }));
    if (url.includes("/api/settings")) return Promise.resolve(new Response(JSON.stringify(values), { status: 200 }));
    throw new Error(`unstubbed fetch: ${url}`);
  }) as unknown as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

describe("SettingsRenderer groupIds", () => {
  // HOME-UI-03: a card-grid settings page mounts several SettingsRenderer
  // instances on one screen, each meant for a different card - without a
  // way to restrict which groups render, every instance would show every
  // eligible group, defeating the whole point of splitting them into cards.
  test("only renders the requested groups, even when more are eligible", async () => {
    const registry = [
      key({ key: "household.locale", lives_in: "household.system" }),
      key({ key: "household.notify_updates", lives_in: "household.notifications", label: "Notify on updates" }),
    ];
    const values = [value({ key: "household.locale" }), value({ key: "household.notify_updates", label: "Notify on updates" })];
    const restore = stubSettings(registry, values);
    try {
      const { container } = renderWithQueryClient(
        <SettingsRenderer scope="household" scopeValue="household" honouredBy="home" groupIds={["household.system"]} />,
      );
      await findByText(container, "Language and region");
      expect(queryByText(container, "Notify on updates")).toBeNull();
    } finally {
      restore();
    }
  });

  test("without groupIds, every eligible group still renders (unchanged default)", async () => {
    const registry = [
      key({ key: "household.locale", lives_in: "household.system" }),
      key({ key: "household.notify_updates", lives_in: "household.notifications", label: "Notify on updates" }),
    ];
    const values = [value({ key: "household.locale" }), value({ key: "household.notify_updates", label: "Notify on updates" })];
    const restore = stubSettings(registry, values);
    try {
      const { container } = renderWithQueryClient(<SettingsRenderer scope="household" scopeValue="household" honouredBy="home" />);
      await findByText(container, "Language and region");
      expect(await findByText(container, "Notify on updates")).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  test("a groupIds list matching nothing shows the same empty state as truly having no settings", async () => {
    const registry = [key({ key: "household.locale", lives_in: "household.system" })];
    const values = [value({ key: "household.locale" })];
    const restore = stubSettings(registry, values);
    try {
      const { container } = renderWithQueryClient(
        <SettingsRenderer scope="household" scopeValue="household" honouredBy="home" groupIds={["person.voice"]} />,
      );
      expect(await findByText(container, "No settings yet.")).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  // A code review: a groupIds typo (or an id that drifts out from under
  // a caller) rendered the exact same "No settings yet." as a genuinely
  // empty scope, with nothing anywhere signaling that a whole card had
  // gone silently missing.
  test("groupIds matching nothing warns", async () => {
    const registry = [key({ key: "household.locale", lives_in: "household.system" })];
    const values = [value({ key: "household.locale" })];
    const restore = stubSettings(registry, values);
    const warn = mock(() => {});
    const original = console.warn;
    console.warn = warn;
    try {
      const { container } = renderWithQueryClient(
        <SettingsRenderer scope="household" scopeValue="household" honouredBy="home" groupIds={["household.systm"]} />,
      );
      await findByText(container, "No settings yet.");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("matched no group"));
    } finally {
      console.warn = original;
      restore();
    }
  });

  test("groupIds matching something real never warns", async () => {
    const registry = [key({ key: "household.locale", lives_in: "household.system" })];
    const values = [value({ key: "household.locale" })];
    const restore = stubSettings(registry, values);
    const warn = mock(() => {});
    const original = console.warn;
    console.warn = warn;
    try {
      const { container } = renderWithQueryClient(
        <SettingsRenderer scope="household" scopeValue="household" honouredBy="home" groupIds={["household.system"]} />,
      );
      await findByText(container, "Language and region");
      expect(warn).not.toHaveBeenCalled();
    } finally {
      console.warn = original;
      restore();
    }
  });

  // A fix-hunk re-review: the first version of this warning ran inside
  // AsyncState's own render prop, so it re-fired on every re-render of
  // this component (a parent's search box changing `filter` is the
  // normal case) instead of once per real misconfiguration - a
  // one-shot signal turned into a console flood. A stable groupIds
  // array (same items, fresh reference each render - the normal shape
  // of an inline prop) re-rendering via `filter` must warn once, not
  // once per re-render.
  test("a re-render with the same mismatched groupIds (fresh array reference) does not re-warn", async () => {
    const registry = [key({ key: "household.locale", lives_in: "household.system" })];
    const values = [value({ key: "household.locale" })];
    const restore = stubSettings(registry, values);
    const warn = mock(() => {});
    const original = console.warn;
    console.warn = warn;
    try {
      const { container, rerender, queryClient } = renderWithQueryClient(
        <SettingsRenderer scope="household" scopeValue="household" honouredBy="home" groupIds={["household.systm"]} />,
      );
      await findByText(container, "No settings yet.");
      expect(warn).toHaveBeenCalledTimes(1);
      rerender(
        <QueryClientProvider client={queryClient}>
          <SettingsRenderer scope="household" scopeValue="household" honouredBy="home" groupIds={["household.systm"]} filter="something" />
        </QueryClientProvider>,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      console.warn = original;
      restore();
    }
  });
});
