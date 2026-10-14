# Wizard

`Wizard` guides a person through one step at a time. It keeps the step list, current heading, form content and navigation buttons together.

## Picture aside

Pass `aside` to show a picture beside the steps on wide screens. The wizard fills the left half. The picture fills the right half, stays in place while the page scrolls, and uses `object-fit: cover`. Below the `lg` breakpoint (64rem), the aside is not rendered, so an image passed there is not requested on phone screens.

```tsx
<Wizard
  steps={steps}
  currentStepId="owner"
  completedCount={1}
  onJumpTo={setStep}
  onNext={continueSetup}
  layout="centered"
  heading="Your name"
  aside={<img src={homePicture} alt="A home among green hills" />}
>
  <OwnerFields />
</Wizard>
```

The aside keeps the wizard content in one left column. When `aside` is omitted, the current layout and markup are unchanged. See `WizardAsideShowcase` for a complete example.
