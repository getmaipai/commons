// Schemas kept out of the codegen sweep (gen-ts.ts, bundle-schemas.ts):
// their allOf/if/then conditionals aren't reliably preserved by either
// generator today (spec-v0.1.1, RF-05b's stack-event). One list,
// imported by both scripts, so adding a schema here can't update one
// codegen path and silently miss the other.
export const STACK_SCHEMA_NAMES: ReadonlySet<string> = new Set([
  "health-item.schema.json",
  // STACK-CONNECTIONS-01: hand-written mirror (kind-conditional rules the generators drop).
  "stack-connection.schema.json",
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
  // VF-RECEIPT-01: hand-written mirror.
  "stack-video-receipt.schema.json",
  // VF-ROLES-01: hand-written mirror of the operation names.
  "stack-video-operation.schema.json",
  // VF-ROUGHCUT-01: hand-written mirrors of the rough-cut request and result.
  "stack-rough-cut-request.schema.json",
  "stack-rough-cut-result.schema.json",
  // STACK-MODELS-PAGE-01: hand-written mirrors of the choices API (the Zod file is the source; the generators would only add noise).
  "stack-choices-view.schema.json",
  "stack-choices-error.schema.json",
  "stack-choices-pick-request.schema.json",
  "stack-choices-pick-result.schema.json",
  "stack-choices-order-request.schema.json",
  "stack-choices-order-result.schema.json",
  "stack-choices-recommended-request.schema.json",
  "stack-choices-recommended-result.schema.json",
  "stack-choices-unused.schema.json",
  "stack-choices-remove-request.schema.json",
  "stack-choices-remove-result.schema.json",
  "stack-choices-add-model-request.schema.json",
  "stack-choices-add-model-result.schema.json",
  "stack-choices-migrate-request.schema.json",
  "stack-choices-migrate-result.schema.json",
]);
