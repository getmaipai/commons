import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CreationHeader } from "./creation-header";
import { TierSegment } from "./tier-segment";
import { CompanionsShowcase } from "./CompanionsShowcase";

afterEach(cleanup);

const noop = () => {};
const visibility = { mode: "private" as const, people: [], canManage: false, onOpen: noop };
const FACTS = "Full HD · 5 s · 1920×1088 · about 8 min";

describe("CreationHeader display variant", () => {
  test("draws a serif display title, an eyebrow, a subtitle and a facts line", () => {
    const view = render(<MemoryRouter><CreationHeader variant="display" title="Paper boat" eyebrow="Video" subtitle="Made Friday" facts={FACTS} visibility={visibility} /></MemoryRouter>);
    const title = view.getByRole("heading", { level: 1, name: "Paper boat" });
    expect(title.className).toContain("font-[family-name:var(--font-display)]");
    expect(title.className).toContain("text-[28px]");
    expect(title.className).toContain("md:text-[44px]");
    expect(view.container.querySelector("[data-slot=creation-header-eyebrow]")!.textContent).toBe("Video");
    expect(view.container.querySelector("[data-slot=creation-header-subtitle]")!.textContent).toBe("Made Friday");
    expect(view.container.querySelector("[data-slot=facts-line]")!.textContent).toBe(FACTS);
  });
  test("eyebrow, subtitle and facts are optional", () => {
    const view = render(<MemoryRouter><CreationHeader variant="display" title="Paper boat" visibility={visibility} /></MemoryRouter>);
    expect(view.container.querySelector("[data-slot=creation-header-eyebrow]")).toBeNull();
    expect(view.container.querySelector("[data-slot=creation-header-subtitle]")).toBeNull();
    expect(view.container.querySelector("[data-slot=facts-line]")).toBeNull();
  });
});

describe("facts line", () => {
  test("is mono, muted and absent without facts, on the header and on TierSegment", () => {
    const header = render(<MemoryRouter><CreationHeader title="x" facts={FACTS} visibility={visibility} /></MemoryRouter>);
    const line = header.container.querySelector("[data-slot=facts-line]")!;
    expect(line.className).toContain("font-mono");
    expect(line.className).toContain("text-muted-foreground");
    header.unmount();
    const plain = render(<MemoryRouter><CreationHeader title="x" visibility={visibility} /></MemoryRouter>);
    expect(plain.container.querySelector("[data-slot=facts-line]")).toBeNull();
    plain.unmount();
    for (const presentation of ["segment", "cards", "dropdown"] as const) {
      const view = render(<TierSegment value="standard" onValueChange={noop} presentation={presentation} facts={FACTS} />);
      expect(view.container.querySelector("[data-slot=facts-line]")!.textContent).toBe(FACTS);
      view.unmount();
      const none = render(<TierSegment value="standard" onValueChange={noop} presentation={presentation} />);
      expect(none.container.querySelector("[data-slot=facts-line]")).toBeNull();
      none.unmount();
    }
  });
});

describe("CompanionsShowcase", () => {
  test("renders the three companions", () => {
    const view = render(<MemoryRouter><CompanionsShowcase /></MemoryRouter>);
    expect(view.container.querySelectorAll("[data-slot=video-player-overlay-pills]").length).toBeGreaterThan(0);
    expect(view.container.querySelector("[data-variant=display]")).not.toBeNull();
    expect(view.container.querySelectorAll("[data-slot=facts-line]").length).toBe(2);
  });
});
