import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { RobotFace, type RobotFaceExpression } from "./robot-face";

describe("RobotFace", () => {
  afterEach(cleanup);

  it("renders with default props", () => {
    const { getByRole } = render(<RobotFace name="Rover" />);
    expect(getByRole("img")).toHaveAttribute("data-expression", "idle");
    expect(getByRole("img")).toHaveAttribute("data-color", "mint");
  });

  it("sets every expression", () => {
    const expressions: RobotFaceExpression[] = ["idle", "present", "listening", "thinking", "working", "speaking", "asking", "done", "concerned", "sleeping", "offline"];
    for (const expression of expressions) {
      const { getByRole, unmount } = render(<RobotFace name="Rover" expression={expression} />);
      expect(getByRole("img")).toHaveAttribute("data-expression", expression);
      unmount();
    }
  });

  it("changes background for night and color", () => {
    const { container, rerender } = render(<RobotFace name="Rover" />);
    const rect = container.querySelector("rect");
    expect(rect).toHaveAttribute("fill", "#C4F0DA");
    rerender(<RobotFace name="Rover" color="sky" />);
    expect(rect).toHaveAttribute("fill", "#CDEBFA");
    rerender(<RobotFace name="Rover" night />);
    expect(rect).toHaveAttribute("fill", "#000000");
  });

  it("renders a 36px header box and labels the expression", () => {
    const { getByRole } = render(<RobotFace name="Rover" expression="listening" size="header" />);
    const face = getByRole("img");
    expect(face).toHaveStyle({ width: "36px", height: "36px" });
    expect(face).toHaveAttribute("aria-label", "Rover's face, listening");
  });
});
