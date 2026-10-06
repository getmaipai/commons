"use client";

import type { ComponentProps } from "react";
import { AttachmentPrimitive, ComposerPrimitive } from "@assistant-ui/react";
import { PlusIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { field, ghostButton } from "./surfaces";

/**
 * Runtime form of the composer's attachments: the chips track whatever the
 * thread's attachment adapter stages. Vendored from assistant-ui's
 * `composer-attachments` Element. It adds nothing a runtime does not already
 * have; with no adapter configured it renders no chips and the add button
 * stays inert. The standalone chip lives in `composer.tsx`.
 */
export function ComposerAttachmentsRow({
  removeLabel = (name) => `Remove ${name}`,
  className,
}: {
  /** The remove button's accessible name for a given file. */
  removeLabel?: (name: string) => string;
  className?: string;
}) {
  return (
    <ComposerPrimitive.Attachments>
      {({ attachment }) => (
        <AttachmentPrimitive.Root
          data-slot="composer-attachment-runtime"
          className={cn(
            field,
            "flex items-center gap-2.5 rounded-[14px] py-1.5 ps-1.5 pe-2.5",
            className,
          )}
        >
          <span className="max-w-36 truncate ps-1.5 text-xs font-medium">
            <AttachmentPrimitive.Name />
          </span>
          {attachment.status.type !== "running" && (
            <AttachmentPrimitive.Remove
              aria-label={removeLabel(attachment.name)}
              className={cn(ghostButton, "size-5")}
            >
              <XIcon className="size-3" />
            </AttachmentPrimitive.Remove>
          )}
        </AttachmentPrimitive.Root>
      )}
    </ComposerPrimitive.Attachments>
  );
}

export function AddAttachmentButton({
  label = "Add attachment",
  className,
  ...props
}: Omit<ComponentProps<typeof ComposerPrimitive.AddAttachment>, "children"> & {
  label?: string;
}) {
  return (
    <ComposerPrimitive.AddAttachment
      aria-label={label}
      className={cn(ghostButton, "size-8", className)}
      {...props}
    >
      <PlusIcon className="size-4" />
    </ComposerPrimitive.AddAttachment>
  );
}

/** Marks the composer bar as a drop target; `data-dragging` is set mid-drag. */
export function ComposerAttachmentDropzone({
  className,
  ...props
}: ComponentProps<typeof ComposerPrimitive.AttachmentDropzone>) {
  return (
    <ComposerPrimitive.AttachmentDropzone
      className={cn(
        "data-[dragging=true]:border-dashed data-[dragging=true]:bg-blue-500/[0.04]",
        className,
      )}
      {...props}
    />
  );
}
