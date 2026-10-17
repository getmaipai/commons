import { describe, expect, test, mock, afterEach } from "bun:test";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { LocationField, type PlaceAdapter } from "@/kit/settings/LocationField";

afterEach(cleanup);

const names: Record<string, string> = { "ent-a": "Lucia's cabin", "ent-b": "Grandma", "ent-c": "Lake" };
function adapter(over: Partial<PlaceAdapter> = {}): PlaceAdapter {
  return {
    labelFor: (id) => names[id] ?? id,
    search: mock(async () => [{ name: "Portland", area: "Oregon", lat: 45.52, lon: -122.68 }]),
    add: mock(async () => "ent-new"),
    rename: mock(async () => true),
    ...over,
  };
}

function multi(value: string[], a: PlaceAdapter) {
  const onValueChange = mock((_v: unknown) => {});
  const r = render(<LocationField value={value} multiple allowCurrent adapter={a} onValueChange={onValueChange} ariaLabel="Places" />);
  return { ...r, onValueChange };
}

async function openMenu(r: ReturnType<typeof render>, name: string) {
  const btn = r.getByLabelText(`Actions for ${name}`);
  fireEvent.pointerDown(btn, { button: 0, ctrlKey: false });
  fireEvent.click(btn);
  await waitFor(() => expect(r.baseElement.querySelector('[role="menu"]')).not.toBeNull());
}

