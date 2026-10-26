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
