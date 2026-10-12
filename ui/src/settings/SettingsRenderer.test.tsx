import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { SettingsRenderer } from "@/kit/settings/SettingsRenderer";

const originalFetch = globalThis.fetch;
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

type Def = {
  key: string;
  selector: string;
  label: string;
  help?: string;
  level?: "basic" | "advanced" | "expert";
  lives_in: string;
  secret?: boolean;
  scope?: string;
  honoured_by?: string[];
  range?: unknown;
  default?: unknown;
};

function registryOf(defs: Def[]) {
  return defs.map((d) => ({
    scope: "person",
    level: "basic",
    secret: false,
    honoured_by: ["home"],
    default: d.selector === "boolean" ? false : "",
    ...d,
  }));
}

function valuesOf(defs: Def[], values: Record<string, unknown> = {}) {
  return defs.map((d) => ({
    key: d.key,
    value: d.key in values ? values[d.key] : d.selector === "boolean" ? false : "",
    source: "default",
    label: d.label,
    level: d.level ?? "basic",
    secret: d.secret ?? false,
    isSet: d.secret ? true : undefined,
  }));
}

const DEFS: Def[] = [
  { key: "chat.photo_uploads", selector: "boolean", label: "Send photos in chat", help: "Attach pictures to a message.", lives_in: "person.chat" },
  { key: "reference.images", selector: "boolean", label: "Show pictures in answers", lives_in: "person.chat" },
  { key: "ui.show_turn_stats", selector: "boolean", label: "Show reply stats", level: "advanced", lives_in: "person.chat" },
  { key: "search.safe_search", selector: "select", label: "Safe search level", range: { options: ["off", "moderate", "strict"] }, lives_in: "person.search" },
  { key: "ui.pinned_apps", selector: "text", label: "Pinned apps", level: "expert", lives_in: "profile.appearance" },
  { key: "search.brave_api_key", selector: "text", label: "Brave key", secret: true, level: "advanced", lives_in: "person.search" },
  { key: "stack.only", selector: "boolean", label: "Stack only", lives_in: "person.chat", honoured_by: ["stack"] },
];

const calls: { path: string; method: string; body?: string }[] = [];

function mockApi(defs: Def[], values: Record<string, unknown> = {}, putStatus = 200) {
  calls.length = 0;
  globalThis.fetch = (async (path: RequestInfo | URL, init?: RequestInit) => {
    const url = String(path);
    const method = init?.method ?? "GET";
    calls.push({ path: url, method, body: init?.body as string | undefined });
    const json = (data: unknown, status = 200) =>
      ({ ok: status < 400, status, json: async () => data, text: async () => JSON.stringify(data) }) as Response;
    if (url === "/api/settings/registry") return json(registryOf(defs));
    if (url.startsWith("/api/settings?scope=")) return json(valuesOf(defs, values));
    if (url === "/api/settings" && method === "PUT") {
      const body = JSON.parse(String(init!.body)) as { key: string; value: unknown };
      if (putStatus >= 400) return json({ error: "That value is not allowed." }, putStatus);
      const d = defs.find((x) => x.key === body.key)!;
      return json({ key: body.key, value: body.value, source: "user", label: d.label, level: d.level ?? "basic", secret: false });
    }
    return json({}, 404);
  }) as unknown as typeof fetch;
}

const props = { scope: "person" as const, scopeValue: "person:p1", honouredBy: "home" };

describe("SettingsRenderer - cards and rows", () => {
  beforeEach(() => mockApi(DEFS));

  test("one card per registry group, headed by its title, rows split by inset dividers", async () => {
    const { findByText, container } = renderWithQueryClient(<SettingsRenderer {...props} />);
    await findByText("Send photos in chat");
    const sections = [...container.querySelectorAll("section")];
    expect(sections.map((s) => s.id)).toEqual(["settings-person.chat", "settings-person.search"]);
    expect(sections.map((s) => s.querySelector("h3")!.textContent)).toEqual(["Chat", "Search"]);
    const chat = sections[0]!;
    expect(chat.querySelectorAll("[data-slot=item-group][data-variant=card]")).toHaveLength(1);
    expect(chat.querySelectorAll("[data-slot=item][data-size=setting]")).toHaveLength(3);
    expect(chat.querySelectorAll("[data-slot=item-separator][data-variant=inset]")).toHaveLength(2);
  });

  test("a key for another product and an expert key are never drawn", async () => {
    const { findByText, queryByText } = renderWithQueryClient(<SettingsRenderer {...props} />);
    await findByText("Send photos in chat");
    expect(queryByText("Stack only")).toBeNull();
    expect(queryByText("Pinned apps")).toBeNull();
  });

  test("a secret key shows Set and never its value", async () => {
    mockApi(DEFS, { "search.brave_api_key": "BSA-secret-value" });
    const { findByText, container } = renderWithQueryClient(<SettingsRenderer {...props} expandAdvanced />);
    await findByText("Brave key");
    expect(container.innerHTML).not.toContain("BSA-secret-value");
  });
});

