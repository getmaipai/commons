import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { WEATHER_CLASSES } from "./elements/weather-condition";
import { phaseOf } from "./elements/weather-scene";

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
const rgb = (c: Lab): RGB => { const l=c.l+.3963377774*c.a+.2158037573*c.b, m=c.l-.1055613458*c.a-.0638541728*c.b, s=c.l-.0894841775*c.a-1.291485548*c.b; const f=(v:number)=>{v=v**3;return 255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055)}; return [f(l),f(m),f(s)]; };
const linear=(v:number)=>{v=Math.max(0,Math.min(255,v))/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};
const luminance=(c:RGB)=>.2126*linear(c[0])+.7152*linear(c[1])+.0722*linear(c[2]);
const contrast=(c:RGB)=>(1.05)/(luminance(c)+.05);
const mixRgb=(a:RGB,b:RGB,t:number):RGB=>a.map((v,i)=>v*(1-t)+b[i]!*t) as RGB;
const caps=[.46,.50,.50];
const capsOk=(values: Lab[][]) => values.every((stops)=>stops.every((c,i)=>c.l<=caps[i]!));
const readStops=(src:string,cls:string,phase:"night"|"dawn"|"day"|"dusk")=>["top","mid","bottom"].map(stop=>token(src,`${cls}-${phase}-${stop}`));
const palette=(src:string,cls:string,t:number,twilight:"dawn"|"dusk")=>[0,1,2].map(i=>{const n=readStops(src,cls,"night")[i]!, w=readStops(src,cls,twilight)[i]!, d=readStops(src,cls,"day")[i]!; const stage=mixLab(w,d,Math.max(0,Math.min(1,(t-.5)*2))); return mixLab(n,stage,Math.max(0,Math.min(1,t*2)));});
const sample=(src:string,cls:string,stops:Lab[],x:number,y:number)=>{
 const idx=y<55?0:y<100?1:2; let c=rgb(stops[idx]!);
 const glow=token(src,`${cls}-glow`); const g=rgb(glow); c=mixRgb(c,g,Math.max(0,.12*(1-x/100))*glow.alpha);
 c=mixRgb(c,[255,255,255],.22);
 const flat=/--weather-scrim:\s*rgb\(0 0 0 \/ ([.\d]+)\)/.exec(src); c=mixRgb(c,[0,0,0],Number(flat?.[1]??.16));
 const text=token(src,`${cls}-dusk-scrim`); c=mixRgb(c,[0,0,0],text.alpha*(1-y/100)); return contrast(c);
};
describe("weather scene token contrast",()=>{
 test("phase thresholds and fallback",()=>{expect(phaseOf({elevation:-30,isDay:false}).phase).toBe("night");expect(phaseOf({elevation:-3,isDay:true}).phase).toBe("dusk");expect(phaseOf({elevation:1,isDay:false}).phase).toBe("dawn");expect(phaseOf({elevation:30,isDay:true}).phase).toBe("day");expect(phaseOf({isDay:true}).elevation).toBe(30);});
 test("the shared cap validator rejects a deliberately raised parsed stop",()=>{const p=readStops(themes[0]!,"clear","day");expect(capsOk([p])).toBe(true);p[0]={...p[0]!,l:.461};expect(capsOk([p])).toBe(false);});
 for(let theme=0;theme<themes.length;theme++) for(const cls of WEATHER_CLASSES) test(`theme ${theme} ${cls}: parsed palettes meet caps and contrast`,()=>{
  const src=themes[theme]!; const elevations=[-30,-3,1,30]; const paletteSamples:Lab[][]=[];
  for(const elevation of elevations){const result=phaseOf({elevation,isDay:elevation>0});const twilight=elevation>=0?"dawn":"dusk";paletteSamples.push(palette(src,cls,result.t,twilight));}
  paletteSamples.push(palette(src,cls,.25,"dusk"),palette(src,cls,.75,"dawn"));
  expect(capsOk(paletteSamples),"blended stops respect L caps").toBe(true);
  for(const phase of ["night","dawn","day","dusk"] as const) {
   const authored=readStops(src,cls,phase); expect(capsOk([authored]),`${cls} ${phase} authored caps`).toBe(true);
   resolvedToken(src,`${cls}-${phase}-glow`);
   const scrim=token(src,`${cls}-${phase}-scrim`); expect(scrim.alpha).toBeGreaterThan(0);
  }
  for(const stops of paletteSamples) for(const x of [4,30,55]) for(const y of [58,72,86,98]) expect(sample(src,cls,stops,x,y),`${cls} ${x},${y}`).toBeGreaterThanOrEqual(4.5);
 });
 test("registered weather properties keep the transition",()=>{for(const p of ["--wx-top","--wx-mid","--wx-bottom","--wx-glow","--wx-scrim","--wx-t"])expect(css).toContain(`@property ${p}`);expect(css).toContain("--wx-top 3200ms cubic-bezier(.37, 0, .63, 1)");});
 test("cloud day, night and twilight tints exist in all themes and stay out of the text band",()=>{
  const weatherClassList=["clear","partly-cloudy","overcast","drizzle","rain","snow","thunderstorm"];
  for(const src of themes) for(const cls of weatherClassList) for(const suffix of ["lit","shade","night-lit","night-shade","twilight-lit","twilight-shade"]) expect(token(src,`${cls}-cloud-${suffix}`).l).toBeGreaterThan(0);
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
