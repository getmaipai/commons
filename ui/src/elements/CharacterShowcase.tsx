import { CharacterTile } from "@/kit/primitives/CharacterTile";
import { CharacterHero } from "@/kit/elements/character-hero";
import { CompanionCard } from "@/kit/elements/companion-card";
import { CompanionProfileHeader } from "@/kit/elements/companion-profile-header";
import { ChatHeader } from "@/kit/elements/chat-header";
import { Button } from "@/kit/ui/button";
import { icons } from "@/kit/icons";

export function CharacterShowcase() {
  const Talk = icons["message-circle"];
  const Call = icons.smartphone;
  const More = icons["more-horizontal"];
  return <div className="grid gap-8 p-6">
    <div className="flex gap-6"><CharacterTile name="Marlow" selected line="Ready" /><CharacterTile name="Add character" variant="add" /></div>
    <CharacterHero name="Marlow" line="Here for a chat" actions={<><Button variant="ghost" size="icon" aria-label="Talk"><Talk /></Button><Button variant="ghost" size="icon" aria-label="Call"><Call /></Button><Button variant="ghost" size="icon" aria-label="More actions"><More /></Button></>} />
    <CompanionCard name="Marlow" line="A thoughtful companion for your everyday questions." status="Ready" meta="Choose a conversation to get started" actions={<Button>Chat</Button>} />
    <CompanionProfileHeader name="Marlow" eyebrow="Built-in companion" line="Here for a chat" actions={<Button>Chat</Button>} />
    <ChatHeader name="Marlow" media={<span aria-hidden="true">M</span>} onMenu={() => {}} onCall={() => {}} />
  </div>;
}
