// A package page that navigates to another item of itself (Now playing's Next) must settle on the new item,
// not replace the address back and forth with the old one (the audio Next loop).
import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/kit/queryClient";
import { SchemaPage } from "@/kit/schema/SchemaPage";

afterEach(cleanup);

describe("SchemaPage arrival", () => {
  test("navigating to another item settles on it and does not rewrite the address", async () => {
    const seen: string[] = [];
    let go: (id: string) => void = () => {};
    function Probe() {
      const location = useLocation();
      const navigate = useNavigate();
      seen.push(location.search);
      go = (id) => navigate(`/apps/demo/play?id=${id}`, { state: { pageState: { id } } });
      return null;
    }
    const page = { type: "page", id: "play", title: "Now playing", body: [{ type: "empty_state", icon: "music", text: "Nothing here" }] };
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={[{ pathname: "/apps/demo/play", search: "?id=a", state: { pageState: { id: "a" } } }]}>
          <Probe />
          <SchemaPage page={page as never} packageId="demo" />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await act(async () => { go("b"); });
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
    expect(seen.at(-1)).toBe("?id=b");
    const after = seen.slice(seen.indexOf("?id=b"));
    expect(after.every((s) => s === "?id=b")).toBe(true);
  });
});
