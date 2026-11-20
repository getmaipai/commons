"use client";

// K3 story: the ProposalCard in every state (matches a photo, guessed, editing, making, saving, busy and disabled
// actions, error), for a check at 375 and desktop in both themes. Fictional pictures and persona names only.
import { useState, type ReactNode } from "react";
import { ProposalCard, type ProposalPicture } from "./proposal-card";
import { i18n } from "@/kit/i18n";

function picture(shape: "sun" | "hill" | "dot", opacity: number): string {
  const hue = shape === "sun" ? 25 : shape === "hill" ? 140 : 250;
  const fg = `hsl(${hue + 15} 45% 75%)`;
  const body = shape === "sun" ? `<circle cx="150" cy="90" r="48" fill="${fg}" fill-opacity="${opacity + 0.4}"/><rect y="200" width="320" height="120" fill="${fg}" fill-opacity="${opacity + 0.2}"/>`
    : shape === "hill" ? `<path d="M0 220 Q90 120 180 210 T320 190 V320 H0Z" fill="${fg}" fill-opacity="${opacity + 0.4}"/>`
      : `<circle cx="160" cy="160" r="90" fill="${fg}" fill-opacity="${opacity + 0.4}"/><circle cx="210" cy="120" r="26" fill="${fg}" fill-opacity="${opacity + 0.2}"/>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="hsl(${hue} 35% 40%)"/>${body}</svg>`);
}

// Sample words live in plain constants: they are story data, not kit text.
const NAME = { juniper: "Juniper", atlas: "Atlas", willow: "Willow", sage: "Sage" };
const WORDS = {
  front: "Front",
  atlas: "A tall figure in a long grey coat, drawn from the words you gave.",
  atlasShort: "A tall figure in a long grey coat.",
  willow: "A small figure with a wide straw hat.",
  sage: "A calm figure in a blue scarf.",
  coat: "Juniper wears a green raincoat.",
  useThis: "Use this look",
};

const FROM_PHOTO: ProposalPicture[] = [
  { id: "front", src: picture("sun", 0.5), alt: "Juniper facing front", badge: "from_photo", caption: WORDS.front },
  { id: "side", src: picture("hill", 0.45), alt: "Juniper from the side", badge: "from_photo" },
  { id: "back", src: picture("dot", 0.4), alt: "Juniper from behind", badge: "guessed" },
  { id: "walk", src: picture("hill", 0.3), alt: "Juniper walking", badge: "guessed" },
];
const GUESSED: ProposalPicture[] = FROM_PHOTO.slice(0, 3).map((p, index) => ({ ...p, id: `g${index}`, badge: "guessed" as const, alt: p.alt.replace("Juniper", "Atlas") }));
const NOTE = "A match shows the look is close to your photo. It does not prove who is in it.";
const noop = () => {};

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-sm font-medium text-muted-foreground">{children}</h2>;
}

export function ProposalCardShowcase() {
  const [description, setDescription] = useState("Juniper wears a green raincoat and carries a small lantern. Short dark hair, a kind face.");
  return (
    <div className="grid max-w-5xl gap-6 p-6 lg:grid-cols-2">
      <div>
        <Heading>{i18n._({ id: "ui.Ready, with an editable description", message: "Ready, with an editable description" })}</Heading>
        <ProposalCard title={NAME.juniper} description={description} onDescriptionChange={setDescription} pictures={FROM_PHOTO} note={NOTE}
          approve={{ onSelect: noop }} change={{ onSelect: noop }} discard={{ onSelect: noop }} />
      </div>
      <div>
        <Heading>{i18n._({ id: "ui.Guessed, with a changed label", message: "Guessed, with a changed label" })}</Heading>
        <ProposalCard title={NAME.atlas} description={WORDS.atlas} pictures={GUESSED}
          approve={{ label: WORDS.useThis, onSelect: noop }} change={{ onSelect: noop }} discard={{ onSelect: noop }} />
      </div>
      <div>
        <Heading>{i18n._({ id: "ui.Making the pictures", message: "Making the pictures" })}</Heading>
        <ProposalCard title={NAME.willow} description={WORDS.willow} pictures={[]} status="making" onDescriptionChange={noop}
          approve={{ onSelect: noop }} change={{ onSelect: noop }} discard={{ onSelect: noop }} />
      </div>
      <div>
        <Heading>{i18n._({ id: "ui.Saving", message: "Saving" })}</Heading>
        <ProposalCard title={NAME.sage} description={WORDS.sage} pictures={GUESSED.slice(0, 2)} status="saving" onDescriptionChange={noop}
          approve={{ onSelect: noop, busy: true }} change={{ onSelect: noop }} discard={{ onSelect: noop }} />
      </div>
      <div>
        <Heading>{i18n._({ id: "ui.Actions busy and disabled", message: "Actions busy and disabled" })}</Heading>
        <ProposalCard title={NAME.juniper} description={WORDS.coat} pictures={FROM_PHOTO.slice(0, 2)}
          approve={{ onSelect: noop, disabled: true }} change={{ onSelect: noop, busy: true }} discard={{ onSelect: noop, disabled: true }} />
      </div>
      <div>
        <Heading>{i18n._({ id: "ui.Error", message: "Error" })}</Heading>
        <ProposalCard title={NAME.atlas} description={WORDS.atlasShort} pictures={[]} errorMessage="MaiPai could not make the pictures. Press Try another guess to try again."
          approve={{ onSelect: noop }} change={{ onSelect: noop }} discard={{ onSelect: noop }} />
      </div>
    </div>
  );
}
