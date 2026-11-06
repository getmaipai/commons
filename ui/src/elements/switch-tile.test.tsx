import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { SwitchTile } from "./switch-tile";
afterEach(cleanup);
describe("SwitchTile", () => {
  test("renders and toggles", () => { let n=0; const v=render(<SwitchTile name="Fan" room="Office" on={false} onToggle={()=>n++}/>); fireEvent.click(v.getByRole("switch",{name:"Fan"})); expect(n).toBe(1); expect(v.getByText("Off")).toBeTruthy(); });
  test("pending and unavailable disable control", () => { const v=render(<SwitchTile name="Fan" room="Office" on pending unavailable onToggle={()=>{}}/>); expect(v.getByRole("switch",{name:"Fan"}).hasAttribute("disabled")).toBe(true); expect(v.getByText("Last known: on")).toBeTruthy(); });
  test("labels remain readable", () => { const v=render(<SwitchTile name="Fan" room="Office" on onToggle={()=>{}}/>); expect(v.getByText("On")).toBeTruthy(); });
});
