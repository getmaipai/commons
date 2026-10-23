import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  ALLOWED_VIEW_IDS, CENTRAL_AREA_IDS, RESERVED_AREA_IDS, PAGE_COUNT_ENFORCED,
  SETTINGS_CAP_ENFORCED, checkAreas, checkPageCount, lintManifestSettings,
  type AreasFile, type RegistryKey,
} from "../../settings/areas-check.js";

const ROOT = join(import.meta.dir, "..", "..");
const file = JSON.parse(readFileSync(join(ROOT, "settings/areas.json"), "utf8")) as AreasFile;
const registry = JSON.parse(readFileSync(join(ROOT, "settings/keys.json"), "utf8")) as RegistryKey[];
const legacy = JSON.parse(readFileSync(join(ROOT, "settings/legacy-sections.json"), "utf8"));
const schema = JSON.parse(readFileSync(join(ROOT, "schemas/settings-area.schema.json"), "utf8"));
const ajv = new Ajv2020({ strict: false, allErrors: true }); addFormats(ajv);
const validate = ajv.compile(schema);
const clone = <T>(v:T):T => JSON.parse(JSON.stringify(v));
const getArea = (id:string) => file.areas.find(a=>a.id===id)!;
const getPage = (a:string,id:string) => getArea(a).sections.find(s=>s.id===id)!;

describe("settings page tabs",()=>{
 test("central pages are 9 household and 7 personal, with no Chat area",()=>{
  expect(file.areas.map(a=>a.id).sort()).toEqual(["account","home"]);
  expect(getArea("home").sections.map(s=>s.id)).toEqual(["household","privacy","ai","media","voice","search","apps","backups","advanced"]);
  expect(getArea("account").sections.map(s=>s.id)).toEqual(["profile","appearance","chat","voice","notifications","pictures","data"]);
  expect(CENTRAL_AREA_IDS).toEqual(["account","home"]);
  expect(RESERVED_AREA_IDS).toContain("chat");
  expect(lintManifestSettings({id:"music",contributes:{settings_area:{...getArea("account"),id:"chat"}}}).join(" ")).toMatch(/reserved/);
  expect(PAGE_COUNT_ENFORCED).toBe(true); expect(SETTINGS_CAP_ENFORCED).toBe(false);
  expect(checkAreas(file,registry)).toEqual([]);
 });
 test("tab views and audience constraints validate",()=>{
  for(const a of file.areas) expect(validate(a),JSON.stringify(validate.errors)).toBe(true);
  const bad=clone(file); getPageFrom(bad,"home","ai").tabs![0]!.view="home.unknown";
  expect(checkAreas(bad,registry).join(" ")).toMatch(/unknown view/);
  const broad=clone(file); getPageFrom(broad,"home","ai").tabs![0]!.min_role="guest";
  getPageFrom(broad,"home","ai").min_role="admin";
  expect(checkAreas(broad,registry).join(" ")).toMatch(/broader than the area's admin/);
  const sectionView=clone(file); getPageFrom(sectionView,"home","ai").trail_view="home.engine_admin";
  expect(checkAreas(sectionView,registry).join(" ")).toMatch(/section-level views/);
 });
 test("audiences from replaced sections stay on tabs",()=>{
  expect(getPage("home","media").tabs?.map(t=>t.min_role)).toEqual(["admin","admin"]);
  expect(getPage("account","voice").tabs?.find(t=>t.id==="robot")).toMatchObject({bands:["adult"],needs:["robot.paired","robots.enabled"]});
  expect(getPage("account","chat").tabs?.find(t=>t.id==="skills")?.bands).toEqual(["teen","adult"]);
 });
 test("robot details remain on Apps and tab views exist",()=>{
  expect(getPage("home","apps").detail).toMatchObject({param:"id",view:"home.devices_admin",tabs:[{id:"overview"},{id:"behaviour"},{id:"access"}]});
  expect(getPage("home","apps").tabs?.[0]?.view).toBe("home.devices_admin");
  expect(getPage("home","ai").tabs?.map(t=>t.id)).toEqual(["overview","models","engines","advanced","coding"]);
 });
 test("legacy mapping covers each old section exactly once and targets a real page tab",()=>{
  const old=JSON.parse(readFileSync(join(ROOT,"settings/areas.json"),"utf8")) as AreasFile;
  const entries=legacy.mappings as any[];
  const ids=entries.map(x=>`${x.old.area}/${x.old.section}`);
  const expected=[
   ..."general people search integrations ai pictures commands voices robot reference-library media-library storage maintenance privacy developer network coding".split(" ").map(x=>`home/${x}`),
   ..."profile appearance notifications voice pictures data device robot developer coding".split(" ").map(x=>`account/${x}`),
   ..."general personalization skills shortcuts voice notifications memories parental-controls household".split(" ").map(x=>`chat/${x}`),
  ].sort();
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.sort()).toEqual(expected);
  expect(entries.filter(x=>x.old.area==="chat"&&x.replacement).length).toBe(5);
  for(const row of entries){
   const dst=row.new??row.replacement;
   if(!dst){expect(row.reason).toBeTruthy();continue;}
   const target=file.areas.find(a=>a.id===dst.area)?.sections.find(s=>s.id===dst.section);
   expect(target,JSON.stringify(row)).toBeDefined();
   if(row.new) expect(target!.tabs?.some(t=>t.id===dst.tab)).toBe(true);
  }
  expect(ids).toContain("chat/parental-controls");
 });
 test("every registry group remains drawn once or explicitly not placed",()=>{
  const counts=new Map<string,number>();
  for(const a of file.areas) for(const s of a.sections) for(const c of s.cards??[]) if(c.group&&c.scope){const k=`${c.scope}:${c.group}`;counts.set(k,(counts.get(k)??0)+1)}
  for(const c of file.device_cards){const k=`${c.scope}:${c.group}`;counts.set(k,(counts.get(k)??0)+1)}
  const parked=new Set(file.not_placed.map(n=>`${n.scope}:${n.group}`));
  for(const k of new Set(registry.map(r=>`${r.scope}:${r.lives_in}`))) expect((counts.get(k)??0)+Number(parked.has(k)),k).toBe(1);
 });
});
function getPageFrom(f:AreasFile,a:string,id:string){return f.areas.find(x=>x.id===a)!.sections.find(x=>x.id===id)!}
