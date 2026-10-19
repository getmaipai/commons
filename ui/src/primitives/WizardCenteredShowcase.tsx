import { SafeImage } from "@/kit/primitives/SafeImage";
// Kit showcase entry for Wizard's centered layout.
import { Wizard } from "@/kit/primitives/Wizard";
import logo from "@/kit/dashboard/assets/images/logos/darklogo.svg";
import logoWhite from "@/kit/dashboard/assets/images/logos/whitelogo.svg";

const steps = [
  { id: "household", title: "Household" },
  { id: "owner", title: "Owner" },
  { id: "finish", title: "Finish" },
];

export function WizardCenteredShowcase() {
  return (
    <div className="h-dvh">
      <Wizard
        steps={steps}
        currentStepId="owner"
        completedCount={1}
        onJumpTo={() => {}}
        onBack={() => {}}
        onNext={() => {}}
        layout="centered"
        stepKind="intro"
        heading="Tell us about your place"
        eyebrow="Step 1"
        description="In this step, we'll ask you which type of property you have and if guests will book the entire place or just a room. Then let us know the location and how many guests can stay."
        stickyFooter
        progress={{ current: 1, total: 3, label: "Getting started" }}
        header={<><SafeImage src={logo} alt="MaiPai Home" className="h-8 w-auto dark:hidden" /><SafeImage src={logoWhite} alt="MaiPai Home" className="hidden h-8 w-auto dark:block" /><button type="button" data-wizard-action>Save and exit</button></>}
      >
        <div />
      </Wizard>
    </div>
  );
}
