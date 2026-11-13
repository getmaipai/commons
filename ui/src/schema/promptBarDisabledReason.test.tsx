// A prompt_bar node's own `disabled_reason` turns the submit off with one plain line, with no host makingNotice.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext } from "@/kit/schema/packageScope";
import type { UiNode } from "@/kit/schema/types";

const realMatchMedia = window.matchMedia;
beforeEach(() => { stubMatchMedia(); });
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; });

const node = (extra: object) => ({ type: "prompt_bar", label: "Describe", submit_label: "Generate", submit: { call: { target: "/api/plugins/image/actions/make", args: { prompt: "{prompt}" } } }, ...extra }) as unknown as UiNode;

describe("prompt_bar disabled_reason", () => {
  test("shows the line and keeps Generate off even with words", () => {
    const view = renderWithQueryClient(<MemoryRouter><PackageScopeContext.Provider value={{ packageId: "image" }}><NodeRenderer node={node({ disabled_reason: "Images are coming soon." })} state={{}} /></PackageScopeContext.Provider></MemoryRouter>);
    expect(view.getByRole("status").textContent).toBe("Images are coming soon.");
    expect((view.getByRole("button", { name: "Generate" }) as HTMLButtonElement).disabled).toBe(true);
  });
  test("without it the bar is unchanged", () => {
    const view = renderWithQueryClient(<MemoryRouter><PackageScopeContext.Provider value={{ packageId: "image" }}><NodeRenderer node={node({})} state={{}} /></PackageScopeContext.Provider></MemoryRouter>);
    expect(view.queryByRole("status")).toBeNull();
  });
});
