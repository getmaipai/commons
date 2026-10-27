import { afterEach, describe, expect, test } from "bun:test";
import { useState } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { TaskBrowser } from "./task-browser";

afterEach(cleanup);

describe("TaskBrowser", () => {
  test("shows tab counts and reports tab changes", () => {
    let changed = "";
    const { getByRole, getByText } = render(<TaskBrowser label="Tasks" tabs={[{ id: "open", label: "Open", count: 2 }, { id: "done", label: "Done", count: 0 }]} activeTab="open" onTabChange={(id) => { changed = id; }} items={[]} selectedId={null} onSelect={() => {}} detail={<div>Task detail</div>} empty={<div>No tasks</div>} backLabel="Back" />);
    expect(getByText("2")).toBeTruthy();
    fireEvent.mouseDown(getByRole("tab", { name: "Done" }));
    expect(changed).toBe("done");
  });

  test("selects an item, marks it current, shows detail, and returns to the list on phone back", () => {
    const selected: string[] = [];
    const { getByRole, getByText, queryByRole } = render(<TaskBrowser label="Tasks" tabs={[{ id: "open", label: "Open" }]} activeTab="open" onTabChange={() => {}} items={[{ id: "task-a", title: "Review request", line: "Waiting" }]} selectedId="task-a" onSelect={(id) => selected.push(id)} detail={<div>Selected detail</div>} empty={<div>No tasks</div>} backLabel="Back to tasks" />);
    const task = getByRole("button", { name: /Review request/ });
    expect(task.getAttribute("aria-current")).toBe("true");
    expect(queryByRole("button", { name: "Back to tasks" })).toBeNull();
    fireEvent.click(task);
    expect(selected).toEqual(["task-a"]);
    expect(getByText("Selected detail")).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Back to tasks" }));
    expect(queryByRole("button", { name: "Back to tasks" })).toBeNull();
    expect(getByRole("button", { name: /Review request/ })).toBeTruthy();
  });

  test("a host that stores the selection still gets the phone detail and back control", () => {
    function Host() {
      const [selectedId, setSelectedId] = useState<string | null>(null);
      return <TaskBrowser label="Tasks" tabs={[{ id: "open", label: "Open" }]} activeTab="open" onTabChange={() => {}} items={[{ id: "task-a", title: "Review request" }]} selectedId={selectedId} onSelect={setSelectedId} detail={<div>Selected detail</div>} empty={<div>No tasks</div>} backLabel="Back to tasks" />;
    }
    const { getByRole, queryByRole } = render(<Host />);
    fireEvent.click(getByRole("button", { name: /Review request/ }));
    expect(getByRole("button", { name: "Back to tasks" })).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Back to tasks" }));
    expect(queryByRole("button", { name: "Back to tasks" })).toBeNull();
  });

  test("renders empty content in the list area", () => {
    const { getByText } = render(<TaskBrowser label="Tasks" tabs={[]} activeTab="" onTabChange={() => {}} items={[]} selectedId={null} onSelect={() => {}} detail={<div>Detail</div>} empty={<div>No tasks</div>} backLabel="Back" />);
    expect(getByText("No tasks")).toBeTruthy();
  });
});
