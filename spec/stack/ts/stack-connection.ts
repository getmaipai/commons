// Hand-written Zod mirror of ../schemas/stack-connection.schema.json (STACK-CONNECTIONS-01).
import { z } from "zod";

export const StackConnectionKind = z.enum(["home", "mcp"]);
export const StackConnectionReach = z.enum(["this_computer", "home_network", "tailscale", "command", "url"]);
export const StackConnectionState = z.enum(["connected", "not_seen_lately", "paused", "not_tested"]);
export const StackConnectionEndpoint = z.discriminatedUnion("type", [
  z.object({ type: z.literal("command"), command: z.string().min(1), args: z.array(z.string()).optional() }).strict(),
  z.object({ type: z.literal("url"), url: z.string().url().regex(/^https?:\/\//) }).strict(),
]);
export const StackConnectionTool = z.object({ name: z.string().min(1), description: z.string().optional() }).strict();

const date = z.string().datetime({ offset: true });
export const StackConnection = z.object({
  id: z.string().regex(/^conn_[a-z0-9]{6,}$/),
  kind: StackConnectionKind,
  name: z.string().min(1).max(60),
  reach: StackConnectionReach,
  state: StackConnectionState,
  last_seen_at: date.nullable().optional(),
  last_used_at: date.nullable().optional(),
  paired_at: date.nullable().optional(),
  key_fingerprint: z.string().regex(/^SHA256:[A-Za-z0-9+/]{43}$/).nullable().optional(),
  endpoint: StackConnectionEndpoint.optional(),
  tools: z.array(StackConnectionTool).optional(),
  secret_ref: z.string().regex(/^secret_[a-z0-9]{6,}$/).nullable().optional(),
  created_at: date,
  provenance: z.string().min(1),
  hlc: z.string().regex(/^[0-9]+:[0-9]+:[a-z0-9]{6,}$/),
}).strict().superRefine((value, ctx) => {
  const bad = (message: string) => ctx.addIssue({ code: "custom", message });
  if (value.kind === "mcp") {
    if (!value.endpoint) bad("an mcp connection needs an endpoint");
    if (!value.tools) bad("an mcp connection needs a tools list (empty until tested)");
    if (value.reach !== "command" && value.reach !== "url") bad("an mcp connection reaches by command or url");
  } else {
    if (value.endpoint || value.tools || value.secret_ref !== undefined) bad("a home connection has no endpoint, tools or secret_ref");
    if (value.reach === "command" || value.reach === "url") bad("a home connection reaches by this_computer, home_network or tailscale");
    if (value.state === "not_tested") bad("a home connection is never not_tested");
  }
});
export type StackConnection = z.infer<typeof StackConnection>;
