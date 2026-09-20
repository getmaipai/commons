import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "bun:test";
import { MemoryRouter } from "react-router-dom";
import { FooterBar } from "@/kit/blocks/dashboard/components/FooterBar";

afterEach(cleanup);

test("FooterBar shows the version, linked counts and the status label", () => {
  render(
    <MemoryRouter>
      <FooterBar
        version="MaiPai Home v0.1.0"
        counts={[{ label: "2 repairs open", href: "/settings" }, { label: "18 running", href: "/apps" }]}
        status="ok"
        statusLabel="All systems operational"
      />
    </MemoryRouter>,
  );
  expect(document.body.textContent).toContain("MaiPai Home v0.1.0");
  expect(document.querySelector('a[href="/settings"]')?.textContent).toBe("2 repairs open");
  expect(document.body.textContent).toContain("All systems operational");
});

test("FooterBar renders no counts at all without breaking", () => {
  render(<MemoryRouter><FooterBar version="MaiPai Home v0.1.0" counts={[]} status="warning" statusLabel="2 repairs open" /></MemoryRouter>);
  expect(document.body.textContent).toContain("2 repairs open");
});
