import assert from 'node:assert/strict';
import {load} from '../geo-index.mjs';
const report=load('dist/data/us-mexico-frontier.json'),sites=[report.gapSites[0],report.gapSites.find(p=>p.point[0]>-104&&p.point[0]<-102),...report.gapSites.filter(p=>p.point[0]>-101).slice(0,3)].map(p=>p.point);
async function landPixel(p,point){return p.evaluate(`new Promise(resolve=>{map.once('render',()=>{const q=map.project(${JSON.stringify(point)}),canvas=map.getCanvas(),gl=canvas.getContext('webgl2'),ratio=canvas.width/canvas.clientWidth,pixel=new Uint8Array(4);gl.readPixels(Math.round(q.x*ratio),canvas.height-1-Math.round(q.y*ratio),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);const color=map.getPaintProperty('background','background-color'),rgb=/^#/.test(color)?color.slice(1).match(/../g).map(c=>parseInt(c,16)):[];resolve(Math.max(...rgb.map((v,i)=>Math.abs(v-pixel[i]))));});map.triggerRepaint();})`);}
export default [1280,390].map(width=>({name:'US–Mexico river bends remain filled across levels and projections '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#mexico');
 for(const country of ['mexico','united-states']){
  if(country!=='mexico'){await p.evaluate("changeAtlas('united-states',false)");await p.settle();}
  for(const projection of ['mercator','globe']){
   await p.evaluate(`document.getElementById('globe-view').setAttribute('aria-pressed','${projection==='globe'}');syncGlobe(false);void 0`);
   for(const point of sites){await p.evaluate(`map.jumpTo({center:${JSON.stringify(point)},zoom:12});void 0`);await p.settle();assert((await landPixel(p,point))>8,country+' has no background slit at '+point+' in '+projection);if(country==='mexico')assert(await p.evaluate(`map.queryRenderedFeatures(map.project(${JSON.stringify(point)}),{layers:['mexico-first-fill']}).length>0`),'Mexican state covers repaired land');}
  }
 }
 await p.evaluate("changeAtlas('mexico',false)");await p.settle();await p.evaluate('currentAtlas().restore("MX-TAM")');await p.settle();
 for(const point of sites.filter(p=>p[0]>-100)){await p.evaluate(`map.jumpTo({center:${JSON.stringify(point)},zoom:12});void 0`);await p.settle();assert(await p.evaluate(`map.queryRenderedFeatures(map.project(${JSON.stringify(point)}),{layers:['mexico-second-fill']}).length>0`),'Municipal layer keeps the repaired Rio Grande edge');}
 await p.screenshot('us-mexico-curves-'+width);
 await p.evaluate("changeAtlas('finland',false)");await p.settle();for(const point of sites.filter(p=>p[0]>-100)){await p.evaluate(`map.jumpTo({center:${JSON.stringify(point)},zoom:12});void 0`);await p.settle();assert((await landPixel(p,point))>8,'Unopened-country preview has no lower Rio Grande gap');}
 assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
}}));
