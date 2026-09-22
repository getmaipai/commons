// U2a (home/docs/plans/turn-machine-state-record-2026-09-22.md, "The
// budget record"): ModelCapabilities gains an optional turn_budget field,
// the per-model record turnNext.ts's model and tool nodes read (U2b/c).
// model-capabilities.chat.example.json already round-trips a populated
// turn_budget through fixtures.test.ts; this file proves the shape's own
// rules the fixture alone doesn't exercise: it is optional (a model with
// no measured record parses fine, matching "a model with no record runs
// with model_transitions false"), rounds is closed to 0/1/2, deadlines_ms
// and measured are each all-or-nothing objects, and additionalProperties
// is false throughout (a stray key is a bug, not a future field).
import { describe, expect, test } from "bun:test";
import { ModelCapabilities } from "../../gen/ts/model-capabilities.js";

const BASE = {
  id: "test-model",
  role: "chat",
  label: "Test Model",
  license: "Apache-2.0",
  engine: "llama-server",
  implemented: true,
  sizing: {
    kind: "transformer_gguf",
    param_count_billion: 1,
    bits_per_weight: 4,
    num_layers: 1,
    num_kv_heads: 1,
    head_dim: 1,
    max_context: 4096,
  },
} as const;

const VALID_BUDGET = {
  rounds: 1,
  tools_offered: ["recall", "remember", "remind", "timer", "weather", "websearch"],
  always_search: true,
  answer_from_context_tool: true,
  model_transitions: true,
  context_tokens: 4000,
  thinking_budget_tokens: 512,
  deadlines_ms: { model: 20000, tool: 10000, total: 45000 },
  measured: { false_call_rate: 0, inverse_miss_rate: 0.62, rewrite_pass_rate: 0, on: "ARCH-MEASURE-01, 2026-09-22" },
} as const;

describe("ModelCapabilities.turn_budget", () => {
  test("absent turn_budget still parses (a model with no measured record)", () => {
    expect(() => ModelCapabilities.parse(BASE)).not.toThrow();
  });

  test("a fully populated turn_budget parses", () => {
    expect(() => ModelCapabilities.parse({ ...BASE, turn_budget: VALID_BUDGET })).not.toThrow();
  });

  test("rounds is closed to 0, 1, or 2", () => {
    expect(() => ModelCapabilities.parse({ ...BASE, turn_budget: { ...VALID_BUDGET, rounds: 3 } })).toThrow();
  });

  test("the robot's Pi shape: rounds 0, model_transitions false, no search", () => {
    const robotBudget = { ...VALID_BUDGET, rounds: 0, always_search: false, answer_from_context_tool: false, model_transitions: false };
    expect(() => ModelCapabilities.parse({ ...BASE, turn_budget: robotBudget })).not.toThrow();
  });

  test("deadlines_ms is all-or-nothing: missing 'total' fails", () => {
    const { total: _total, ...incomplete } = VALID_BUDGET.deadlines_ms;
    expect(() => ModelCapabilities.parse({ ...BASE, turn_budget: { ...VALID_BUDGET, deadlines_ms: incomplete } })).toThrow();
  });

  test("measured is all-or-nothing: missing 'on' fails", () => {
    const { on: _on, ...incomplete } = VALID_BUDGET.measured;
    expect(() => ModelCapabilities.parse({ ...BASE, turn_budget: { ...VALID_BUDGET, measured: incomplete } })).toThrow();
  });

  test("a stray key on turn_budget is rejected (additionalProperties: false)", () => {
    expect(() => ModelCapabilities.parse({ ...BASE, turn_budget: { ...VALID_BUDGET, extra_field: true } })).toThrow();
  });

  test("measured.false_call_rate is a 0..1 rate, not a count", () => {
    expect(() => ModelCapabilities.parse({ ...BASE, turn_budget: { ...VALID_BUDGET, measured: { ...VALID_BUDGET.measured, false_call_rate: 1.5 } } })).toThrow();
  });
});
