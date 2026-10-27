import { CharacterTile } from "@/kit/primitives/CharacterTile";
import { CharacterHero } from "@/kit/elements/character-hero";
import { CompanionCard } from "@/kit/elements/companion-card";
import { CompanionProfileHeader } from "@/kit/elements/companion-profile-header";
import { ChatHeader } from "@/kit/elements/chat-header";
import { ActivityFeed } from "@/kit/elements/activity-feed";
import { TaskBrowser } from "@/kit/elements/task-browser";
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
    <ActivityFeed label="Recent activity" groups={[{ id: "today", label: "Today", items: [
      { id: "approval", title: "Trip plan needs your approval", line: "Marlow is waiting for a decision", meta: "10 minutes ago", tone: "needs_you", action: <Button variant="link">Review</Button> },
      { id: "summary", title: "Weekly summary is ready", line: "Three new updates", tone: "done" },
    ]}]} aside={<div className="rounded-lg border border-border bg-card p-4 text-card-foreground"><h3 className="font-medium">Your week</h3><p className="text-muted-foreground text-sm">Two updates are ready.</p></div>} />
    <TaskBrowser label="Tasks" tabs={[{ id: "open", label: "Open", count: 2 }, { id: "done", label: "Done", count: 0 }]} activeTab="open" onTabChange={() => {}} items={[{ id: "approval", title: "Approve the trip plan", line: "Marlow needs your decision", meta: "Today" }]} selectedId="approval" onSelect={() => {}} detail={<div className="rounded-lg border border-border bg-card p-5 text-card-foreground"><h3 className="font-medium">Approve the trip plan</h3><p className="mt-2 text-muted-foreground">Review the itinerary and confirm the dates.</p></div>} empty={<p className="p-4 text-muted-foreground">No tasks in this view.</p>} backLabel="All tasks" />
  </div>;
}
