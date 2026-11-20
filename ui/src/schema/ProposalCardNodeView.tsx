import { useContext, useEffect, useMemo, useRef } from "react";
import { AsyncState } from "@/kit/primitives/AsyncState";
import { ProposalCard, type ProposalAction, type ProposalPicture } from "@/kit/elements/proposal-card";
import { ConfirmDialog } from "@/kit/schema/ConfirmDialog";
import { useBinding } from "@/kit/schema/binding";
import { useDispatchAction } from "@/kit/schema/actions";
import { disabledWhen } from "@/kit/schema/condition";
import { readField } from "@/kit/schema/fieldPath";
import { localPicture } from "@/kit/schema/mediaPath";
import { PageStateContext } from "@/kit/schema/packageScope";
import type { ProposalButton, ProposalCardNode } from "@/kit/schema/types";

type Row = Record<string, unknown>;

const EMPTY: Row[] = [];
const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);

/** UI-BLOCKS-01: `proposal_card`. The first row of `bind` is the proposal and `pictures.bind` has its pictures. With `description_state` the
 * person edits the description; the edit lives in that page-state name (never in the address, SchemaPage's typed-state rule) and an action
 * reads it as `{<name>}`. The row's own description seeds the name, and a new one from the server (another guess) replaces an edit. */
export function ProposalCardNodeView({ node, state }: { node: ProposalCardNode; state: Row }) {
  const writer = useContext(PageStateContext);
  const query = useBinding<Row[]>(node.bind, state);
  const picturesQuery = useBinding<Row[]>(node.pictures.bind, state);
  const { dispatch, pendingConfirm, lastError } = useDispatchAction();
  const row = Array.isArray(query.data) ? query.data[0] : undefined;
  const pictureRows = Array.isArray(picturesQuery.data) ? picturesQuery.data : EMPTY;
  const f = node.pictures.item_fields;
  const pictures = useMemo(
    () =>
      pictureRows.flatMap((p, i): ProposalPicture[] => {
        const src = localPicture(readField(p, f.src));
        if (src === null) return [];
        const badge = f.badge ? readField(p, f.badge) : undefined;
        return [{
          id: String(i),
          src,
          alt: String(readField(p, f.alt) ?? ""),
          badge: badge === "from_photo" || badge === "guessed" ? badge : undefined,
          caption: f.caption ? str(readField(p, f.caption)) : undefined,
        }];
      }),
    [pictureRows, f],
  );

  const serverDescription = row ? String(readField(row, node.description) ?? "") : undefined;
  const name = node.description_state;
  const seeded = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!name || !writer || serverDescription === undefined || seeded.current === serverDescription) return;
    seeded.current = serverDescription;
    writer.merge({ [name]: serverDescription });
  }, [name, writer, serverDescription]);

  return (
    <AsyncState data={query.data} error={query.isError} isFetching={query.isFetching} onRetry={() => query.refetch()} errorLayout="row" isEmpty={() => false}>
      {() => {
        if (!row) return null;
        const editable = Boolean(name && writer);
        const edited = name && typeof state[name] === "string" ? (state[name] as string) : undefined;
        const description = edited ?? serverDescription ?? "";
        // An action reads the description as it stands (the edit, or the server's) under the state name, over the row's own fields.
        const item: Row = name ? { ...row, [name]: description } : row;
        const statusRaw = readField(row, node.status);
        const status = statusRaw === "making" || statusRaw === "saving" ? statusRaw : "ready";
        const action = (button: ProposalButton): ProposalAction => ({
          label: button.label,
          disabled: disabledWhen(button.disabled_when, name ? { ...state, [name]: description } : state),
          onSelect: () => dispatch(button.action, [item]),
        });
        return (
          <>
            <ProposalCard
              title={String(readField(row, node.title) ?? "")}
              description={description}
              onDescriptionChange={editable ? (value) => writer!.merge({ [name!]: value }) : undefined}
              pictures={pictures}
              status={status}
              approve={action(node.approve)}
              change={action(node.change)}
              discard={action(node.discard)}
              note={node.note ? str(readField(row, node.note)) : undefined}
              errorMessage={(node.error ? str(readField(row, node.error)) : undefined) ?? lastError ?? undefined}
            />
            {pendingConfirm ? <ConfirmDialog pendingConfirm={pendingConfirm} /> : null}
          </>
        );
      }}
    </AsyncState>
  );
}
