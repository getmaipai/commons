import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { StudioLayout } from "@/kit/elements/studio-layout";

afterEach(cleanup);

describe("StudioLayout", () => {
  test("renders the title as the page heading, with optional subtitle and actions", () => {
    const { getByRole, getByText, rerender, queryByText } = render(<StudioLayout title="Appearance studio" navLabel="Studio sections" nav={<span>Basics</span>}><p>Stage</p></StudioLayout>);
    expect(getByRole("heading", { level: 1, name: "Appearance studio" })).toBeTruthy();
    expect(queryByText("My Rivet · draft")).toBeNull();
    expect(queryByRoleButton("Save", getByRole)).toBeNull();

    rerender(<StudioLayout title="Appearance studio" subtitle="My Rivet · draft" actions={<button>Save</button>} navLabel="Studio sections" nav={<span>Basics</span>}><p>Stage</p></StudioLayout>);
    expect(getByText("My Rivet · draft")).toBeTruthy();
    expect(getByRole("button", { name: "Save" })).toBeTruthy();
  });

  test("provides a named navigation landmark, content and an optional aside", () => {
    const { getByRole, getByText, queryByRole, rerender } = render(<StudioLayout title="Studio" navLabel="Appearance sections" nav={<span>Basics</span>}><p>Preview stage</p></StudioLayout>);
    expect(getByRole("navigation", { name: "Appearance sections" })).toBeTruthy();
    expect(getByText("Preview stage")).toBeTruthy(); expect(queryByRole("main")).toBeNull();
    expect(queryByRole("complementary")).toBeNull();

    rerender(<StudioLayout title="Studio" navLabel="Appearance sections" nav={<span>Basics</span>} rail={<p>Reference</p>}><p>Preview stage</p></StudioLayout>);
    expect(getByRole("complementary").textContent).toContain("Reference");
  });

  test("uses the three-column large grid only when a rail is present", () => {
    const { container, rerender } = render(<StudioLayout title="Studio" navLabel="Sections" nav={<span>Basics</span>}><p>Stage</p></StudioLayout>);
    const grid = container.querySelector("nav")?.parentElement;
    expect(grid?.className).toContain("lg:grid-cols-[16rem_minmax(0,1fr)]");
    expect(grid?.className).not.toContain("lg:grid-cols-[16rem_minmax(0,1fr)_18rem]");

    rerender(<StudioLayout title="Studio" navLabel="Sections" nav={<span>Basics</span>} rail={<p>Reference</p>}><p>Stage</p></StudioLayout>);
    expect(grid?.className).toContain("lg:grid-cols-[16rem_minmax(0,1fr)_18rem]");
  });
});

function queryByRoleButton(label: string, getByRole: (role: string, options: { name: string }) => HTMLElement) {
  try {
    return getByRole("button", { name: label 
  test("the header stacks title and actions on phones and sits side by side from sm", () => {
    const { container } = render(<StudioLayout title="Studio" actions={<button>Publish</button>} navLabel="Sections" nav={<span>Basics</span>}><p>Stage</p></StudioLayout>);
    const header = container.querySelector("header");
    expect(header?.className).toContain("flex-col"); expect(header?.className).toContain("sm:flex-row");
  });
});
  } catch {
    return null;
  }
}
