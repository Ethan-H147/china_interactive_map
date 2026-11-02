import assert from 'node:assert/strict';
const camera=p=>p.evaluate('[map.getCenter().toArray(),map.getZoom()]');
async function same(p,expected,label){const actual=await camera(p);for(let i=0;i<2;i++)assert(Math.abs(actual[0][i]-expected[0][i])<1e-6,label+' center');assert(Math.abs(actual[1]-expected[1])<1e-6,label+' zoom');}
// Phones fit a quiz above its taller sheet, so the round has its own camera rather than the default fit,
// and ending it leaves the camera where it is.
export async function fitsAboveSheet(p,bounds,label){const r=await p.evaluate('(()=>{const a=AtlasSheet.mapArea(),b='+JSON.stringify(bounds)+',[s,n]=[map.project(b[0]),map.project(b[1])];return {top:a.top,bottom:innerHeight-a.bottom,width:innerWidth,x:[s.x,n.x],y:[n.y,s.y]}})()');assert(r.x[0]>=-2&&r.x[1]<=r.width+2&&r.y[0]>=r.top-2&&r.y[1]<=r.bottom+2,label+' fits above the sheet '+JSON.stringify(r));assert((r.x[1]-r.x[0])/r.width>=.6||(r.y[1]-r.y[0])/(r.bottom-r.top)>=.6,label+' fills the map area '+JSON.stringify(r));}
const china=[[73.6,18.2],[134.8,53.5]];
export default [1280,390].map(width=>({name:'China quiz framing '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#china');await p.tap('#fit-map');await p.settle();const expected=await camera(p);
 await p.tap('#tab-quiz');await p.evaluate('document.getElementById("china-quiz-level").value="provinces";document.getElementById("china-quiz-level").dispatchEvent(new Event("change"))');
 for(const type of ['find','identify','name']){
  await p.evaluate('document.getElementById("cn-quiz-type").value='+JSON.stringify(type)+';document.getElementById("cn-quiz-type").dispatchEvent(new Event("change"))');await p.settle();await p.tap('#cn-quiz-panel [data-q=start]');await p.waitFor('chinaFirstQuiz.active');await p.settle();const round=width===390?await camera(p):expected;if(width===390)await fitsAboveSheet(p,china,type+' start');else await same(p,expected,type+' start');
  if(type==='find'){await p.evaluate('void map.jumpTo({center:[110,32],zoom:7})');await p.settle();await p.tap('#fit-map');await p.settle();await same(p,round,'Quiz fit');const reveal='#cn-quiz-panel [data-q=reveal]';await p.waitFor('(()=>{const e=document.querySelector('+JSON.stringify(reveal)+');return e&&e.getClientRects().length&&!e.disabled})()');await p.tap(reveal);const next='#cn-quiz-panel [data-q=next]';await p.waitFor('(()=>{const e=document.querySelector('+JSON.stringify(next)+');return e&&e.getClientRects().length&&!e.disabled&&e.textContent.includes("Next")})()');await p.tap(next);await p.settle();await same(p,round,'Next question');}
  const last=width===390?await camera(p):expected;await p.evaluate('chinaFirstQuiz.end()');await p.settle();await same(p,last,type+' exit');await p.tap('#tab-quiz');
 }
 await p.evaluate('document.getElementById("cn-quiz-level").value="prefectures";document.getElementById("cn-quiz-level").dispatchEvent(new Event("change"))');await p.settle();await p.tap('#cn-prefectures-quiz-panel [data-q=start]');await p.settle();if(width===390)await fitsAboveSheet(p,china,'All-China prefecture quiz');else await same(p,expected,'All-China prefecture quiz');await p.screenshot('china-quiz-default-framing-'+width);await p.tap('#home');await p.settle();
}}));
