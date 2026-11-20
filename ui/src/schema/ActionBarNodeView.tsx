import { useContext, useRef } from "react";
import { AsyncState } from "@/kit/primitives/AsyncState";
import { ActionBar, type ActionBarAction } from "@/kit/elements/action-bar";
import { ConfirmDialog } from "@/kit/schema/ConfirmDialog";
import { useBinding } from "@/kit/schema/binding";
import { useDispatchAction } from "@/kit/schema/actions";
import { disabledWhen } from "@/kit/schema/condition";
import { readField } from "@/kit/schema/fieldPath";
import { PageStateContext } from "@/kit/schema/packageScope";
import type { ActionBarButton, ActionBarNode } from "@/kit/schema/types";

type Row = Record<string, unknown>;

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() !== "" ? v : undefined);

/** UI-BLOCKS-01: `action_bar`, with no `bind` (the buttons only) or with one (the first row words the estimate and the reason). */
export function ActionBarNodeView({ node, state }: { node: ActionBarNode; state: Row }) {
  return node.bind ? <BoundActionBar node={node} state={state} bind={node.bind} /> : <Bar node={node} state={state} row={undefined} waiting={false} />;
}

function BoundActionBar({ node, state, bind }: { node: ActionBarNode; state: Row; bind: NonNullable<ActionBarNode["bind"]> }) {
  const query = useBinding<Row[]>(bind, state);
  if (query.data === undefined && query.isError) {
    return <AsyncState data={null} error isFetching={query.isFetching} onRetry={() => query.refetch()} errorLayout="row">{() => null}</AsyncState>;
  }
  if (Array.isArray(query.data) && query.data.length === 0) return null;
  const row = Array.isArray(query.data) ? query.data[0] : undefined;
  // While the first answer is on its way the reason is not known, so the primary action waits.
  return <Bar node={node} state={state} row={row} waiting={query.data === undefined} />;
}

function Bar({ node, state, row, waiting }: { node: ActionBarNode; state: Row; row: Row | undefined; waiting: boolean }) {
  const writer = useContext(PageStateContext);
  const { dispatch, pendingConfirm, lastError } = useDispatchAction();
  // A press is answered at once, before the page state has re-rendered, so a second press in the same breath is dropped here.
  const pressed = useRef(false);
  // The first row's own fields and the page state both fill `{placeholders}`; the row wins.
  const item: Row = { ...state, ...row };

  const action = (button: ActionBarButton | undefined, extraOff: boolean): ActionBarAction | undefined => {
    if (!button) return undefined;
    const busy = Boolean(button.busy_state && state[button.busy_state]);
    return {
      label: button.label,
      busy,
      busyLabel: button.busy_label,
      disabled: extraOff || disabledWhen(button.disabled_when, state),
      onSelect: () => {
        if (pressed.current) return;
        // A `confirm` has no end to wait for until the person answers, so it never sets the busy name.
        const name = "confirm" in button.action ? undefined : button.busy_state;
        if (name) { pressed.current = true; writer?.merge({ [name]: true }); }
        dispatch(button.action, [item], () => {
          pressed.current = false;
          if (name) writer?.merge({ [name]: undefined });
        });
      },
    };
  };
  const primary = action(node.primary, waiting)!;
  const reason = row && node.reason ? str(readField(row, node.reason)) : undefined;
  const estimate = row && node.estimate ? str(readField(row, node.estimate)) : undefined;
  return (
    <>
      <ActionBar primary={primary} secondary={action(node.secondary, false)} estimate={estimate} reason={reason} sticky={node.sticky !== false} />
      {lastError ? <p role="alert" className="text-destructive px-4 text-sm">{lastError}</p> : null}
      {pendingConfirm ? <ConfirmDialog pendingConfirm={pendingConfirm} /> : null}
    </>
  );
}
