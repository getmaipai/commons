"use client";

import { useRef, useState, type DragEvent, type InputHTMLAttributes } from "react";
import { cn } from "@/kit/utils";

export interface DropzoneProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  onFile: (file: File) => void;
  label: string;
}

/** Small accessible file drop area, styled with the kit's existing surface tokens. */
export function Dropzone({ onFile, label, className, ...inputProps }: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const acceptFile = (file?: File) => { if (file) onFile(file); };
  const onDrop = (event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files[0]); };
  return <label className={cn("flex min-h-20 cursor-pointer items-center justify-center rounded-md border border-dashed p-4 text-sm text-muted-foreground", dragging && "border-primary bg-primary/5", className)} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
    {label}<input {...inputProps} ref={input} type="file" className="sr-only" onChange={event => acceptFile(event.currentTarget.files?.[0])} />
  </label>;
}
