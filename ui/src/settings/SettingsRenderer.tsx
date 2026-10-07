import { Fragment, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, request } from "@/kit/http";
import type { SettingsKey } from "@maipai/spec/gen/ts/settings-key.js";
import type { ResolvedSetting } from "@/kit/settings/resolvedSetting";
import { groupSettings, sectionTitle, type SettingsGroup, type MergedSetting } from "@/kit/settings/groupSettings";
import { AsyncState } from "@/kit/primitives/AsyncState";
import { getIcon } from "@/kit/icons";
import { Alert, AlertDescription } from "../dashboard/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../dashboard/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader } from "../dashboard/components/ui/empty";
import { Item, ItemContent, ItemGroup, ItemSeparator, ItemTitle } from "../dashboard/components/ui/item";
import { SettingRow, type BeforeChange } from "./SettingRow";
import type { PersonOption } from "./PersonMultiSelect";
import { useSettingsHeadingLevel } from "./headingLevel";

interface SettingsRendererProps {
  scope: "household" | "person" | "device";
  /** The runtime scope string the API expects: "household",
   * "person:<id>", or "device:<id>" (lib/settings.ts's parseScope). */
  scopeValue: string;
  /** The rendering product's own identifier, matching a registry key's
   * `honoured_by` entries (e.g. "home", "stack") - a key not honoured by
   * this product is never shown, regardless of scope. */
  honouredBy: string;
  /** Case-insensitive substring match over label and help text. A group
   * with nothing matching renders nothing, and a match inside a folded
   * advanced key surfaces directly rather than hiding behind "Show N
   * advanced settings". */
  filter?: string;
  /** Render only the named `lives_in` group(s) (a second page embedding
   * just its own group, such as Storage). Omitted: every eligible group. */
  only?: readonly string[];
  /** Keep only these keys (every group), or per group in
   * `includeKeysByGroup`, which wins for a group it names. */
  includeKeys?: readonly string[];
  includeKeysByGroup?: Readonly<Record<string, readonly string[]>>;
  /** Show advanced keys without the "Show N advanced settings" fold. */
  expandAdvanced?: boolean;
  /** Replace a group's heading, by `lives_in` id. */
  titleOverrides?: Readonly<Record<string, string>>;
  /** Rows only: no heading and no card (the host supplies the frame). */
  plainRows?: boolean;
  /** Merge every shown group into one card under the first group's heading. */
  mergeGroups?: boolean;
  /** The household roster for a person multi-select; omitted, the control
   * reads `GET /api/people` itself. */
  people?: readonly PersonOption[];
  /** The per-key hook run before every write (see BeforeChange). */
  beforeChange?: BeforeChange;
  /** A key to scroll into view and focus once the rows have loaded (a
   * `#<key>` deep link). */
  focusKey?: string;
  /** The card title's heading level. Default: 2 inside a SettingsShell (its
   * page title is the h1), 3 on its own. */
  headingLevel?: 2 | 3;
}

// The registry never varies by which renderer is asking, so every instance
// shares one query: `staleTime: Infinity` since it is generated at build
// time (spec/settings/keys.json) and never changes while a household looks
// at the page.
const REGISTRY_QUERY_KEY = ["settings-registry"];
const ChevronDown = getIcon("chevron-down");

/** docs/SETTINGS.md's generic renderer, pointed at a scope: one card per
 * registry group (`lives_in`), one `SettingRow` per key, separated by
 * inset dividers, with a folded "Show N advanced settings" row once a
 * group has three or more advanced keys. Built from the shipped kit parts
 * only (Item, ItemGroup card, Switch, Select, Input, Button, Collapsible,
 * Alert, Empty). */
