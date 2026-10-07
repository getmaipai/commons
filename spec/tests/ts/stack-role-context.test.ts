import { afterEach, expect, test } from "bun:test";
import { ChatRoleContextSchema } from "../../stack/ts/role-context.js";
import { STACK_ROLES_STUB_BODY, startStubStackRolesServer } from "../../stack/ts/stubServer.js";

test("Stack roles stub keeps chat context flat and per-slot", () => {
  const chat = STACK_ROLES_STUB_BODY.roles[0]!;
  expect(ChatRoleContextSchema.parse(chat)).toMatchObject({
    context_length: 20480,
    context_per_slot: 20480,
    context_total: 40960,
    slots: 2,
    context_scope: "per slot",
  });
  expect("context" in chat).toBe(false);
});

let stop: (() => void) | undefined;
afterEach(() => { stop?.(); stop = undefined; });

test("Stack roles stub serves its flat body over HTTP", async () => {
  const server = startStubStackRolesServer(0);
  stop = server.stop;
  const response = await fetch(`${server.url}/stack/v1/roles`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(STACK_ROLES_STUB_BODY);
});
