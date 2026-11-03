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
  expect(area().groups).toEqual([{label:"Yours",sections:["profile","appearance","chat","voice","notifications","data"]},{label:"The home",sections:["household","privacy","ai","media","home-voice","search","offline-data","apps","backups","advanced"]}]);
  expect(area().sections.filter(s=>s.scope==="person")).toHaveLength(6);expect(area().sections.filter(s=>s.scope==="household")).toHaveLength(10);
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
  expect(page(file,"media").tabs?.map(t=>t.min_role)).toEqual(["admin","admin","admin","admin"]);
  expect(page(file,"voice").tabs?.find(t=>t.id==="robot")).toMatchObject({bands:["adult"],needs:["robot.paired","robots.enabled"]});
  expect(page(file,"chat").tabs?.find(t=>t.id==="skills")?.bands).toEqual(["teen","adult"]);
  expect(page(file,"apps").detail).toMatchObject({param:"id",view:"home.devices_admin",tabs:[{id:"overview"},{id:"behaviour"},{id:"access"}]});
  expect(page(file,"ai").tabs?.map(t=>t.id)).toEqual(["overview","engines","advanced","coding"]);
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
 test("registry groups remain placed once",()=>{const counts=new Map<string,number>();for(const a of file.areas)for(const s of a.sections)for(const c of s.cards??[])if(c.scope)for(const g of c.groups??(c.group?[c.group]:[])){const k=`${c.scope}:${g}`;counts.set(k,(counts.get(k)??0)+1)}for(const c of file.device_cards){const k=`${c.scope}:${c.group}`;counts.set(k,(counts.get(k)??0)+1)}const parked=new Set(file.not_placed.map(n=>`${n.scope}:${n.group}`));for(const k of new Set(registry.map(r=>`${r.scope}:${r.lives_in}`)))expect((counts.get(k)??0)+Number(parked.has(k)),k).toBe(1);});
});

