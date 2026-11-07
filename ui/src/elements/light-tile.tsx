"use client";
import { useRef } from "react";
import type { CSSProperties } from "react";
import { LightbulbIcon } from "lucide-react";
import { Slider } from "@/kit/ui/slider";
import { Switch } from "@/kit/ui/switch";
import { i18n } from "@/kit/i18n"

export interface LightTileProps { name:string; room:string; on:boolean; brightness:number; pending?:boolean; unavailable?:boolean; swatch?:string; onToggle:()=>void; onBrightness:(value:number)=>void }
type GlowStyle = CSSProperties & { "--device-swatch"?: string };
export function LightTile({name,room,on,brightness,pending=false,unavailable=false,swatch,onToggle,onBrightness}:LightTileProps) {
 const start=useRef<number|null>(null); const last=useRef(brightness); const disabled=pending||unavailable;
 const glowStyle:GlowStyle={opacity:on?Math.max(.08,brightness/100):0,"--device-swatch":swatch};
 return <article data-slot="light-tile" className="relative isolate flex w-full max-w-sm flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 text-card-foreground" data-state={on?"on":"off"}>
  <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-300 motion-reduce:transition-none" style={{ ...glowStyle, backgroundColor: swatch ? "var(--device-swatch)" : "var(--primary)" }} data-slot="light-glow" />
  <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground"><LightbulbIcon className="size-5" aria-hidden/></span><div><h3 className="text-sm font-medium">{name}</h3><p className="text-muted-foreground text-xs">{room}</p></div></div><Switch aria-label={name} checked={on} disabled={disabled} onCheckedChange={onToggle}/></div>
  <div className="flex items-center justify-between text-xs"><span>{unavailable?(on?i18n._({ id: "ui.Last known: on", message: "Last known: on" }):i18n._({ id: "ui.Last known: off", message: "Last known: off" })):on?i18n._({ id: "ui.On", message: "On" }):i18n._({ id: "ui.Off", message: "Off" })}</span>{pending?<span role="status" className="text-muted-foreground">{i18n._({ id: "ui.Updating…", message: "Updating…" })}</span>:null}</div>
  <label className="text-muted-foreground text-xs" htmlFor={`brightness-${name.replace(/[^\w-]/g,"-")}`}>{i18n._({ id: "ui.Brightness", message: "Brightness" })}</label>
  <Slider id={`brightness-${name.replace(/[^\w-]/g,"-")}`} aria-label={i18n._({ id: "ui.{name} brightness", message: "{name} brightness", values: { name } })} min={0} max={100} step={1} value={[brightness]} disabled={disabled} onValueChange={([v])=>{if(v!==undefined)last.current=v;}} onValueCommit={([v])=>{if(v!==undefined)onBrightness(v);start.current=null;}} onPointerDown={()=>{start.current=brightness;}} />
 </article>;
}