describe("SettingsRenderer - advanced fold", () => {
  const advanced: Def[] = [
    { key: "a.one", selector: "boolean", label: "Basic one", lives_in: "person.chat" },
    { key: "a.two", selector: "boolean", label: "Adv two", level: "advanced", lives_in: "person.chat" },
    { key: "a.three", selector: "boolean", label: "Adv three", level: "advanced", lives_in: "person.chat" },
    { key: "a.four", selector: "boolean", label: "Adv four", level: "advanced", lives_in: "person.chat" },
  ];
  beforeEach(() => mockApi(advanced));

  test("three advanced keys fold behind a Show 3 advanced settings row that opens them", async () => {
    const { findByRole, queryByText, getByText } = renderWithQueryClient(<SettingsRenderer {...props} />);
    const trigger = await findByRole("button", { name: /Show 3 advanced settings/ });
    expect(queryByText("Adv two")).toBeNull();
    fireEvent.click(trigger);
    await waitFor(() => expect(getByText("Adv two")).toBeTruthy());
    expect(getByText("Adv four")).toBeTruthy();
  });

  test("a focusKey inside the fold opens it and focuses that row", async () => {
    Element.prototype.scrollIntoView = function () {};
    const view = renderWithQueryClient(<SettingsRenderer {...props} focusKey="a.three" />);
    await view.findByText("Adv three");
    await waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toBe("Adv three"));
  });

  test("expandAdvanced shows them with no fold", async () => {
    const { findByText, queryByRole } = renderWithQueryClient(<SettingsRenderer {...props} expandAdvanced />);
    await findByText("Adv two");
    expect(queryByRole("button", { name: /advanced settings/ })).toBeNull();
  });

  test("a search match inside the fold surfaces directly", async () => {
    const { findByText, queryByText, queryByRole } = renderWithQueryClient(<SettingsRenderer {...props} filter="adv three" />);
    await findByText("Adv three");
    expect(queryByText("Adv two")).toBeNull();
    expect(queryByRole("button", { name: /advanced settings/ })).toBeNull();
  });
});

describe("SettingsRenderer - filter and empty states", () => {
  beforeEach(() => mockApi(DEFS));

  test("filters by label and by help text, hiding groups with no match", async () => {
    const view = renderWithQueryClient(<SettingsRenderer {...props} filter="attach pictures" />);
    await view.findByText("Send photos in chat");
    expect(view.queryByText("Show pictures in answers")).toBeNull();
    expect(view.queryByText("Safe search level")).toBeNull();
  });

  test("no match says so", async () => {
    const view = renderWithQueryClient(<SettingsRenderer {...props} filter="zzz" />);
    expect(await view.findByText("No settings match that search.")).toBeTruthy();
  });

  test("a scope with no eligible key says there is nothing yet", async () => {
    const view = renderWithQueryClient(<SettingsRenderer {...props} honouredBy="bot" />);
    expect(await view.findByText("No settings yet.")).toBeTruthy();
  });
});

