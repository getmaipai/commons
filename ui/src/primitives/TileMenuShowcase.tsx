import { DropdownMenuItem } from "@/kit/ui/dropdown-menu";
import { getIcon } from "@/kit/icons";
import { MediaShelf } from "./MediaShelf";

const d = (s: string) => s;
const items = [
  { id: "one", title: d("A quiet morning") },
  { id: "two", title: d("The long way home") },
];
const ActionMenu = () => {
  const Save = getIcon("bookmark");
  const Play = getIcon("play");
  const Remove = getIcon("trash");
  return <>
    <DropdownMenuItem><Save aria-hidden="true" />{d("Save")}</DropdownMenuItem>
    <DropdownMenuItem><Play aria-hidden="true" />{d("Play")}</DropdownMenuItem>
    <DropdownMenuItem><Remove aria-hidden="true" />{d("Remove")}</DropdownMenuItem>
  </>;
};

export function TileMenuShowcase() {
  const renderItem = (item: typeof items[number]) => <div className="flex h-full items-end rounded-xl bg-gradient-to-br from-primary/60 via-accent to-muted p-3 font-medium text-foreground">{item.title}</div>;
  return <div className="flex flex-col gap-6">
    <MediaShelf items={items} getKey={(item) => item.id} getLabel={(item) => item.title} variant="plain" layout="grid" aspect="square" renderItem={renderItem} renderMenu={() => <ActionMenu />} />
    <MediaShelf items={items} getKey={(item) => item.id} variant="plain" layout="rail" renderItem={renderItem} renderMenu={() => <ActionMenu />} />
  </div>;
}
