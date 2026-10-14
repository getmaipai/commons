import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SPEC = join(import.meta.dir, "..");
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const schema = JSON.parse(readFileSync(join(SPEC, "schemas", "tour.schema.json"), "utf8"));
const validateSchema = ajv.compile(schema);
type Tour = { audience: string[]; steps: Array<{ title?: string; body?: string; title_by_audience?: Record<string, string>; body_by_audience?: Record<string, string>; hero_slide?: string }> };

export function validateTour(value: unknown, heroSlideIds?: ReadonlySet<string>): string[] {
  if (!validateSchema(value)) return (validateSchema.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`);
  const tour = value as Tour;
  const errors: string[] = [];
  for (const [index, step] of tour.steps.entries()) {
    const raw = (value as Tour).steps[index] as Tour["steps"][number] & { id?: string; target?: string; placement?: string; hero_slide?: string };
    if (raw.placement === "center" && raw.target !== undefined) errors.push(`/steps/${index} centered steps must omit target`);
    if (raw.placement !== "center" && !raw.target) errors.push(`/steps/${index} targeted steps require target`);
    if (raw.hero_slide && (raw.placement !== "center" || raw.target !== undefined || raw.title !== undefined || raw.body !== undefined)) {
      errors.push(`/steps/${index} hero_slide requires a centered step without target, title, or body`);
    }
    if (raw.placement === "center" && !raw.hero_slide && (!raw.title || !raw.body)) errors.push(`/steps/${index} centered steps without hero_slide require title and body`);
    const copy = `${step.title ?? ""} ${step.body ?? ""}`;
    if (/https?:\/\/|www\./i.test(copy)) errors.push(`/steps/${index} copy must not contain links out`);
    if (tour.audience.includes("child") && /settings|privacy|other people/i.test(copy) && !step.body_by_audience?.child) {
      errors.push(`/steps/${index} requires body_by_audience.child for child-audience copy about settings, privacy, or other people`);
    }
    if (step.hero_slide && heroSlideIds && !heroSlideIds.has(step.hero_slide)) errors.push(`/steps/${index}/hero_slide does not name an existing hero slide`);
  }
  return errors;
}

if (import.meta.main) {
  const value = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
  const idsArg = process.argv[3];
  const ids = idsArg ? new Set(JSON.parse(readFileSync(idsArg, "utf8")).map((slide: { id: string }) => slide.id)) : undefined;
  const errors = validateTour(value, ids);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  }
}
