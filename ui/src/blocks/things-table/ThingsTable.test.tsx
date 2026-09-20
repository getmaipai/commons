import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "bun:test";
import { ThingsTable } from "@/kit/blocks/things-table/ThingsTable";

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = [{ id: "weather", name: "Weather" }];

// Regression: a sortable column header's button carried no touch-target
// treatment at all - axe measured it as small as 51x16px, well under
// docs/UI.md's 48px floor, on the Apps page's first real table (found
// live, before this shipped, the same class of gap MetricCard's own
// state link had). A first fix attempt applied hitArea(3) alone - a
// review caught the math: hitArea(3) is a fixed +24px total, so a 16px
// box only reaches 40px, still short. `py-1` (+8px) brings the box to
// 24px first (16+8+24=48), the size hitArea(3)'s own doc comment
// actually assumes.
test("a sortable column header button carries a real touch-target extension", () => {
  render(
    <ThingsTable<Row>
      columns={[{ key: "name", header: "Package", render: (row) => row.name }]}
      rows={rows}
      getKey={(row) => row.id}
      empty="No packages"
    />,
  );
  const header = document.querySelector("button[aria-label='Package']")!;
  expect(header.className).toContain("before:-inset-3");
  expect(header.className).toContain("py-1");
});