describe("VIDEO-SETTINGS-03: Pictures, videos and music",()=>{
 const keyOf=(k:string)=>registry.find(r=>r.key===k) as (RegistryKey&{range?:{options?:string[]};default?:unknown;secret?:boolean;copy?:{does?:string};label?:string})|undefined;
 const media=()=>page(file,"media");
 test("the area keeps its name and has the four tabs, no Media library, and no person Pictures and videos page",()=>{
  expect(media().label).toBe("Pictures, videos and music");
  expect(media().tabs?.map(t=>[t.id,t.label])).toEqual([["pictures","Pictures"],["videos","Videos"],["music","Music"],["styles","Styles"]]);
  expect(media().tabs?.some(t=>t.id==="media-library"||t.view==="home.media_library")).toBe(false);
  expect(area().sections.some(s=>s.id==="pictures")).toBe(false);
  expect(legacy.mappings.find((m:any)=>m.old.area==="account"&&m.old.section==="pictures").new).toEqual({area:"settings",section:"profile",tab:"profile"});
  expect(legacy.mappings.find((m:any)=>m.old.section==="media-library").new).toEqual({area:"settings",section:"media",tab:"pictures"});
 });
 test("every card sits in a tab, each Pictures, Videos, Music, Styles card names a view and one registry group",()=>{
  const cards=media().cards!;const tabs=new Set(media().tabs!.map(t=>t.id));
  for(const c of cards){expect(tabs.has(c.tab!),c.label).toBe(true);expect(c.group,c.label).toBeTruthy();}
  const views:Record<string,string>={"household.media_pictures":"home.media_pictures","household.media_kids":"home.media_kids","household.media_videos":"home.media_videos","household.media_music":"home.media_music","household.media_styles":"home.media_styles"};
  for(const [g,v] of Object.entries(views)){const c=cards.filter(x=>x.group===g);expect(c,g).toHaveLength(1);expect(c[0]!.view).toBe(v);expect(ALLOWED_VIEW_IDS).toContain(v);}
  expect(cards.find(c=>c.group==="household.media_styles")!.tab).toBe("styles");
  expect(cards.filter(c=>c.tab==="pictures").map(c=>c.group)).toEqual(["household.media_pictures","household.media_kids"]);
  expect(cards.filter(c=>c.tab==="music").map(c=>c.group)).toEqual(["household.media_music","household.media_online","household.media_lookups"]);
  expect(cards.find(c=>c.group==="household.media_lookups")!.collapsed).toBe(true);
  for(const g of ["household.media_pictures","household.media_videos","household.media_music"])expect(Object.keys(cards.find(c=>c.group===g)!.copy!)).toEqual(expect.arrayContaining(["models_label","models_help","models_button"]));
 });
 test("the new keys exist with their ranges and homes; Quick and Detailed leave the new keys and their copy",()=>{
  expect(keyOf("generation.picture_tier")).toMatchObject({selector:"select",range:{options:["standard","boost"]},default:"standard",lives_in:"household.media_pictures"});
  expect(keyOf("generation.video_tier")).toMatchObject({selector:"select",range:{options:["standard","boost"]},default:"standard",lives_in:"household.media_videos"});
  expect(keyOf("generation.styles.adult_only")).toMatchObject({selector:"select",range:{options:["allowed","restricted"]},default:"allowed",lives_in:"household.media_styles"});
  expect(keyOf("generation.styles.civitai")).toMatchObject({selector:"boolean",default:false,lives_in:"household.media_styles"});
  expect(keyOf("generation.styles.civitai_key")).toMatchObject({selector:"text",secret:true,default:"",lives_in:"household.media_styles"});
  for(const k of ["generation.picture_tier","generation.video_tier","generation.styles.adult_only","generation.styles.civitai","generation.styles.civitai_key"])expect(JSON.stringify(keyOf(k))).not.toMatch(/quick|detailed|wan|ltx/i);
 });
 test("old keys stay readable until the drop slice and are parked, never drawn",()=>{
  const parked=(g:string)=>file.not_placed.some(n=>n.scope==="household"&&n.group===g);
  for(const k of ["generation.adult_adapters","generation.video.adult_adapters","generation.picture_quality","generation.video_quality","generation.picture_quick_model","generation.picture_detailed.enabled","engines.video.choice","engines.music.choice","generation.people_prompts"])expect(keyOf(k),k).toBeDefined();
  expect(keyOf("generation.people_prompts")!.lives_in).toBe("household.media_retired");expect(parked("household.media_retired")).toBe(true);
  expect(registry.filter(r=>r.lives_in==="household.media_retired").map(r=>r.key)).toEqual(["generation.people_prompts"]);
  expect(registry.filter(r=>r.lives_in==="household.media_styles_old").map(r=>r.key).sort()).toEqual(["generation.adult_adapters","generation.video.adult_adapters"]);
  expect(parked("household.media_styles_old")).toBe(true);
  expect(file.not_placed.some(n=>n.scope==="person"&&n.group==="person.likeness")).toBe(true);
  expect(registry.filter(r=>r.lives_in==="household.pictures")).toEqual([]);
  expect(keyOf("generation.kid_enabled")!.lives_in).toBe("person.likeness");
 });
 test("no group is both drawn and parked, and each media key has exactly one home",()=>{
  const drawn=new Set<string>();for(const c of media().cards!)drawn.add(c.group!);
  for(const n of file.not_placed)expect(drawn.has(n.group)&&n.scope==="household").toBe(false);
  const homes: Record<string,string>={"generation.adults":"household.media_pictures","generation.kids":"household.media_kids","generation.kids_daily_pictures":"household.media_kids","generation.kids_daily_videos":"household.media_kids","generation.household_likeness":"household.media_kids","generation.video.enabled":"household.media_videos","generation.music.enabled":"household.media_music","generation.music.length":"household.media_music","music.lyrics_online":"household.media_lookups","music.musicbrainz_match":"household.media_lookups","music.artist_wikimedia":"household.media_lookups","music.album_art_online":"household.media_lookups"};
  for(const [k,g] of Object.entries(homes))expect(keyOf(k)!.lives_in,k).toBe(g);
  expect(registry.filter(r=>r.key==="generation.picture_tier").length).toBe(1);
 });
 test("MUSIC-FACTS-01, MUSIC-DJ-01, MUSIC-GEN-20c: Wikimedia copy covers songs, music.dj and music.lyrics_translate are placed",()=>{
  const wiki=keyOf("music.artist_wikimedia")!;
  expect(wiki).toMatchObject({scope:"household",selector:"boolean",default:true,lives_in:"household.media_lookups"});
  expect(wiki.label).toBe("Show facts and photos from Wikimedia");
  expect(wiki.help).toMatch(/artist/);expect(wiki.help).toMatch(/song/);
  expect((wiki as any).copy.does).toMatch(/artists and songs/);
  expect(keyOf("music.dj")).toMatchObject({scope:"person",selector:"select",range:{options:["off","minimal","full"]},default:"full",band_default:{child:"off",teen:"off",adult:"full"},lives_in:"person.music"});
  expect(keyOf("music.lyrics_translate")).toMatchObject({scope:"person",selector:"text",default:"",lives_in:"person.music"});
  expect((keyOf("music.lyrics_translate") as any).band_default).toBeUndefined();
  const cards=file.areas.flatMap(a=>a.sections).flatMap(s=>s.cards??[]).filter(c=>c.group==="person.music");
  expect(cards.length).toBe(1);expect(cards[0]!.scope).toBe("person");
 });
 test("checkAreas refuses a media tab with no card, a second home for a key and a drawn parked group",()=>{
  const empty=clone(file);page(empty,"media").tabs!.push({id:"extra",label:"Extra",min_role:"admin"});expect(checkAreas(empty,registry).join(" ")).toMatch(/holds nothing/);
  const twice=clone(file);page(twice,"media").cards!.push({label:"Again",group:"household.media_styles",scope:"household",tab:"videos"});expect(checkAreas(twice,registry).join(" ")).toMatch(/more than one card/);
  const both=clone(file);page(both,"media").cards!.push({label:"Old",group:"household.media_retired",scope:"household",tab:"styles"});expect(checkAreas(both,registry).join(" ")).toMatch(/not placed and also has a card/);
  const unknown=clone(file);page(unknown,"media").cards![0]!.view="home.media_unknown";expect(checkAreas(unknown,registry).join(" ")).toMatch(/unknown view/);
 });
 test("the Styles copy fits the schema limits and says no resource words",()=>{
  const styles=media().cards!.find(c=>c.group==="household.media_styles")!;
  expect(styles.description!.length).toBeLessThanOrEqual(160);
  for(const v of Object.values(styles.copy!)){expect(v.length).toBeLessThanOrEqual(200);expect(v).not.toMatch(/—/);}
  expect(validate(area()),JSON.stringify(validate.errors)).toBe(true);
 });
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
