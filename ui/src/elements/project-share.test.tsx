import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { ProjectShareDialog } from "./project-share";

afterEach(cleanup);

describe("ProjectShareDialog", () => {
  test("lists each person with their role", () => {
    const view = render(
      <ProjectShareDialog open onOpenChange={() => {}} onRoleChange={mock(() => {})} members={[{ id: "person-a", name: "Alfred", role: "can_use" }, { id: "person-b", name: "Daisy", role: "none" }]} />,
    );
    expect(view.getByRole("heading", { name: "Share project" })).not.toBeNull();
    expect(view.getByRole("combobox", { name: "Alfred" }).textContent).toBe("Can use");
    expect(view.getByRole("combobox", { name: "Daisy" }).textContent).toBe("No access");
  });
  test("an empty household says so", () => {
    const view = render(<ProjectShareDialog open onOpenChange={() => {}} onRoleChange={() => {}} members={[]} />);
    expect(view.getByText("There is no one to share with yet.")).not.toBeNull();
  });
});
