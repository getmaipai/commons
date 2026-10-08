"use client";

import { Component, type ComponentProps, type ReactNode } from "react";
import { AnswerBlock } from "@maipai/spec/gen/ts/answer-block.js";
import { cn } from "cn";
import { Chart } from "./chart";
import { ComparisonCard } from "./comparison-card";
import { DataTable, type DataTableColumn } from "./data-table";
import { ImageGallery } from "./image-gallery";
import { ScheduleCard } from "./schedule-card";
import { SpecSheet } from "./spec-sheet";
import { Timeline } from "./timeline";
import { TodoList } from "./todo-list";

/**
 * GENUI-03a: the web renderer for a spec `AnswerBlock`. It validates the
 * block, then hands `props` straight to the kit Element named by `kind`
 * (the spec guarantees the two shapes match). Anything it cannot render,
 * an unknown kind, props that fail validation or an Element that throws,
 * shows the block's own `alt` sentence instead. It never throws.
 */
export interface AnswerBlockHandlers {
  /** Maps an image `src` (the spec carries a hub image id) to a URL the
   * browser can load. Unset: `src` is used as given. */
  resolveImageSrc?: (src: string) => string;
  /** An `image_gallery` tile was opened. */
  onImageOpen?: (blockId: string, imageId: string) => void;
  /** A `schedule_card` toggle was pressed. Unset: the card is read-only. */
  onScheduleToggle?: (blockId: string) => void;
}

export interface AnswerBlockViewProps
  extends AnswerBlockHandlers,
    Omit<ComponentProps<"div">, "children"> {
  /** A block as the hub delivers it. Validated here, so a record the schema
   * refuses, or a `kind` this kit does not know, falls back to `alt`. */
  block: unknown;
}

/** The block's `alt` sentence, or undefined when it has none. */
export function altOf(block: unknown): string | undefined {
  if (typeof block !== "object" || block === null) return undefined;
  const alt = (block as { alt?: unknown }).alt;
  return typeof alt === "string" && alt.trim() !== "" ? alt : undefined;
}

function Fallback({
  alt,
  kind,
  className,
  ...props
}: ComponentProps<"div"> & { alt: string | undefined; kind?: unknown }) {
  if (alt === undefined) return null;
  return (
    <div
      data-slot="answer-block"
      data-fallback=""
      data-kind={typeof kind === "string" ? kind : undefined}
      className={cn("text-muted-foreground max-w-sm text-[13px]", className)}
      {...props}
    >
      {alt}
    </div>
  );
}

class Guard extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// `AnswerBlock` is a z.any() refined to exactly one kind's shape, so its
// inferred type is `any`; `kind` selects which props shape the cast names.
function renderKind(
  block: any,
  { resolveImageSrc, onImageOpen, onScheduleToggle }: AnswerBlockHandlers,
): ReactNode {
  const props = block.props;
  switch (block.kind) {
    case "spec_sheet":
      return <SpecSheet {...props} visibleCount={props.rows.length} />;
    case "data_table":
      return (
        <DataTable
          {...props}
          columns={props.columns as DataTableColumn<Record<string, unknown>>[]}
        />
      );
    case "chart":
      return <Chart {...props} visibleCount={props.points.length} />;
    case "timeline":
      return <Timeline {...props} visibleCount={props.events.length} />;
    case "todo_list":
      return <TodoList {...props} />;
    case "image_gallery":
      return (
        <ImageGallery
          {...props}
          images={props.images.map((image: { src: string }) => ({
            ...image,
            src: resolveImageSrc ? resolveImageSrc(image.src) : image.src,
          }))}
          onOpen={onImageOpen && ((id) => onImageOpen(block.id, id))}
        />
      );
    case "schedule_card":
      return (
        <ScheduleCard
          {...props}
          onToggle={onScheduleToggle && (() => onScheduleToggle(block.id))}
        />
      );
    case "comparison":
      return <ComparisonCard {...props} />;
    default:
      return null;
  }
}

export function AnswerBlockView({
  block,
  resolveImageSrc,
  onImageOpen,
  onScheduleToggle,
  className,
  ...props
}: AnswerBlockViewProps) {
  const alt = altOf(block);
  const fallback = (
    <Fallback
      alt={alt}
      kind={(block as { kind?: unknown } | null)?.kind}
      className={className}
      {...props}
    />
  );
  let parsed: ReturnType<typeof AnswerBlock.safeParse>;
  try {
    parsed = AnswerBlock.safeParse(block);
  } catch {
    return fallback;
  }
  if (!parsed.success) return fallback;
  const valid = parsed.data;
  return (
    <Guard fallback={fallback}>
      <div
        data-slot="answer-block"
        data-kind={valid.kind}
        className={className}
        {...props}
      >
        {renderKind(valid, { resolveImageSrc, onImageOpen, onScheduleToggle })}
      </div>
    </Guard>
  );
}
