import { LightTile } from "./light-tile";
import { SwitchTile } from "./switch-tile";
import { SceneTile } from "./scene-tile";
import { LockTile } from "./lock-tile";

/** State gallery for the smart-home device card elements. */
export function DeviceCardsShowcase() {
  return <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2">
    <LightTile name="Reading light" room="Living room" on brightness={72} onToggle={()=>{}} onBrightness={()=>{}} />
    <LightTile name="Porch light" room="Front porch" on={false} brightness={0} pending onToggle={()=>{}} onBrightness={()=>{}} />
    <LightTile name="Desk light" room="Office" on brightness={35} unavailable onToggle={()=>{}} onBrightness={()=>{}} />
    <SwitchTile name="Ceiling fan" room="Bedroom" on onToggle={()=>{}} />
    <SwitchTile name="Ventilation" room="Bathroom" on={false} pending onToggle={()=>{}} />
    <SwitchTile name="Garden pump" room="Garden" on unavailable onToggle={()=>{}} />
    <SceneTile name="Movie night" room="Living room" onActivate={()=>{}} />
    <LockTile name="Front door" room="Entry" locked note="Unlocking cannot be undone remotely." onConfirm={()=>{}} />
    <LockTile name="Garage door" room="Garage" locked={false} pending onConfirm={()=>{}} />
    <LockTile name="Side door" room="Mudroom" locked unavailable onConfirm={()=>{}} />
  </div>;
}
