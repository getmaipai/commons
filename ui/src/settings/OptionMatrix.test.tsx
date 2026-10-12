import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { OptionMatrix } from "./OptionMatrix";

const rows = [
  { id: "blp-gambling", label: "Gambling sites", note: "Set by Jordan", resetLabel: "Back to Teen" },
  { id: "blp-scam", label: "Scam sites" },
];
const columns = [
  { key: "global", label: "Global defaults", value: ["blp-scam"], locked: ["blp-scam"] },
  { key: "person", label: "Sam", value: ["blp-gambling"], locked: [] },
];

afterEach(cleanup);

describe("OptionMatrix row note and reset", () => {
  test("shows the note and a reset button only on the row that has one, and reports the row", () => {
    const seen: string[] = [];
    const { getByText, getByRole, queryAllByRole } = render(<OptionMatrix rowsLabel="Kind of site" rows={rows} columns={columns} onToggle={() => {}} onReset={(id) => seen.push(id)} />);
    expect(getByText("Set by Jordan")).toBeTruthy();
    expect(queryAllByRole("button", { name: "Back to Teen" })).toHaveLength(1);
    fireEvent.click(getByRole("button", { name: "Back to Teen" }));
    expect(seen).toEqual(["blp-gambling"]);
  });

  test("without onReset no reset button is drawn", () => {
    const { queryAllByRole } = render(<OptionMatrix rowsLabel="Kind of site" rows={rows} columns={columns} onToggle={() => {}} />);
    expect(queryAllByRole("button")).toHaveLength(0);
  });
});
