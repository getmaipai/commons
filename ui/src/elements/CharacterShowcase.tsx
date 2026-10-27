import { CharacterTile } from "@/kit/primitives/CharacterTile";
import { CharacterHero } from "@/kit/elements/character-hero";
import { CompanionCard } from "@/kit/elements/companion-card";
import { CompanionProfileHeader } from "@/kit/elements/companion-profile-header";
import { ChatHeader } from "@/kit/elements/chat-header";
import { CompanionPreview } from "@/kit/elements/companion-preview";
import { RightPane } from "@/kit/elements/right-pane";
import { CompanionAvatar } from "@/kit/elements/companion-avatar";
import type { CompanionClips } from "@/kit/elements/companion-avatar-machine";
import { ActivityFeed } from "@/kit/elements/activity-feed";
import { TaskBrowser } from "@/kit/elements/task-browser";
import { CompanionStage } from "@/kit/elements/companion-stage";
import { Button } from "@/kit/ui/button";
import { icons } from "@/kit/icons";

export function CharacterShowcase() {
  const Talk = icons["message-circle"];
  const Call = icons.smartphone;
  const More = icons["more-horizontal"];
  const clips: CompanionClips = { idle: { h264: "", still: "", loop: true }, thinking: { h264: "", still: "", loop: true }, needs_you: { h264: "", still: "", loop: true }, happy: { h264: "", still: "", loop: false }, greeting: { h264: "", still: "", loop: false } };
  return <div className="grid gap-8 p-6">
    <div className="flex items-center gap-6"><CompanionAvatar name="Marlow" clips={clips} size="xs" ring="speaking" /><CompanionPreview name="Marlow" trigger={<button type="button" className="rounded-full border border-border px-3 py-2">Marlow preview</button>} ready context="You're on this page" lastLine="I can help you here." askPlaceholder="Ask Marlow..." onAsk={() => {}} onMic={() => {}} action={<Button variant="outline">Review</Button>} /></div>
    <RightPane open pinned={false} onOpenChange={() => {}} onPinnedChange={() => {}} companionTab={{ id: "companion", label: "Chat", content: <p>Companion tab</p> }} activeTab="companion" onActiveTabChange={() => {}} title="Chat" headerActions={<Button variant="ghost" size="icon" aria-label="Search"><icons.search /></Button>} avatar={<CompanionAvatar name="Marlow" clips={clips} size="xs" ring="listening" />} pinLabel="Pin pane" closeLabel="Close pane" label="Companion pane" />
    <div className="flex gap-6"><CharacterTile name="Marlow" selected line="Ready" /><CharacterTile name="Add character" variant="add" /></div>
    <CharacterHero name="Marlow" line="Here for a chat" actions={<><Button variant="ghost" size="icon" aria-label="Talk"><Talk /></Button><Button variant="ghost" size="icon" aria-label="Call"><Call /></Button><Button variant="ghost" size="icon" aria-label="More actions"><More /></Button></>} />
    <CompanionCard name="Marlow" line="A thoughtful companion for your everyday questions." status="Ready" meta="Choose a conversation to get started" actions={<Button>Chat</Button>} />
    <CompanionProfileHeader name="Marlow" eyebrow="Built-in companion" line="Here for a chat" actions={<Button>Chat</Button>} />
    <ChatHeader name="Marlow" media={<span aria-hidden="true">M</span>} onMenu={() => {}} onCall={() => {}} />
    <div className="h-[32rem] max-w-md"><CompanionStage name="Marlow" mode="idle" stateWord="Ready" character={<CompanionAvatar name="Marlow" clips={clips} size="lg" />} bubble={<p>Hello, Jesse.</p>} actions={[{ id: "help", label: "Help me with this page", icon: <Talk />, onSelect: () => {} }]} talk={<div className="rounded-full border border-border px-4 py-3 text-sm text-muted-foreground">Talk to Marlow...</div>} /></div>
    <ActivityFeed label="Recent activity" groups={[{ id: "today", label: "Today", items: [
      { id: "approval", title: "Trip plan needs your approval", line: "Marlow is waiting for a decision", meta: "10 minutes ago", tone: "needs_you", action: <Button variant="link">Review</Button> },
      { id: "summary", title: "Weekly summary is ready", line: "Three new updates", tone: "done" },
    ]}]} aside={<div className="rounded-lg border border-border bg-card p-4 text-card-foreground"><h3 className="font-medium">Your week</h3><p className="text-muted-foreground text-sm">Two updates are ready.</p></div>} />
    <TaskBrowser label="Tasks" tabs={[{ id: "open", label: "Open", count: 2 }, { id: "done", label: "Done", count: 0 }]} activeTab="open" onTabChange={() => {}} items={[{ id: "approval", title: "Approve the trip plan", line: "Marlow needs your decision", meta: "Today" }]} selectedId="approval" onSelect={() => {}} detail={<div className="rounded-lg border border-border bg-card p-5 text-card-foreground"><h3 className="font-medium">Approve the trip plan</h3><p className="mt-2 text-muted-foreground">Review the itinerary and confirm the dates.</p></div>} empty={<p className="p-4 text-muted-foreground">No tasks in this view.</p>} backLabel="All tasks" />
  </div>;
}
