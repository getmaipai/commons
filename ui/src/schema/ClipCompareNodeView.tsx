import { useContext, useEffect } from "react";
import { ClipCompare } from "@/kit/elements/clip-compare";
import { PageStateContext } from "@/kit/schema/packageScope";
import { localPicture } from "@/kit/schema/mediaPath";
import type { ClipCompareNode } from "@/kit/schema/types";

export function ClipCompareNodeView({ node, state }: { node: ClipCompareNode; state: Record<string, unknown> }) {
  const writer = useContext(PageStateContext);
  const mode = node.mode_state && (state[node.mode_state] === "wipe" || state[node.mode_state] === "side_by_side") ? state[node.mode_state] as "wipe" | "side_by_side" : node.mode;
  useEffect(() => { if (node.mode_state && state[node.mode_state] === undefined) writer?.merge({ [node.mode_state]: node.mode }); }, [node.mode_state, node.mode, state, writer]);
  const before = localPicture(node.before.src);
  const after = localPicture(node.after.src);
  if (!before || !after) return null;
  return <ClipCompare before={{ ...node.before, src: before }} after={{ ...node.after, src: after }} mode={mode} onModeChange={node.mode_state ? (next) => writer?.merge({ [node.mode_state!]: next }) : undefined} />;
}
