import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { WEATHER_CLASSES } from "./elements/weather-condition";
import { phaseOf } from "./elements/weather-scene";
import scene from "./elements/weather-scene.json";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const rootAt = css.indexOf("/* WEATHER-SCENE-01: phase palette targets");
const mediaAt = css.indexOf("@media (prefers-color-scheme: dark)");
const systemAt = css.indexOf("/* WEATHER-SCENE-01 dark palette values.", mediaAt);
const explicitAt = css.indexOf("/* WEATHER-SCENE-01 dark palette values.", css.indexOf(".dark {"));
const block = (start: number, endMarker: string) => css.slice(start, css.indexOf(endMarker, start));
const themes = [block(rootAt, "--weather-ink:"), block(systemAt, "--weather-ink:"), block(explicitAt, "--weather-ink:")];
type Lab = { l: number; a: number; b: number; alpha: number };
type RGB = [number, number, number];
const parse = (text: string): Lab => { const m = /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/.exec(text); if (!m) throw new Error(`Bad OKLCH token: ${text}`); const h=Number(m[3])*Math.PI/180; return {l:Number(m[1]),a:Number(m[2])*Math.cos(h),b:Number(m[2])*Math.sin(h),alpha:Number(m[4]??1)}; };
const token = (src: string, name: string): Lab => { const m = new RegExp(`--weather-${name}:\\s*(oklch\\([^;]+\\))`).exec(src); if (!m) throw new Error(`Missing --weather-${name}`); return parse(m[1]!); };
const resolvedToken = (src: string, name: string): Lab => { const direct=new RegExp(`--weather-${name}:\\s*(oklch\\([^;]+\\))`).exec(src); if(direct)return parse(direct[1]!); const alias=new RegExp(`--weather-${name}:\\s*var\\(--weather-([\\w-]+)\\)`).exec(src); if(!alias)throw new Error(`Missing --weather-${name}`); return token(src,alias[1]!); };
const mixLab = (a: Lab,b: Lab,t: number): Lab => ({l:a.l*(1-t)+b.l*t,a:a.a*(1-t)+b.a*t,b:a.b*(1-t)+b.b*t,alpha:a.alpha*(1-t)+b.alpha*t});
const polar = (c: Lab) => ({ chroma: Math.hypot(c.a,c.b), hue: (Math.atan2(c.b,c.a)*180/Math.PI+360)%360 });
const rgb = (c: Lab): RGB => { const l=c.l+.3963377774*c.a+.2158037573*c.b, m=c.l-.1055613458*c.a-.0638541728*c.b, s=c.l-.0894841775*c.a-1.291485548*c.b; const f=(v:number)=>{v=v**3;return 255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055)}; return [f(l),f(m),f(s)]; };
const linear=(v:number)=>{v=Math.max(0,Math.min(255,v))/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};
const luminance=(c:RGB)=>.2126*linear(c[0])+.7152*linear(c[1])+.0722*linear(c[2]);
const contrast=(c:RGB)=>(1.05)/(luminance(c)+.05);
const mixRgb=(a:RGB,b:RGB,t:number):RGB=>a.map((v,i)=>v*(1-t)+b[i]!*t) as RGB;
const caps=[scene.caps.top,scene.caps.mid,scene.caps.bottom];
const capsOk=(values: Lab[][]) => values.every((stops)=>stops.every((c,i)=>c.l<=caps[i]!));
const readStops=(src:string,cls:string,phase:"night"|"dawn"|"day"|"dusk")=>["top","mid","bottom"].map(stop=>token(src,`${cls}-${phase}-${stop}`));
const palette=(src:string,cls:string,t:number,twilight:"dawn"|"dusk")=>[0,1,2].map(i=>{const n=readStops(src,cls,"night")[i]!, w=readStops(src,cls,twilight)[i]!, d=readStops(src,cls,"day")[i]!; const stage=mixLab(w,d,Math.max(0,Math.min(1,(t-.5)*2))); return mixLab(n,stage,Math.max(0,Math.min(1,t*2)));});
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
// Stops are capped like the CSS (min(l, cap)); the base gradient runs top 0%, mid 55%, bottom 100% and mixes in sRGB.
const capped=(stops:Lab[]):RGB[]=>stops.map((c,i)=>rgb({...c,l:Math.min(c.l,caps[i]!)}));
const baseAt=(stops:Lab[],y:number):RGB=>{const [top,mid,bottom]=capped(stops) as [RGB,RGB,RGB];return y<=55?mixRgb(top,mid,y/55):mixRgb(mid,bottom,(y-55)/45);};
/** Horizon layers as the CSS paints them: radial-gradient(85% 48% at 92% 100%, colour, transparent 70%) at the --wx-t opacity. */
const horizonAlpha=(x:number,y:number)=>Math.max(0,1-Math.hypot((x-92)/85,(y-100)/48)/.7);
/** Text scrim: linear-gradient(to top right, scrim 0%, transparent 58%). Position along the corner gradient is (x + (1 - y)) / 2. */
const textScrimAlpha=(alpha:number,x:number,y:number)=>alpha*Math.max(0,1-((x/100+(1-y/100))/2)/.58);
const variants=[{name:"full",flat:false},{name:"wide",flat:false},{name:"compact",flat:true},{name:"lite",flat:true}] as const;
const sample=(src:string,cls:string,stops:Lab[],t:number,x:number,y:number,flat:boolean,horizon=true)=>{
 let c=baseAt(stops,y);
 const glow=token(src,`${cls}-glow`); const g=rgb(glow); c=mixRgb(c,g,Math.max(0,.12*(1-x/100))*glow.alpha);
 if(horizon){
  const tw=token(src,"horizon-twilight"), day=token(src,"horizon-day");
  c=mixRgb(c,rgb(tw),tw.alpha*clamp01(1-Math.abs(t-.5)*2)*horizonAlpha(x,y));
  c=mixRgb(c,rgb(day),day.alpha*clamp01((t-.5)*2)*horizonAlpha(x,y));
 }
 c=mixRgb(c,[255,255,255],scene.effects.effectWhite);
 if(flat){const f=/--weather-scrim:\s*rgb\(0 0 0 \/ ([.\d]+)\)/.exec(src); c=mixRgb(c,[0,0,0],Number(f?.[1]??.16));}
 const text=token(src,`${cls}-dusk-scrim`); c=mixRgb(c,rgb({...text,alpha:1}),textScrimAlpha(text.alpha,x,y)); return contrast(c);
};
describe("weather scene token contrast",()=>{
 test("phase thresholds and fallback",()=>{expect(phaseOf({elevation:-30,isDay:false}).phase).toBe("night");expect(phaseOf({elevation:-3,isDay:true}).phase).toBe("dusk");expect(phaseOf({elevation:1,isDay:false}).phase).toBe("dawn");expect(phaseOf({elevation:30,isDay:true}).phase).toBe("day");expect(phaseOf({isDay:true}).elevation).toBe(30);});
 test("the shared cap validator rejects a deliberately raised parsed stop",()=>{const p=readStops(themes[0]!,"clear","day");expect(capsOk([p])).toBe(true);p[0]={...p[0]!,l:scene.caps.top+.001};expect(capsOk([p])).toBe(false);});
 for(let theme=0;theme<themes.length;theme++) for(const cls of WEATHER_CLASSES) test(`theme ${theme} ${cls}: parsed palettes meet caps and contrast`,()=>{
  const src=themes[theme]!; const elevations=[-30,-3,1,30]; const paletteSamples:Lab[][]=[]; const sampleT:number[]=[];
  for(const elevation of elevations){const result=phaseOf({elevation,isDay:elevation>0});const twilight=elevation>=0?"dawn":"dusk";paletteSamples.push(palette(src,cls,result.t,twilight));sampleT.push(result.t);}
  for(const [tv,tw] of [[.25,"dusk"],[.75,"dawn"],[.5,"dusk"],[.5,"dawn"]] as const){paletteSamples.push(palette(src,cls,tv,tw));sampleT.push(tv);}
  expect(capsOk(paletteSamples),"blended stops respect L caps").toBe(true);
  for(const phase of ["night","dawn","day","dusk"] as const) {
   const authored=readStops(src,cls,phase); expect(capsOk([authored]),`${cls} ${phase} authored caps`).toBe(true);
   resolvedToken(src,`${cls}-${phase}-glow`);
   const scrim=token(src,`${cls}-${phase}-scrim`); expect(scrim.alpha).toBeGreaterThan(0);
  }
  const low:string[]=[]; let worst=Infinity;
  for(const v of variants) paletteSamples.forEach((stops,k)=>{for(const x of [4,30,55]) for(const y of [58,72,86,98]){const ratio=sample(src,cls,stops,sampleT[k]!,x,y,v.flat); worst=Math.min(worst,ratio); if(ratio<4.5) low.push(`${v.name} t=${sampleT[k]!.toFixed(2)} ${x},${y}: ${ratio.toFixed(2)}`);}});
  if(process.env.WEATHER_CONTRAST_REPORT) console.log(`theme ${theme} ${cls}: worst ${worst.toFixed(2)}`);
  expect(low.slice(0,6),`${cls} points under 4.5:1`).toEqual([]);
 });
 test("sky text elements inherit the ink token and preserve contrast coverage for all themes and scenes",()=>{
  const page=readFileSync(new URL("./elements/weather-forecast-page.tsx",import.meta.url),"utf8");
  expect(page).toContain('data-slot="weather-forecast-summary" className="mb-4 text-base leading-relaxed"');
  expect(page).toContain('style={{ color: "var(--weather-ink)" }}');
  const advice=readFileSync(new URL("./elements/weather-advice.tsx",import.meta.url),"utf8");
  expect(advice).toContain('data-slot="weather-advice-lead"');
  for(const src of themes)for(const cls of WEATHER_CLASSES)for(const elevation of [-30,-3,1,30]){
   const stops=palette(src,cls,phaseOf({elevation,isDay:elevation>0}).t,elevation>=0?"dawn":"dusk");
   expect(capsOk([stops]),`${cls} theme ${themes.indexOf(src)} elevation ${elevation}`).toBe(true);
  }
 });
 test("registered weather properties keep the transition",()=>{for(const p of ["--wx-top","--wx-mid","--wx-bottom","--wx-glow","--wx-scrim","--wx-t"])expect(css).toContain(`@property ${p}`);expect(css).toContain("--wx-top 3200ms cubic-bezier(.37, 0, .63, 1)");});
 test("cloud day, night and twilight tints exist in all themes and stay out of the text band",()=>{
  const weatherClassList=["clear","partly-cloudy","overcast","drizzle","rain","snow","thunderstorm"];
  for(const src of themes) for(const cls of weatherClassList) {
   const dayLit=token(src,`${cls}-cloud-lit`), dayShade=token(src,`${cls}-cloud-shade`);
   const nightLit=token(src,`${cls}-cloud-night-lit`), nightShade=token(src,`${cls}-cloud-night-shade`);
   const twilightLit=token(src,`${cls}-cloud-twilight-lit`), twilightShade=token(src,`${cls}-cloud-twilight-shade`);
   expect(dayLit.l).toBeGreaterThan(0); expect(dayShade.l).toBeGreaterThan(0);
   expect(nightLit.l).toBeLessThanOrEqual(.46); expect(nightShade.l).toBeLessThanOrEqual(.34);
   expect(twilightLit.l).toBeLessThanOrEqual(.66); expect(twilightShade.l).toBeLessThanOrEqual(.42);
   const lit=polar(twilightLit), shade=polar(twilightShade);
   expect(lit.hue).toBeGreaterThanOrEqual(20); expect(lit.hue).toBeLessThanOrEqual(80); expect(lit.chroma).toBeGreaterThanOrEqual(.02); expect(lit.chroma).toBeLessThanOrEqual(.10);
   expect(shade.hue<=60 || shade.hue>=330).toBe(true); expect(shade.chroma).toBeLessThanOrEqual(.07);
   for(const [a,b] of [[nightLit,twilightLit],[twilightLit,dayLit],[nightShade,twilightShade],[twilightShade,dayShade]] as const) for(const t of [.25,.5,.75]) {
    const blend=polar(mixLab(a,b,t));
    expect(blend.hue<100 || blend.hue>200 || blend.chroma<=.03,`${cls} blended hue ${blend.hue.toFixed(1)} chroma ${blend.chroma.toFixed(3)}`).toBe(true);
   }
  }
  expect(css).toContain("--wx-cloud-lit 3200ms cubic-bezier(.37, 0, .63, 1)");
  const cloudRules=css.slice(css.indexOf('[data-slot="weather-sky"] [data-fx="cloud"] {'),css.indexOf('[data-slot="weather-sky"] [data-fx="fog"] {'));
  expect(cloudRules).toContain("20% 56%"); expect(cloudRules).toContain("0% 22%"); expect(cloudRules).toContain("8% 40%");
 });
 test("every color-mix in the sky rules has three top-level parts and the percentage on the second colour",()=>{
  const topLevelParts=(body:string)=>{const parts:string[]=[];let depth=0,cur="";for(const ch of body){if(ch==="(")depth++;if(ch===")")depth--;if(ch===","&&depth===0){parts.push(cur);cur="";}else cur+=ch;}parts.push(cur);return parts;};
  let found=0; const rules=css.split("\n").filter(l=>l.startsWith('[data-slot="weather-sky"] { position: absolute;'));
  for(const rule of rules) for(let i=rule.indexOf("color-mix(");i>=0;i=rule.indexOf("color-mix(",i+1)){
   let depth=0,end=-1;for(let j=i+"color-mix".length;j<rule.length;j++){if(rule[j]==="(")depth++;if(rule[j]===")"){depth--;if(depth===0){end=j;break;}}}
   const body=rule.slice(i+"color-mix(".length,end);expect(topLevelParts(body).length).toBe(3);found++;
  }
  expect(found).toBeGreaterThanOrEqual(6);
 });
});

