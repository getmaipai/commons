import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { Timeline } from "./timeline";

const events = [{ id: "problem-1", when: "past" as const, time: "Oct 6", title: "Brain stopped", detail: "Ongoing since 10:35 PM" }];

describe("Timeline", () => {
  test("keeps its entrance animation by default", () => {
    const view = render(<Timeline events={events} visibleCount={1} />);
    expect(view.container.querySelector(".animate-in")).toBeInTheDocument();
  });

  test("can render content immediately without entrance animation", () => {
    const view = render(<Timeline events={events} visibleCount={1} animate={false} />);
    expect(view.container.querySelector(".animate-in")).toBeNull();
    expect(view.container.textContent).toContain("Oct 6");
    expect(view.container.textContent).toContain("Ongoing since 10:35 PM");
  });
});
