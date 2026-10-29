"use client";

// KIT-3S-01 story: the three companion screens (Create Character, Animate
// Character, Customize Companion) drawn with shipped kit parts and their
// additive variants only. No className anywhere on a kit part: the look comes
// from the variants and the theme tokens.
import { ArrowLeft, ArrowRight, Mic, UserRound, WandSparkles } from "lucide-react";
import { CharacterTile } from "@/kit/primitives/CharacterTile";
import { Progress } from "@/kit/primitives/Progress";
import { Button } from "./button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogSection, DialogTitle } from "./dialog";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Textarea } from "./textarea";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";
import { GenerationStage } from "../elements/generation-stage";
import { CompanionStage } from "../elements/companion-stage";

const STYLES = ["Realistic", "Cartoon", "Anime", "3D", "Pixel", "Custom"];
const STATES = ["Idle", "Listening", "Thinking", "Speaking"];
const OPTIONAL = ["Working", "Researching", "Writing", "Done", "Sleeping", "Laughing", "Surprised", "Sad", "Confused"];
const TRAITS = ["Warm", "Playful", "Calm", "Curious", "Witty", "Serious"];

function Still({ label }: { label: string }) {
  return <span aria-hidden="true" className="flex size-full items-center justify-center text-xs text-muted-foreground">{label}</span>;
}

export function CreateCharacterShowcase() {
  return (
    <Dialog open modal={false}>
      <DialogContent variant="flow">
        <DialogHeader>
          <DialogTitle size="xl">Create Character</DialogTitle>
          <DialogDescription>Step 1 of 3 · Describe your character</DialogDescription>
        </DialogHeader>
        <Progress mode="determinate" value={(1 / 3) * 100} segments={3} tone="solid" size="md" label="Step 1 of 3" />
        <DialogBody columns="two">
          <div className="flex flex-col gap-6">
            <DialogSection title="Name">
              <Input aria-label="Name" shape="pill" placeholder="Name your character" />
              <ToggleGroup type="single" variant="segmented" fill defaultValue="describe" aria-label="How to start">
                <ToggleGroupItem value="describe">Describe</ToggleGroupItem>
                <ToggleGroupItem value="upload">Upload Photo</ToggleGroupItem>
              </ToggleGroup>
              <Textarea shape="rounded" placeholder="Describe how your character looks" />
            </DialogSection>
            <DialogSection title="Choose a style">
              <div className="grid grid-cols-3 gap-3">
                {STYLES.map((style) => <CharacterTile key={style} variant="picture" name={style} selected={style === "Cartoon"} media={<Still label={style} />} />)}
              </div>
            </DialogSection>
            <Button width="full" shape="pill"><WandSparkles />Generate character</Button>
          </div>
          <DialogSection title="Character Preview">
            <GenerationStage generating={false} shape="panel" frame="strong" transparency="checker" aspectRatio="4 / 5" />
            <p className="text-sm text-muted-foreground">Happy with it? Approve to move on, or change the words and generate again.</p>
            <Button shape="pill" width="full">Approve &amp; Continue</Button>
          </DialogSection>
        </DialogBody>
        <DialogFooter align="between">
          <Button variant="outline" shape="pill"><ArrowLeft />Back</Button>
          <Button shape="pill" disabled>Continue<ArrowRight /></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AnimateCharacterShowcase() {
  return (
    <Dialog open modal={false}>
      <DialogContent variant="flow">
        <DialogHeader>
          <DialogTitle size="xl">Animate Character</DialogTitle>
          <DialogDescription>Step 2 of 3 · Bring it to life</DialogDescription>
        </DialogHeader>
        <Progress mode="determinate" value={(2 / 3) * 100} segments={3} tone="solid" size="md" label="Step 2 of 3" />
        <DialogBody columns="two">
          <DialogSection title="Preview">
            <GenerationStage generating={false} shape="panel" caption="Idle" />
          </DialogSection>
          <div className="flex flex-col gap-6">
            <DialogSection title="Required" aside="0 of 4">
              <div className="grid grid-cols-4 gap-3">
                {STATES.map((state) => <CharacterTile key={state} variant="animation" locked name={state} media={<Still label={state} />} />)}
              </div>
              <Button shape="pill" width="full">Generate Required</Button>
            </DialogSection>
            <DialogSection title="Optional" aside={<Button variant="link" size="sm">Select All</Button>}>
              <div className="grid grid-cols-3 gap-3">
                {OPTIONAL.map((state) => <CharacterTile key={state} variant="animation" name={state} media={<Still label={state} />} onCheckedChange={() => {}} />)}
              </div>
              <Button variant="secondary" shape="pill" width="full" disabled>Generate Optional (0)</Button>
            </DialogSection>
          </div>
        </DialogBody>
        <DialogFooter align="between">
          <Button variant="outline" shape="pill"><ArrowLeft />Back</Button>
          <Button shape="pill" disabled>Continue<ArrowRight /></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CustomizeCompanionShowcase() {
  return (
    <Dialog open modal={false}>
      <DialogContent variant="flow">
        <DialogHeader>
          <DialogTitle size="xl">Customize Companion</DialogTitle>
          <DialogDescription>Step 3 of 3 · Voice and personality</DialogDescription>
        </DialogHeader>
        <Progress mode="determinate" value={100} segments={3} tone="solid" size="md" label="Step 3 of 3" />
        <DialogBody columns="two">
          <div className="flex flex-col gap-6">
            <DialogSection title="Voice" icon={<Mic />}>
              <ToggleGroup type="single" variant="segmented" fill defaultValue="choose" aria-label="Voice source">
                <ToggleGroupItem value="choose">Choose Voice</ToggleGroupItem>
                <ToggleGroupItem value="clone">Create / Clone</ToggleGroupItem>
              </ToggleGroup>
              <div className="flex items-center gap-2">
                <Select defaultValue="warm">
                  <SelectTrigger shape="pill" width="full" aria-label="Voice"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="warm">Warm</SelectItem></SelectContent>
                </Select>
                <Button variant="outline" shape="pill">Preview</Button>
              </div>
            </DialogSection>
            <DialogSection title="Personality" icon={<UserRound />}>
              <ToggleGroup type="single" variant="chip" wrap defaultValue="Warm" aria-label="Personality">
                {TRAITS.map((trait) => <ToggleGroupItem key={trait} value={trait}>{trait}</ToggleGroupItem>)}
              </ToggleGroup>
            </DialogSection>
            <DialogSection title="Backstory">
              <Textarea shape="rounded" placeholder="Where does your companion come from?" />
              <Button variant="secondary" shape="pill"><WandSparkles />Generate</Button>
            </DialogSection>
          </div>
          <DialogSection title="Companion Preview">
            <CompanionStage
              surface="panel"
              name="Sage"
              mode="idle"
              showHeader={false}
              character={<Still label="Sage" />}
              talk={null}
              actions={[
                { id: "test", label: "Test Conversation", onSelect: () => {} },
                { id: "save", label: "Save Companion", primary: true, onSelect: () => {} },
              ]}
            />
          </DialogSection>
        </DialogBody>
        <DialogFooter align="between">
          <Button variant="outline" shape="pill"><ArrowLeft />Back</Button>
          <span className="text-sm text-muted-foreground">You can change all of this later.</span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
