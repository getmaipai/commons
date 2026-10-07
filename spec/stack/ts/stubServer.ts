import { ChatRoleContextSchema } from "./role-context.js";

const CHAT_CONTEXT = ChatRoleContextSchema.parse({
  context_length: 20480,
  context_per_slot: 20480,
  context_total: 40960,
  slots: 2,
  context_scope: "per slot",
});

/** Flat /stack/v1/roles response shared by the Stack API contract tests
 * and Home's role-health regression test. */
export const STACK_ROLES_STUB_BODY = {
  roles: [
    {
      id: "chat",
      label: "Chat",
      wire: "chat",
      residency: "resident",
      endpoints: ["/v1/chat/completions"],
      quality: ["fast", "everyday", "best"],
      sharesModelWith: null,
      state: { state: "ready", since: "2026-10-07T00:00:00Z" },
      reason: null,
      model: null,
      check: { state: "not checked", at: null, reason: null, stale: false },
      identity: { ok: true, expected: null, actual: null, reason: null },
      ...CHAT_CONTEXT,
      models: [],
      picture_tokens_max: null,
    },
  ],
};

/** Starts a real HTTP stub for the Stack roles route. */
export function startStubStackRolesServer(port = 0) {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port,
    fetch(request) {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/stack/v1/roles") {
        return Response.json(STACK_ROLES_STUB_BODY);
      }
      return Response.json({ error: `no stub route for ${request.method} ${url.pathname}` }, { status: 404 });
    },
  });
  return {
    url: `http://127.0.0.1:${server.port}`,
    stop: () => server.stop(true),
  };
}
