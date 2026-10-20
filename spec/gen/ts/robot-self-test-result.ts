// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/robot-self-test-result.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Device-to-hub answer to self_test. detail is plain words, never audio, a transcript or an image.*/
export const RobotSelfTestResult = z
  .object({
    run_id: z.string().min(1).max(64),
    part: z.enum(["speaker", "face", "head", "lights", "mic"]),
    ok: z.boolean(),
    detail: z.string().max(200),
    took_ms: z.number().int().gte(0),
  })
  .strict()
  .describe(
    "Device-to-hub answer to self_test. detail is plain words, never audio, a transcript or an image.",
  );
export type RobotSelfTestResult = z.infer<typeof RobotSelfTestResult>;
