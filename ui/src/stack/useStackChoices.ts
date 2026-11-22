// STACK-MODELS-PAGE-01. The page's one hook: reads the Stack's choices through a `StackClient`, keeps them fresh while a download runs (and
// whenever the client's event feed says something changed, so a choice made in the other app shows at once), and wraps every write so a failure
// comes back as one plain sentence instead of a thrown error. TanStack Query holds the cache, but the hook brings its own QueryClient (one per
// client object), so a host needs no provider and the Stack admin page and Home both work unchanged.
import { QueryClient, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createQueryClient } from "@/kit/queryClient";
import { StackClientError, sentenceOf } from "./StackClient";
import type {
  StackAddModelBody, StackAddModelResult, StackCategoryId, StackChoiceCategory, StackClient, StackInstallStarted, StackLevel, StackOrderResult, StackPickBody, StackPickResult,
  StackRecommendedResult, StackRemoveResult, StackRemoved, StackUnused,
} from "./StackClient";
import { anyInstalling, movePriority } from "./stackLogic";
import { failedToRead, failedToSave } from "./stackWords";

/** The result of a write: the value, or the one sentence to show (the Stack's own when it sent one) and its stable code. */
export type Outcome<T> = { ok: true; value: T } | { ok: false; message: string; code: string | null };

export const STACK_CHOICES_KEY = ["stack", "choices"] as const;

const caches = new WeakMap<StackClient, QueryClient>();
function queryClientFor(client: StackClient): QueryClient {
  let found = caches.get(client);
  if (!found) {
    found = createQueryClient();
    caches.set(client, found);
  }
  return found;
}

export interface UseStackChoicesOptions {
  /** How often to ask again while a model is downloading. Default 2000; 0 turns polling off (tests). */
  pollMs?: number;
  /** A host's own QueryClient, when it wants one cache for everything. */
  queryClient?: QueryClient;
}

export function useStackChoices(client: StackClient, options: UseStackChoicesOptions = {}) {
  const pollMs = options.pollMs ?? 2000;
  const queryClient = options.queryClient ?? queryClientFor(client);
  const query = useQuery(
    {
      queryKey: STACK_CHOICES_KEY,
      queryFn: () => client.readChoices(),
      refetchInterval: (q) => (pollMs > 0 && q.state.data && anyInstalling(q.state.data.categories) ? pollMs : false),
    },
    queryClient,
  );
  useEffect(() => client.subscribe?.(() => { void queryClient.invalidateQueries({ queryKey: STACK_CHOICES_KEY }); }), [client, queryClient]);

  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set());
  const view = query.data;
  // The actions read the latest view through a ref, so their identity stays put while the view refreshes (a sheet that runs one in an effect must not re-run it on every poll).
  const latest = useRef(view);
  latest.current = view;

  const track = useCallback(async <T,>(key: string, work: () => Promise<T>, fallback: string, refresh = true): Promise<Outcome<T>> => {
    setBusy((current) => new Set(current).add(key));
    try {
      const value = await work();
      if (refresh) await queryClient.invalidateQueries({ queryKey: STACK_CHOICES_KEY });
      return { ok: true, value };
    } catch (error) {
      if (refresh) void queryClient.invalidateQueries({ queryKey: STACK_CHOICES_KEY });
      return { ok: false, message: sentenceOf(error, fallback), code: error instanceof StackClientError ? error.code : null };
    } finally {
      setBusy((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }, [queryClient]);

  const actions = useMemo(() => ({
    setRoleEnabled: (role: string, enabled: boolean) => track<void>(`role:${role}`, () => client.setRoleEnabled(role, enabled), failedToSave()),
    movePriority: (role: string, dir: -1 | 1) => {
      const rows = (latest.current?.categories ?? []).flatMap((c) => (c.role ? [{ role: c.role, priority: c.role_priority }] : []));
      const changes = movePriority(rows, role, dir);
      if (Object.keys(changes).length === 0) return Promise.resolve<Outcome<void>>({ ok: true, value: undefined });
      return track<void>(`priority:${role}`, () => client.setRolePriorities(changes), failedToSave());
    },
    choose: (category: StackCategoryId, level: StackLevel, body: StackPickBody) => track<StackPickResult>(`pick:${category}:${level}:${body.profile ?? ""}`, () => client.chooseModel(category, level, body), failedToSave()),
    saveOrder: (category: StackCategoryId, order: string[], off?: string[]) => track<StackOrderResult>(`order:${category}`, () => client.setOrder(category, { order, ...(off ? { off } : {}) }), failedToSave()),
    previewRecommended: () => track<StackRecommendedResult>("recommended:preview", () => client.recommended(true), failedToSave(), false),
    applyRecommended: () => track<StackRecommendedResult>("recommended", () => client.recommended(false), failedToSave()),
    install: (id: string) => track<StackInstallStarted>(`install:${id}`, () => client.installModel(id), failedToSave()),
    uninstall: (id: string) => track<StackRemoved>(`uninstall:${id}`, () => client.removeModel(id), failedToSave()),
    loadUnused: () => track<StackUnused>("unused:read", () => client.readUnused(), failedToRead(), false),
    removeUnused: (ids: string[], tidy: boolean) => track<StackRemoveResult>("unused:remove", () => client.removeUnused({ ids, tidy }), failedToSave()),
    addModel: (body: StackAddModelBody) => track<StackAddModelResult>("add-model", () => client.addModel(body), failedToSave()),
  }), [client, track]);

  const reload = useCallback(async () => { await queryClient.invalidateQueries({ queryKey: STACK_CHOICES_KEY }); }, [queryClient]);
  const categories: readonly StackChoiceCategory[] = view?.categories ?? [];
  return {
    view,
    categories,
    loading: query.isPending,
    /** The sentence to show when the read failed and there is nothing older to show. */
    error: query.isError ? sentenceOf(query.error, failedToRead()) : null,
    fetching: query.isFetching,
    busy,
    reload,
    ...actions,
  };
}

export type StackChoicesState = ReturnType<typeof useStackChoices>;
