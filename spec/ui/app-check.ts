// Cross-file conformance for a package app (APP-KIND-01): the rules JSON Schema
// cannot say about `contributes.pages[]`, `contributes.data[]` and the page
// documents they name. The generated manifest model and ui/schema.json check each
// shape; this checks how they fit together. Returns plain-language violations,
// an empty array when the app conforms. The hub runs it when a package is
// loaded, so a bad page is refused then, never at request time.

export interface AppPageEntry { id: string; label?: string; nav?: boolean; kind?: string; module: string; icon?: string; keywords?: string[]; pinned_by_default?: boolean; pin_order?: number; min_role?: string }
export interface AppDataEntry { id: string; surface?: string; rows?: string; inputs?: Record<string, unknown>; refresh_s?: number }
export interface AppSidebarRows { bind: unknown; item_key_field?: string; item_label_field?: string; item_media_field?: string; only_followed?: boolean; open: unknown; manage?: { label: string; open: unknown } }
export interface AppSidebarGroup { id: string; title?: string; pages?: string[]; rows?: AppSidebarRows }
export interface AppSidebar { search?: unknown; groups: AppSidebarGroup[] }
export interface AppContributes { pages?: AppPageEntry[]; data?: AppDataEntry[]; sidebar?: AppSidebar }

/** The node types a package page may use. Anything that reads another route
 * (card_grid, widget_card, ...) or mounts a host component
 * (message_thread, settings_editor) is refused: a package page draws only its
 * own data, through the package nodes and the layout nodes. MEDIA-POLISH-01: a
 * split_view is a layout node; its children are checked like any other. */
export const PACKAGE_PAGE_NODE_TYPES: readonly string[] = ["page", "section", "empty_state", "progress", "answer_blocks", "picker", "search", "detail_pane", "tabs", "list", "media_shelf", "billboard", "player", "reader", "split_view"];

/** The role ladder, highest first; a page's `min_role` may only sit at or above the package's. */
export const ROLE_LADDER: readonly string[] = ["owner", "admin", "adult", "teen", "child", "guest"];

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

function checkAction(action: unknown, packageId: string, where: string, out: string[], allowPlay = false): void {
  if (!isObject(action)) return;
  const navigate = action.navigate;
  if (isObject(navigate) && typeof navigate.to === "string") {
    const base = `/apps/${packageId}`;
    const settings = `/settings/${packageId}`;
    const inside = (root: string) => navigate.to === root || (navigate.to as string).startsWith(`${root}/`);
    if (!inside(base) && !inside(settings)) out.push(`${where}: navigate.to "${navigate.to}" must stay under ${base} (or ${settings}, the app's own settings)`);
  }
  const call = action.call;
  if (isObject(call) && typeof call.target === "string" && !call.target.startsWith(`/api/plugins/${packageId}/`)) {
    out.push(`${where}: call.target "${call.target}" must stay under /api/plugins/${packageId}/`);
  }
  if (isObject(action.confirm)) checkAction(action.confirm.on_confirm, packageId, where, out, allowPlay);
  if (action.play !== undefined && !allowPlay) out.push(`${where}: the play action is not available on a package page`);
}

function checkBinding(bind: unknown, where: string, data: Map<string, AppDataEntry>, want: "blocks" | "rows" | "list", out: string[]): void {
  if (!isObject(bind)) { out.push(`${where}: needs a bind`); return; }
  if (bind.source !== "package") { out.push(`${where}: bind.source must be "package", not "${String(bind.source)}"`); return; }
  const path = typeof bind.path === "string" ? bind.path : "";
  const entry = data.get(path);
  if (!entry) { out.push(`${where}: bind.path "${path}" is not a contributes.data id of this package`); return; }
  if (want === "rows" && entry.rows === undefined) out.push(`${where}: data "${path}" returns blocks, not rows; a picker needs a data entry with "rows"`);
  if (want === "blocks" && entry.rows !== undefined) out.push(`${where}: data "${path}" returns rows, not blocks; an answer_blocks node needs a recipe data entry`);
  if (want === "list" && entry.rows !== "list") out.push(`${where}: data "${path}" must be a "rows": "list" entry (the package's own row route)`);
}

