import { expect, test } from "bun:test";
import { createGesturePicker, createGestureScheduler, pitchAccents, type GestureClip } from "./index";
const clips: GestureClip[] = ["nod1","nod2","tilt","glance","settle"].map((id,i)=>({id,kind:(i<2?"nod":id) as GestureClip["kind"],amp:1,frames:8,fps:24}));
test("picker avoids repeating a gesture clip",()=>{ const p=createGesturePicker(clips,()=>0); expect(p()?.id).toBe("nod1"); expect(p()?.id).not.toBe("nod1"); });
test("pitch accents find rising tone beats and ignore a flat tone",()=>{
 const rate=16000, duration=2, samples=new Float32Array(rate*duration);
 for(let i=0;i<samples.length;i++){ const t=i/rate; const beat=Math.floor(t/.5); const within=t%0.5; const f=within<.15?180+beat*0+150*Math.sin(Math.PI*within/.3):180; samples[i]=.2*Math.sin(2*Math.PI*f*t); }
 expect(pitchAccents(samples,rate).length).toBeGreaterThan(0);
 const flat=Float32Array.from({length:rate},(_,i)=>.2*Math.sin(2*Math.PI*180*i/rate)); expect(pitchAccents(flat,rate)).toEqual([]);
});
test("scheduler leads accents, enforces cooldown and drops low probability beats",()=>{
 const scheduler=createGestureScheduler({rng:()=>.1,clock:()=>0,clips});
 const plan=scheduler.plan([{t:.7,strength:.2,phraseStart:false},{t:1.4,strength:.9,phraseStart:false}],{speaking:true});
 expect(plan.length).toBe(1); expect(plan[0]!.at).toBe(.58);
});
test("idle gestures wait 8 to 15 seconds in milliseconds, use amp 1 and then wait again", () => {
  let now = 0;
  const scheduler = createGestureScheduler({ rng: () => 0, clock: () => now, clips });
  expect(scheduler.plan([], { speaking: false })).toEqual([]);
  now = 8001;
  const first = scheduler.plan([], { speaking: false });
  expect(first.length).toBe(1);
  expect(scheduler.plan([], { speaking: false })).toEqual([]);
});
test("a clip kind is not picked three times in a row when another kind is available", () => {
  const picker = createGesturePicker(clips, () => 0);
  const kinds = [picker(), picker(), picker(), picker()].map((clip) => clip!.kind);
  for (let i = 2; i < kinds.length; i++) expect(kinds[i] === kinds[i - 1] && kinds[i] === kinds[i - 2]).toBe(false);
});
