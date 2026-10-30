// TIER-SPEC-01: the typed-options check for a tier slot (schemas/tier-slot.schema.json)
// against the category table in vocab/resource-tiers.json. The schema says a slot is
// { model, options }; this says which option names and values each category accepts,
// and which options a minor never receives. Home and the Stack both call it so neither
// keeps a second copy of the table.
import tiers from "../../vocab/resource-tiers.json" with { type: "json" };

export type TierId = "reduced" | "standard" | "boost" | "max";
export type TierBand = "child" | "teen" | "adult";
export type TierOptionValue = boolean | number;
export interface TierSlotValue {
  model: string;
  options: Record<string, TierOptionValue>;
  who?: "everyone" | "assigned" | "admins";
}

interface OptionDef {
  id: string;
  type: "boolean" | "integer" | "number";
  min?: number;
  max?: number;
  default: TierOptionValue;
  minors: boolean;
}

const category = (id: string) => tiers.categories.find((c) => c.id === id);

/** Plain-words problems with a slot's options for one category; empty means valid. */
export function checkTierSlotOptions(categoryId: string, options: Record<string, unknown>): string[] {
  const cat = category(categoryId);
  if (!cat) return [`${categoryId} is not a category with tiers.`];
  const defs = cat.options as OptionDef[];
  const problems: string[] = [];
  for (const [name, value] of Object.entries(options)) {
    const def = defs.find((d) => d.id === name);
    if (!def) {
      problems.push(`${cat.label} has no option called ${name}.`);
      continue;
    }
    if (def.type === "boolean") {
      if (typeof value !== "boolean") problems.push(`${name} must be on or off.`);
      continue;
    }
    if (typeof value !== "number" || (def.type === "integer" && !Number.isInteger(value))) {
      problems.push(`${name} must be a ${def.type === "integer" ? "whole " : ""}number.`);
      continue;
    }
    if (def.min !== undefined && value < def.min) problems.push(`${name} must be at least ${def.min}.`);
    if (def.max !== undefined && value > def.max) problems.push(`${name} must be at most ${def.max}.`);
  }
  return problems;
}

/** The options a person of this band actually runs with: a child's or teen's thinking options are always their defaults (RULES.md rules 2 and 8). */
export function optionsForBand(categoryId: string, options: Record<string, TierOptionValue>, band: TierBand): Record<string, TierOptionValue> {
  if (band === "adult") return { ...options };
  const defs = (category(categoryId)?.options ?? []) as OptionDef[];
  const out: Record<string, TierOptionValue> = {};
  for (const [name, value] of Object.entries(options)) {
    const def = defs.find((d) => d.id === name);
    out[name] = def && !def.minors ? def.default : value;
  }
  return out;
}
