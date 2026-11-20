import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { withLoadedImagesAsync } from "../../tests/withLoadedImages";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { CreationHeaderNodeSchema, PageNodeSchema, ShareChangeSchema } from "@/kit/schema/types";

afterEach(cleanup);

const row = {
  id: "item-1", title: "{title}", creator: { name: null, avatar_url: null, label: "Made at home", href: null }, made_at: null, description: "{description}",
  visibility: { mode: "shared", people: [{ id: "person-1", name: "Aster" }], can_manage: true },
  candidates: [{ id: "person-1", name: "Aster" }, { id: "person-2", name: "Basil" }, { id: "person-3", name: "{candidate}" }],
};

const node = CreationHeaderNodeSchema.parse({
  type: "creation_header", bind: { source: "route", path: "/api/created/1" },
  share_change: {
    add: { call: { target: "/api/created/1/share", args: { person_id: "{person_id}" } } },
    remove: { call: { target: "/api/created/1/share", method: "DELETE", args: { person_id: "{person_id}" } } },
    make_private: { call: { target: "/api/created/1/private", method: "POST" } },
  },
});

describe("creation_header schema node", () => {
  test("parses collection fields, actions, and footer part", () => {
    const collection = CreationHeaderNodeSchema.parse({ ...node, variant: "collection", fields: { art: "cover", meta: "album", footer_lines: "credits" }, primary: { label: "Play", icon: "play", action: { play: { media_id: "{id}" } } }, shuffle: { label: "Shuffle", action: { play: { media_id: "{id}", shuffle: true } } }, more: [{ label: "Edit", action: { navigate: { to: "/edit" } } }], part: "footer" });
    expect(collection.variant).toBe("collection");
    expect(collection.part).toBe("footer");
  });
  test("share_change accepts host call actions only", () => {
    expect(() => ShareChangeSchema.parse(node.share_change)).not.toThrow();
    expect(() => ShareChangeSchema.parse({ ...node.share_change, add: { navigate: { to: "/people" } } })).toThrow();
  });

  test("parses through the page schema and renders the safe fallback labels", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify(row), { status: 200 }))) as unknown as typeof fetch;
    try {
      expect(PageNodeSchema.parse({ type: "page", id: "detail", title: "Detail", body: [node] }).body).toHaveLength(1);
      const view = renderWithQueryClient(<MemoryRouter><NodeRenderer node={node} /></MemoryRouter>);
      await view.findByRole("heading", { name: "Untitled" });
      expect(view.getByText("Made at home")).toBeTruthy();
      expect(within(document.body).queryByText(/\{[^{}]+\}/)).toBeNull();
      fireEvent.click(view.getByRole("button", { name: "Shared, manage sharing" }));
      await waitFor(() => expect(within(document.body).getByRole("dialog")).toBeTruthy());
      expect(within(document.body).getByRole("switch", { name: "Basil" })).toBeTruthy();
      expect(within(document.body).getByRole("switch", { name: "Someone" })).toBeTruthy();
      expect(view.queryByText(/\{[^{}]+\}/)).toBeNull();
    } finally {
      globalThis.fetch = original;
    }
  });

  test("passes avatar_seed from the creator and visibility people to the kit faces", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify({
      ...row,
      creator: { name: "Basil", avatar_url: null, avatar_seed: "creator-seed", href: "/people/basil" },
      visibility: { mode: "shared", people: [{ id: "person-1", name: "Aster", avatar_seed: "aster-seed" }], can_manage: true },
    }), { status: 200 }))) as unknown as typeof fetch;
    try {
      await withLoadedImagesAsync(async () => {
        const view = renderWithQueryClient(<MemoryRouter><NodeRenderer node={node} /></MemoryRouter>);
        const link = await view.findByRole("link", { name: "Basil, open profile" });
        expect(link.querySelector("img")?.getAttribute("src")?.startsWith("data:image/svg+xml")).toBe(true);
        const chip = view.getByRole("button", { name: "Shared, manage sharing" });
        expect(chip.querySelector("img")?.getAttribute("src")?.startsWith("data:image/svg+xml")).toBe(true);
      });
    } finally {
      globalThis.fetch = original;
    }
  });

  test("passes a creator href from the bound row to the kit router link", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify({
      ...row, creator: { name: "Aster", avatar_url: null, href: "/people/aster" },
    }), { status: 200 }))) as unknown as typeof fetch;
    try {
      const view = renderWithQueryClient(<MemoryRouter><NodeRenderer node={node} /></MemoryRouter>);
      const link = await view.findByRole("link", { name: "Aster, open profile" });
      expect(link.getAttribute("href")).toBe("/people/aster");
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("creation_header studio variant (VIDEO-STUDIO-03)", () => {
  const studio = (extra: Record<string, unknown> = {}) => CreationHeaderNodeSchema.parse({ ...node, variant: "studio", eyebrow: "Studio", primary: { label: "Export as a new clip", action: { navigate: { to: "/export" } } }, secondary: { label: "Back to the clip", action: { navigate: { to: "/back" } } }, ...extra });
  const serve = (data: unknown) => { globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify(data), { status: 200 }))) as unknown as typeof fetch; };
  test("draws the eyebrow, a sentence-case title, the art and the end side actions, and none of the creator line or share chip", async () => {
    const original = globalThis.fetch;
    serve({ ...row, title: "Paper boat in the rain", art: "/poster.jpg" });
    try {
      const view = renderWithQueryClient(<MemoryRouter><NodeRenderer node={studio()} /></MemoryRouter>);
      const h = await view.findByRole("heading", { name: "Paper boat in the rain" });
      expect(h.className).not.toContain("uppercase");
      expect(h.className).toContain("font-semibold");
      const header = view.container.querySelector("header[data-variant=studio]")!;
      expect(header.querySelector("[data-slot=creation-header-eyebrow]")!.textContent).toBe("Studio");
      expect(header.querySelector("[data-slot=creation-header-eyebrow]")!.className).not.toContain("uppercase");
      expect(header.querySelector("[data-slot=creation-header-art] img")!.getAttribute("src")).toBe("/poster.jpg");
      const actions = within(header.querySelector("[data-slot=creation-header-actions]") as HTMLElement).getAllByRole("button");
      expect(actions.map((b) => b.textContent)).toEqual(["Back to the clip", "Export as a new clip"]);
      expect(view.queryByText("Made at home")).toBeNull();
      expect(view.queryByRole("button", { name: /manage sharing|Shared|Private/ })).toBeNull();
    } finally { globalThis.fetch = original; }
  });
  test("no art, eyebrow or actions are drawn when they are absent", async () => {
    const original = globalThis.fetch;
    serve({ ...row, title: "Make any video" });
    try {
      const view = renderWithQueryClient(<MemoryRouter><NodeRenderer node={CreationHeaderNodeSchema.parse({ ...node, variant: "studio" })} /></MemoryRouter>);
      await view.findByRole("heading", { name: "Make any video" });
      expect(view.container.querySelector("[data-slot=creation-header-art]")).toBeNull();
      expect(view.container.querySelector("[data-slot=creation-header-eyebrow]")).toBeNull();
      expect(view.container.querySelector("[data-slot=creation-header-actions]")).toBeNull();
    } finally { globalThis.fetch = original; }
  });
  test("a locked row draws no art, eyebrow or title, and keeps the actions", async () => {
    const original = globalThis.fetch;
    serve({ ...row, title: "Secret clip", art: "/poster.jpg", locked: true });
    try {
      const view = renderWithQueryClient(<MemoryRouter><NodeRenderer node={studio()} /></MemoryRouter>);
      await view.findByRole("button", { name: "Back to the clip" });
      const header = view.container.querySelector("header[data-variant=studio]")!;
      expect(header.getAttribute("data-locked")).toBe("true");
      expect(header.querySelector("img")).toBeNull();
      expect(header.querySelector("[data-slot=creation-header-art]")).toBeNull();
      expect(view.queryByText("Studio")).toBeNull();
      expect(view.queryByText("Secret clip")).toBeNull();
      expect(view.queryByRole("heading")).toBeNull();
    } finally { globalThis.fetch = original; }
  });
  test("the default variant is unchanged: full still draws the title, creator line and chip", () => {
    expect(CreationHeaderNodeSchema.parse(node).variant).toBe("full");
    expect(CreationHeaderNodeSchema.parse(node).secondary).toBeUndefined();
  });
});

