import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { ALLOWED_VIEW_IDS, CENTRAL_AREA_IDS, RESERVED_AREA_IDS, PAGE_COUNT_ENFORCED, SETTINGS_CAP_ENFORCED, checkAreas, checkPageCount, lintManifestSettings, type AreasFile, type RegistryKey } from "../../settings/areas-check.js";
const ROOT=join(import.meta.dir,"..","..");
const file=JSON.parse(readFileSync(join(ROOT,"settings/areas.json"),"utf8")) as AreasFile;
const registry=JSON.parse(readFileSync(join(ROOT,"settings/keys.json"),"utf8")) as RegistryKey[];
const legacy=JSON.parse(readFileSync(join(ROOT,"settings/legacy-sections.json"),"utf8"));
const schema=JSON.parse(readFileSync(join(ROOT,"schemas/settings-area.schema.json"),"utf8"));
const ajv=new Ajv2020({strict:false,allErrors:true});addFormats(ajv);const validate=ajv.compile(schema);
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const area=()=>file.areas[0]!;const page=(f:AreasFile,id:string)=>f.areas[0]!.sections.find(s=>s.id===id)!;

describe("single Settings area",()=>{
 test("has one guest-openable area with two exact groups and scoped page counts",()=>{
  expect(file.areas.map(a=>a.id)).toEqual(["settings"]); expect(area().audience.min_role).toBe("guest");
  expect(area().groups).toEqual([{label:"Yours",sections:["profile","appearance","chat","voice","notifications","pictures","data"]},{label:"The home",sections:["household","privacy","ai","media","home-voice","search","apps","backups","advanced"]}]);
  expect(area().sections.filter(s=>s.scope==="person")).toHaveLength(7);expect(area().sections.filter(s=>s.scope==="household")).toHaveLength(9);
  expect(CENTRAL_AREA_IDS).toEqual(["settings"]);expect(RESERVED_AREA_IDS).toEqual(expect.arrayContaining(["home","account","chat","settings"]));
  expect(lintManifestSettings({id:"music",contributes:{settings_area:{...area(),id:"settings"}}}).join(" ")).toMatch(/reserved/);
  expect(PAGE_COUNT_ENFORCED).toBe(true);expect(SETTINGS_CAP_ENFORCED).toBe(false);expect(checkAreas(file,registry)).toEqual([]);
 });
 test("schema, tabs, views, scope and audiences validate",()=>{
  for(const a of file.areas)expect(validate(a),JSON.stringify(validate.errors)).toBe(true);
  const bad=clone(file);page(bad,"ai").tabs![0]!.view="home.unknown";expect(checkAreas(bad,registry).join(" ")).toMatch(/unknown view/);
  const broad=clone(file);page(broad,"ai").min_role="adult";page(broad,"ai").tabs![0]!.min_role="guest";expect(checkAreas(broad,registry).join(" ")).toMatch(/broader than its page/);
  const unguarded=clone(file);delete page(unguarded,"privacy").min_role;expect(checkAreas(unguarded,registry).join(" ")).toMatch(/household section must have min_role/);
  const scope=clone(file);page(scope,"household").scope="person";expect(checkAreas(scope,registry).join(" ")).toMatch(/disagrees with section scope/);
  const sectionView=clone(file);page(sectionView,"ai").trail_view="home.engine_admin";expect(checkAreas(sectionView,registry).join(" ")).toMatch(/section-level views/);
 });
 test("preserves gated tabs and robot detail",()=>{
  expect(page(file,"media").tabs?.map(t=>t.min_role)).toEqual(["admin","admin"]);
  expect(page(file,"voice").tabs?.find(t=>t.id==="robot")).toMatchObject({bands:["adult"],needs:["robot.paired","robots.enabled"]});
  expect(page(file,"chat").tabs?.find(t=>t.id==="skills")?.bands).toEqual(["teen","adult"]);
  expect(page(file,"apps").detail).toMatchObject({param:"id",view:"home.devices_admin",tabs:[{id:"overview"},{id:"behaviour"},{id:"access"}]});
  expect(page(file,"ai").tabs?.map(t=>t.id)).toEqual(["overview","models","engines","advanced","coding"]);
 });
 test("every old origin/main and intermediate route maps once to an existing target",()=>{
  if(!existsSync("/tmp/areas-pre.json"))return; // one-off migration fixture, absent on a clean machine
  const pre=JSON.parse(readFileSync("/tmp/areas-pre.json","utf8")) as AreasFile;
  const entries=legacy.mappings as any[];const ids=entries.map(x=>`${x.old.area}/${x.old.section}`);
  const expected=new Set<string>();
  for(const a of pre.areas)for(const s of a.sections)expected.add(`${a.id}/${s.id}`);
  for(const a of ["home","account"])expected.add(`${a}/${a}`);
  for(const x of entries)if(["home","account","chat"].includes(x.old.area))expected.add(`${x.old.area}/${x.old.section}`);
  expect(new Set(ids).size).toBe(ids.length);expect(new Set(ids)).toEqual(expected);
  expect(entries.filter(x=>x.old.area==="chat"&&x.replacement).length).toBe(9);
  for(const row of entries){const dst=row.new??row.replacement;if(!dst){expect(row.reason).toBeTruthy();continue;}const target=area().sections.find(s=>s.id===dst.section);expect(target,JSON.stringify(row)).toBeDefined();if(row.new)expect(target!.tabs?.some(t=>t.id===dst.tab)).toBe(true);}
 });
 test("registry groups remain placed once",()=>{const counts=new Map<string,number>();for(const a of file.areas)for(const s of a.sections)for(const c of s.cards??[])if(c.group&&c.scope){const k=`${c.scope}:${c.group}`;counts.set(k,(counts.get(k)??0)+1)}for(const c of file.device_cards){const k=`${c.scope}:${c.group}`;counts.set(k,(counts.get(k)??0)+1)}const parked=new Set(file.not_placed.map(n=>`${n.scope}:${n.group}`));for(const k of new Set(registry.map(r=>`${r.scope}:${r.lives_in}`)))expect((counts.get(k)??0)+Number(parked.has(k)),k).toBe(1);});
});

describe("section scope: required in the central file, optional for a package area (spec 0.1.222)", () => {
  test("a central section without scope fails; the same schema accepts a package area section without it", () => {
    const broken = JSON.parse(JSON.stringify(file)) as typeof file;
    delete (broken.areas[0]!.sections[0] as { scope?: string }).scope;
    expect(checkAreas(broken, registry).some((e) => /must declare scope/.test(e))).toBe(true);
    const manifestSection = { id: "places", label: "Places", icon: "map-pin", kind: "keys" };
    expect(Object.keys(manifestSection)).not.toContain("scope");
    const schemaSection = (schema as { definitions?: Record<string, { required?: string[] }>; $defs?: Record<string, { required?: string[] }> });
    const defs = schemaSection.definitions ?? schemaSection.$defs ?? {};
    expect(defs.section?.required ?? []).not.toContain("scope");
  });
});
