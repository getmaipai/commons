import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { SceneTile } from "./scene-tile";
afterEach(cleanup);
describe("SceneTile", () => { test("activates on press and names room",()=>{let n=0;const v=render(<SceneTile name="Movie" room="Den" onActivate={()=>n++}/>);fireEvent.click(v.getByRole("button",{name:"Movie"}));expect(n).toBe(1);expect(v.getByText("Den")).toBeTruthy();}); test("keeps label readable",()=>{const v=render(<SceneTile name="Movie" room="Den" onActivate={()=>{}}/>);expect(v.getByRole("button",{name:"Movie"})).toBeTruthy();}); });