describe("SettingsRenderer - embedding options", () => {
  beforeEach(() => mockApi(DEFS));

  test("only draws the named group", async () => {
    const view = renderWithQueryClient(<SettingsRenderer {...props} only={["person.search"]} />);
    await view.findByText("Safe search level");
    expect(view.queryByText("Send photos in chat")).toBeNull();
  });

  test("includeKeys keeps only those keys, includeKeysByGroup wins for its group", async () => {
    const view = renderWithQueryClient(
      <SettingsRenderer {...props} includeKeys={["chat.photo_uploads"]} includeKeysByGroup={{ "person.search": ["search.safe_search"] }} />,
    );
    await view.findByText("Send photos in chat");
    expect(view.queryByText("Show pictures in answers")).toBeNull();
    expect(view.getByText("Safe search level")).toBeTruthy();
  });

  test("titleOverrides rename a heading", async () => {
    const view = renderWithQueryClient(<SettingsRenderer {...props} titleOverrides={{ "person.chat": "Photos and pictures" }} />);
    expect((await view.findByRole("heading", { name: "Photos and pictures" })).tagName).toBe("H3");
  });

  test("plainRows draws rows with no heading and no card", async () => {
    const view = renderWithQueryClient(<SettingsRenderer {...props} plainRows only={["person.chat"]} />);
    await view.findByText("Send photos in chat");
    expect(view.container.querySelector("h3")).toBeNull();
    expect(view.container.querySelector("[data-variant=card]")).toBeNull();
  });

  test("mergeGroups folds every shown group into the first one's card", async () => {
    const view = renderWithQueryClient(<SettingsRenderer {...props} mergeGroups />);
    await view.findByText("Safe search level");
    expect(view.container.querySelectorAll("section")).toHaveLength(1);
    expect(view.container.querySelectorAll("[data-variant=card]")).toHaveLength(1);
    expect(view.getByText("Send photos in chat")).toBeTruthy();
  });

  test("focusKey scrolls to the row and focuses its control once loaded", async () => {
    const scrolled: string[] = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push((this as HTMLElement).dataset.settingKey ?? "");
    };
    const view = renderWithQueryClient(<SettingsRenderer {...props} focusKey="reference.images" />);
    await view.findByText("Show pictures in answers");
    await waitFor(() => expect(document.activeElement?.getAttribute("role")).toBe("switch"));
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Show pictures in answers");
    expect(scrolled).toEqual(["reference.images"]);
  });
});

describe("SettingsRenderer - writes", () => {
  test("toggling a switch PUTs the key and value to the scope and shows the new state", async () => {
    mockApi(DEFS);
    const view = renderWithQueryClient(<SettingsRenderer {...props} />);
    const toggle = await view.findByRole("switch", { name: "Send photos in chat" });
    await act(async () => {
      fireEvent.click(toggle);
    });
    const put = calls.find((c) => c.method === "PUT")!;
    expect(JSON.parse(put.body!)).toEqual({ scope: "person:p1", key: "chat.photo_uploads", value: true });
    await waitFor(() => expect(view.getByRole("switch", { name: "Send photos in chat" }).getAttribute("aria-checked")).toBe("true"));
    expect((await view.findByRole("status")).textContent).toBe("Saved.");
  });

  test("a rejected write shows the server's sentence in an alert above the cards", async () => {
    mockApi(DEFS, {}, 422);
    const view = renderWithQueryClient(<SettingsRenderer {...props} />);
    await act(async () => {
      fireEvent.click(await view.findByRole("switch", { name: "Send photos in chat" }));
    });
    expect((await view.findByRole("alert")).textContent).toContain("That value is not allowed.");
  });

  test("beforeChange can refuse a write: nothing is sent", async () => {
    mockApi(DEFS);
    const beforeChange = mock(async () => "Not allowed right now." as const);
    const view = renderWithQueryClient(<SettingsRenderer {...props} beforeChange={beforeChange} />);
    await act(async () => {
      fireEvent.click(await view.findByRole("switch", { name: "Send photos in chat" }));
    });
    expect(beforeChange).toHaveBeenCalledWith("chat.photo_uploads", true);
    expect(calls.some((c) => c.method === "PUT")).toBe(false);
    expect((await view.findByRole("status")).textContent).toBe("Not allowed right now.");
  });
});

