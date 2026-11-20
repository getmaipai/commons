// Layout sweep (kit rule: a global CSS change ships with a before and after layout diff). Renders each showcase page at 1280 and 375 px from a
// Vite preview (default http://127.0.0.1:9941/kit-preview.html?e=<page>, a page in a Home worktree that imports the showcases from the kit under test)
// and records, for every focusable or positioned element, its computed position and box, into $SWEEP_OUT/sweep-<label>.json (default /tmp). Run it once per kit version (for example the last tag and the change), then compare with sweepdiff.py.
// Needs Playwright (any Chromium). Written during A11Y-DEBT-01, where a global `position: relative` rule broke every `.absolute` handle.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const label = process.argv[2];
const pages = ["gallery","storyboard","mediastage","videoplayer","companions","retake","settings","tileloop","compare","actionbar","proposal","voice","jobshots"];
const b = await chromium.launch(); const out = {};
for (const [w,h] of [[1280,800],[375,812]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, colorScheme: "light" }); const p = await c.newPage();
  for (const e of pages) {
    await p.goto(`http://127.0.0.1:9941/kit-preview.html?e=${e}`); await p.waitForTimeout(2200);
    out[`${w}|${e}`] = await p.evaluate(() => {
      const SEL = 'button, a[href], input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="slider"], [tabindex]:not([tabindex="-1"]), [class*="absolute"], [class*="fixed"], [class*="sticky"]';
      return [...document.querySelectorAll(SEL)].filter((e) => !e.closest("[aria-hidden=true]")).map((e, i) => { const cs = getComputedStyle(e); const rc = e.getBoundingClientRect(); const cls = typeof e.className === "string" ? e.className : ""; const m = cls.match(/(^|\s)(absolute|fixed|sticky)(\s|$)/); return { i, tag: e.tagName.toLowerCase(), label: (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 30), pos: cs.position, wantPos: m ? m[2] : null, x: Math.round(rc.x), y: Math.round(rc.y), w: Math.round(rc.width), h: Math.round(rc.height) }; });
    });
  }
  await c.close();
}
await b.close(); writeFileSync(`${process.env.SWEEP_OUT ?? "/tmp"}/sweep-${label}.json`, JSON.stringify(out)); console.log(label, Object.keys(out).length, "page-views", Object.values(out).reduce((a, l) => a + l.length, 0), "elements");
