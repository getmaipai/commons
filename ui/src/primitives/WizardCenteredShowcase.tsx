// Kit showcase entry for Wizard's centered layout.
import { Wizard } from "@/kit/primitives/Wizard";
import { Input } from "@/kit/ui/input";
import { Label } from "@/kit/ui/label";

const steps = [
  { id: "household", title: "Household" },
  { id: "owner", title: "Owner" },
  { id: "finish", title: "Finish" },
];

export function WizardCenteredShowcase() {
  return (
    <div className="h-[32rem] rounded-lg border border-border">
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
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="wizard-showcase-name">Name</Label>
          <Input id="wizard-showcase-name" defaultValue="alfred" />
        </div>
      </Wizard>
    </div>
  );
}
