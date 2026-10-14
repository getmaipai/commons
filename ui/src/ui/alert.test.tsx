import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Alert, AlertDescription, AlertTitle } from "@/kit/ui/alert";

afterEach(cleanup);

describe("Alert", () => {
  test("renders its title and description", () => {
    const { getByText } = render(
      <Alert>
        <AlertTitle>Setup needed</AlertTitle>
        <AlertDescription>Finish setup on this computer.</AlertDescription>
      </Alert>,
    );

    expect(getByText("Setup needed")).toBeTruthy();
    expect(getByText("Finish setup on this computer.")).toBeTruthy();
  });

  test("the destructive variant has the alert role", () => {
    const { getByRole } = render(
      <Alert variant="destructive">
        <AlertTitle>Search unavailable</AlertTitle>
        <AlertDescription>Search is temporarily down.</AlertDescription>
      </Alert>,
    );

    expect(getByRole("alert")).toBeTruthy();
  });

  test("the warning variant uses the existing orange status hue token", () => {
    const { getByRole } = render(<Alert variant="warning">Needs attention</Alert>);
    const alert = getByRole("alert");

    expect(alert.className).toContain("var(--hue-orange)");
    expect(alert.className).not.toContain("#");
  });
});
