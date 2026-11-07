import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FullLogo from "./FullLogo";

afterEach(cleanup);

describe("FullLogo", () => {
  test("by default the link is cropped to the 40 px mark below lg (the header and rail)", () => {
    const { container } = render(<MemoryRouter><FullLogo /></MemoryRouter>);
    const link = container.querySelector("a") as HTMLElement;
    expect(link.className).toContain("max-w-[40px]");
    expect(link.className).toContain("lg:max-w-[120px]");
  });

  test("`full` shows the whole wordmark at every width (the sign-in page at 375 px)", () => {
    const { container } = render(<MemoryRouter><FullLogo full /></MemoryRouter>);
    const link = container.querySelector("a") as HTMLElement;
    expect(link.className).toContain("max-w-[120px]");
    expect(link.className).not.toContain("max-w-[40px]");
  });
});
