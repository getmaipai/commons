// The last item of a long package page must scroll clear of the phone's bottom bar (PHONE-07). The page body keeps its bottom
// padding equal to the bar's inset (the one value PhoneNav publishes, 0 from 640 px up) plus a gap, so a page with no bar is unchanged.
import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/kit/queryClient";
import { SchemaPage } from "@/kit/schema/SchemaPage";

afterEach(cleanup);

const page = { type: "page", id: "home", title: "Home", body: [{ type: "empty_state", icon: "music", text: "Nothing here" }] };
function body(props: { floatingBar?: boolean } = {}) {
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter><SchemaPage page={page as never} packageId="demo" {...props} /></MemoryRouter>
    </QueryClientProvider>,
  );
  return view.container.querySelector("[data-slot=schema-page-body]") as HTMLElement;
}

test("the page body's bottom padding follows the phone bar's inset", () => {
  expect(body().className).toContain("pb-[calc(1rem+var(--phone-nav-offset,0px))]");
});

test("an explicit floatingBar page keeps its larger fixed padding", () => {
  const el = body({ floatingBar: true });
  expect(el.className).toContain("pb-24");
  expect(el.className).not.toContain("--phone-nav-offset");
});
