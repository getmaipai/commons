import { describe, expect, test, mock, afterEach } from "bun:test";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { Wizard, type WizardStep } from "@/kit/primitives/Wizard";
import { Progress } from "@/kit/primitives/Progress";

afterEach(cleanup);

const STEPS: WizardStep[] = [
  { id: "a", title: "Household" },
  { id: "b", title: "Owner" },
  { id: "c", title: "Done" },
];

describe("Wizard", () => {
  test("renders identically with no new props", () => {
    const { container } = render(<Wizard steps={STEPS} currentStepId="b" completedCount={1} onJumpTo={() => {}} onNext={() => {}}>content</Wizard>);
    expect(container.innerHTML).toMatchSnapshot();
  });

  const BASE = { steps: STEPS, currentStepId: "b", completedCount: 1, onJumpTo: () => {}, onNext: () => {} };

  async function withViewport(width: number, check: (container: HTMLElement) => void) {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === "(min-width: 64rem)" && width >= 1024,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      const { container } = render(<Wizard {...BASE} aside={<img src="/wizard-aside.jpg" alt="A hillside home" />}>content</Wizard>);
      await waitFor(() => check(container));
    } finally {
      cleanup();
      window.matchMedia = originalMatchMedia;
    }
  }

  test("centered layout keeps one column and constrains it to a centered 40rem width", () => {
    const { container, getByText, getByRole } = render(
      <Wizard {...BASE} layout="centered">content</Wizard>,
    );
    const main = container.querySelector("main")!;
    expect(main.getAttribute("data-wizard-layout")).toBe("centered");
    expect(main.className).toContain("mx-auto");
    expect(main.className).toContain("w-full");
    expect(main.className).toContain("max-w-[40rem]");
    expect(main.className).not.toContain("grid-cols");
    expect(getByRole("heading", { name: "Owner" })).toBeTruthy();
    expect(getByText("content")).toBeTruthy();
    expect(container.querySelector("[data-wizard-bar]")).toBeNull();
  });

  test("centered layout exposes header and eyebrow, centers its content, and places progress at the footer edge", () => {
    const { container, getByText, getByRole, queryByText } = render(
      <Wizard {...BASE} layout="centered" stickyFooter header={<span>Brand</span>} eyebrow="Step 1" heading="Tell us about your place" description="A short introduction." progress={{ current: 1, total: 3 }}>
        <div data-testid="question">Question</div>
      </Wizard>,
    );
    const main = container.querySelector("main")!;
    const content = container.querySelector('[tabindex="0"]')!;
    const bar = container.querySelector("[data-wizard-bar]")!;
    expect(main.firstElementChild?.textContent).toBe("Brand");
    expect(getByText("Step 1")).toBeTruthy();
    expect(content.className).toContain("justify-center");
    expect(bar.querySelector('[role="progressbar"]')).toBeTruthy();
    expect(queryByText("Step 1 of 3")).toBeNull();
    expect(getByRole("heading", { name: "Tell us about your place" }).className).toContain("tracking-[-0.02em]");
  });

  test("centered question step uses a 32px title and layout tokens, while default markup stays snapshotted", async () => {
    const { container, getByRole } = render(<Wizard {...BASE} layout="centered">content</Wizard>);
    expect(getByRole("heading", { name: "Owner" }).className).toContain("text-[length:var(--wizard-question-title-size)]");
    const tokens = await Bun.file(new URL("../tokens.css", import.meta.url)).text();
    expect(tokens).toContain("--wizard-title-color: #222222;");
    expect(tokens).toContain("--wizard-secondary-color: #717171;");
    expect(tokens).toContain("--wizard-divider: #dddddd;");
    expect(tokens).toContain("--wizard-title-color: #f5f5f5;");
    expect(container.querySelector('[data-wizard-layout="centered"]')).toBeTruthy();
  });

  test("dark centered wizard keeps a light primary button while light tokens stay unchanged", async () => {
    const tokens = await Bun.file(new URL("../tokens.css", import.meta.url)).text();
    const lightCentered = tokens.match(/:root \[data-wizard-layout="centered"\] \{([\s\S]*?)\n\}/)?.[1];
    const darkCentered = tokens.match(/:root\.dark \[data-wizard-layout="centered"\], \.dark \[data-wizard-layout="centered"\] \{([\s\S]*?)\n\}/)?.[1];

    expect(lightCentered).toContain("--wizard-primary-background: #222222;");
    expect(lightCentered).toContain("--wizard-primary-foreground: #ffffff;");
    expect(darkCentered).toContain("--wizard-primary-background: #f5f5f5;");
    expect(darkCentered).toContain("--wizard-primary-foreground: #222222;");
  });

  test("centered intro gives the header and footer the full row and anchors its copy in the left half", () => {
    const { container, getByRole } = render(
      <Wizard {...BASE} layout="centered" stepKind="intro" header={<button>Save and exit</button>} stickyFooter onBack={() => {}} heading="Tell us about your place" eyebrow="Step 1" progress={{ current: 1, total: 3 }}>
        body
      </Wizard>,
    );
    expect(container.querySelector("main")!.className).toContain("w-full");
    expect(container.querySelector("[data-wizard-header] button")?.parentElement?.hasAttribute("data-wizard-header")).toBe(true);
    expect(container.querySelector('[tabindex="0"] > div')!.className).toContain("lg:ml-[12vw]");
    expect(container.querySelector("[data-wizard-bar]")!.querySelector('[role="progressbar"]')).toBeTruthy();
    expect(getByRole("button", { name: "Back" }).className).toContain("underline");
  });

  test("centered intro keeps its header and bottom progress treatment when an aside is supplied", () => {
    const { container } = render(
      <Wizard {...BASE} layout="centered" stepKind="intro" header={<button data-wizard-action>Save and exit</button>} aside={<img src="/aside.png" alt="A home" />} stickyFooter heading="Welcome" eyebrow="Step 1" progress={{ current: 1, total: 3 }}>
        body
      </Wizard>,
    );
    expect(container.querySelector("[data-wizard-header]")).toBeTruthy();
    expect(container.querySelector("main")?.getAttribute("data-wizard-layout")).toBe("centered");
    expect(container.querySelector("[data-wizard-bar]")!.querySelector('[role="progressbar"]')).toBeTruthy();
  });

  test("centered sticky footer keeps its controls in the same centered 40rem column", () => {
    const { container } = render(
      <Wizard {...BASE} layout="centered" stickyFooter>content</Wizard>,
    );
    const bar = container.querySelector("[data-wizard-bar]")!;
    const footer = bar.firstElementChild!;
    expect(bar.className).toContain("fixed");
    expect(footer.className).toContain("mx-auto");
    expect(footer.className).toContain("max-w-[40rem]");
    expect(footer.className).not.toContain("lg:max-w-none");
  });

  test("aside layout is one screen tall so the header and footer stay put and only the middle scrolls", () => {
    const { container } = render(<Wizard {...BASE} header={<span>Save and exit</span>} aside={<img src="/aside.png" alt="A home" />}>content</Wizard>);
    const main = container.querySelector("[data-wizard-layout]")!;
    expect(main.className).toContain("h-dvh");
    expect(main.className).not.toContain("min-h-dvh");
    const column = main.firstElementChild!;
    expect(column.className).not.toContain("min-h-dvh");
    expect(column.querySelector("[data-wizard-header]")).not.toBeNull();
    expect(column.querySelector(".overflow-y-auto")).not.toBeNull();
    const heads = column.querySelector("[data-wizard-heads]")!;
    expect(heads.className).toContain("sticky");
    expect(heads.closest(".overflow-y-auto")).not.toBeNull();
  });

  test("aside is not rendered below lg, so its image is not requested on a phone", async () => {
    await withViewport(1023, (container) => {
      expect(container.querySelector("[data-wizard-aside]")).toBeNull();
      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelector("main")!.className).toContain("grid-cols-1");
    });
  });

  test("aside fills the sticky right column at lg", async () => {
    await withViewport(1024, (container) => {
      const main = container.querySelector("main")!;
      const aside = container.querySelector("[data-wizard-aside]")!;
      const imageFrame = aside.firstElementChild!;
      expect(main.className).toContain("lg:grid-cols-2");
      expect(aside.className).toContain("sticky");
      expect(aside.className).toContain("h-dvh");
      expect(imageFrame.className).toContain("[&_img]:object-cover");
      expect(imageFrame.querySelector("img")?.getAttribute("src")).toBe("/wizard-aside.jpg");
    });
  });

  test("split layout renders both panes in DOM order and gates the two-pane grid on lg:", () => {
    const { container, getByTestId } = render(
      <Wizard {...BASE} layout="split" hero={<div data-testid="hero">Hi</div>} heading="Your home" description="Short">
        <p data-testid="body">content</p>
      </Wizard>,
    );
    const main = container.querySelector("main")!;
    expect(main.getAttribute("data-wizard-layout")).toBe("split");
    expect(main.className).toContain("grid-cols-1");
    expect(main.className).toContain("lg:grid-cols-2");
    expect(main.className).not.toMatch(/min-\[|order-|absolute/);
    const body = getByTestId("body").parentElement!;
    const left = getByTestId("hero").parentElement!.parentElement!;
    expect(body.className).toContain("lg:col-start-2");
    expect(left.className).toContain("lg:col-start-1");
    expect(left.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(left.textContent).toBe("HiOwnerYour homeShort");
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  test("heading prop is the only h1 and the step title is not printed as a second heading", () => {
    const { getAllByRole } = render(<Wizard {...BASE} heading="Your home">content</Wizard>);
    expect(getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(getAllByRole("heading", { level: 1 })[0]!.textContent).toBe("Your home");
  });

  test("description renders under the heading; absent heading keeps the step title h1", () => {
    const { getByRole, getByText } = render(<Wizard {...BASE} heading="Your home" description="A short description">content</Wizard>);
    expect(getByText("A short description").previousElementSibling).toBe(getByRole("heading", { level: 1 }));
    cleanup();
    const fallback = render(<Wizard {...BASE}>content</Wizard>);
    expect(fallback.getByRole("heading", { name: "Owner", level: 1 })).toBeTruthy();
  });

  test("hero renders above the heading and only when passed", () => {
    const { container, rerender, getByTestId } = render(<Wizard {...BASE}>content</Wizard>);
    expect(container.querySelector("[data-testid=hero]")).toBeNull();
    rerender(<Wizard {...BASE} hero={<div data-testid="hero">Welcome</div>} heading="Your home">content</Wizard>);
    const hero = getByTestId("hero");
    const h1 = container.querySelector("h1")!;
    expect(hero.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("progress shows 'Step 2 of 6' and a progressbar with aria-valuenow 2 of 6", () => {
    const { getByRole, getByText } = render(<Wizard {...BASE} progress={{ current: 2, total: 6 }}>content</Wizard>);
    expect(getByText("Step 2 of 6")).toBeTruthy();
    const bar = getByRole("progressbar", { name: "Step 2 of 6" });
    expect(bar.getAttribute("aria-valuenow")).toBe("2");
    expect(bar.getAttribute("aria-valuemax")).toBe("6");
  });

  test("centered progress label is the eyebrow when a caller does not pass a separate eyebrow", () => {
    const { getByText, queryByText } = render(
      <Wizard {...BASE} layout="centered" heading="Your home" progress={{ current: 1, total: 3, label: "Getting started" }}>content</Wizard>,
    );
    expect(getByText("Getting started")).toBeTruthy();
    expect(queryByText("Owner")).toBeNull();
  });

  test("sticky footer pins a bar and the scroll region has bottom padding", () => {
    const { container } = render(<Wizard {...BASE} layout="split" onBack={() => {}}>content</Wizard>);
    expect(container.querySelector("main")!.className).toContain("pb-[var(--wizard-bar-height)]");
    expect(container.querySelector("[data-wizard-bar]")!.className).toContain("fixed");
    cleanup();
    const off = render(<Wizard {...BASE} layout="split" stickyFooter={false}>content</Wizard>);
    expect(off.container.querySelector("[data-wizard-bar]")).toBeNull();
    expect(off.getByRole("button", { name: "Continue" })).toBeTruthy();
    cleanup();
    const def = render(<Wizard {...BASE} stickyFooter>content</Wizard>);
    expect(def.container.querySelector('[tabindex="0"]')!.className).toContain("pb-[var(--wizard-bar-height)]");
  });

  test("progress replaces the step strip and prints no step-title caption", () => {
    const { queryByRole, queryByText } = render(<Wizard {...BASE} progress={{ current: 2, total: 6 }} heading="Your home">content</Wizard>);
    expect(queryByRole("list")).toBeNull();
    expect(queryByText("Owner")).toBeNull();
  });

  test("footer buttons keep the same place and order on every step", () => {
    const props = { onJumpTo: () => {}, onNext: () => {}, layout: "split" as const };
    const { container, rerender } = render(<Wizard {...props} steps={STEPS} currentStepId="a" completedCount={0}>content</Wizard>);
    const controls = () => Array.from(container.querySelectorAll("[data-wizard-bar] button")).map((b) => b.textContent);
    expect(controls()).toEqual(["Continue"]);
    rerender(<Wizard {...props} steps={STEPS} currentStepId="b" completedCount={1} onBack={() => {}}>content</Wizard>);
    expect(controls()).toEqual(["Back", "Continue"]);
    rerender(<Wizard {...props} steps={STEPS} currentStepId="c" completedCount={2} onBack={() => {}}>content</Wizard>);
    expect(controls()).toEqual(["Back", "Continue"]);
    const row = container.querySelector("[data-wizard-bar] button")!.parentElement!;
    expect(row.children[row.children.length - 1]!.textContent).toBe("Continue");
    expect(row.querySelector(".flex-1")).toBeTruthy();
  });

  test("Back calls onBack once and leaves the body it shows untouched", () => {
    const onBack = mock(() => {});
    const { getByRole } = render(<Wizard {...BASE} layout="split" onBack={onBack}><input aria-label="answer" defaultValue="kept" /></Wizard>);
    fireEvent.click(getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect((getByRole("textbox", { name: "answer" }) as HTMLInputElement).value).toBe("kept");
  });

  test("split with heading, hero and progress has one h1, one named progressbar and named buttons", () => {
    const { getAllByRole, getByRole } = render(
      <Wizard {...BASE} layout="split" hero={<span>logo</span>} heading="Your home" progress={{ current: 2, total: 6 }} onBack={() => {}}>content</Wizard>,
    );
    expect(getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(getAllByRole("progressbar")).toHaveLength(1);
    expect(getByRole("progressbar").getAttribute("aria-label")).toBeTruthy();
    expect(getByRole("button", { name: "Back" })).toBeTruthy();
    expect(getByRole("button", { name: "Continue" })).toBeTruthy();
  });

  test("segmented progress has one progressbar with the right value and N hidden segments", () => {
    const { getByRole, container } = render(<Progress mode="determinate" value={(2 / 6) * 100} segments={6} label="Step 2 of 6" />);
    expect(container.querySelectorAll('[role="progressbar"]')).toHaveLength(1);
    expect(getByRole("progressbar").getAttribute("aria-valuenow")).toBe("2");
    expect(container.querySelectorAll('span[aria-hidden="true"]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-segment="current"]')).toHaveLength(1);
  });

  test("Progress without segments renders as today", () => {
    const { container } = render(<Progress mode="determinate" value={40} />);
    expect(container.querySelector('[data-slot="progress"]')).toBeTruthy();
    expect(container.querySelector('[role="progressbar"] [aria-hidden="true"]')).toBeNull();
  });

  test("choice card padding defaults to today's value and grows only inside the split Wizard", async () => {
    const tokens = await Bun.file(new URL("../tokens.css", import.meta.url)).text();
    expect(tokens).toContain("--field-choice-padding: 0.625rem;");
    expect(tokens).toMatch(/:root \[data-wizard-layout="split"\] \{\s*--field-choice-padding: 1.25rem;/);
    expect(tokens.match(/--field-choice-padding:/g)).toHaveLength(2);
    expect(tokens).toContain("--wizard-title-size: clamp(2rem, 3.8vw, 3.5rem);");
    const field = await Bun.file(new URL("../dashboard/components/ui/field.tsx", import.meta.url)).text();
    expect(field).toContain("p-[var(--field-choice-padding)]");
    const { container } = render(<Wizard {...BASE} layout="split">content</Wizard>);
    expect(container.querySelector("main")!.getAttribute("style")).toBeNull();
  });

  test("split layout pins a full-width bottom bar with the progress on its top edge, Back on the left and the primary on the right", () => {
    const { container } = render(<Wizard {...BASE} layout="split" progress={{ current: 2, total: 6 }} onBack={() => {}}>content</Wizard>);
    const bar = container.querySelector("[data-wizard-bar]")!;
    expect(bar.className).toContain("inset-x-0");
    expect(bar.firstElementChild!.querySelector('[role="progressbar"]')).toBeTruthy();
    expect(Array.from(bar.querySelectorAll("button")).map((b) => b.textContent)).toEqual(["Back", "Continue"]);
  });

  test("the screen change animation is motion-safe only and the keyframes ship in tokens.css", async () => {
    const { container } = render(<Wizard {...BASE} layout="split" heading="Your home">content</Wizard>);
    const animated = container.querySelectorAll('[class*="animate-[wizard-step-in"]');
    expect(animated).toHaveLength(2);
    for (const el of Array.from(animated)) expect(el.className).toContain("motion-safe:animate-[wizard-step-in");
    expect(container.innerHTML).not.toMatch(/(^|[ "])animate-\[wizard/);
    const tokens = await Bun.file(new URL("../tokens.css", import.meta.url)).text();
    expect(tokens).toContain("@keyframes wizard-step-in");
    cleanup();
    const plain = render(<Wizard {...BASE}>content</Wizard>);
    expect(plain.container.innerHTML).not.toContain("wizard-step-in");
  });

  test("renders an optional banner between the steps and scroll region", () => {
    const props = {
      steps: STEPS,
      currentStepId: "b",
      completedCount: 1,
      onJumpTo: () => {},
      onNext: () => {},
    };
    const { container, rerender, getByTestId } = render(<Wizard {...props}>content</Wizard>);
    const main = container.querySelector("main")!;
    const noBannerMarkup = main.innerHTML;
    expect(main.children).toHaveLength(3);
    expect(main.children[0]?.tagName).toBe("OL");
    expect(main.children[1]?.getAttribute("tabindex")).toBe("0");

    rerender(
      <Wizard {...props} banner={<aside data-testid="banner">Preview mode</aside>}>
        content
      </Wizard>,
    );
    const banner = getByTestId("banner");
    const scrollRegion = main.querySelector('[tabindex="0"]')!;
    expect(banner.parentElement).toBe(main);
    expect(main.children[1]).toBe(banner);
    expect(main.children[2]).toBe(scrollRegion);
    expect(scrollRegion.contains(banner)).toBe(false);

    rerender(<Wizard {...props}>content</Wizard>);
    expect(main.innerHTML).toBe(noBannerMarkup);
  });

  test("shows the current step's title as the heading", () => {
    const { getByRole } = render(
      <Wizard steps={STEPS} currentStepId="b" completedCount={1} onJumpTo={() => {}} onNext={() => {}}>
        content
      </Wizard>,
    );
    expect(getByRole("heading", { name: "Owner" })).toBeTruthy();
  });

  test("keeps the centered intro inset inside the aside pane and preserves the no-aside inset", () => {
    const heading = "Welcome to MaiPai Home and Set Up Your Household Together";
    const { getByRole, rerender } = render(
      <Wizard
        steps={STEPS}
        currentStepId="a"
        completedCount={0}
        onJumpTo={() => {}}
        onNext={() => {}}
        heading={heading}
        description="Choose a few options to prepare your household."
        layout="centered"
        stepKind="intro"
      >
        <p>Long introductory content stays within the wizard column.</p>
      </Wizard>,
    );

    const noAsideHeadingColumn = getByRole("heading", { name: heading }).parentElement;
    const noAsideBodyColumn = noAsideHeadingColumn?.parentElement?.querySelector(".mt-8");
    expect(noAsideHeadingColumn?.className).toContain("lg:ml-[12vw]");
    expect(noAsideBodyColumn?.className).toContain("lg:ml-[12vw]");
    expect(noAsideHeadingColumn?.className).toContain("lg:max-w-[40rem]");
    expect(noAsideBodyColumn?.className).toContain("lg:max-w-[40rem]");

    rerender(
      <Wizard
        steps={STEPS}
        currentStepId="a"
        completedCount={0}
        onJumpTo={() => {}}
        onNext={() => {}}
        heading={heading}
        description="Choose a few options to prepare your household."
        layout="centered"
        stepKind="intro"
        aside={<div aria-hidden="true" />}
      >
        <p>Long introductory content stays within the wizard column.</p>
      </Wizard>,
    );

    const asideHeadingColumn = getByRole("heading", { name: heading }).parentElement;
    const asideBodyColumn = asideHeadingColumn?.parentElement?.querySelector(".mt-8");
    for (const column of [asideHeadingColumn, asideBodyColumn]) {
      expect(column?.className).toContain("lg:w-[90%]");
      expect(column?.className).toContain("lg:mx-auto");
      expect(column?.className).toContain("lg:max-w-none");
      expect(column?.className).not.toContain("lg:ml-[12vw]");
    }
  });

  test("Continue calls onNext", () => {
    const onNext = mock(() => {});
    const { getByRole } = render(
      <Wizard steps={STEPS} currentStepId="a" completedCount={0} onJumpTo={() => {}} onNext={onNext}>
        content
      </Wizard>,
    );
    fireEvent.click(getByRole("button", { name: "Continue" }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  test("no Back button on the first step; Back appears and fires once onBack is supplied", () => {
    const onBack = mock(() => {});
    const { queryByRole, rerender, getByRole } = render(
      <Wizard steps={STEPS} currentStepId="a" completedCount={0} onJumpTo={() => {}} onNext={() => {}}>
        content
      </Wizard>,
    );
    expect(queryByRole("button", { name: "Back" })).toBeNull();

    rerender(
      <Wizard steps={STEPS} currentStepId="b" completedCount={1} onJumpTo={() => {}} onNext={() => {}} onBack={onBack}>
        content
      </Wizard>,
    );
    fireEvent.click(getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test("a completed step's number is clickable and jumps back to it", () => {
    const onJumpTo = mock(() => {});
    const { getByRole } = render(
      <Wizard steps={STEPS} currentStepId="c" completedCount={2} onJumpTo={onJumpTo} onNext={() => {}}>
        content
      </Wizard>,
    );
    fireEvent.click(getByRole("button", { name: /Household/ }));
    expect(onJumpTo).toHaveBeenCalledWith("a");
  });

  test("a not-yet-reached step is named but its button is disabled, not jumpable", () => {
    const onJumpTo = mock(() => {});
    const { getByRole } = render(
      <Wizard steps={STEPS} currentStepId="a" completedCount={0} onJumpTo={onJumpTo} onNext={() => {}}>
        content
      </Wizard>,
    );
    const futureStep = getByRole("button", { name: /Done/ });
    expect(futureStep.hasAttribute("disabled")).toBe(true);
    fireEvent.click(futureStep);
    expect(onJumpTo).not.toHaveBeenCalled();
  });

  test("phase mode keeps labels visible, removes numbered markers, and holds the 48px touch floor", () => {
    const { getByRole } = render(
      <Wizard steps={STEPS} currentStepId="a" completedCount={0} onJumpTo={() => {}} onNext={() => {}} phaseMode>
        content
      </Wizard>,
    );
    const phaseList = getByRole("list", { name: "Setup phases" });
    const firstPhase = getByRole("button", { name: "Household" });
    expect(phaseList.textContent).toBe("HouseholdOwnerDone");
    expect(firstPhase.className).toContain("min-h-12");
    expect(firstPhase.textContent).toBe("Household");
  });

  test("Skip renders the caller's own reason, never a bare label, and fires onSkip", () => {
    const onSkip = mock(() => {});
    const { getByRole } = render(
      <Wizard
        steps={STEPS}
        currentStepId="a"
        completedCount={0}
        onJumpTo={() => {}}
        onNext={() => {}}
        onSkip={onSkip}
        skipLabel="Skip - set this up later in Settings"
      >
        content
      </Wizard>,
    );
    fireEvent.click(getByRole("button", { name: "Skip - set this up later in Settings" }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  test("nextDisabled and busy both disable Continue; busy relabels it", () => {
    const { getByRole, rerender } = render(
      <Wizard steps={STEPS} currentStepId="a" completedCount={0} onJumpTo={() => {}} onNext={() => {}} nextDisabled>
        content
      </Wizard>,
    );
    expect(getByRole("button", { name: "Continue" }).hasAttribute("disabled")).toBe(true);

    rerender(
      <Wizard steps={STEPS} currentStepId="a" completedCount={0} onJumpTo={() => {}} onNext={() => {}} busy>
        content
      </Wizard>,
    );
    expect(getByRole("button", { name: "Working…" }).hasAttribute("disabled")).toBe(true);
  });
});
