import { describe, expect, test } from "bun:test";
import { SessionSignInSource } from "../../gen/ts/session-sign-in-source.js";

describe("SPEC-SESSION-SOURCE-01", () => {
  test("accepts the three closed sign-in sources", () => {
    for (const v of ["local", "away", "paired_device"]) {
      expect(SessionSignInSource.parse(v)).toBe(v);
    }
  });

  test("a session recorded before the field existed reads as local", () => {
    expect(SessionSignInSource.parse(undefined)).toBe("local");
  });

  test("rejects an unknown or differently cased source", () => {
    for (const v of ["tailscale", "Away", "", null, 3]) {
      expect(SessionSignInSource.safeParse(v).success).toBe(false);
    }
  });
});