describe("creation_header display variant and facts, VIDEO-KIT-01 (K2)", () => {
  const display = (change: Record<string, unknown> = {}) => CreationHeaderNodeSchema.parse({ ...node, variant: "display", eyebrow: "Studio", ...change });
  const draw = async (n: ReturnType<typeof display>, data: Record<string, unknown>) => {
    const original = globalThis.fetch;
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify({ ...row, ...data }), { status: 200 }))) as unknown as typeof fetch;
    try {
      const view = renderWithQueryClient(<MemoryRouter><NodeRenderer node={n} /></MemoryRouter>);
      await view.findByRole("heading");
      return view;
    } finally { globalThis.fetch = original; }
  };

  test("display parses, and fields.facts names the row path (default facts)", () => {
    expect(display().variant).toBe("display");
    expect(display().fields).toBeUndefined();
    expect(display({ fields: { facts: "line" } }).fields?.facts).toBe("line");
    expect(() => display({ fields: { facts: "" } })).toThrow();
    expect(() => CreationHeaderNodeSchema.parse({ ...node, variant: "huge" })).toThrow();
  });

  test("display draws the eyebrow, the display title and the facts line, and no creator line or chip", async () => {
    const view = await draw(display(), { title: "Juniper's gate", facts: "Full HD · 5 s · 1920×1088" });
    const header = view.container.querySelector("header[data-variant=display]")!;
    expect(header.querySelector("[data-slot=creation-header-eyebrow]")!.textContent).toBe("Studio");
    expect(view.getByRole("heading", { name: "Juniper's gate" })).toBeTruthy();
    expect(header.querySelector("[data-slot=facts-line]")!.textContent).toBe("Full HD · 5 s · 1920×1088");
    expect(view.queryByText("Made at home")).toBeNull();
    expect(view.queryByRole("button", { name: /sharing/ })).toBeNull();
  });

  test("a facts path reads another row field, and an empty or missing value draws nothing", async () => {
    const view = await draw(display({ fields: { facts: "summary" } }), { title: "Gate", facts: "ignored", summary: "5 s · wide" });
    expect(view.container.querySelector("[data-slot=facts-line]")!.textContent).toBe("5 s · wide");
    view.unmount();
    const none = await draw(display(), { title: "Gate", facts: "   " });
    expect(none.container.querySelector("[data-slot=facts-line]")).toBeNull();
  });

  test("the facts line reaches the full variant too", async () => {
    const view = await draw(CreationHeaderNodeSchema.parse(node) as ReturnType<typeof display>, { title: "Gate", facts: "5 s · wide" });
    expect(view.container.querySelector("[data-slot=facts-line]")!.textContent).toBe("5 s · wide");
  });
});
