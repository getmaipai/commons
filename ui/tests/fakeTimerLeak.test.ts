import { describe, expect, test, jest } from "bun:test"
import { loadKitCatalog } from "@/kit/i18n"

// A file that leaves jest.useFakeTimers() on used to hang the next file in the same bun process (gate batch, 0% CPU, no output).
// tests/preload.ts restores real timers after every test; the first test plays the leaking file, the second the file after it.
describe("fake timers do not leak into the next test", () => {
  test("leaves fake timers on", () => {
    jest.useFakeTimers()
    expect(setTimeout).not.toBe(undefined)
  })

  test("setTimeout is real again and loadKitCatalog settles within a second", async () => {
    let fired = false
    setTimeout(() => { fired = true }, 5)
    await new Promise<void>(resolve => setTimeout(resolve, 30))
    expect(fired).toBe(true)
    const settled = await Promise.race([
      loadKitCatalog("es").then(() => "settled"),
      new Promise<string>(resolve => setTimeout(() => resolve("hung"), 1000)),
    ])
    expect(settled).toBe("settled")
  })
})