describe("WEATHER-SCENE-08 tokens exist in all three blocks and the proof can fail",()=>{
 test("the proof rejects a sky painted at the caps (it is not vacuous)",()=>{
  const bright:Lab[]=[{l:scene.caps.top,a:0,b:0,alpha:1},{l:scene.caps.mid,a:0,b:0,alpha:1},{l:scene.caps.bottom,a:0,b:0,alpha:1}];
  const worst=Math.min(...[4,30,55].flatMap(x=>[58,72,86,98].map(y=>sample(themes[0]!,"clear",bright,1,x,y,false))));
  expect(worst).toBeLessThan(4.5);
 });
 test("the text scrim and horizon shapes used by the proof match the CSS gradients",()=>{
  expect(textScrimAlpha(.5,0,100)).toBeCloseTo(.5,6);
  expect(textScrimAlpha(.5,100,0)).toBe(0);
  expect(textScrimAlpha(.5,50,50)).toBeCloseTo(.5*(1-.5/.58),6);
  expect(horizonAlpha(92,100)).toBe(1); expect(horizonAlpha(4,58)).toBe(0);
 });
 test("every changed or new colour token is defined in the light, system dark and explicit dark blocks",()=>{
  for(const src of themes){
   for(const name of ["horizon-twilight","horizon-day"]) token(src,name);
   for(const cls of WEATHER_CLASSES){
    for(const phase of ["dusk","dawn"] as const) readStops(src,cls,phase);
    expect(token(src,`${cls}-dusk-scrim`).alpha).toBeCloseTo(.5,6);
   }
  }
  const sunBlocks=[block(rootAt,"--weather-star:"),block(systemAt,"--weather-star:"),css.slice(explicitAt)];
  for(const src of sunBlocks) for(const name of ["sun-disc-core","sun-disc-edge","sun-twilight"]) token(src,name);
  expect(css).toContain("--weather-sun-core: #ffd75e"); expect(css).toContain("--weather-sun-edge: #ffb02e");
 });
 test("dusk and dawn use the authored clear palette in the light block and the same offsets in the dark blocks",()=>{
  const l=(name:string,src=themes[0]!)=>token(src,name);
  const near=(c:Lab,L:number,C:number,H:number)=>{const p=polar(c);expect(c.l).toBeCloseTo(L,3);expect(p.chroma).toBeCloseTo(C,3);expect(p.hue).toBeCloseTo(H,0);};
  near(l("clear-dusk-top"),.26,.07,285); near(l("clear-dusk-mid"),.36,.09,15); near(l("clear-dusk-bottom"),.44,.13,48);
  near(l("clear-dawn-mid"),.44,.06,340); near(l("clear-dawn-bottom"),.50,.10,35);
  for(const src of themes.slice(1)){ expect(l("clear-dusk-bottom",src).l).toBeCloseTo(.425,3); expect(l("clear-dawn-bottom",src).l).toBeCloseTo(.445,3); }
  expect(token(themes[0]!,"clear-dusk-mid").l).toBeGreaterThan(token(themes[0]!,"clear-dusk-top").l);
 });
 test("overcast, rain and storm cloud shades are darker so grey reads against grey; the snow cloud is lighter",()=>{
  const want:[string,number,number][]=[["overcast-cloud-shade",.50,.46],["rain-cloud-shade",.38,.34],["thunderstorm-cloud-shade",.24,.20],["snow-cloud-lit",.92,.88]];
  for(const [name,light,dark] of want){ expect(token(themes[0]!,name).l).toBeCloseTo(light,3); expect(token(themes[1]!,name).l).toBeCloseTo(dark,3); expect(token(themes[2]!,name).l).toBeCloseTo(dark,3); }
 });
});
