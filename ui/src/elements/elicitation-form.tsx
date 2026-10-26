"use client";

import { useState, type ComponentProps } from "react";
import { CheckIcon, PlugIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { Input } from "./ui/input";
import { Button } from "../dashboard/components/ui/button";
import { Calendar } from "../dashboard/components/ui/calendar";
import { OptionList } from "./option-list";
import { QuestionFlow } from "./question-flow";
import { mono, paper } from "./surfaces";

export type ElicitationState = "request" | "accepted" | "declined";
export type AskFieldKind = "text" | "number" | "date_time" | "choice" | "yes_no";
export type ElicitationValue = string | number | boolean;

export interface AskField {
  name: string;
  label: string;
  kind: AskFieldKind;
  required: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  max_length?: 500;
  options?: readonly string[];
  /** Date and time input presentation for a date_time value. */
  inputType?: "date" | "time" | "datetime-local";
}

/** Legacy shape retained for existing callers. */
export interface ElicitationField {
  name: string;
  label: string;
  value: string;
  kind: "text" | "choice" | "toggle";
  options?: readonly string[];
  required?: boolean;
  placeholder?: string;
  max_length?: 500;
}

type Field = AskField | ElicitationField;

function kindOf(field: Field): AskFieldKind {
  return field.kind === "toggle" ? "yes_no" : field.kind;
}

function inputValue(field: Field): string {
  return "value" in field ? field.value : "";
}

function optionListOptions(field: Field) {
  return (field.options ?? (kindOf(field) === "yes_no" ? ["Yes", "No"] : [])).map((label) => ({ id: label, label }));
}

export function ElicitationForm({
  server,
  message,
  fields,
  state,
  onAccept,
  onDecline,
  onSubmit,
  submitting = false,
  error,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "server" | "message" | "fields" | "state" | "onAccept" | "onDecline" | "onSubmit"> & {
  server: string;
  message: string;
  fields: readonly Field[];
  state: ElicitationState;
  onAccept?: () => void;
  onDecline?: () => void;
  onSubmit?: (values: Record<string, ElicitationValue>) => void | Promise<void>;
  submitting?: boolean;
  error?: string | null;
}) {
  const initialValues = Object.fromEntries(fields.map((item) => [item.name, inputValue(item)]));
  const [values, setValues] = useState<Record<string, string | boolean>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const isSubmitting = submitting || busy;

  const setValue = (name: string, value: string | boolean) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    for (const item of fields) {
      const value = values[item.name];
      const kind = kindOf(item);
      if (item.required && (value === undefined || value === "")) {
        next[item.name] = "This field is required.";
      } else if (kind === "text" && typeof value === "string" && value.length > (item.max_length ?? 500)) {
        next[item.name] = `Enter no more than ${item.max_length ?? 500} characters.`;
      } else if (kind === "number" && value !== "" && value !== undefined) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) next[item.name] = "Enter a valid number.";
        else if ("min" in item && item.min !== undefined && numeric < item.min) next[item.name] = `Enter a number at least ${item.min}.`;
        else if ("max" in item && item.max !== undefined && numeric > item.max) next[item.name] = `Enter a number no greater than ${item.max}.`;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate() || !onSubmit || isSubmitting) return;
    const payload: Record<string, ElicitationValue> = {};
    for (const item of fields) {
      const kind = kindOf(item);
      const value = values[item.name];
      if (value === "" || value === undefined) continue;
      if (kind === "number") payload[item.name] = Number(value);
      else if (kind === "yes_no") payload[item.name] = value === true || value === "Yes" || value === "yes";
      else payload[item.name] = String(value);
    }
    setBusy(true);
    try {
      await onSubmit(payload);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-slot="elicitation-form" className={cn(paper, "flex w-full max-w-sm flex-col gap-3.5 rounded-[20px] p-4", className)} {...props}>
      <div className="flex items-center gap-2.5">
        <span className="bg-foreground/[0.05] text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-lg"><PlugIcon className="size-3.5" /></span>
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{server}</span>
        <span className={cn(mono, "text-muted-foreground shrink-0")}>needs input</span>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">{message}</p>
      <div className="flex min-w-0 flex-col gap-3">
        {fields.map((item) => {
          const kind = kindOf(item);
          const value = values[item.name];
          const options = optionListOptions(item);
          const selected = kind === "yes_no" ? (value === true || value === "Yes" || value === "yes" ? "Yes" : value === false || value === "No" || value === "no" ? "No" : "") : String(value ?? "");
          return <div key={item.name} className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`elicitation-${item.name}`} className={cn(mono, "text-muted-foreground")}>{item.label}{item.required && <span aria-hidden="true"> *</span>}</label>
            {kind === "choice" ? (
              <QuestionFlow steps={[{ id: item.name, question: item.label, options }]} defaultValue={selected ? { [item.name]: [selected] } : undefined} onComplete={(answers) => setValue(item.name, answers[item.name]?.[0] ?? "")} className="max-w-none border-0 bg-transparent p-0 dark:bg-transparent" />
            ) : kind === "yes_no" ? (
              <div id={`elicitation-${item.name}`}>
                <OptionList options={options} defaultValue={selected ? [selected] : undefined} onConfirm={(ids) => setValue(item.name, ids[0] === "Yes")} className="max-w-none border-0 bg-transparent p-0 dark:bg-transparent" />
              </div>
            ) : kind === "date_time" && (item as AskField).inputType === "date" ? (
              <Calendar mode="single" selected={value ? new Date(`${value}T12:00:00`) : undefined} onSelect={(date) => setValue(item.name, date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : "")} />
            ) : (
              <Input id={`elicitation-${item.name}`} aria-invalid={Boolean(errors[item.name]) || undefined} type={kind === "number" ? "number" : kind === "date_time" ? ((item as AskField).inputType ?? "datetime-local") : "text"} value={value === true ? "Yes" : value === false ? "No" : String(value ?? "")} placeholder={item.placeholder} maxLength={kind === "text" ? item.max_length ?? 500 : undefined} min={kind === "number" && "min" in item ? item.min : undefined} max={kind === "number" && "max" in item ? item.max : undefined} onChange={(event) => setValue(item.name, event.currentTarget.value)} />
            )}
            {errors[item.name] ? <p className="text-destructive text-xs" role="alert">{errors[item.name]}</p> : null}
          </div>;
        })}
      </div>
      {error ? <div role="alert" data-slot="alert" className="border-destructive/30 text-destructive rounded-lg border px-3 py-2 text-xs">{error}</div> : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {state === "request" ? <>
          <Button type="button" variant="ghost" onClick={onDecline} disabled={isSubmitting}>Decline</Button>
          {onSubmit ? <Button type="button" onClick={() => void submit()} disabled={isSubmitting || fields.some((item) => item.required && (values[item.name] === "" || values[item.name] === undefined))}>{isSubmitting ? "Submitting…" : "Submit"}</Button> : <Button type="button" onClick={onAccept}>Send</Button>}
        </> : <span className="text-muted-foreground flex items-center gap-2 text-xs">{state === "accepted" ? <><CheckIcon className="size-3.5 text-status-ok" />Sent to {server}</> : <><XIcon className="size-3.5" />Declined</>}</span>}
      </div>
    </div>
  );
}
