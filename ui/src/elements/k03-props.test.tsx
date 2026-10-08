// ELT-T1-K03: one row per new optional prop.
import { afterEach, describe, expect, test, mock } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ComparisonCard, type ComparisonOption } from "./comparison-card";
import { ModelPicker } from "./model-picker";
import { QuotaBanner } from "./quota-banner";
import { ToolError } from "./tool-error";
import { ComposerMenu, ComposerMenuLabel } from "./composer";
import { ErrorState } from "./error-state";
import { CanvasSplit } from "./canvas-split";
import { VoiceConversation } from "./voice-conversation";
import { TypingIndicator } from "./typing-indicator";
import { ArtifactCard } from "./artifact-card";
import { JobProgress } from "./job-progress";
import { dateGroupLabel, startOfLocalDay } from "./thread-list.aui";
import { groupThreads } from "./thread-search";
import { TooltipIconButton } from "../assistant-ui/tooltip-icon-button";
import { TooltipIconButton as ElementTooltipIconButton } from "./tooltip-icon-button";
import { AsyncState } from "../primitives/AsyncState";
import { File } from "./file";

afterEach(cleanup);

const options: ComparisonOption[] = [
  { id: "a", name: "A", headline: "h", traits: ["quick"] },
  { id: "b", name: "B", headline: "h2", traits: [false as const] },
];
const models = [
  { id: "m1", name: "One", family: "F", context: "8k", capabilities: [] },
];

describe("ComparisonCard", () => {
  test("no recommendedId draws no pick and no reason draws no line", () => {
    const { container, queryByText } = render(
      <ComparisonCard traitLabels={["Fast"]} options={options} />,
    );
    expect(queryByText("pick")).toBeNull();
    expect(container.querySelector("p")).toBeNull();
  });
  test("recommendedId and reason draw the pick and the line", () => {
    const { getByText } = render(
      <ComparisonCard traitLabels={["Fast"]} options={options} recommendedId="b" reason="Why." />,
    );
    expect(getByText("pick")).toBeTruthy();
    expect(getByText("Why.")).toBeTruthy();
  });
});

describe("ModelPicker", () => {
  test("price is optional, status and reason draw when given", () => {
    const { container, getByText } = render(
      <ModelPicker
        models={[{ ...models[0]!, status: { label: "Installed", tone: "good" }, reason: "Fits your RAM" }]}
        selectedId="m1"
      />,
    );
    expect(getByText("Fits your RAM")).toBeTruthy();
    const status = container.querySelector("[data-slot='model-picker-status']");
    expect(status?.textContent).toBe("Installed");
    expect(status?.getAttribute("data-tone")).toBe("good");
    expect(container.textContent).not.toContain("$");
  });
  test("a status with no tone is neutral", () => {
    const { container } = render(
      <ModelPicker models={[{ ...models[0]!, status: { label: "Soon" } }]} selectedId="x" />,
    );
    expect(container.querySelector("[data-slot='model-picker-status']")?.getAttribute("data-tone")).toBe("neutral");
  });
});

describe("QuotaBanner", () => {
  test("no resetsIn hides the line, no onUpgrade hides the action", () => {
    const { container, queryByRole } = render(<QuotaBanner used={1} limit={10} unit="GB" />);
    expect(container.textContent).not.toContain("resets in");
    expect(queryByRole("button")).toBeNull();
  });
  test("onUpgrade draws the action with its label", () => {
    const onUpgrade = mock(() => {});
    const { getByRole } = render(<QuotaBanner used={1} limit={10} unit="GB" upgradeLabel="More" onUpgrade={onUpgrade} />);
    fireEvent.click(getByRole("button", { name: "More" }));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });
  test("formatAmount formats remaining, used and limit values", () => {
    const formatAmount = (value: number) => value === 1024 ? "1 KB" : "20 GB";
    const { container, getByRole } = render(
      <QuotaBanner used={1024} limit={20 * 1024 ** 3} unit="bytes" formatAmount={formatAmount} />,
    );
    expect(container.textContent).toContain("20 GB left");
    expect(container.textContent).toContain("1 KB of 20 GB used");
    expect(getByRole("meter").getAttribute("aria-valuetext")).toBe("1 KB of 20 GB used");
  });
});

describe("QuotaBanner label", () => {
  test("onUpgrade without a label draws no empty button", () => {
    expect(render(<QuotaBanner used={1} limit={10} unit="GB" onUpgrade={() => {}} />).queryByRole("button")).toBeNull();
  });
});

