import { LightTile } from "./light-tile";
import { SwitchTile } from "./switch-tile";
import { SceneTile } from "./scene-tile";
import { LockTile } from "./lock-tile";
import { FanTile } from "./fan-tile";
import { CoverTile } from "./cover-tile";
import { ClimateTile } from "./climate-tile";
import { RoomHeader } from "./room-header";

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
    <FanTile name="Ceiling fan" room="Bedroom" on percentage={70} onToggle={()=>{}} onPercentage={()=>{}} />
    <FanTile name="Window fan" room="Office" on={false} percentage={0} onToggle={()=>{}} onPercentage={()=>{}} />
    <CoverTile name="Living room blind" room="Living room" position={45} onOpen={()=>{}} onStop={()=>{}} onClose={()=>{}} />
    <CoverTile name="Garage cover" room="Garage" position={0} pending onOpen={()=>{}} onStop={()=>{}} onClose={()=>{}} />
    <ClimateTile name="Thermostat" room="Hall" mode="heat" current={19} target={21.5} min={16} max={28} unit="°" onTarget={()=>{}} />
    <ClimateTile name="Bedroom AC" room="Bedroom" mode="cool" current={26} target={23} min={16} max={28} onTarget={()=>{}} />
    <div className="sm:col-span-2"><RoomHeader name="Kitchen" onCount={2} total={3} onToggleAll={()=>{}}>
      <SwitchTile name="Kettle" room="Kitchen" on onToggle={()=>{}} />
      <SwitchTile name="Dishwasher" room="Kitchen" on={false} onToggle={()=>{}} />
      <SceneTile name="Dinner" room="Kitchen" onActivate={()=>{}} />
    </RoomHeader></div>
  </div>;
}
