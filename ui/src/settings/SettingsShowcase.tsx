// Showcase of the settings look (KIT-SET-01): the ChatGPT settings card as
// the kit's own parts draw it, with the additive settings variants. Home's
// UI showcase page mounts this entry; it takes no props and no data.
import { Fragment } from "react";
import { Button } from "@/kit/dashboard/components/ui/button";
import { Input } from "@/kit/dashboard/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/kit/dashboard/components/ui/item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/kit/dashboard/components/ui/select";
import { Switch } from "@/kit/dashboard/components/ui/switch";
import { i18n } from "@/kit/i18n";

type Row = {
  title: string;
  help: string;
  control: "switch-on" | "switch-off" | "select" | "change" | "input";
};

const rows = (): Row[] => [
  { title: i18n._({ id: "ui.Send photos in chat", message: "Send photos in chat" }), help: i18n._({ id: "ui.Let people in this home attach pictures to a message.", message: "Let people in this home attach pictures to a message." }), control: "switch-on" },
  { title: i18n._({ id: "ui.Show pictures in answers", message: "Show pictures in answers" }), help: i18n._({ id: "ui.Answers can include images found on the web. Turn this off to see text only, which also keeps the page quieter on a slow connection.", message: "Answers can include images found on the web. Turn this off to see text only, which also keeps the page quieter on a slow connection." }), control: "switch-off" },
  { title: i18n._({ id: "ui.Safe search", message: "Safe search" }), help: i18n._({ id: "ui.How strictly web results are filtered.", message: "How strictly web results are filtered." }), control: "select" },
  { title: i18n._({ id: "ui.Library folder", message: "Library folder" }), help: i18n._({ id: "ui.Where the reference library lives.", message: "Where the reference library lives." }), control: "change" },
  { title: i18n._({ id: "ui.Reply length", message: "Reply length" }), help: i18n._({ id: "ui.A number of words to aim for.", message: "A number of words to aim for." }), control: "input" },
];

function Control({ row }: { row: Row }) {
  switch (row.control) {
    case "switch-on":
      return <Switch size="md" defaultChecked aria-label={row.title} />;
    case "switch-off":
      return <Switch size="md" aria-label={row.title} />;
    case "select":
      return (
        <Select defaultValue="moderate">
          <SelectTrigger size="row" aria-label={row.title}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="moderate">{i18n._({ id: "ui.Moderate", message: "Moderate" })}</SelectItem>
            <SelectItem value="strict">{i18n._({ id: "ui.Strict", message: "Strict" })}</SelectItem>
          </SelectContent>
        </Select>
      );
    case "change":
      return (
        <>
          <span className="max-w-48 truncate font-mono text-[13px] text-settings-helper">/srv/library/reference</span>
          <Button variant="secondary" size="row">{i18n._({ id: "ui.Change", message: "Change" })}</Button>
        </>
      );
    case "input":
      return <Input size="row" className="w-24" defaultValue="200" aria-label={row.title} />;
  }
}

export function SettingsShowcase() {
  return (
    <section aria-label={i18n._({ id: "ui.Settings card", message: "Settings card" })} className="mx-auto flex w-full max-w-(--settings-content-max) flex-col gap-3">
      <h3 className="text-[length:var(--settings-section-heading-size)] font-medium">{i18n._({ id: "ui.Chat", message: "Chat" })}</h3>
      <ItemGroup variant="card">
        {rows().map((row, i) => (
          <Fragment key={row.title}>
            {i > 0 && <ItemSeparator variant="inset" />}
            <Item size="setting" className="flex-wrap sm:flex-nowrap">
              <ItemContent>
                <ItemTitle>{row.title}</ItemTitle>
                <ItemDescription clamp={false}>{row.help}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Control row={row} />
              </ItemActions>
            </Item>
          </Fragment>
        ))}
      </ItemGroup>
    </section>
  );
}