describe("SettingsRenderer - option matrix card", () => {
  const MATRIX = {
    rows: "search/blocklists",
    columns: [
      { label: "Kids", key: "search.blocklists.child", band: "child" as const },
      { label: "Teens", key: "search.blocklists.teen", band: "teen" as const },
      { label: "Adults", key: "search.blocklists.adult", band: "adult" as const },
    ],
    locked_note: "Adult sites are always blocked for Kids and Teens.",
    save_error: "That change was not saved. Check your connection, then tick the box again.",
  };
  const mdefs: Def[] = [
    ...MATRIX.columns.map((c) => ({ key: c.key, selector: "select", label: `Blocked lists, ${c.label}`, lives_in: "household.blocked_sites", scope: "household", default: [], range: { multiple: true, options: ["blp-gambling"] } })),
    { key: "search.hosts.deny", selector: "text", label: "Always block these sites", lives_in: "household.blocked_sites", scope: "household" },
  ];
  const mprops = { scope: "household" as const, scopeValue: "household", honouredBy: "home", only: ["household.blocked_sites"], matrix: MATRIX };

  test("draws one checkbox per kind of site and audience; the column keys are not drawn as rows", async () => {
    mockApi(mdefs, { "search.blocklists.child": ["blp-gambling"] });
    const { findByLabelText, queryByText, findByText } = renderWithQueryClient(<SettingsRenderer {...mprops} />);
    const kids = (await findByLabelText("Gambling sites for Kids")) as HTMLElement;
    expect(kids.getAttribute("aria-checked")).toBe("true");
    expect(((await findByLabelText("Gambling sites for Teens")) as HTMLElement).getAttribute("aria-checked")).toBe("false");
    expect(queryByText("Blocked lists, Kids")).toBeNull();
    await findByText("Always block these sites");
  });

  test("a locked cell is checked and disabled, with the plain reason shown", async () => {
    mockApi(mdefs);
    const { findByLabelText, findByText } = renderWithQueryClient(<SettingsRenderer {...mprops} />);
    const locked = (await findByLabelText("Adult sites for Kids")) as HTMLElement;
    expect(locked.getAttribute("aria-checked")).toBe("true");
    expect(locked.hasAttribute("disabled") || locked.getAttribute("aria-disabled") === "true" || locked.hasAttribute("data-disabled")).toBe(true);
    expect(((await findByLabelText("Adult sites for Adults")) as HTMLElement).getAttribute("aria-checked")).toBe("false");
    await findByText(MATRIX.locked_note);
  });

  test("ticking a box writes the whole list to that audience's key", async () => {
    mockApi(mdefs, { "search.blocklists.teen": ["blp-gambling"] });
    const { findByLabelText } = renderWithQueryClient(<SettingsRenderer {...mprops} />);
    fireEvent.click(await findByLabelText("Gambling sites for Kids"));
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    const put = calls.find((c) => c.method === "PUT")!;
    expect(JSON.parse(put.body!)).toEqual({ scope: "household", key: "search.blocklists.child", value: ["blp-gambling"] });
  });

  test("a failed tick shows the card's own what-to-do message when the server gave none", async () => {
    mockApi(mdefs);
    const real = globalThis.fetch;
    globalThis.fetch = (async (path: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") throw new TypeError("network down");
      return real(path, init);
    }) as unknown as typeof fetch;
    const { findByLabelText, findByText } = renderWithQueryClient(<SettingsRenderer {...mprops} />);
    fireEvent.click(await findByLabelText("Gambling sites for Kids"));
    await findByText(MATRIX.save_error);
  });
});

describe("SettingsRenderer - news feed list matrix (KS-05)", () => {
  const NEWS = {
    rows: "news/feed-lists",
    rows_label: "News list",
    columns: [
      { label: "Kids", key: "news.lists.child", band: "child" as const },
      { label: "Teens", key: "news.lists.teen", band: "teen" as const },
      { label: "Adults", key: "news.lists.adult", band: "adult" as const },
    ],
    unavailable_note: "A dash means the list is not offered to that user type.",
    save_error: "That change was not saved. Check your connection, then tick the box again.",
  };
  const ndefs: Def[] = NEWS.columns.map((c) => ({ key: c.key, selector: "select", label: `News lists, ${c.label}`, lives_in: "household.news", scope: "household", default: [], range: { multiple: true, options: ["feeds-household", "feeds-children"] } }));
  const nprops = { scope: "household" as const, scopeValue: "household", honouredBy: "home", only: ["household.news"], matrix: NEWS };

  test("a list not offered to a user type is unchecked and disabled, with the plain reason shown", async () => {
    mockApi(ndefs, { "news.lists.child": ["feeds-household", "feeds-children"] });
    const { findByLabelText, findByText } = renderWithQueryClient(<SettingsRenderer {...nprops} />);
    const notOffered = (await findByLabelText("Household news for Kids")) as HTMLElement;
    expect(notOffered.getAttribute("aria-checked")).toBe("false");
    expect(notOffered.hasAttribute("disabled") || notOffered.getAttribute("aria-disabled") === "true" || notOffered.hasAttribute("data-disabled")).toBe(true);
    expect(((await findByLabelText("Kids' news for Adults")) as HTMLElement).getAttribute("aria-checked")).toBe("false");
    expect(((await findByLabelText("Kids' news for Kids")) as HTMLElement).getAttribute("aria-checked")).toBe("true");
    await findByText("News list");
    await findByText(NEWS.unavailable_note);
  });

  test("ticking an offered box writes the whole list to that user type's key", async () => {
    mockApi(ndefs, {});
    const { findByLabelText } = renderWithQueryClient(<SettingsRenderer {...nprops} />);
    fireEvent.click(await findByLabelText("Household news for Teens"));
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    expect(JSON.parse(calls.find((c) => c.method === "PUT")!.body!)).toEqual({ scope: "household", key: "news.lists.teen", value: ["feeds-household"] });
  });
});
