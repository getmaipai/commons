// Cross-file conformance for a package app (APP-KIND-01): the rules JSON Schema
// cannot say about `contributes.pages[]`, `contributes.data[]` and the page
// documents they name. The generated manifest model and ui/schema.json check each
// shape; this checks how they fit together. Returns plain-language violations,
// an empty array when the app conforms. The hub runs it when a package is
// loaded, so a bad page is refused then, never at request time.

export interface AppPageEntry { id: string; label?: string; nav?: boolean; kind?: string; module: string; icon?: string; keywords?: string[]; pinned_by_default?: boolean; pin_order?: number }
export interface AppDataEntry { id: string; surface?: string; rows?: string; inputs?: Record<string, unknown>; refresh_s?: number }
export interface AppContributes { pages?: AppPageEntry[]; data?: AppDataEntry[] }

/** The node types a package page may use. Anything that reads another route
 * (list, card_grid, widget_card, split_view, ...) or mounts a host component
 * (message_thread, settings_editor) is refused: a package page draws only its
 * own data, through the two package nodes and the layout nodes. */
export const PACKAGE_PAGE_NODE_TYPES: readonly string[] = ["page", "section", "empty_state", "progress", "answer_blocks", "picker", "detail_pane"];

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

function checkAction(action: unknown, packageId: string, where: string, out: string[]): void {
  if (!isObject(action)) return;
  const navigate = action.navigate;
  if (isObject(navigate) && typeof navigate.to === "string") {
    const base = `/apps/${packageId}`;
    if (navigate.to !== base && !navigate.to.startsWith(`${base}/`)) out.push(`${where}: navigate.to "${navigate.to}" must stay under ${base}`);
  }
  const call = action.call;
  if (isObject(call) && typeof call.target === "string" && !call.target.startsWith(`/api/plugins/${packageId}/`)) {
    out.push(`${where}: call.target "${call.target}" must stay under /api/plugins/${packageId}/`);
  }
  if (isObject(action.confirm)) checkAction(action.confirm.on_confirm, packageId, where, out);
  if (action.play !== undefined) out.push(`${where}: the play action is not available on a package page`);
}

function checkBinding(bind: unknown, where: string, data: Map<string, AppDataEntry>, want: "blocks" | "rows", out: string[]): void {
  if (!isObject(bind)) { out.push(`${where}: needs a bind`); return; }
  if (bind.source !== "package") { out.push(`${where}: bind.source must be "package", not "${String(bind.source)}"`); return; }
  const path = typeof bind.path === "string" ? bind.path : "";
  const entry = data.get(path);
  if (!entry) { out.push(`${where}: bind.path "${path}" is not a contributes.data id of this package`); return; }
  if (want === "rows" && entry.rows === undefined) out.push(`${where}: data "${path}" returns blocks, not rows; a picker needs a data entry with "rows"`);
  if (want === "blocks" && entry.rows !== undefined) out.push(`${where}: data "${path}" returns rows, not blocks; an answer_blocks node needs a recipe data entry`);
}

function walk(node: unknown, packageId: string, data: Map<string, AppDataEntry>, where: string, out: string[]): void {
  if (!isObject(node)) { out.push(`${where}: a node must be an object`); return; }
  const type = String(node.type);
  if (!PACKAGE_PAGE_NODE_TYPES.includes(type)) { out.push(`${where}: node type "${type}" is not allowed on a package page`); return; }
  if (type === "answer_blocks") checkBinding(node.bind, `${where} answer_blocks`, data, "blocks", out);
  if (type === "picker" && node.bind !== undefined) checkBinding(node.bind, `${where} picker`, data, "rows", out);
  if (isObject(node.empty_state)) checkAction(node.empty_state.action, packageId, where, out);
  if (type === "empty_state") checkAction(node.action, packageId, where, out);
  const kids = type === "page" ? node.body : type === "section" ? node.children : type === "detail_pane" ? node.body : undefined;
  if (Array.isArray(kids)) kids.forEach((kid, i) => walk(kid, packageId, data, `${where}/${type}[${i}]`, out));
}

/** `loadPage(module)` returns the parsed `pages/<module>.json`, or undefined when the file is missing. */
export function checkAppPackage(packageId: string, contributes: AppContributes | undefined, loadPage: (module: string) => unknown): string[] {
  const out: string[] = [];
  const pages = contributes?.pages ?? [];
  const dataList = contributes?.data ?? [];
  if (pages.length === 0) {
    if (dataList.length > 0) out.push("contributes.data is declared but the package has no pages");
    return out;
  }
  const ids = new Set<string>();
  for (const page of pages) {
    if (ids.has(page.id)) out.push(`page id "${page.id}" is declared twice`);
    ids.add(page.id);
    if (page.kind !== undefined && page.kind !== "schema") out.push(`page "${page.id}": kind "${page.kind}" is refused; only "schema" pages are allowed`);
  }
  if (!ids.has("index")) out.push('an app needs one page with id "index"');
  const data = new Map<string, AppDataEntry>();
  for (const entry of dataList) {
    if (data.has(entry.id)) out.push(`data id "${entry.id}" is declared twice`);
    data.set(entry.id, entry);
    if (entry.rows !== undefined && entry.surface === undefined) out.push(`data "${entry.id}": rows needs a surface`);
  }
  for (const page of pages) {
    const doc = loadPage(page.module);
    const where = `pages/${page.module}.json`;
    if (doc === undefined) { out.push(`${where} is missing (page "${page.id}")`); continue; }
    if (!isObject(doc) || doc.type !== "page") { out.push(`${where} must be a page document`); continue; }
    walk(doc, packageId, data, where, out);
  }
  return out;
}