/** A field that names a picture must be a field path, never an address (a page never loads another site's picture). */
function checkFieldPath(value: unknown, where: string, field: string, out: string[]): void {
  if (typeof value === "string" && /^[a-z]+:|\/\//i.test(value)) out.push(`${where}: ${field} must be a field path, not an address`);
}

function walk(node: unknown, packageId: string, data: Map<string, AppDataEntry>, where: string, out: string[]): void {
  if (!isObject(node)) { out.push(`${where}: a node must be an object`); return; }
  const type = String(node.type);
  if (!PACKAGE_PAGE_NODE_TYPES.includes(type)) { out.push(`${where}: node type "${type}" is not allowed on a package page`); return; }
  if (type === "answer_blocks") {
    checkBinding(node.bind, `${where} answer_blocks`, data, "blocks", out);
    // NEWS-00: the actions map is the one place a package page may use `play` (Listen: the hub's own speech route).
    if (isObject(node.actions)) for (const [role, action] of Object.entries(node.actions)) checkAction(action, packageId, `${where} answer_blocks.actions.${role}`, out, role === "listen");
    // WEATHER-FIX-01: a stated-reason button may go to the app's own screens only.
    if (isObject(node.states)) for (const [reason, notice] of Object.entries(node.states)) {
      if (isObject(notice) && Array.isArray(notice.actions)) for (const action of notice.actions) checkAction(action, packageId, `${where} answer_blocks.states.${reason}`, out);
    }
  }
  if (type === "list") {
    checkBinding(node.bind, `${where} list`, data, "rows", out);
    if (isObject(node.row_action)) checkAction(node.row_action.action, packageId, `${where} list.row_action`, out);
    if (isObject(node.row_toggle)) checkAction(node.row_toggle.action, packageId, `${where} list.row_toggle`, out);
    if (typeof node.item_media_field === "string" && /^[a-z]+:|\/\//i.test(node.item_media_field)) out.push(`${where} list: item_media_field must be a field path, not an address`);
  }
  // MEDIA-PLAYER-01: the media nodes draw the package's own rows, and are the places a package page may hand an item to
  // the host's player (`play`): a shelf tile, a billboard button, the player's next item.
  if (type === "media_shelf") {
    checkBinding(node.bind, `${where} media_shelf`, data, "list", out);
    checkAction(node.on_select, packageId, `${where} media_shelf.on_select`, out, true);
    if (Array.isArray(node.row_actions)) node.row_actions.forEach((button, i) => isObject(button) && checkAction(button.action, packageId, `${where} media_shelf.row_actions[${i}]`, out, true));
    if (isObject(node.see_all)) checkAction(node.see_all.action, packageId, `${where} media_shelf.see_all`, out);
    checkFieldPath(node.item_media_field, `${where} media_shelf`, "item_media_field", out);
  }
  if (type === "billboard") {
    checkBinding(node.bind, `${where} billboard`, data, "list", out);
    if (isObject(node.primary)) checkAction(node.primary.action, packageId, `${where} billboard.primary`, out, true);
    if (Array.isArray(node.secondary)) node.secondary.forEach((b, i) => isObject(b) && checkAction(b.action, packageId, `${where} billboard.secondary[${i}]`, out, true));
    checkFieldPath(node.item_art_field, `${where} billboard`, "item_art_field", out);
  }
  if (type === "player") {
    checkBinding(node.bind, `${where} player`, data, "list", out);
    checkAction(node.on_progress, packageId, `${where} player.on_progress`, out);
    checkAction(node.on_next, packageId, `${where} player.on_next`, out, true);
    if (Array.isArray(node.actions)) node.actions.forEach((b, i) => isObject(b) && checkAction(b.action, packageId, `${where} player.actions[${i}]`, out));
  }
  if (type === "reader") {
    checkBinding(node.bind, `${where} reader`, data, "list", out);
    checkAction(node.on_locator, packageId, `${where} reader.on_locator`, out);
    checkAction(node.on_close, packageId, `${where} reader.on_close`, out);
    if (isObject(node.fields)) for (const [name, value] of Object.entries(node.fields)) checkFieldPath(value, `${where} reader.fields`, name, out);
  }
  if (type === "search") {
    if (node.recents !== undefined) checkBinding(node.recents, `${where} search.recents`, data, "rows", out);
    checkAction(node.submit, packageId, `${where} search.submit`, out);
    checkAction(node.clear_recents, packageId, `${where} search.clear_recents`, out);
  }
  if (type === "picker" && node.bind !== undefined) checkBinding(node.bind, `${where} picker`, data, "rows", out);
  if (isObject(node.empty_state)) checkAction(node.empty_state.action, packageId, where, out);
  if (type === "empty_state") checkAction(node.action, packageId, where, out);
  if (type === "tabs" && Array.isArray(node.tabs)) {
    const seen = new Set<string>();
    node.tabs.forEach((tab: unknown, i: number) => {
      if (!isObject(tab)) { out.push(`${where}/tabs[${i}]: a tab must be an object`); return; }
      const id = String(tab.id);
      if (seen.has(id)) out.push(`${where}/tabs[${i}]: tab id "${id}" is declared twice`);
      seen.add(id);
      if (Array.isArray(tab.body)) tab.body.forEach((kid, j) => walk(kid, packageId, data, `${where}/tabs[${i}]/body[${j}]`, out));
    });
  }
  const kids = type === "page" ? node.body : type === "section" ? node.children : type === "detail_pane" ? node.body : undefined;
  if (Array.isArray(kids)) kids.forEach((kid, i) => walk(kid, packageId, data, `${where}/${type}[${i}]`, out));
  if (type === "split_view") {
    for (const part of ["main", "aside"] as const) {
      const list = node[part];
      if (Array.isArray(list)) list.forEach((kid, i) => walk(kid, packageId, data, `${where}/split_view.${part}[${i}]`, out));
    }
    if (node.list !== undefined) walk(node.list, packageId, data, `${where}/split_view.list`, out);
    if (node.detail !== undefined) walk(node.detail, packageId, data, `${where}/split_view.detail`, out);
  }
}

/** NEWS-SIDEBAR-01: the sidebar's references must land on this package. Its search is the page `search` node and its rows and
 * actions are the page `package_binding` and `action`, so they run through the same checks a page's do (`walk`,
 * `checkBinding`, `checkAction`); on top, every `navigate` target names a page this package declares, every `{field}`
 * placeholder names a field the group declares, and a picture field is a field path, never an address. */
function checkSidebar(packageId: string, sidebar: AppSidebar, pageIds: Set<string>, data: Map<string, AppDataEntry>, out: string[]): void {
  const where = "contributes.sidebar";
  const page = (id: string, at: string): void => { if (!pageIds.has(id)) out.push(`${where}: ${at} names page "${id}", which this package does not declare`); };
  const target = (action: unknown, at: string, fields: ReadonlySet<string> | null): void => {
    checkAction(action, packageId, `${where}: ${at}`, out);
    if (!isObject(action) || !isObject(action.navigate)) return;
    const to = action.navigate.to;
    if (typeof to === "string") {
      const base = `/apps/${packageId}`;
      if (to === base) page("index", at);
      else if (to.startsWith(`${base}/`)) page(to.slice(base.length + 1).split("/")[0] ?? "", at);
    }
    if (fields && isObject(action.navigate.state)) {
      for (const value of Object.values(action.navigate.state)) {
        if (typeof value !== "string") continue;
        for (const match of value.matchAll(/\{([^}]+)\}/g)) if (!fields.has(match[1]!)) out.push(`${where}: ${at} placeholder {${match[1]}} names a field the group does not declare`);
      }
    }
  };
  if (sidebar.search !== undefined) {
    if (!isObject(sidebar.search) || sidebar.search.type !== "search") out.push(`${where}: search must be a search node`);
    else walk(sidebar.search, packageId, data, `${where} search`, out);
    target(isObject(sidebar.search) ? sidebar.search.submit : undefined, "search.submit", null);
  }
  const seen = new Set<string>();
  for (const group of sidebar.groups) {
    const at = `group "${group.id}"`;
    if (seen.has(group.id)) out.push(`${where}: ${at} is declared twice`);
    seen.add(group.id);
    if ((group.pages === undefined) === (group.rows === undefined)) out.push(`${where}: ${at} needs exactly one of pages and rows`);
    for (const id of group.pages ?? []) page(id, at);
    const rows = group.rows;
    if (!rows) continue;
    checkBinding(rows.bind, `${where}: ${at} rows`, data, "list", out);
    const fields = new Set([rows.item_key_field ?? "key", rows.item_label_field ?? "label", ...(rows.item_media_field ? [rows.item_media_field] : [])]);
    target(rows.open, `${at} open`, fields);
    if (rows.manage) target(rows.manage.open, `${at} manage`, fields);
    checkFieldPath(rows.item_media_field, `${where}: ${at}`, "rows.item_media_field", out);
  }
}

/** `loadPage(module)` returns the parsed `pages/<module>.json`, or undefined when the file is missing. `packageMinRole` is the manifest's own `min_role`; with it a page that lowers the floor is reported. */
export function checkAppPackage(packageId: string, contributes: AppContributes | undefined, loadPage: (module: string) => unknown, packageMinRole?: string): string[] {
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
    if (page.min_role !== undefined && packageMinRole !== undefined && ROLE_LADDER.includes(packageMinRole) && ROLE_LADDER.indexOf(page.min_role) > ROLE_LADDER.indexOf(packageMinRole)) {
      out.push(`page "${page.id}": min_role "${page.min_role}" is below the package's "${packageMinRole}"; a page may only raise the floor`);
    }
    if (page.kind !== undefined && page.kind !== "schema") out.push(`page "${page.id}": kind "${page.kind}" is refused; only "schema" pages are allowed`);
  }
  if (!ids.has("index")) out.push('an app needs one page with id "index"');
  const data = new Map<string, AppDataEntry>();
  for (const entry of dataList) {
    if (data.has(entry.id)) out.push(`data id "${entry.id}" is declared twice`);
    data.set(entry.id, entry);
    if (entry.rows === "places" && entry.surface === undefined) out.push(`data "${entry.id}": rows needs a surface`);
  }
  if (contributes?.sidebar) checkSidebar(packageId, contributes.sidebar, ids, data, out);
  for (const page of pages) {
    const doc = loadPage(page.module);
    const where = `pages/${page.module}.json`;
    if (doc === undefined) { out.push(`${where} is missing (page "${page.id}")`); continue; }
    if (!isObject(doc) || doc.type !== "page") { out.push(`${where} must be a page document`); continue; }
    walk(doc, packageId, data, where, out);
  }
  return out;
}
