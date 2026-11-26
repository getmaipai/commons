// STACK-LICENCE-01. The model-licence card of the shared AI and models page. One acceptance covers every model the Stack installs, so the card
// shows each licence as a link with its plain summary points, offers one primary action, and afterwards keeps only the quiet line saying when it was
// accepted. Kit primitives and tokens only; every sentence goes through `i18n._` (I18N-K1).
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/kit/ui/button";
import { Card } from "@/kit/ui/card";
import { i18n, kitLocaleTag } from "@/kit/i18n";
import { sentenceOf } from "./StackClient";
import type { StackLicences as StackLicencesView, StackLicencesClient } from "./StackClient";

const fallback = () => i18n._({ id: "ui.That could not be saved. Try again.", message: "That could not be saved. Try again." });

/** The accepted date in the person's own locale and calendar; the raw ISO stamp is never shown. */
function acceptedOn(iso: string | null): string {
  if (!iso) return "";
  try { return new Intl.DateTimeFormat(kitLocaleTag(), { dateStyle: "medium" }).format(new Date(iso)); }
  catch { return iso; }
}

export function StackLicences({ client, onAccepted }: { client: StackLicencesClient; /** Called after a successful accept so the host can refresh what it read alongside the licences (the choices, and their "licence needed" markers). */ onAccepted?: () => void }) {
  const [data, setData] = useState<StackLicencesView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => { setData(await client.read()); }, [client]);
  useEffect(() => { void refresh().catch(() => undefined); }, [refresh]);

  async function accept() {
    setBusy(true); setError("");
    // The POST answers with the same payload, and the card reads once more so what it shows is what the Stack now holds.
    try { setData(await client.accept()); await refresh().catch(() => undefined); onAccepted?.(); }
    catch (cause) { setError(sentenceOf(cause, fallback())); }
    finally { setBusy(false); }
  }

  if (!data) return null;

  // Accepted: one muted line, nothing else. The card does not come back until the Stack raises the terms version.
  if (data.accepted) {
    return <p className="min-w-0 break-words text-sm text-muted-foreground" data-testid="licences-accepted">{i18n._({ id: "ui.Licences accepted on {date}.", message: "Licences accepted on {date}.", values: { date: acceptedOn(data.accepted_at) } })}</p>;
  }

  return (
    <section aria-labelledby="stack-licences-heading" className="flex min-w-0 flex-col gap-3" data-testid="licences-card">
      <Card className="gap-0 py-0">
        <div className="flex min-w-0 flex-col gap-3 p-4">
          <h3 id="stack-licences-heading" className="text-base font-semibold">{i18n._({ id: "ui.Model licences", message: "Model licences" })}</h3>
          <p className="min-w-0 break-words text-sm text-muted-foreground">{i18n._({ id: "ui.Some models come with the maker's licence. Read them once and accept, and every model can then be installed.", message: "Some models come with the maker's licence. Read them once and accept, and every model can then be installed." })}</p>
          <ul className="flex min-w-0 flex-col gap-2" aria-label={i18n._({ id: "ui.Licences", message: "Licences" })}>
            {data.licences.map((licence) => (
              <li key={licence.id} className="flex min-w-0 flex-col gap-0.5">
                <a href={licence.url} target="_blank" rel="noopener noreferrer" className="w-fit break-words text-sm underline-offset-4 hover:underline">{licence.name}</a>
                <ul className="flex min-w-0 flex-col gap-0.5" aria-label={i18n._({ id: "ui.What the {licence} licence says", message: "What the {licence} licence says", values: { licence: licence.name } })}>
                  {licence.summary.map((point) => <li key={point} className="min-w-0 break-words text-sm text-muted-foreground">{point}</li>)}
                </ul>
              </li>
            ))}
          </ul>
          {error && <p role="alert" className="min-w-0 break-words text-sm text-destructive">{error}</p>}
          <Button className="w-fit" disabled={busy} onClick={() => { void accept(); }}>{busy ? i18n._({ id: "ui.Accepting", message: "Accepting" }) : i18n._({ id: "ui.I have read and accept the licences of the models the Stack installs", message: "I have read and accept the licences of the models the Stack installs" })}</Button>
        </div>
      </Card>
    </section>
  );
}
