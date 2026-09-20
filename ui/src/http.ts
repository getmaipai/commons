// The one fetch client the kit's own schema interpreter (kit/schema/
// binding.ts, kit/schema/actions.ts) and settings renderer build on: a
// `route`-sourced binding or a `call` action target a JSON page authors
// is just a path string, not a named product API method, so the
// interpreter needs the same request plumbing (credentials, timeout,
// error shape) directly rather than a product importing this indirectly.
// Every request is same-origin with the session cookie included -
// `credentials: "include"` is not optional.
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

// `timeoutMs` is opt-in, not a default: many calls (a long-running job
// poll, a multi-GB upload) are legitimately long by design, so a global
// fetch timeout would be wrong for them. `didTimeOut()` distinguishes
// this controller's own abort from a caller-supplied `init.signal`
// aborting for its own reason (a stopped run, an unmounted component) -
// both surface as the identical DOMException, so only the timer itself
// knows which one actually fired.
function withTimeout(timeoutMs: number | undefined): { signal: AbortSignal | undefined; clear: () => void; didTimeOut: () => boolean } {
  const controller = timeoutMs ? new AbortController() : undefined;
  let timedOut = false;
  const timer = controller
    ? setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs)
    : undefined;
  return {
    signal: controller?.signal,
    clear: () => {
      if (timer) clearTimeout(timer);
    },
    didTimeOut: () => timedOut,
  };
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

export async function request<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const { timeoutMs, ...rest } = init ?? {};
  const { signal, clear, didTimeOut } = withTimeout(timeoutMs);
  // Both signals matter when both are given: the timeout's own and a
  // caller-supplied one (a stopped run, an unmounted component) -
  // whichever fires first aborts the fetch.
  const combinedSignal = signal && rest.signal ? AbortSignal.any([signal, rest.signal]) : (signal ?? rest.signal);
  try {
    const res = await fetch(path, {
      ...rest,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...rest.headers },
      signal: combinedSignal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(body.error ?? res.statusText, res.status, body.code);
    }
    return body as T;
  } catch (err) {
    if (isAbortError(err)) {
      // Only the timeout's own abort is reported as a timeout - a
      // caller's own signal aborting (a deliberate cancellation) stays
      // a plain AbortError, not a misleading "timed out".
      if (didTimeOut()) throw new ApiError(`Timed out after ${(timeoutMs ?? 0) / 1000}s`, 0, "timeout");
      throw err;
    }
    throw err;
  } finally {
    clear();
  }
}