describe("LocationField", () => {
  test("lists saved places in order", () => {
    const r = multi(["ent-a", "ent-b"], adapter());
    const items = r.getAllByRole("listitem").map((li) => li.textContent);
    expect(items[0]).toContain("Lucia's cabin");
    expect(items[1]).toContain("Grandma");
  });

  test("move down writes the reordered array", async () => {
    const r = multi(["ent-a", "ent-b"], adapter());
    await openMenu(r, "Lucia's cabin");
    fireEvent.click(r.getByText("Move down"));
    expect(r.onValueChange).toHaveBeenCalledWith(["ent-b", "ent-a"]);
  });

  test("move up is disabled on the first entry", async () => {
    const r = multi(["ent-a", "ent-b"], adapter());
    await openMenu(r, "Lucia's cabin");
    const item = r.getByText("Move up").closest("[role=menuitem]");
    expect(item?.hasAttribute("data-disabled") || item?.getAttribute("aria-disabled") === "true").toBe(true);
  });

  test("remove asks first, then drops only that id", async () => {
    const r = multi(["ent-a", "ent-b"], adapter());
    await openMenu(r, "Grandma");
    fireEvent.click(r.getByText("Remove"));
    expect(r.onValueChange).not.toHaveBeenCalled();
    fireEvent.click(await waitFor(() => r.getByRole("button", { name: "Remove" })));
    expect(r.onValueChange).toHaveBeenCalledWith(["ent-a"]);
  });

  test("confirmed remove also deletes the place record through the adapter", async () => {
    const remove = mock(async (_id: string) => true);
    const r = multi(["ent-a", "ent-b"], adapter({ remove }));
    await openMenu(r, "Grandma");
    fireEvent.click(r.getByText("Remove"));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(await waitFor(() => r.getByRole("button", { name: "Remove" })));
    expect(remove).toHaveBeenCalledWith("ent-b");
  });

  test("rename saves through the adapter", async () => {
    const a = adapter();
    const r = multi(["ent-a"], a);
    await openMenu(r, "Lucia's cabin");
    fireEvent.click(r.getByText("Rename"));
    const doc = r.baseElement.ownerDocument;
    const input = await waitFor(() => {
      const el = doc.querySelector('input[aria-label="Place name"]') as HTMLInputElement | null;
      if (!el) throw new Error("no dialog");
      return el;
    });
    fireEvent.change(input, { target: { value: "Cabin" } });
    const save = [...doc.querySelectorAll("button")].find((b) => b.textContent === "Save")!;
    fireEvent.click(save);
    await waitFor(() => expect(a.rename).toHaveBeenCalledWith("ent-a", "Cabin"));
  });

  test("add searches, saves the hit and appends its id", async () => {
    const a = adapter();
    const r = multi(["ent-a"], a);
    fireEvent.click(r.getByText("Add a place"));
    const doc = r.baseElement.ownerDocument;
    const input = await waitFor(() => {
      const el = doc.querySelector('input[aria-label="Search for a place"]') as HTMLInputElement | null;
      if (!el) throw new Error("no popover");
      return el;
    });
    fireEvent.change(input, { target: { value: "Port" } });
    fireEvent.click(await waitFor(() => r.getByText("Portland"), { timeout: 2000 }));
    await waitFor(() => expect(r.onValueChange).toHaveBeenCalledWith(["ent-a", "ent-new"]));
    expect(a.add).toHaveBeenCalledTimes(1);
  });

  test("the browser prompt opens only from the button", () => {
    const useCurrent = mock(async () => true);
    const r = multi(["ent-a"], adapter({ useCurrent }));
    expect(useCurrent).not.toHaveBeenCalled();
    fireEvent.click(r.getByText("Use current location"));
    expect(useCurrent).toHaveBeenCalledTimes(1);
  });

  test("a refused prompt says what to do", async () => {
    const r = multi([], adapter({ useCurrent: async () => false }));
    fireEvent.click(r.getByText("Use current location"));
    await waitFor(() => r.getByText(/Location is blocked/));
  });

  test("a search row is one line: the name, then the region muted on the same row, both truncating", async () => {
    const a = adapter({ search: mock(async () => [{ name: "Milford", area: "Connecticut, United States", lat: 41.2, lon: -73.06 }]) });
    const r = multi([], a);
    fireEvent.click(r.getByText("Add a place"));
    const doc = r.baseElement.ownerDocument;
    const input = await waitFor(() => (doc.querySelector('input[aria-label="Search for a place"]') as HTMLInputElement | null) ?? (() => { throw new Error("no popover"); })());
    fireEvent.change(input, { target: { value: "milford, ct" } });
    const row = (await waitFor(() => doc.querySelector('[data-slot="command-item"]') ?? (() => { throw new Error("no row"); })(), { timeout: 2000 })) as HTMLElement;
    expect(row.getAttribute("data-density")).toBe("roomy");
    const spans = [...row.querySelectorAll("span")];
    const name = spans.find((el) => el.textContent === "Milford")!;
    const area = spans.find((el) => el.textContent === "Connecticut, United States")!;
    expect(name.className).toContain("truncate");
    expect(area.className).toContain("truncate");
    expect(area.className).toContain("text-muted-foreground");
    expect(row.className).toContain("min-h-11");
    expect(doc.querySelector('[data-slot="popover-content"]')?.className).toContain("w-[26rem]");
  });

  test("the search list says Searching while it waits and No places match when nothing comes back", async () => {
    let finish: (v: never[]) => void = () => {};
    const a = adapter({ search: mock(() => new Promise<never[]>((resolve) => { finish = resolve; })) });
    const r = multi([], a);
    fireEvent.click(r.getByText("Add a place"));
    const doc = r.baseElement.ownerDocument;
    const input = await waitFor(() => (doc.querySelector('input[aria-label="Search for a place"]') as HTMLInputElement | null) ?? (() => { throw new Error("no popover"); })());
    expect(r.getByText("Type at least two letters.")).toBeTruthy();
    fireEvent.change(input, { target: { value: "zzzz" } });
    await waitFor(() => r.getByText("Searching"));
    await waitFor(() => expect(a.search).toHaveBeenCalled(), { timeout: 2000 });
    finish([]);
    await waitFor(() => r.getByText(/No places match/));
  });

  test("keyboard: arrows move the highlight and Enter picks the highlighted place", async () => {
    const hits = [
      { name: "Milford", area: "Connecticut, United States", lat: 41.2, lon: -73.06 },
      { name: "Milford Lawns", area: "Connecticut, United States", lat: 41.3, lon: -73.1 },
    ];
    const a = adapter({ search: mock(async () => hits), add: mock(async () => "ent-picked") });
    const r = multi([], a);
    fireEvent.click(r.getByText("Add a place"));
    const doc = r.baseElement.ownerDocument;
    const input = await waitFor(() => (doc.querySelector('input[aria-label="Search for a place"]') as HTMLInputElement | null) ?? (() => { throw new Error("no popover"); })());
    fireEvent.change(input, { target: { value: "milford" } });
    await waitFor(() => expect(doc.querySelectorAll('[data-slot="command-item"]').length).toBe(2), { timeout: 2000 });
    expect(doc.querySelector('[data-slot="command-item"][data-selected="true"]')?.textContent).toContain("Milford");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    await waitFor(() => expect(doc.querySelector('[data-slot="command-item"][data-selected="true"]')?.textContent).toContain("Milford Lawns"));
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(r.onValueChange).toHaveBeenCalledWith(["ent-picked"]));
    expect(a.add).toHaveBeenCalledWith(hits[1]);
  });

  test("a blocked location names the browser's steps", async () => {
    const r = multi([], adapter({ useCurrent: async () => false }));
    fireEvent.click(r.getByText("Use current location"));
    const note = await waitFor(() => r.getByText(/Location is blocked\./));
    expect(note.textContent).toMatch(/site settings|Safari > Settings > Websites > Location/);
    expect(note.textContent).toContain("pick a saved place");
  });

  test("empty list shows the empty state", () => {
    const r = multi([], adapter());
    expect(r.getByText("No saved places yet.")).toBeTruthy();
  });

  test("single value with allow_current shows Current location by default", () => {
    const r = render(<LocationField value={null} multiple={false} allowCurrent adapter={adapter({ choices: ["ent-a"] })} onValueChange={() => {}} ariaLabel="Default" />);
    expect(r.getByLabelText("Default").textContent).toContain("Current location");
  });

  test("household home (single, no current) shows the label and no current button", () => {
    const r = render(<LocationField value="ent-b" multiple={false} allowCurrent={false} adapter={adapter({ useCurrent: async () => true })} onValueChange={() => {}} ariaLabel="Home" />);
    expect(r.getByText("Grandma")).toBeTruthy();
    expect(r.queryByText("Use current location")).toBeNull();
  });
});

