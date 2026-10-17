import { createContext } from "react";
import { readField } from "@/kit/schema/fieldPath";

// APP-KIND-02: what lets a package's own page run through the interpreter
// without being able to reach the rest of the hub. The shell mounts a package
// page inside `PackageScopeContext`; inside it a binding and a `call` target are
// resolved only under `/api/plugins/<that id>/` and `navigate.to` only under
// `/apps/<that id>/`. Outside it (the Memory page) nothing changes, and a
// `package` binding is refused because there is no package to ask.

export interface PackageScope {
  packageId: string;
}

export const PackageScopeContext = createContext<PackageScope | null>(null);

/** Page state a node can write (a picker). SchemaPage owns the state and passes
 * it to `NodeRenderer` as the `state` prop; this is only the setter. */
export interface PageStateWriter {
  /** Merges `patch` into the page state in one update; an `undefined` value removes the name. */
  merge(patch: Record<string, unknown>): void;
}
export const PageStateContext = createContext<PageStateWriter | null>(null);

export const PACKAGE_BINDING_REFUSED = "This page can't load that.";
export const PACKAGE_ACTION_REFUSED = "This page can't do that.";

/** Dot segments, backslashes, doubled slashes and their percent-encoded forms: anything that could leave a prefix. */
function climbs(path: string): boolean {
  return path.includes("..") || path.includes("\\") || path.includes("//") || /%(2e|2f|5c)/i.test(path);
}

/** True when `path` stays inside the package's own API prefix. Rejects any
 * path that tries to climb out of it. */
export function underPluginApi(path: string, packageId: string): boolean {
  if (climbs(path)) return false;
  const base = `/api/plugins/${packageId}`;
  return path === base || path.startsWith(`${base}/`) || path.startsWith(`${base}?`);
}

/** True when `to` stays inside the package's own app routes. */
export function underAppRoute(to: string, packageId: string): boolean {
  if (climbs(to)) return false;
  const base = `/apps/${packageId}`;
  return to === base || to.startsWith(`${base}/`) || to.startsWith(`${base}?`);
}

/** The typed event a client writes when a package page reaches outside its
 * package. It names no path, package or person. */
export function reportPageRejected(): void {
  console.warn("app.page_rejected");
}

export interface ResolvedParams {
  /** The JSON body of the data call, `$state.<name>` references filled in. */
  body: Record<string, unknown>;
  /** The same params for the query key: a value that carries coordinates is left out
   * (a Current location must never be part of a key), and the counter of each
   * left-out value stands in so a re-share still refetches. */
  keyParams: Record<string, unknown>;
  nonces: number[];
}

function carriesCoordinates(value: unknown): boolean {
  return typeof value === "object" && value !== null && typeof (value as { lat?: unknown }).lat === "number" && typeof (value as { lon?: unknown }).lon === "number";
}

/** Fills a package binding's `params` from page state. A string `"$state.<name>"` reads
 * the state value (an unset value is left out); anything else is sent as written. */
export function resolveParams(params: Record<string, unknown> | undefined, state: Record<string, unknown>): ResolvedParams {
  const body: Record<string, unknown> = {};
  const keyParams: Record<string, unknown> = {};
  const nonces: number[] = [];
  for (const [name, raw] of Object.entries(params ?? {})) {
    const fromState = typeof raw === "string" && raw.startsWith("$state.");
    const value = fromState ? readField(state, (raw as string).slice("$state.".length)) : raw;
    if (value === undefined || value === null || value === "") continue;
    body[name] = value;
    if (carriesCoordinates(value)) {
      const counter = fromState ? readField(state, `${(raw as string).slice("$state.".length)}_n`) : undefined;
      nonces.push(typeof counter === "number" ? counter : 0);
      continue;
    }
    keyParams[name] = value;
  }
  return { body, keyParams, nonces };
}