describe("ToolError", () => {
  test("no attempt hides the counter, no handlers hide Retry and Skip", () => {
    const { container, queryByRole } = render(<ToolError name="n" target="t" message="m" />);
    expect(container.textContent).not.toContain("/");
    expect(queryByRole("button")).toBeNull();
  });
  test("each handler draws only its own button, labels overridable", () => {
    const { queryByRole, getByRole } = render(
      <ToolError name="n" target="t" message="m" attempt={1} maxAttempts={2} onRetry={() => {}} retryLabel="Reintentar" />,
    );
    expect(queryByRole("button", { name: "Skip" })).toBeNull();
    expect(getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });
  test("skipLabel and retryingLabel apply", () => {
    const { getByRole } = render(
      <ToolError name="n" target="t" message="m" retrying onSkip={() => {}} skipLabel="Omitir" retryingLabel="Probando" />,
    );
    expect(getByRole("button", { name: "Omitir" })).toBeTruthy();
    expect(getByRole("button", { name: "Probando" })).toBeTruthy();
  });
});

describe("ToolError details and actions", () => {
  test("omitted: no disclosure and no actions slot", () => {
    const { container } = render(<ToolError name="n" target="t" message="m" />);
    expect(container.querySelector("details")).toBeNull();
    expect(container.querySelector('[data-slot="tool-error-actions"]')).toBeNull();
  });
  test("details draws a collapsed disclosure with an overridable label", () => {
    const { container, getByText } = render(
      <ToolError name="n" target="t" message="m" details={<span>cause</span>} detailsLabel="Detalles" />,
    );
    const d = container.querySelector("details") as HTMLDetailsElement;
    expect(d.open).toBe(false);
    expect(getByText("Detalles")).toBeTruthy();
    expect(getByText("cause")).toBeTruthy();
  });
  test("actions render alongside Retry", () => {
    const { getByRole } = render(
      <ToolError name="n" target="t" message="m" onRetry={() => {}} actions={<a href="/repairs">Repairs</a>} />,
    );
    expect(getByRole("link", { name: "Repairs" })).toBeTruthy();
    expect(getByRole("button", { name: "Retry" })).toBeTruthy();
  });
});

describe("ComposerMenuLabel", () => {
  test("renders a token-styled heading inside ComposerMenu", () => {
    const { getByText } = render(
      <ComposerMenu open>
        <ComposerMenuLabel className="x">Models</ComposerMenuLabel>
      </ComposerMenu>,
    );
    const el = getByText("Models");
    expect(el.getAttribute("data-slot")).toBe("composer-menu-label");
    expect(el.className).toContain("text-muted-foreground");
    expect(el.className).toContain("x");
  });
});

describe("ErrorState", () => {
  test("no onRetry draws no Retry, no detail draws only the title", () => {
    const { queryByRole, container } = render(<ErrorState title="Oops" retrying={false} />);
    expect(queryByRole("button")).toBeNull();
    expect(container.querySelectorAll("p").length).toBe(1);
  });
  test("inline drops max-w-sm and the card padding in both branches", () => {
    const card = render(<ErrorState title="Oops" retrying={false} />).getByRole("alert");
    expect(card.className).toContain("max-w-sm");
    expect(card.className).toContain("px-4");
    cleanup();
    const inline = render(<ErrorState title="Oops" retrying={false} layout="inline" />).getByRole("alert");
    expect(inline.className).not.toContain("max-w-sm");
    expect(inline.className).not.toContain("px-4");
    expect(inline.className).not.toContain("py-3");
    cleanup();
    const inlineBusy = render(<ErrorState title="Oops" retrying layout="inline" />).getByRole("status");
    expect(inlineBusy.className).not.toContain("max-w-sm");
  });
  test("retryLabel and retryingLabel override the copy", () => {
    const { getByRole } = render(<ErrorState title="Oops" retrying={false} onRetry={() => {}} retryLabel="Again" />);
    expect(getByRole("button", { name: "Again" })).toBeTruthy();
    cleanup();
    expect(render(<ErrorState title="Oops" retrying retryingLabel="Wait" />).getByRole("status").textContent).toContain("Wait");
  });
});

describe("CanvasSplit", () => {
  test("pane is full height, flat, with a left hairline; card is the default", () => {
    const pane = render(<CanvasSplit variant="pane" />).container.firstElementChild!;
    expect(pane.getAttribute("data-variant")).toBe("pane");
    expect(pane.className).toContain("h-full");
    expect(pane.className).toContain("border-s");
    expect(pane.className).not.toContain("rounded-[20px]");
    cleanup();
    const card = render(<CanvasSplit />).container.firstElementChild!;
    expect(card.getAttribute("data-variant")).toBeNull();
    expect(card.className).toContain("rounded-[20px]");
  });
});

describe("VoiceConversation", () => {
  test("extra renders after the controls", () => {
    const { getByText } = render(
      <VoiceConversation mode="listening" amplitude={0} extra={<a href="#s">Voice settings</a>} />,
    );
    expect(getByText("Voice settings")).toBeTruthy();
  });
});

describe("TypingIndicator", () => {
  test("label sets the accessible name in both variants", () => {
    expect(render(<TypingIndicator label="Escribiendo" />).getByRole("status").getAttribute("aria-label")).toBe("Escribiendo");
    cleanup();
    expect(render(<TypingIndicator variant="bare" label="Escribiendo" />).getByRole("status").getAttribute("aria-label")).toBe("Escribiendo");
    cleanup();
    expect(render(<TypingIndicator />).getByRole("status").getAttribute("aria-label")).toBe("Assistant is typing");
  });
});

describe("ArtifactCard", () => {
  test("actions render inside the card", () => {
    const { container, getByRole } = render(
      <ArtifactCard title="T" meta="m" actions={<button type="button">Menu</button>} />,
    );
    expect(container.querySelector("[data-slot='artifact-card']")?.contains(getByRole("button", { name: "Menu" }))).toBe(true);
  });
});

describe("JobProgress", () => {
  const stages = [{ name: "A", weight: 1 }];
  test("no eta hides it while running; labels are overridable", () => {
    const running = render(<JobProgress title="J" stages={stages} stageIndex={0} stageProgress={0.5} cancelLabel="Cancelar" />);
    expect(running.getByRole("button", { name: "Cancelar" })).toBeTruthy();
    expect(running.container.textContent).not.toContain("done");
    cleanup();
    const done = render(<JobProgress title="J" stages={stages} stageIndex={1} stageProgress={0} doneLabel="listo" />);
    expect(done.container.textContent).toContain("listo");
  });
});

describe("thread grouping export", () => {
  test("dateGroupLabel buckets Today, Yesterday, Earlier and undefined as Today", () => {
    const now = new Date(2026, 9, 6, 15, 0, 0);
    const start = startOfLocalDay(now);
    expect(dateGroupLabel(now, start)).toBe("Today");
    expect(dateGroupLabel(undefined, start)).toBe("Today");
    expect(dateGroupLabel(new Date(2026, 9, 5, 23, 0, 0), start)).toBe("Yesterday");
    expect(dateGroupLabel(new Date(2026, 9, 1), start)).toBe("Earlier");
  });
  test("thread-search groups built from it match the day groups, in first-seen order", () => {
    const now = new Date(2026, 9, 6, 15, 0, 0);
    const start = startOfLocalDay(now);
    const dates = [new Date(2026, 9, 6, 9), new Date(2026, 9, 5, 9), new Date(2026, 8, 1), new Date(2026, 9, 6, 8)];
    const grouped = groupThreads(
      dates.map((d, i) => ({ id: String(i), title: `t${i}`, group: dateGroupLabel(d, start) })),
    );
    expect(grouped.groups.map((g) => [g.group, g.threads.map((t) => t.id)])).toEqual([
      ["Today", ["0", "3"]],
      ["Yesterday", ["1"]],
      ["Earlier", ["2"]],
    ]);
  });
});

describe("TooltipIconButton hitArea48", () => {
  test("adds the 48px pseudo-element hit area only when asked", () => {
    const off = render(<ElementTooltipIconButton tooltip="Copy">c</ElementTooltipIconButton>).getByRole("button");
    expect(off.className).not.toContain("before:-inset-3");
    cleanup();
    const on = render(<ElementTooltipIconButton tooltip="Copy" hitArea48>c</ElementTooltipIconButton>).getByRole("button");
    expect(on.className).toContain("before:-inset-3");
    expect(on.className).toContain("size-6");
    cleanup();
    // The enhanced copy already carries the 48px floor by default.
    expect(render(<TooltipIconButton tooltip="Copy">c</TooltipIconButton>).getByRole("button").className).toContain("before:-inset-3");
  });
  test("legacy re-export: hitArea48 defaults on, false opts out, className is untouched", () => {
    const on = render(<TooltipIconButton tooltip="Copy" hitArea48>c</TooltipIconButton>).getByRole("button");
    expect(on.className).toContain("before:-inset-3");
    expect(on.className).toContain("size-6");
    cleanup();
    const off = render(<TooltipIconButton tooltip="Copy" hitArea48={false} className="extra">c</TooltipIconButton>).getByRole("button");
    expect(off.className).not.toContain("before:-inset-3");
    expect(off.className).toContain("size-6");
    expect(off.className).toContain("extra");
    expect(off.hasAttribute("hitarea48")).toBe(false);
  });
});

describe("File.Download hitArea48", () => {
  test("adds a 48px pseudo-element target only when requested", () => {
    const off = render(<File.Download data="https://example.test/file" sourceType="url" mimeType="application/pdf" filename="file.pdf" />).getByRole("link");
    expect(off.className).not.toContain("before:-inset-3");
    expect(off.hasAttribute("hitArea48")).toBe(false);
    cleanup();

    const on = render(<File.Download data="https://example.test/file" sourceType="url" mimeType="application/pdf" filename="file.pdf" hitArea48 />).getByRole("link");
    expect(on.className).toContain("before:-inset-3");
    expect(on.className).toContain("relative");
    expect(on.hasAttribute("hitArea48")).toBe(false);
  });
});

describe("AsyncState error branch", () => {
  test("shows exactly today's text through ErrorState, no raw detail, Retry calls onRetry", () => {
    const onRetry = mock(() => {});
    const { getByRole, container } = render(
      <AsyncState data={null} error errorMessage="Could not load people." onRetry={onRetry}>
        {() => null}
      </AsyncState>,
    );
    expect(getByRole("alert").textContent).toBe("Could not load people.Try again");
    expect(container.querySelectorAll("p").length).toBe(1);
    fireEvent.click(getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
  test("default message is unchanged", () => {
    const { getByRole } = render(<AsyncState data={null} error onRetry={() => {}}>{() => null}</AsyncState>);
    expect(getByRole("alert").textContent).toContain("Something went wrong.");
  });
});
