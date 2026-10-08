"use client";

import { Component, type ComponentProps, type ReactNode } from "react";
import { AnswerBlock as AnswerBlockSchema } from "@maipai/spec/gen/ts/answer-block.js";
import type { AnswerBlock as AnswerBlockRecord } from "@maipai/spec/gen/ts/answer-block.js";
import { cn } from "cn";
import { Chart } from "./chart";
import { ComparisonCard } from "./comparison-card";
import { DataTable, type DataTableSort } from "./data-table";
import { ImageGallery, type GalleryImage } from "./image-gallery";
import { ScheduleCard } from "./schedule-card";
import { SpecSheet } from "./spec-sheet";
import { Timeline } from "./timeline";
import { TodoList } from "./todo-list";
import { paper } from "./surfaces";

export type { AnswerBlockRecord };

export interface AnswerBlockHandlers {
  /** Maps a picture reference to a displayable address. Unset: used as is. */
  resolveImageSrc?: (src: string) => string;
  /** A gallery picture was opened. */
  onOpenImage?: (blockId: string, imageId: string) => void;
  /** The schedule card's toggle was pressed. Unset: no toggle is drawn. */
  onToggleSchedule?: (blockId: string) => void;
  /** A sortable data-table header was pressed. */
  onSortChange?: (blockId: string, sort: DataTableSort | null) => void;
}

export type AnswerBlockProps = Omit<ComponentProps<"div">, "children"> &
  AnswerBlockHandlers & {
    /** A block from `@maipai/spec`. Checked again here; see the fallback. */
    block: AnswerBlockRecord;
  };

/** The block's `alt` sentence, or `undefined` when it carries none. */
const altOf = (block: unknown) => {
  const alt = (block as { alt?: unknown } | null | undefined)?.alt;
  return typeof alt === "string" && alt.trim() !== "" ? alt : undefined;
};

function Fallback({
  alt,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & { alt: string | undefined }) {
  if (alt === undefined) return null;
  return (
    <div
      data-slot="answer-block-fallback"
      className={cn(
        paper,
        "text-muted-foreground w-full max-w-sm rounded-2xl p-4 text-[13px]",
        className,
      )}
      {...props}
    >
      {alt}
    </div>
  );
}

class RenderGuard extends Component<
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

function Body({
  block,
  resolveImageSrc,
  onOpenImage,
  onToggleSchedule,
  onSortChange,
  ...rest
}: AnswerBlockHandlers & {
  block: AnswerBlockRecord;
} & Omit<ComponentProps<"div">, "children">) {
  const id = block.id;
  switch (block.kind) {
    case "spec_sheet":
      return (
        <SpecSheet
          {...block.props}
          visibleCount={block.props.rows.length}
          {...rest}
        />
      );
    case "data_table": {
      const { sort, ...props } = block.props;
      return (
        <DataTable
          {...props}
          {...(sort === undefined ? {} : { sort })}
          {...(onSortChange ? { onSortChange: (s: DataTableSort | null) => onSortChange(id, s) } : {})}
          {...rest}
        />
      );
    }
    case "chart":
      return (
        <Chart
          {...block.props}
          visibleCount={block.props.points.length}
          {...rest}
        />
      );
    case "timeline":
      return (
        <Timeline
          {...block.props}
          visibleCount={block.props.events.length}
          {...rest}
        />
      );
    case "todo_list":
      return <TodoList {...block.props} {...rest} />;
    case "image_gallery": {
      const images = block.props.images.map((image: GalleryImage) => ({
        ...image,
        src: resolveImageSrc ? resolveImageSrc(image.src) : image.src,
      }));
      return (
        <ImageGallery
          {...block.props}
          images={images}
          {...(onOpenImage ? { onOpen: (imageId: string) => onOpenImage(id, imageId) } : {})}
          {...rest}
        />
      );
    }
    case "schedule_card":
      return (
        <ScheduleCard
          {...block.props}
          {...(onToggleSchedule ? { onToggle: () => onToggleSchedule(id) } : {})}
          {...rest}
        />
      );
    case "comparison":
      return <ComparisonCard {...block.props} {...rest} />;
    default:
      return <Fallback alt={altOf(block)} {...rest} />;
  }
}

/**
 * GENUI-03a: renders one `AnswerBlock` with the kit Element of the same kind.
 * A block that fails the schema (an unknown `kind`, bad `props`), or an
 * Element that throws while rendering, shows the block's `alt` sentence
 * instead; it never throws. A block with no usable `alt` renders nothing.
 */
export function AnswerBlock({ block, ...props }: AnswerBlockProps) {
  const {
    resolveImageSrc,
    onOpenImage,
    onToggleSchedule,
    onSortChange,
    ...rest
  } = props;
  const parsed = AnswerBlockSchema.safeParse(block);
  const { className, ...divProps } = rest;
  const fallback = <Fallback alt={altOf(block)} className={className} {...divProps} />;
  if (!parsed.success) return fallback;
  return (
    <RenderGuard fallback={fallback}>
      <Body
        block={parsed.data}
        {...(resolveImageSrc ? { resolveImageSrc } : {})}
        {...(onOpenImage ? { onOpenImage } : {})}
        {...(onToggleSchedule ? { onToggleSchedule } : {})}
        {...(onSortChange ? { onSortChange } : {})}
        {...rest}
      />
    </RenderGuard>
  );
}
