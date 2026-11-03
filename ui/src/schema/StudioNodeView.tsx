import { AsyncState } from "@/kit/primitives/AsyncState";
import { TrackStudio } from "@/kit/elements/track-studio";
import { useBinding } from "@/kit/schema/binding";
import { readField } from "@/kit/schema/fieldPath";
import type { StudioNode } from "@/kit/schema/types";

type Row = Record<string, unknown>;

const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);

/** VIDEO-STUDIO-04 (K3): `studio`. Reads one clip row and hands the Element its lanes. A row whose `locked` path is true is set aside before
 * anything else is read: one lock tile, no lanes, no request. */
export function StudioNodeView({ node, state }: { node: StudioNode; state: Row }) {
  const query = useBinding<Row | Row[]>(node.bind, state);
  const row = Array.isArray(query.data) ? query.data[0] : query.data;
  return (
    <AsyncState data={query.data} error={query.isError} isFetching={query.isFetching} onRetry={() => query.refetch()} errorMessage="Could not open this clip." isEmpty={() => !row} emptyIcon="film" emptyText="Pick a clip to open it in the Studio.">
      {() => (row ? <StudioRow node={node} row={row} /> : null)}
    </AsyncState>
  );
}

function StudioRow({ node, row }: { node: StudioNode; row: Row }) {
  const f = node.fields ?? {};
  // A locked clip: ONE tile and nothing else is read (not the title, the poster or a single lane).
  if (readField(row, f.locked ?? "locked") === true) return <TrackStudio locked lockedMaking={readField(row, f.making ?? "making") === true} lanes={[]} />;
  return (
    <TrackStudio
      resetKey={String(readField(row, f.key ?? "id") ?? "clip")}
      title={str(readField(row, f.title ?? "title"))}
      poster={str(readField(row, f.poster ?? "poster"))}
      kind={node.kind}
      lanes={readField(row, f.lanes ?? "lanes")}
    />
  );
}