describe("SettingRow with a location selector", () => {
  test("renders the field and writes the picked order through onChange", async () => {
    const { SettingRow } = await import("@/kit/settings/SettingRow");
    const onChange = mock(async (_v: unknown) => true);
    const setting = {
      def: { key: "weather.places", scope: "person", selector: "location", range: { multiple: true, allow_current: true }, default: [], label: "Places", level: "basic", secret: false, lives_in: "x", honoured_by: ["home"] },
      resolved: { key: "weather.places", value: ["ent-a", "ent-b"], source: "user", label: "Places", level: "basic", secret: false },
    } as never;
    const r = render(<SettingRow setting={setting} onChange={onChange} onReset={() => {}} places={adapter()} />);
    await openMenu(r, "Lucia's cabin");
    fireEvent.click(r.getByText("Move down"));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(["ent-b", "ent-a"]));
  });

  test("without an adapter the row says it is not supported", async () => {
    const { SettingRow } = await import("@/kit/settings/SettingRow");
    const setting = {
      def: { key: "household.home", scope: "household", selector: "location", range: {}, default: null, label: "Home", level: "basic", secret: false, lives_in: "x", honoured_by: ["home"] },
      resolved: { key: "household.home", value: null, source: "default", label: "Home", level: "basic", secret: false },
    } as never;
    const r = render(<SettingRow setting={setting} onChange={async () => true} onReset={() => {}} />);
    expect(r.getByText(/Not supported/)).toBeTruthy();
  });
});

describe("LocationField failure paths", () => {
  test("add that rejects says so and writes nothing", async () => {
    const a = adapter({ add: mock(async () => { throw new Error("down"); }) });
    const r = multi(["ent-a"], a);
    fireEvent.click(r.getByText("Add a place"));
    const doc = r.baseElement.ownerDocument;
    const input = await waitFor(() => {
      const el = doc.querySelector('input[aria-label="Search for a place"]') as HTMLInputElement | null;
      if (!el) throw new Error("no popover");
      return el;
    });
    fireEvent.change(input, { target: { value: "Port" } });
    fireEvent.click(await waitFor(() => r.getByText("Portland"), { timeout: 2000 }));
    await waitFor(() => r.getByText(/was not saved/));
    expect(r.onValueChange).not.toHaveBeenCalled();
  });

  test("a rejected prompt shows the blocked note instead of an unhandled error", async () => {
    const r = multi([], adapter({ useCurrent: async () => { throw new Error("timeout"); } }));
    fireEvent.click(r.getByText("Use current location"));
    await waitFor(() => r.getByText(/Location is blocked/));
  });

  test("a saved place missing from choices still shows in the single select", () => {
    const r = render(<LocationField value="ent-b" multiple={false} allowCurrent adapter={adapter({ choices: ["ent-a"] })} onValueChange={() => {}} ariaLabel="Default" />);
    expect(r.getByLabelText("Default").textContent).toContain("Grandma");
  });

  test("a single place can be cleared", () => {
    const onValueChange = mock((_v: unknown) => {});
    const r = render(<LocationField value="ent-b" multiple={false} allowCurrent={false} adapter={adapter()} onValueChange={onValueChange} ariaLabel="Home" />);
    fireEvent.click(r.getByText("Clear"));
    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  test("duplicate stored ids render once", () => {
    const r = multi(["ent-a", "ent-a", "ent-b"], adapter());
    expect(r.getAllByRole("listitem").length).toBe(2);
  });
});
