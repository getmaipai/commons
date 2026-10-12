import { Button } from "../dashboard/components/ui/button";
import { Checkbox } from "../dashboard/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../dashboard/components/ui/table";

export interface OptionMatrixRow {
  id: string;
  label: string;
  /** One plain sentence on what the row does; read out with the row label. */
  does?: string;
  /** A short plain line under the row, such as who set this row ("Set by Jordan"). */
  note?: string;
  /** Text of the button that puts this row back to its default ("Back to Teen"). Absent: no button on this row. */
  resetLabel?: string;
}

export interface OptionMatrixColumn {
  key: string;
  label: string;
  /** Row ids ticked in this column. */
  value: readonly string[];
  /** Row ids ticked and locked in this column (shown checked, cannot change). */
  locked: readonly string[];
  /** Row ids not offered to this audience: shown unchecked and disabled, never writable. */
  unavailable?: readonly string[];
}

interface OptionMatrixProps {
  rowsLabel: string;
  rows: readonly OptionMatrixRow[];
  columns: readonly OptionMatrixColumn[];
  /** The plain reason a locked box cannot change; shown once under the grid. */
  lockedNote?: string;
  /** The plain reason a box is unavailable; shown once under the grid. */
  unavailableNote?: string;
  onToggle: (columnKey: string, rowId: string, checked: boolean) => void;
  /** Called when a row's reset button (its `resetLabel`) is pressed. */
  onReset?: (rowId: string) => void;
  disabled?: boolean;
}

/** A grid of tick boxes: a row per option, a column per audience. Composed
 * from the shipped Table and Checkbox only. */
export function OptionMatrix({ rowsLabel, rows, columns, lockedNote, unavailableNote, onToggle, onReset, disabled }: OptionMatrixProps) {
  const anyLocked = columns.some((c) => c.locked.length > 0);
  const anyUnavailable = columns.some((c) => (c.unavailable?.length ?? 0) > 0);
  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{rowsLabel}</TableHead>
            {columns.map((c) => (
              <TableHead key={c.key} className="text-center">{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-normal">
                <span className="font-medium">{row.label}</span>
                {row.does ? <span className="block text-muted-foreground">{row.does}</span> : null}
                {row.note ? <span className="block text-muted-foreground">{row.note}</span> : null}
                {row.resetLabel && onReset ? (
                  <Button type="button" variant="link" size="xs" disabled={disabled} onClick={() => onReset(row.id)}>
                    {row.resetLabel}
                  </Button>
                ) : null}
              </TableCell>
              {columns.map((c) => {
                const isLocked = c.locked.includes(row.id);
                const isUnavailable = c.unavailable?.includes(row.id) ?? false;
                return (
                  <TableCell key={c.key} className="text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        aria-label={`${row.label} for ${c.label}`}
                        checked={!isUnavailable && (isLocked || c.value.includes(row.id))}
                        disabled={disabled || isLocked || isUnavailable}
                        onCheckedChange={(next) => onToggle(c.key, row.id, next)}
                      />
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {anyLocked && lockedNote ? <p className="px-2 pb-2 text-sm text-muted-foreground">{lockedNote}</p> : null}
      {anyUnavailable && unavailableNote ? <p className="px-2 pb-2 text-sm text-muted-foreground">{unavailableNote}</p> : null}
    </div>
  );
}
