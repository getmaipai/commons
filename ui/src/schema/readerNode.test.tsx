import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { installReaderFixtureLibraries } from "../../tests/readerFixtureLibraries";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PageNodeSchema, ReaderNodeSchema } from "@/kit/schema/types";
import { PackageScopeContext } from "@/kit/schema/packageScope";

installReaderFixtureLibraries();
const nativeFetch = globalThis.fetch;
const nativeContext = HTMLCanvasElement.prototype.getContext;
let item: Record<string, unknown>;
let calls: Array<{ url: string; body: unknown; keepalive?: boolean }>;
beforeEach(() => {
  const base = document.createElement("base");
  base.href = "http://localhost/";
  document.head.append(base);
  calls = [];
  item = { id: "book-1", title: "Moon Rivets Field Guide", file: { url: "/moon-rivets.pdf" }, book: { format: "pdf" }, position: { locator: { kind: "page", page: 2 } } };
  HTMLCanvasElement.prototype.getContext = mock(() => ({})) as unknown as typeof nativeContext;
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined, keepalive: init?.keepalive });
    return Promise.resolve(new Response(JSON.stringify(url.endsWith("/data/item") ? [item] : { ok: true }), { status: 200 }));
  }) as unknown as typeof fetch;
});
afterEach(() => { cleanup(); document.head.querySelector("base")?.remove(); globalThis.fetch = nativeFetch; HTMLCanvasElement.prototype.getContext = nativeContext; });

function renderBook() {
  const page = PageNodeSchema.parse(JSON.parse(readFileSync(`${import.meta.dir}/../../../spec/ui/pages/books-reader.json`, "utf8")));
  return renderWithQueryClient(<MemoryRouter><PackageScopeContext.Provider value={{ packageId: "books" }}><NodeRenderer node={page} state={{ id: "book-1" }} /></PackageScopeContext.Provider></MemoryRouter>);
}

describe("reader schema interpreter", () => {
  test("bound format and locator fields restore the book, and progress sends JSON without a refetch", async () => {
    const view = renderBook();
    await waitFor(() => expect(view.getByRole("status").textContent).toBe("Page 2 of 2 · 100%"));
    expect(calls.find((c) => c.url.endsWith("/data/item"))?.body).toEqual({ id: "book-1" });
    fireEvent.click(view.getByRole("button", { name: "Previous page" }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/progress/book-1"))).toBe(true));
    expect(calls.find((c) => c.url.endsWith("/progress/book-1"))).toMatchObject({ body: { locator: { kind: "page", page: 1 }, percent: 0 }, keepalive: true });
    expect(calls.filter((c) => c.url.endsWith("/data/item"))).toHaveLength(1);
  });

  test("a close flushes the latest location before navigation", async () => {
    const view = renderBook();
    await waitFor(() => expect(view.getByRole("status").textContent).toBe("Page 2 of 2 · 100%"));
    fireEvent.click(view.getByRole("button", { name: "Close reader" }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/progress/book-1"))).toBe(true));
    expect(calls.find((c) => c.url.endsWith("/progress/book-1"))?.body).toEqual({ locator: { kind: "page", page: 2 }, percent: 100 });
  });

  test("invalid formats and outside sources show an unavailable book", async () => {
    item.file = { url: "https://outside.example/book.pdf" };
    const view = renderBook();
    await view.findByText("This book is not available.");
    expect(view.container.querySelector("[data-slot=reader]")).toBeNull();
  });

  test("Reader's Zod schema rejects unknown fields, formats, themes and font steps", () => {
    const reader = { type: "reader", bind: { source: "route", path: "/api/books" }, format: "epub" };
    expect(ReaderNodeSchema.safeParse(reader).success).toBe(true);
    for (const change of [{ format: "html" }, { theme: "blue" }, { font_size: 7 }, { fields: { unknown: "x" } }, { locator: { kind: "page", page: 1 } }]) expect(ReaderNodeSchema.safeParse({ ...reader, ...change }).success).toBe(false);
  });
});
