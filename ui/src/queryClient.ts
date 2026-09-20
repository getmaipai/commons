import { QueryClient } from "@tanstack/react-query";

/** One factory, not a bare `new QueryClient()` at every call site: a
 * product's own hub/service is typically a local machine on the
 * household's own network, not a flaky public API, so TanStack Query's
 * default of three silent retries with exponential backoff before a
 * query ever reports `isError` just delays whatever retry UI the caller
 * already provides - a failure shows up once, immediately, with a real
 * "Try again" button, not several seconds of a silent spinner. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}
