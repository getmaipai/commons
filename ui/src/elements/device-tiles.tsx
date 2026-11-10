"use client";
import { i18n } from "@/kit/i18n";
import { LightTile } from "@/kit/elements/light-tile";
import { SwitchTile } from "@/kit/elements/switch-tile";
import { FanTile } from "@/kit/elements/fan-tile";
import { CoverTile } from "@/kit/elements/cover-tile";
import { LockTile } from "@/kit/elements/lock-tile";
import { SceneTile } from "@/kit/elements/scene-tile";
import { ClimateTile, type ClimateMode } from "@/kit/elements/climate-tile";

export type DeviceKind = "light" | "switch" | "fan" | "cover" | "lock" | "scene" | "climate";
export const DEVICE_KINDS: readonly DeviceKind[] = ["light", "switch", "fan", "cover", "lock", "scene", "climate"];

/** What a tile asks for. `value` is the slider or setpoint number where there is one. */
export type DeviceCommand = "toggle" | "brightness" | "percentage" | "open" | "stop" | "close" | "confirm" | "activate" | "target";

type Row = Record<string, unknown>;

export interface DeviceTilesProps {
  /** Device rows: `{id, kind, name, state, room?, on?, brightness?, percentage?, position?, locked?, mode?, current?, target?, min?, max?, unit?, pending?, unavailable?, swatch?, note?}`. */
  devices: readonly Row[];
  /** A tile was used. The caller decides what it does (the schema node runs the row's own `action`). */
  onCommand?: (device: Row, command: DeviceCommand, value?: number) => void;
  /** Accessible name of the grid. */
  label?: string;
}

const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Whether a row reads as on: `on` wins, else a state word. */
function isOn(row: Row): boolean {
  if (typeof row.on === "boolean") return row.on;
  const state = str(row.state).toLowerCase();
  return state === "on" || state === "open" || state === "opening" || state === "heat" || state === "cool";
}

/** MEDIA-PARITY-02: a grid of the kit's smart-home tiles from device rows. Two columns on a phone. A row with `pending` (or
 * state `pending`) shows the tile's updating ring and takes no input; one with `unavailable` (or state `unavailable`) shows its
 * last known state, disabled. An unknown kind draws as a switch. */
export function DeviceTiles({ devices, onCommand, label }: DeviceTilesProps) {
  const send = (row: Row, command: DeviceCommand, value?: number) => onCommand?.(row, command, value);
  return (
    <ul aria-label={label ?? i18n._({ id: "ui.Devices", message: "Devices" })} data-slot="device-tiles" className="m-0 grid min-w-0 list-none grid-cols-2 gap-3 p-0 md:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]">
      {devices.map((row, i) => {
        const state = str(row.state).toLowerCase();
        const pending = row.pending === true || state === "pending";
        const unavailable = row.unavailable === true || state === "unavailable" || state === "unknown";
        const name = str(row.name) || str(row.title);
        const room = str(row.room);
        const kind = (DEVICE_KINDS as readonly string[]).includes(str(row.kind)) ? (str(row.kind) as DeviceKind) : "switch";
        const on = isOn(row);
        let tile;
        switch (kind) {
          case "light":
            tile = <LightTile name={name} room={room} on={on} brightness={num(row.brightness, on ? 100 : 0)} swatch={str(row.swatch) || undefined} pending={pending} unavailable={unavailable} onToggle={() => send(row, "toggle")} onBrightness={(v) => send(row, "brightness", v)} />;
            break;
          case "fan":
            tile = <FanTile name={name} room={room} on={on} percentage={num(row.percentage, on ? 100 : 0)} pending={pending} unavailable={unavailable} onToggle={() => send(row, "toggle")} onPercentage={(v) => send(row, "percentage", v)} />;
            break;
          case "cover":
            tile = <CoverTile name={name} room={room} position={num(row.position, state === "open" ? 100 : 0)} pending={pending} unavailable={unavailable} onOpen={() => send(row, "open")} onStop={() => send(row, "stop")} onClose={() => send(row, "close")} />;
            break;
          case "lock":
            tile = <LockTile name={name} room={room} locked={typeof row.locked === "boolean" ? row.locked : state !== "unlocked"} note={str(row.note) || undefined} pending={pending} unavailable={unavailable} onConfirm={() => send(row, "confirm")} />;
            break;
          case "scene":
            tile = <SceneTile name={name} room={room} onActivate={() => send(row, "activate")} />;
            break;
          case "climate": {
            const mode: ClimateMode = row.mode === "heat" || row.mode === "cool" ? row.mode : "off";
            tile = <ClimateTile name={name} room={room} mode={mode} current={num(row.current, num(row.target, 20))} target={num(row.target, 20)} min={num(row.min, 10)} max={num(row.max, 30)} step={typeof row.step === "number" ? row.step : undefined} unit={str(row.unit) || undefined} pending={pending} unavailable={unavailable} onTarget={(v) => send(row, "target", v)} />;
            break;
          }
          default:
            tile = <SwitchTile name={name} room={room} on={on} pending={pending} unavailable={unavailable} onToggle={() => send(row, "toggle")} />;
        }
        return <li key={str(row.id) || `${name}-${i}`} data-kind={kind} className="flex min-w-0 [&>*]:max-w-none">{tile}</li>;
      })}
    </ul>
  );
}
