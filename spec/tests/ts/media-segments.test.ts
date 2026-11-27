import { describe, expect, test } from "bun:test";
import { MediaSegmentsSchema, normalizeSegments, skipPlan, type MediaSegment, type MediaSegmentsRecord } from "../../media/ts/segments";

let n=0;
const seg=(startSec:number,endSec:number,over:Partial<MediaSegment>={}):MediaSegment=>({id:`s${n++}`,kind:"ad",startSec,endSec,confidence:.9,source:"llm",status:"auto",...over});
const record=(segments:MediaSegment[],durationSec=1000):MediaSegmentsRecord=>({fileSha256:"a".repeat(64),durationSec,segments,producedBy:{transcriptRevision:"t1",modelId:"m",pipelineVersion:"1",createdAt:"2026-11-27T00:00:00Z"},created_at:"2026-11-27T00:00:00Z",hlc:"1:0:node123",provenance:"stack:media.segments"});

describe("MediaSegments schema",()=>{
  test("accepts file identity record and rejects invalid hash, range and confidence",()=>{
    expect(MediaSegmentsSchema.safeParse(record([seg(10,40)])).success).toBe(true);
    expect(MediaSegmentsSchema.safeParse({...record([]),fileSha256:"bad"}).success).toBe(false);
    expect(MediaSegmentsSchema.safeParse(record([seg(40,10)])).success).toBe(false);
    expect(MediaSegmentsSchema.safeParse(record([seg(10,40,{confidence:1.2})])).success).toBe(false);
  });
});
describe("normalizeSegments",()=>{
  test("sorts, clamps, and drops short or outside ranges",()=>{
    expect(normalizeSegments([seg(90,130),seg(-5,20),seg(30,30.5),seg(120,140)],100).map(s=>[s.startSec,s.endSec])).toEqual([[0,20],[90,100]]);
  });
  test("merges same-kind overlap and sub-two-second gap, unions sources and keeps best confidence",()=>{
    const out=normalizeSegments([seg(10,30,{confidence:.6,source:"text-pattern"}),seg(31.5,50,{source:"llm"})],100);
    expect(out).toHaveLength(1); expect(out[0]).toMatchObject({startSec:10,endSec:50,confidence:.9,source:"llm"});
    expect(new Set(out[0]!.sources)).toEqual(new Set(["text-pattern","llm"]));
    expect(normalizeSegments([seg(10,20),seg(22,30)],100)).toHaveLength(2);
  });
  test("keeps kinds separate, preserves confirmation, does not mutate input",()=>{
    const a=seg(-5,20), out=normalizeSegments([a,seg(19,30,{status:"confirmed",confidence:.3}),seg(15,25,{kind:"intro"})],100);
    expect(a.startSec).toBe(-5); expect(out.find(s=>s.kind==="ad")?.status).toBe("confirmed"); expect(out).toHaveLength(2);
  });
  test("keeps bumper parts separate from nearby ads and one another",()=>{
    const bumper=seg(10,12,{kind:"bumper",groupId:"g",slotRole:"lead-stinger"});
    const ad=seg(12.5,20);
    expect(normalizeSegments([bumper,ad,seg(21,23,{kind:"bumper",groupId:"g",slotRole:"tail-stinger"})],100)).toHaveLength(3);
  });
});
describe("skipPlan",()=>{
  const r=record([seg(10,20),seg(20.5,30),seg(100,110,{status:"held",confidence:.6}),seg(200,210,{status:"rejected"}),seg(300,310,{kind:"intro"}),seg(400,410,{confidence:.82})]);
  test("filters kinds and excludes held/rejected by default while merging gaps under one second",()=>{
    expect(skipPlan(r,{kinds:["ad"]})).toEqual([{startSec:10,endSec:30},{startSec:400,endSec:410}]);
    expect(skipPlan(r,{kinds:["intro"]})).toEqual([{startSec:300,endSec:310}]);
    expect(skipPlan(r,{kinds:["ad"],includeHeld:true})).toHaveLength(3);
  });
  test("confirmed ignores confidence threshold; clamps to file duration; exact one-second gap stays separate",()=>{
    expect(skipPlan(record([seg(10,20,{status:"confirmed",confidence:.2})]),{kinds:["ad"],minConfidence:.9})).toHaveLength(1);
    expect(skipPlan(record([seg(90,130)],100),{kinds:["ad"]})).toEqual([{startSec:90,endSec:100}]);
    expect(skipPlan(record([seg(10,20),seg(21,30)]),{kinds:["ad"]})).toHaveLength(2);
  });
  test("bumper kind is explicit; adjacent skipped ads include the whole bumper group by default",()=>{
    const g=[seg(100,102,{kind:"bumper",groupId:"g",slotRole:"lead-stinger"}),seg(110,120,{kind:"bumper",groupId:"g",slotRole:"slot"}),seg(121,123,{kind:"bumper",groupId:"g",slotRole:"tail-stinger"})];
    const r=record([seg(103,109),...g]);
    expect(skipPlan(r,{kinds:["ad"]})).toEqual([{startSec:103,endSec:109},{startSec:100,endSec:102},{startSec:110,endSec:120},{startSec:121,endSec:123}].sort((a,b)=>a.startSec-b.startSec));
    expect(skipPlan(r,{kinds:["ad"],bumpersWithAds:false})).toEqual([{startSec:103,endSec:109}]);
    expect(skipPlan(record(g),{kinds:["bumper"]})).toHaveLength(3);
    expect(skipPlan(record(g),{kinds:["ad"]})).toHaveLength(0);
  });
});
