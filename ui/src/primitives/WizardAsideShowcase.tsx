import { SafeImage } from "@/kit/primitives/SafeImage";
// Kit showcase entry for Wizard's responsive picture aside.
import { Wizard } from "@/kit/primitives/Wizard";
import { Input } from "@/kit/ui/input";
import { Label } from "@/kit/ui/label";
import homeIllustration from "./wizard-aside-showcase.svg";

const steps = [
  { id: "household", title: "Household" },
  { id: "owner", title: "Owner" },
  { id: "finish", title: "Finish" },
];

export function WizardAsideShowcase() {
  return (
    <div className="min-h-[32rem] overflow-hidden rounded-lg border border-border">
      <Wizard
        steps={steps}
        currentStepId="owner"
        completedCount={1}
        onJumpTo={() => {}}
        onBack={() => {}}
        onNext={() => {}}
        layout="centered"
        heading="Your name"
        description="Add the name this household should use for you."
        aside={<SafeImage src={homeIllustration} alt="A home among green hills at sunset" />}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="wizard-aside-showcase-name">Name</Label>
          <Input id="wizard-aside-showcase-name" defaultValue="alfred" />
        </div>
      </Wizard>
    </div>
  );
}
