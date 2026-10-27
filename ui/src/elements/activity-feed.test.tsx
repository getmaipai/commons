import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { ActivityFeed } from "./activity-feed";

afterEach(cleanup);

describe("ActivityFeed", () => {
  test("keeps groups and items in the supplied order, names its region, and renders its aside", () => {
    const { getByRole, getByText } = render(<ActivityFeed label="Activity" aside={<div>Summary aside</div>} groups={[
      { id: "later", label: "Yesterday", items: [{ id: "b", title: "Second", tone: "done" }] },
      { id: "first", label: "Today", items: [{ id: "a", title: "First", tone: "needs_you" }, { id: "c", title: "Third", tone: "working" }] },
    ]} />);
    expect(getByRole("region", { name: "Activity" })).toBeTruthy();
    expect(getByText("Summary aside")).toBeTruthy();
    const titles = [...document.querySelectorAll("li")].map((item) => item.textContent?.trim());
    expect(titles).toEqual(["DoneSecond", "Needs youFirst", "WorkingThird"]);
    expect(getByText("Yesterday")).toBeTruthy();
    expect(getByText("Today")).toBeTruthy();
  });

  test("renders every tone label and empty content when there are no groups", () => {
    const { getByText, queryByText } = render(<ActivityFeed label="Activity" empty={<p>Nothing here</p>} groups={[]} />);
    expect(getByText("Nothing here")).toBeTruthy();
    expect(queryByText("Needs you")).toBeNull();
    cleanup();
    const view = render(<ActivityFeed label="Activity" groups={[{ id: "g", label: "Today", items: [
      { id: "1", title: "A", tone: "needs_you" }, { id: "2", title: "B", tone: "working" }, { id: "3", title: "C", tone: "done" }, { id: "4", title: "D", tone: "plain" },
    ]}]} />);
    expect(view.getByText("Needs you")).toBeTruthy();
    expect(view.getByText("Working")).toBeTruthy();
    expect(view.getByText("Done")).toBeTruthy();
  });
});
