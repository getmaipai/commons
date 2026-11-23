// Rule check for a maipai.systems/1 manifest. The schema checks shape; this
// checks the rules a schema cannot: layers only call down, one owner per
// piece of state, every id resolves, every component has an owner.
// Run: bun run scripts/check-systems.ts <manifest.json> [--root <repo>]
// With --root, `tests` and `docs` paths are checked to exist under it.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Problem { rule: string; where: string; message: string }
export interface Vocab { parts: Set<string>; capabilities: Set<string> }

type Obj = Record<string, any>;

export function loadVocab(specDir = join(import.meta.dir, "..")): Vocab {
  const api = JSON.parse(readFileSync(join(specDir, "vocab", "robot-api.json"), "utf8"));
  const caps = JSON.parse(readFileSync(join(specDir, "vocab", "capabilities.json"), "utf8"));
  return {
    parts: new Set<string>(api.parts.map((p: Obj) => p.id)),
    capabilities: new Set<string>(caps.capabilities as string[]),
  };
}

export interface Result { errors: Problem[]; warnings: Problem[] }

export function checkSystems(m: Obj, vocab: Vocab, opts: { root?: string } = {}): Result {
  const errors: Problem[] = [];
  const warnings: Problem[] = [];
  const err = (rule: string, where: string, message: string) => errors.push({ rule, where, message });
  const warn = (rule: string, where: string, message: string) => warnings.push({ rule, where, message });

  const bodies = new Set<string>((m.bodies ?? []).map((b: Obj) => b.id));
  const layerNs = new Set<number>((m.layers ?? []).map((l: Obj) => l.n));
  const systems: Obj[] = m.systems ?? [];
  const sysById = new Map<string, Obj>();
  for (const s of systems) {
    if (sysById.has(s.id)) err("owner", s.id, `system id ${s.id} is declared twice`);
    sysById.set(s.id, s);
    if (!layerNs.has(s.layer)) err("ids", s.id, `layer ${s.layer} is not in layers`);
    if (!s.owner) err("owner", s.id, "system has no owner");
    for (const p of s.parts ?? []) if (!vocab.parts.has(p)) err("ids", s.id, `part ${p} is not in vocab/robot-api.json`);
    for (const c of s.capabilities ?? []) if (!vocab.capabilities.has(c)) err("ids", s.id, `capability ${c} is not in vocab/capabilities.json`);
    checkStatus(s.status, s.id);
  }

  function checkStatus(status: Obj | undefined, where: string) {
    if (!status) return;
    for (const k of Object.keys(status)) if (!bodies.has(k)) err("ids", where, `status names body ${k}, which is not in bodies`);
    for (const b of bodies) if (!(b in status) && where.includes(".")) err("ids", where, `status has no entry for body ${b}`);
  }

  // Index every component and what it exposes.
  const comps: { sys: Obj; c: Obj }[] = [];
  const compIds = new Set<string>();
  for (const s of systems) {
    for (const c of s.components ?? []) {
      comps.push({ sys: s, c });
      if (compIds.has(c.id)) err("owner", c.id, `component id ${c.id} is declared twice`);
      compIds.add(c.id);
      if (!String(c.id).startsWith(`${s.id}.`)) err("owner", c.id, `component id must start with its system id "${s.id}."`);
      checkStatus(c.status, c.id);
    }
  }

  // Rule: one owner per piece of state, tool, event, call, setting and switch.
  for (const field of ["owns", "tools", "events", "provides", "settings"] as const) {
    const seen = new Map<string, string>();
    for (const { c } of comps) {
      for (const name of c[field] ?? []) {
        const prev = seen.get(name);
        if (prev && prev !== c.id) err("owner", c.id, `${field} "${name}" is also declared by ${prev}; one owner only`);
        else seen.set(name, c.id);
      }
    }
  }
  const switchOwner = new Map<string, string>();
  for (const { c } of comps) {
    if (!c.switch) continue;
    const prev = switchOwner.get(c.switch);
    if (prev) err("owner", c.id, `switch ${c.switch} is also used by component ${prev}`);
    else switchOwner.set(c.switch, c.id);
    if (!c.budget) err("budget", c.id, "a component with a switch needs a budget");
  }

  // Rule: ids resolve.
  const provided = new Set<string>();
  const tools = new Set<string>();
  const events = new Set<string>();
  for (const { c } of comps) {
    (c.provides ?? []).forEach((x: string) => provided.add(x));
    (c.tools ?? []).forEach((x: string) => tools.add(x));
    (c.events ?? []).forEach((x: string) => events.add(x));
  }
  for (const { sys, c } of comps) {
    for (const call of c.provides ?? []) {
      if (!String(call).startsWith(`${sys.id}::`)) err("owner", c.id, `provided call ${call} must start with "${sys.id}::"`);
    }
    for (const u of c.uses ?? []) {
      if (!String(u).includes("::")) {
        // A tool name: only an adapter may use one, and it must exist.
        if (c.type !== "adapter") err("ids", c.id, `uses "${u}" is a tool name; only an adapter may call tools (others use <system>::<name>)`);
        else if (!tools.has(u)) warn("ids", c.id, `adapter uses tool ${u}, which no component declares`);
        continue;
      }
      if (c.type === "adapter") err("layer", c.id, `adapter reaches the unit only through tools, not call ${u}`);
      const target = String(u).split("::")[0];
      const ts = sysById.get(target);
      if (!ts) { err("ids", c.id, `uses ${u}: no system "${target}"`); continue; }
      // Rule: no reaching up a layer (a unit component calls its own layer or lower).
      if (c.runs_on === "unit" && ts.layer > sys.layer) {
        err("layer", c.id, `uses ${u} in layer ${ts.layer}, above its own layer ${sys.layer}`);
      }
      if (!provided.has(u)) {
        const filledIn = (ts.components ?? []).length > 0;
        (filledIn ? err : warn)("ids", c.id, `uses ${u}, which no component provides`);
      }
    }
    for (const e of c.listens ?? []) {
      if (!events.has(e)) warn("ids", c.id, `listens to event ${e}, which no component publishes`);
    }
  }

  // Rule: every component has an owner (a known system, which has an owner).
  for (const { sys, c } of comps) {
    if (!sysById.has(sys.id) || !sys.owner) err("owner", c.id, "component has no owning system with an owner");
  }

  // Rule: built things are proven enough to ship.
  for (const s of systems) {
    const built = (s.components ?? []).some((c: Obj) => Object.values(c.status ?? {}).some((v) => ["built", "proven_virtual", "proven_unit"].includes(v as string)));
    if (built && !(s.docs ?? []).length) err("proof", s.id, "a system with a built component needs a doc");
  }
  for (const { c } of comps) {
    const built = Object.values(c.status ?? {}).some((v) => ["built", "proven_virtual", "proven_unit"].includes(v as string));
    if (built && c.safety !== "none" && !(c.tests ?? []).length) warn("proof", c.id, `built with safety class ${c.safety} and no test named`);
  }

  if (opts.root) {
    const paths = [
      ...systems.flatMap((s) => [...(s.docs ?? []), ...(s.components ?? []).flatMap((c: Obj) => [...(c.tests ?? []), ...(c.docs ?? [])])]),
    ];
    for (const p of paths) if (!existsSync(join(opts.root, p))) err("paths", p, `path does not exist under ${opts.root}`);
  }
  return { errors, warnings };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const rootAt = args.indexOf("--root");
  const root = rootAt >= 0 ? args.splice(rootAt, 2)[1] : undefined;
  const file = args[0];
  if (!file) { console.error("usage: bun run scripts/check-systems.ts <manifest.json> [--root <repo>]"); process.exit(2); }
  const { errors, warnings } = checkSystems(JSON.parse(readFileSync(file, "utf8")), loadVocab(), { root });
  for (const w of warnings) console.log(`warning [${w.rule}] ${w.where}: ${w.message}`);
  for (const e of errors) console.log(`error   [${e.rule}] ${e.where}: ${e.message}`);
  console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}
