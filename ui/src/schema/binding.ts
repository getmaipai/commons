import { useContext } from "react";
import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { request } from "@/kit/http";
import type { Binding } from "@/kit/schema/types";
import {
  PackageScopeContext,
  PACKAGE_BINDING_REFUSED,
  reportPageRejected,
  resolveParams,
  underPluginApi,
} from "@/kit/schema/packageScope";

// `host` (a host.* RPC method, platform plan 4.9) has no page this
// session builds against it - People/Privacy/Settings stayed hand-
// written React (docs/dev.md's A2UI entry has the reasoning) and
// Memory's own real schema page only ever binds to `route`. Throwing
// here rather than silently no-oping: a page authored against `host`
// today would otherwise render an empty list with no signal that
// nothing was ever fetched.
//
// APP-KIND-02: inside a package page (PackageScopeContext) a binding reaches only
// that package: `source: "package"` is a POST to its own data route with `params` as
// the body, and a route binding must stay under `/api/plugins/<id>/`. Anything else is
// refused here, once, before any request is made. A `package` binding outside a
// package page has no package to ask and is refused the same way.
export function useBinding<T>(binding: Binding, state: Record<string, unknown> = {}): UseQueryResult<T> {
  if (binding.source === "host") {
    throw new Error(`kit/schema: binding.source "host" has no interpreter support yet (bound path: ${binding.path})`);
  }
  const scope = useContext(PackageScopeContext);
  const allowed = binding.source === "package" ? scope !== null : scope === null || underPluginApi(binding.path, scope.packageId);
  const resolved = binding.source === "package" ? resolveParams(binding.params, state) : null;
  // A refused binding gets its own key, so its error can never overwrite the entry
  // another page (Memory) holds under the real path.
  const key = !allowed
    ? ["schema-binding", "refused"]
    : binding.source === "package" && scope
      ? ["schema-binding", "package", scope.packageId, binding.path, resolved!.keyParams, resolved!.nonces]
      : ["schema-binding", binding.path];
  return useQuery<T>({
    queryKey: key,
    // A page whose state changes the request (a channel's key, a search's text) keeps showing what it had until the new answer
    // arrives, so the content never blanks to a skeleton and back.
    placeholderData: keepPreviousData,
    queryFn: () => {
      if (!allowed || (binding.source === "package" && !scope)) {
        reportPageRejected();
        throw new Error(PACKAGE_BINDING_REFUSED);
      }
      if (binding.source === "package") {
        return request<T>(`/api/plugins/${scope!.packageId}/data/${binding.path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(resolved!.body),
        });
      }
      return request<T>(binding.path);
    },
  });
}
