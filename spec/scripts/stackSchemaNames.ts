// Schemas kept out of the codegen sweep (gen-ts.ts, bundle-schemas.ts):
// their allOf/if/then conditionals aren't reliably preserved by either
// generator today (spec-v0.1.1, RF-05b's stack-event). One list,
// imported by both scripts, so adding a schema here can't update one
// codegen path and silently miss the other.
export const STACK_SCHEMA_NAMES: ReadonlySet<string> = new Set([
  "health-item.schema.json",
  "precious-state.schema.json",
  "role-reply-headers.schema.json",
  "role-request.schema.json",
  "stack-event.schema.json",
  "stack-job.schema.json",
  "stack-setting.schema.json",
  "stt-endpoint-response.schema.json",
  "stt-transcribe-response.schema.json",
  "stt-wire-event.schema.json",
  "token-count-request.schema.json",
  "token-count-response.schema.json",
  "turn-stream-event.schema.json",
  // These hand-written mirrors carry if/then rules the generators drop.
  "content-rating.schema.json",
  "content-rater.schema.json",
  // MODELPACK-SPEC-01: hand-written mirrors (oneOf unions the generators flatten).
  "stack-model-pack.schema.json",
  "stack-make-request.schema.json",
  "stack-make-result.schema.json",
  "stack-make-refusal.schema.json",
  "stack-jobs-catalog.schema.json",
]);
