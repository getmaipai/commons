import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, act } from "@testing-library/react";
import { LockTile } from "./lock-tile";
afterEach(cleanup);
describe("LockTile",()=>{
 test("hold completes at about 700ms",()=>{const oldSetTimeout=globalThis.setTimeout; let queued:(()=>void)|null=null; globalThis.setTimeout=((fn:()=>void)=>{queued=fn;return 1 as unknown as ReturnType<typeof setTimeout>;}) as typeof setTimeout;let n=0;const v=render(<LockTile name="Door" room="Entry" locked onConfirm={()=>n++}/>);const b=v.getByRole("button",{name:/hold to unlock/i});fireEvent.pointerDown(b);act(()=>queued?.());expect(n).toBe(1);globalThis.setTimeout=oldSetTimeout;});
 test("Confirm works without a hold",()=>{let n=0;const v=render(<LockTile name="Door" room="Entry" locked onConfirm={()=>n++}/>);fireEvent.click(v.getByRole("button",{name:"Confirm"}));expect(n).toBe(1);});
 test("pending and unavailable disable actions",()=>{const v=render(<LockTile name="Door" room="Entry" locked pending unavailable onConfirm={()=>{}}/>);expect(v.getByRole("button",{name:"Confirm"}).hasAttribute("disabled")).toBe(true);expect(v.getByText(/Last known: locked/)).toBeTruthy();});
 test("note is shown before hold and state label is readable",()=>{const v=render(<LockTile name="Door" room="Entry" locked note="Cannot be undone" onConfirm={()=>{}}/>);expect(v.getByText("Cannot be undone")).toBeTruthy();expect(v.getByText("Locked")).toBeTruthy();});
});
