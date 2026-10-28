import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { PlayerLiveShowcase } from "@/kit/primitives/PlayerLiveShowcase";

afterEach(cleanup);

test("PlayerLiveShowcase draws two Live badges and one seekable item", () => {
  const view = render(<PlayerLiveShowcase />);
  expect(view.getAllByText("Live").length).toBe(2);
  expect(view.container.querySelectorAll('[data-media-chrome="MediaTimeRange"]').length).toBe(1);
});
