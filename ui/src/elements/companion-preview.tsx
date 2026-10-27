import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/kit/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/kit/ui/hover-card";
import { Input } from "@/kit/ui/input";
import { icons } from "@/kit/icons";

export interface CompanionPreviewProps {
  name: string;
  trigger: ReactNode;
  ready?: boolean;
  context?: string;
  lastLine?: string;
  askPlaceholder: string;
  onAsk: (text: string) => void;
  onMic?: () => void;
  action?: ReactNode;
  openDelay?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  listeningLine?: string;
  onTurnOff?: () => void;
}

export function CompanionPreview({ name, trigger, ready, context, lastLine, askPlaceholder, onAsk, onMic, action, openDelay = 300, open, onOpenChange, listeningLine, onTurnOff }: CompanionPreviewProps) {
  const [text, setText] = useState("");
  const Mic = icons.mic;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    onAsk(value);
    setText("");
  };

  return <HoverCard openDelay={openDelay} open={open} onOpenChange={onOpenChange}>
    <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
    <HoverCardContent align="end" className="w-80">
      {listeningLine ? <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3">
        <p className="text-sm text-foreground">{listeningLine}</p>
        {onTurnOff ? <Button type="button" variant="outline" size="sm" onClick={onTurnOff}>Turn off</Button> : null}
      </div> : null}
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate font-medium">{name}</h3>
        {ready ? <span className="text-sm text-muted-foreground">Ready</span> : null}
      </div>
      {context ? <p className="mt-1 text-sm text-muted-foreground">{context}</p> : null}
      {lastLine ? <p className="mt-2 text-sm text-foreground">{lastLine}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
      <form className="mt-3 flex items-center gap-2" onSubmit={submit}>
        <Input aria-label={`Ask ${name}`} placeholder={askPlaceholder} value={text} onChange={(event) => setText(event.target.value)} />
        {onMic ? <Button type="button" variant="ghost" size="icon-sm" aria-label="Use microphone" onClick={onMic}><Mic aria-hidden="true" /></Button> : null}
        <Button type="submit" size="icon-sm" aria-label={`Send to ${name}`} disabled={!text.trim()}><icons.send aria-hidden="true" /></Button>
      </form>
    </HoverCardContent>
  </HoverCard>;
}
