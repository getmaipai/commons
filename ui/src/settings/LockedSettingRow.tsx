import { Item } from "../dashboard/components/ui/item";
import { LockTile } from "@/kit/elements/adult-lock";

/**
 * ADULT-LOCK-01: the locked state of a settings row. A settings list that holds locked entries (the household's adult-only styles)
 * draws this ONE row after the open rows, whatever the number of locked entries: the lock tile in a row, with no label, help
 * text, value, switch or count. It sits in the same `ItemGroup` as `SettingRow` and takes the same row height.
 */
export function LockedSettingRow({ making = false, onUnlock }: { making?: boolean; onUnlock?: () => void }) {
  return (
    <Item size="setting" data-slot="locked-setting-row">
      <LockTile shape="row" making={making} onUnlock={onUnlock} />
    </Item>
  );
}
