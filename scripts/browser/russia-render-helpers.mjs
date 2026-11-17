import fs from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
let canonical;
async function shapes(){
 if(!canonical)canonical=(async()=>{const root=fileURLToPath(new URL('../../',import.meta.url));const {decodeData}=await import(pathToFileURL(root+'dist/geo-pack.mjs'));const {resolveSharedHistory}=await import(pathToFileURL(root+'dist/shared-history-geometry.mjs'));const geometry=await resolveSharedHistory(await decodeData(fs.readFileSync(root+'dist/data/russia/history/borders.bin')),file=>decodeData(fs.readFileSync(root+'dist/data/'+file)));const {packShapes,shapeAtLocation}=await import(pathToFileURL(root+'dist/historic-shapes.mjs'));return {geometry,shapes:packShapes(geometry.faces.features),shapeAtLocation};})();return canonical;
}
export async function siberianPixelProbes(){
 const {geometry,shapes:prepared,shapeAtLocation}=await shapes(),config=geometry.configs[geometry.years[1914].config],points=[];
 const core=(lng,lat)=>{const f=shapeAtLocation(prepared,{lng,lat});return f&&config.units[config.face[f.properties.id]]?.kind==='core';};
 for(let lng=45;lng<180;lng+=6)for(const lat of [51,55,59,63,67,71,75])if([-1,0,1].every(dx=>[-1,0,1].every(dy=>core(lng+dx*.6,lat+dy*.6))))points.push({lng,lat,color:[117,153,198]});
 return points;
}
export async function sakhalinPixelProbes(color,year){
 const {geometry,shapes:prepared,shapeAtLocation}=await shapes(),points=[];
 // Classify against authoring geometry, including its water holes; keep a
 // small margin so a one-pixel shore antialias cannot decide the result.
 const config=geometry.configs[geometry.years[year].config];
 const classify=(lng,lat)=>{const face=shapeAtLocation(prepared,{lng,lat});return !face?'water':config.face[face.properties.id]>=0?'owned':'unassigned';};
 for(let lng=140.5;lng<144;lng+=.13)for(let lat=50.5;lat<54.4;lat+=.14){const expected=classify(lng,lat);if([-1,0,1].every(dx=>[-1,0,1].every(dy=>classify(lng+dx*.035,lat+dy*.035)===expected)))points.push({lng,lat,color:expected==='owned'?color:expected==='water'?[237,240,246]:[215,215,211]});}
 return points;
}
export function installPixelSampler(probes){
 const samples={frames:0,points:0,bad:0,failures:[],enabled:true},gl=map.painter.context.gl;let pixels,width,height;
 window.historicalPixels=samples;
 const sample=()=>{
  if(!samples.enabled)return;
  width=gl.drawingBufferWidth;height=gl.drawingBufferHeight;
  if(!pixels||pixels.length!==width*height*4)pixels=new Uint8Array(width*height*4);
  gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const transform=map.transform||map._camera?.transform,ratio=map.getPixelRatio();samples.frames++;
  for(const probe of probes){
   if(transform?.isLocationOccluded?.(probe))continue;
   const point=map.project(probe),x=Math.round(point.x*ratio),y=height-1-Math.round(point.y*ratio);
   if(x<6||y<6||x>=width-6||y>=height-6)continue;
   let good=0;const center=[];
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const at=((y+dy)*width+x+dx)*4,color=[pixels[at],pixels[at+1],pixels[at+2]];if(!dx&&!dy)center.push(...color);if(color.every((n,i)=>Math.abs(n-probe.color[i])<=18))good++;}
   if(probe.strict)good=center.every((n,i)=>Math.abs(n-probe.color[i])<=4)?9:0;
   samples.points++;
   if(good<5){samples.bad++;if(samples.failures.length<16)samples.failures.push({lng:probe.lng,lat:probe.lat,actual:center,expected:probe.color,zoom:map.getZoom(),bearing:map.getBearing(),frame:samples.frames});}
  }
 };
 map.on('render',sample);samples.stop=()=>{samples.enabled=false;map.off('render',sample);pixels=null;};map.triggerRepaint();
}
export async function beginPixels(p,probes){await p.evaluate('('+installPixelSampler.toString()+')('+JSON.stringify(probes)+')');}
export async function endPixels(p){const result=await p.evaluate('(()=>{historicalPixels.stop();return {frames:historicalPixels.frames,points:historicalPixels.points,bad:historicalPixels.bad,failures:historicalPixels.failures}})()');(p.pixelChecks??=[]).push(result);return result;}
