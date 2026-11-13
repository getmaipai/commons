import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom"
import { useEffect, useRef } from "react"
import { motionMs, motionStopped } from "./motion"
import { useInsertedKeys } from "./useInsertedKeys"
import { useRouteFade } from "./useRouteFade"

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute("data-ease-motion")
})

describe("useInsertedKeys", () => {
  function List({ keys, out }: { keys: string[]; out: { current: ReadonlySet<string> | null } }) {
    out.current = useInsertedKeys(keys)
    return null
  }
  test("the first render flags nothing, a later arrival is flagged and stays flagged", () => {
    const out = { current: null as ReadonlySet<string> | null }
    const view = render(<List keys={["a", "b"]} out={out} />)
    expect([...out.current!]).toEqual([])
    view.rerender(<List keys={["a", "b", "c"]} out={out} />)
    expect([...out.current!]).toEqual(["c"])
    view.rerender(<List keys={["a", "b", "c"]} out={out} />)
    expect([...out.current!]).toEqual(["c"])
  })
})

describe("motion helpers", () => {
  test("calm stops script motion, and a token reads as milliseconds", () => {
    document.documentElement.setAttribute("data-ease-motion", "calm")
    expect(motionStopped()).toBe(true)
    document.documentElement.style.setProperty("--motion-fade-in", "0.16s")
    expect(motionMs("--motion-fade-in", 1)).toBe(160)
    document.documentElement.style.removeProperty("--motion-fade-in")
  })
})

describe("useRouteFade", () => {
  test("fades the body on a path change, not on the first render", () => {
    const calls: number[] = []
    const original = HTMLElement.prototype.animate
    HTMLElement.prototype.animate = (() => {
      calls.push(1)
      return {} as Animation
    }) as unknown as typeof HTMLElement.prototype.animate
    function Body() {
      const ref = useRef<HTMLDivElement>(null)
      const go = useNavigate()
      useRouteFade(ref)
      useEffect(() => {
        const t = setTimeout(() => go("/two"), 0)
        return () => clearTimeout(t)
      }, [go])
      return <div ref={ref} />
    }
    const view = render(<MemoryRouter><Routes><Route path="*" element={<Body />} /></Routes></MemoryRouter>)
    expect(calls.length).toBe(0)
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        HTMLElement.prototype.animate = original
        expect(calls.length).toBe(1)
        view.unmount()
        resolve()
      }, 30),
    )
  })
})