export function SettingsRenderer({
  scope,
  scopeValue,
  honouredBy,
  filter,
  only,
  includeKeys,
  includeKeysByGroup,
  expandAdvanced = false,
  titleOverrides = {},
  plainRows = false,
  mergeGroups = false,
  people,
  beforeChange,
  focusKey,
  headingLevel,
}: SettingsRendererProps) {
  const Heading = `h${useSettingsHeadingLevel(headingLevel)}` as "h2" | "h3";
  const queryClient = useQueryClient();
  // A person-scope render is always the viewer's own settings, so the id in
  // `person:<id>` is the viewer: dropped from a person multi-select.
  const selfPersonId = scope === "person" ? scopeValue.slice("person:".length) : undefined;
  const registryQuery = useQuery<SettingsKey[]>({
    queryKey: REGISTRY_QUERY_KEY,
    queryFn: () => request<SettingsKey[]>("/api/settings/registry"),
    staleTime: Infinity,
  });
  const valuesQuery = useQuery<ResolvedSetting[]>({
    queryKey: ["settings-values", scopeValue],
    queryFn: () => request<ResolvedSetting[]>(`/api/settings?scope=${encodeURIComponent(scopeValue)}`),
  });

  const [writeError, setWriteError] = useState<string | null>(null);
  const [writeSaved, setWriteSaved] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState<Record<string, boolean>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef<string | null>(null);

  function replaceValue(next: ResolvedSetting) {
    queryClient.setQueryData<ResolvedSetting[]>(["settings-values", scopeValue], (prev) =>
      (prev ?? []).map((v) => (v.key === next.key ? next : v)),
    );
  }

  // Returns whether the write actually landed so the row can revert a
  // rejected draft (resolved.value never changes on failure).
  async function handleChange(key: string, value: unknown): Promise<boolean> {
    setPendingKey(key);
    setWriteError(null);
    setWriteSaved(false);
    try {
      const updated = await request<ResolvedSetting>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ scope: scopeValue, key, value }),
      });
      replaceValue(updated);
      setWriteSaved(true);
      return true;
    } catch (e) {
      setWriteError(e instanceof ApiError ? e.message : "Could not save that change.");
      return false;
    } finally {
      setPendingKey(null);
    }
  }

  async function handleReset(key: string) {
    setPendingKey(key);
    setWriteError(null);
    setWriteSaved(false);
    try {
      const restored = await request<ResolvedSetting>("/api/settings/reset", {
        method: "POST",
        body: JSON.stringify({ scope: scopeValue, key }),
      });
      replaceValue(restored);
      setWriteSaved(true);
    } catch (e) {
      setWriteError(e instanceof ApiError ? e.message : "Could not reset that setting.");
    } finally {
      setPendingKey(null);
    }
  }

  const error = registryQuery.isError || valuesQuery.isError;
  const data =
    registryQuery.data && valuesQuery.data ? { registry: registryQuery.data, values: valuesQuery.data } : undefined;

  // A `#<key>` deep link: once the rows exist, scroll to the key's row and
  // focus its first control, once per key.
  useEffect(() => {
    if (!focusKey || !data || focusedRef.current === focusKey) return;
    const row = rootRef.current?.querySelector<HTMLElement>(`[data-setting-key="${CSS.escape(focusKey)}"]`);
    if (!row) return;
    focusedRef.current = focusKey;
    row.scrollIntoView?.({ block: "center" });
    row.querySelector<HTMLElement>("input, button, [role=switch], [role=combobox]")?.focus();
  });

  function renderRow(s: MergedSetting) {
    return (
      <SettingRow
        key={s.def.key}
        setting={s}
        onChange={(v) => handleChange(s.def.key, v)}
        onReset={() => handleReset(s.def.key)}
        disabled={pendingKey === s.def.key}
        selfPersonId={selfPersonId}
        people={people}
        beforeChange={beforeChange}
      />
    );
  }

  function renderRows(rows: MergedSetting[]) {
    return rows.map((s, i) => (
      <Fragment key={s.def.key}>
        {i > 0 ? <ItemSeparator variant="inset" /> : null}
        {renderRow(s)}
      </Fragment>
    ));
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-4">
      {writeError ? (
        <Alert variant="destructive">
          <AlertDescription>{writeError}</AlertDescription>
        </Alert>
      ) : null}
      {writeSaved ? <p role="status">Saved.</p> : null}
      <AsyncState
        data={data}
        error={error}
        isFetching={registryQuery.isFetching || valuesQuery.isFetching}
        onRetry={() => {
          // Only the query that actually failed (the registry succeeds
          // once and never needs retrying again).
          if (registryQuery.isError) registryQuery.refetch();
          if (valuesQuery.isError) valuesQuery.refetch();
        }}
        errorMessage="Could not load settings."
        loadingLabel="Loading settings"
      >
        {({ registry, values }) => {
          const needle = filter?.trim().toLowerCase();
          const matches = (s: MergedSetting) =>
            !needle || s.def.label.toLowerCase().includes(needle) || (s.def.help?.toLowerCase().includes(needle) ?? false);
          const allGroups: SettingsGroup[] = groupSettings(registry, values, scope, honouredBy);
          let groups = (only ? allGroups.filter((g) => only.includes(g.id)) : allGroups)
            .map((group) => {
              const keys = includeKeysByGroup?.[group.id] ?? includeKeys;
              const keep = (s: MergedSetting) => (!keys || keys.includes(s.def.key)) && matches(s);
              return { ...group, basic: group.basic.filter(keep), advanced: group.advanced.filter(keep) };
            })
            .filter((g) => g.basic.length + g.advanced.length > 0);
          if (mergeGroups && groups.length > 1) {
            const first = groups[0]!;
            groups = [
              {
                ...first,
                basic: groups.flatMap((g) => g.basic),
                advanced: groups.flatMap((g) => g.advanced),
                foldAdvanced: false,
              },
            ];
          }
          if (groups.length === 0) {
            return (
              <Empty>
                <EmptyHeader>
                  <EmptyDescription>{needle ? "No settings match that search." : "No settings yet."}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            );
          }
          return (
            <div className="flex flex-col gap-14">
              {groups.map((group) => {
                const folded = group.foldAdvanced && !expandAdvanced && !needle;
                // A `#<key>` deep link to a folded advanced key opens its fold.
                const open = Boolean(advancedOpen[group.id]) || (focusKey !== undefined && group.advanced.some((a) => a.def.key === focusKey));
                const card = (
                  <ItemGroup variant={plainRows ? undefined : "card"}>
                    {renderRows(group.basic)}
                    {group.advanced.length > 0 ? (
                      folded ? (
                        <Collapsible open={open} onOpenChange={(next) => setAdvancedOpen((prev) => ({ ...prev, [group.id]: next }))}>
                          {group.basic.length > 0 ? <ItemSeparator variant="inset" /> : null}
                          <CollapsibleTrigger
                            render={<Item size="setting" render={<button type="button" />} className="w-full cursor-pointer text-left" />}
                          >
                            <ItemContent>
                              <ItemTitle className="text-muted-foreground">
                                {open ? "Hide" : "Show"} {group.advanced.length} advanced settings
                              </ItemTitle>
                            </ItemContent>
                            <ChevronDown aria-hidden className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <ItemSeparator variant="inset" />
                            {renderRows(group.advanced)}
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <>
                          {group.basic.length > 0 ? <ItemSeparator variant="inset" /> : null}
                          {renderRows(group.advanced)}
                        </>
                      )
                    ) : null}
                  </ItemGroup>
                );
                return (
                  <section key={group.id} id={`settings-${group.id}`} aria-label={titleOverrides[group.id] ?? sectionTitle(group.id)} className="flex flex-col gap-3">
                    {plainRows ? null : (
                      <Heading className="text-[length:var(--settings-section-heading-size)] font-medium">
                        {titleOverrides[group.id] ?? sectionTitle(group.id)}
                      </Heading>
                    )}
                    {card}
                  </section>
                );
              })}
            </div>
          );
        }}
      </AsyncState>
    </div>
  );
}
