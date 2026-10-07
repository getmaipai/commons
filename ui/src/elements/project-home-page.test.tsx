import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ProjectHomeHeader, ProjectHomeTabs } from "./project-home-page";

afterEach(cleanup);
const project = { name: "Garden", icon: "leaf", color: "green", description: "Plan the backyard", instructions: "Keep it simple", memory_mode: "shared" };
const projects = { folders: [], canMove: false, rowVariant: "page" as const, pageRows: {} };

describe("project home page Elements (PROJECTS-UI-04)", () => {
  test("header has project identity and edit/archive/delete menu without Share", async () => {
    const view = render(<ProjectHomeHeader project={project} canEdit canManage onSave={() => {}} onArchive={() => {}} onDelete={() => {}} />);
    expect(view.getByRole("heading", { name: "Garden" })).not.toBeNull();
    expect(view.getByText("Plan the backyard")).not.toBeNull();
    fireEvent.pointerDown(view.getByRole("button", { name: "Project options" }), { button: 0, ctrlKey: false });
    expect(await view.findByText("Edit project")).not.toBeNull();
    expect(view.getByText("Archive project")).not.toBeNull();
    expect(view.queryByText("Share")).toBeNull();
  });

  test("tabs show Sources and Artifacts empty states; Sources can be hidden", async () => {
    const view = render(<ProjectHomeTabs projects={projects} showSources hasChats={false} />);
    expect(view.getByRole("tab", { name: "Chats" })).not.toBeNull();
    expect(view.getByRole("tab", { name: "Sources" })).not.toBeNull();
    expect(view.getByRole("tab", { name: "Artifacts" })).not.toBeNull();
    fireEvent.keyDown(view.getByRole("tab", { name: "Chats" }), { key: "ArrowRight" });
    expect(await view.findByText("No sources yet")).not.toBeNull();
    fireEvent.keyDown(view.getByRole("tab", { name: "Sources" }), { key: "ArrowRight" });
    expect(await view.findByText("No artifacts yet")).not.toBeNull();
    cleanup();
    const child = render(<ProjectHomeTabs projects={projects} showSources={false} hasChats={false} />);
    expect(child.queryByRole("tab", { name: "Sources" })).toBeNull();
  });
});
