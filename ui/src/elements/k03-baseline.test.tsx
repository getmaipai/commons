// ELT-T1-K03: every call shape that existed before the additive props must
// render exactly today's markup. The snapshots in __snapshots__ were taken on
// the code as it was before K03 touched it; a diff here is a regression.
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { ComparisonCard } from "./comparison-card";
import { ModelPicker } from "./model-picker";
import { QuotaBanner } from "./quota-banner";
import { ToolError } from "./tool-error";
import { ErrorState } from "./error-state";
import { CanvasSplit } from "./canvas-split";
import { VoiceConversation } from "./voice-conversation";
import { TypingIndicator } from "./typing-indicator";
import { ArtifactCard } from "./artifact-card";
import { JobProgress } from "./job-progress";
import { TooltipIconButton } from "../assistant-ui/tooltip-icon-button";
import { AsyncState } from "../primitives/AsyncState";

afterEach(cleanup);

const html = (node: React.ReactElement) => render(node).container.innerHTML;

describe("old call shapes render unchanged", () => {
  test("comparison-card", () => {
    expect(
      html(
        <ComparisonCard
          traitLabels={["Fast", "Private"]}
          options={[
            { id: "a", name: "A", headline: "h", traits: ["quick", false] },
            { id: "b", name: "B", headline: "h2", traits: [false, "local"] },
          ]}
          recommendedId="a"
          reason="Because."
        />,
      ),
    ).toMatchSnapshot();
  });

  test("model-picker, selectable and read-only", () => {
    const models = [
      { id: "m1", name: "One", family: "F", context: "8k", price: "free", capabilities: ["chat"] },
      { id: "m2", name: "Two", family: "F", context: "16k", price: "$1", capabilities: [] },
    ];
    expect(html(<ModelPicker models={models} selectedId="m1" onSelect={() => {}} />)).toMatchSnapshot();
    cleanup();
    expect(html(<ModelPicker models={models} selectedId="m2" />)).toMatchSnapshot();
  });

  test("quota-banner", () => {
    expect(
      html(<QuotaBanner used={40} limit={50} unit="messages" resetsIn="3h" upgradeLabel="Upgrade" onUpgrade={() => {}} />),
    ).toMatchSnapshot();
  });

  test("tool-error", () => {
    expect(
      html(
        <ToolError name="search" target="example.com" message="boom" attempt={1} maxAttempts={3} retrying={false} onRetry={() => {}} onSkip={() => {}} />,
      ),
    ).toMatchSnapshot();
    cleanup();
    expect(
      html(<ToolError name="search" target="example.com" message="boom" attempt={2} maxAttempts={3} retrying onRetry={() => {}} onSkip={() => {}} />),
    ).toMatchSnapshot();
  });

  test("error-state, both branches", () => {
    expect(html(<ErrorState title="Could not send" detail="Try again." retrying={false} onRetry={() => {}} />)).toMatchSnapshot();
    cleanup();
    expect(html(<ErrorState title="Could not send" detail="Try again." retrying onRetry={() => {}} />)).toMatchSnapshot();
  });

  test("canvas-split", () => {
    expect(html(<CanvasSplit>x</CanvasSplit>)).toMatchSnapshot();
  });

  test("voice-conversation", () => {
    expect(
      html(<VoiceConversation mode="listening" amplitude={0.4} muted={false} onToggleMute={() => {}} onEnd={() => {}} />),
    ).toMatchSnapshot();
  });

  test("typing-indicator, both variants", () => {
    expect(html(<TypingIndicator />)).toMatchSnapshot();
    cleanup();
    expect(html(<TypingIndicator variant="bare" />)).toMatchSnapshot();
  });

  test("artifact-card, idle and generating", () => {
    expect(html(<ArtifactCard title="Plan" meta="v2 · 120 words" />)).toMatchSnapshot();
    cleanup();
    expect(html(<ArtifactCard title="Plan" meta="" generating words={12} />)).toMatchSnapshot();
  });

  test("job-progress", () => {
    const stages = [{ name: "Fetch", weight: 1 }, { name: "Build", weight: 2 }];
    expect(
      html(<JobProgress title="Index" stages={stages} stageIndex={1} stageProgress={0.5} eta="2m" onCancel={() => {}} />),
    ).toMatchSnapshot();
    cleanup();
    expect(
      html(<JobProgress title="Index" stages={stages} stageIndex={2} stageProgress={0} eta="" />),
    ).toMatchSnapshot();
  });

  test("tooltip-icon-button", () => {
    expect(html(<TooltipIconButton tooltip="Copy">c</TooltipIconButton>)).toMatchSnapshot();
  });

  test("AsyncState loading, empty and data branches", () => {
    expect(html(<AsyncState data={undefined} onRetry={() => {}}>{() => <p>x</p>}</AsyncState>)).toMatchSnapshot();
    cleanup();
    expect(html(<AsyncState data={null} onRetry={() => {}}>{() => <p>x</p>}</AsyncState>)).toMatchSnapshot();
    cleanup();
    expect(html(<AsyncState data={[1]} onRetry={() => {}}>{() => <p>ok</p>}</AsyncState>)).toMatchSnapshot();
  });
});
