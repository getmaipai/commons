import { describe, expect, test } from "bun:test";
import { RobotState } from "../../gen/ts/robot-state.js";

const frame = { activity: "idle", muted: false, tracking: false };
const motions = [
  "resting",
  "held",
  "lifted",
  "carried",
  "set_down",
  "shaken",
  "tilted",
  "tapped",
  "falling",
  "bumped",
  "rolling",
];

describe("robot-state motion", () => {
  test("accepts the shared motion states and legacy values", () => {
    for (const motion of motions) {
      expect(RobotState.safeParse({ ...frame, motion }).success, motion).toBe(true);
    }
    expect(RobotState.safeParse({ ...frame, motion: null }).success).toBe(true);
  });

  test("rejects unknown states and validates optional motion_pose", () => {
    expect(RobotState.safeParse({ ...frame, motion: "flying" }).success).toBe(false);
    expect(RobotState.safeParse({ ...frame, motion: "still" }).success).toBe(false);
    for (const pose of ["upright", "left_side", "right_side", "upside_down", "face_down", "on_back", null]) {
      expect(RobotState.safeParse({ ...frame, motion_pose: pose }).success, String(pose)).toBe(true);
    }
    expect(RobotState.safeParse({ ...frame, motion_pose: "sitting" }).success).toBe(false);
  });

  test("accepts frames that omit motion fields", () => {
    expect(RobotState.safeParse(frame).success).toBe(true);
  });
});
