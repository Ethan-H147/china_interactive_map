import assert from 'node:assert/strict';
import {load,linesOf} from '../geo-index.mjs';
const flight=load('dist/data/flight-context.bin'),ukraine=load('dist/data/europe/ukraine/international.bin');
const andes=load('scripts/boundary-sources/north-andes/resolved.bin').features.filter(f=>['BRA-COL','COL-ECU','COL-VEN'].includes(f.properties.pair));
const cases=[...andes,...flight.landBorders.features,...flight.riverBorders.features.slice(0,1),...ukraine.features.filter(f=>f.properties.pair==='UKR-MDA')].map(f=>{const paths=linesOf({features:[f]}),line=paths[0],point=line[Math.floor(line.length/2)],countries=f.properties.countries;return{paths,point,pair:f.properties.pair||countries.join('/'),owner:f.properties.pair?(f.properties.pair==='UKR-MDA'?'ukraine':'colombia'):countries.includes('brazil')?'brazil':'argentina'};});
const ink=(p,paths)=>p.evaluate(`new Promise(resolve=>{map.once('render',()=>{
 const canvas=map.getCanvas(),gl=canvas.getContext('webgl2'),pixels=new Uint8Array(canvas.width*canvas.height*4),scale=canvas.width/canvas.clientWidth;
 gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let tested=0,missing=0,bad=[];
 for(const path of ${JSON.stringify(paths)}){
  const projected=path.map(v=>map.project(v));
  // A subpixel isolated path can quantize to one point; test it again up close.
  if(Math.hypot(Math.max(...projected.map(p=>p.x))-Math.min(...projected.map(p=>p.x)),Math.max(...projected.map(p=>p.y))-Math.min(...projected.map(p=>p.y)))<1)continue;
  for(let i=0;i<path.length;i+=Math.max(1,Math.floor(path.length/1200))){
   const q=projected[i];if(q.x<8||q.y<8||q.x>canvas.clientWidth-8||q.y>canvas.clientHeight-8)continue;
   tested++;let found=false;const x=Math.round(q.x*scale),y=canvas.height-1-Math.round(q.y*scale);
   for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const n=((y+dy)*canvas.width+x+dx)*4;if((pixels[n]+pixels[n+1]+pixels[n+2])/3<210)found=true;}
   if(!found){missing++;if(bad.length<5)bad.push(path[i]);}
  }
 }
 resolve({tested,missing,bad});});map.triggerRepaint();})`);
export default [false,true].map(mobile=>({name:'Precise international borders before selection and at close zoom '+(mobile?'phone':'desktop'),options:mobile?{width:390,height:900,mobile:true}:{width:1280,height:900},async run(p,base){
 await p.open(base,'#japan');await p.waitFor('map.getSource("country-border-previews")&&map.isSourceLoaded("country-border-previews")');
 for(const sample of cases)for(const country of ['japan',sample.owner]){
  if(await p.evaluate('atlasMode')!==country){await p.evaluate('changeAtlas('+JSON.stringify(country)+',false)');await p.settle();}
  for(const zoom of[4.5,8,12]){
   await p.evaluate('void map.jumpTo({center:'+JSON.stringify(sample.point)+',zoom:'+zoom+'})');await p.settle();
   assert.equal(await p.evaluate('AtlasGlobeOverviewController.snapshot().borders.coarse'),false,sample.pair+' precise strokes independently of land overview');
   if(sample.pair==='BRA-COL')assert.equal(await p.evaluate('(()=>{const q=map.project('+JSON.stringify(sample.point)+');return [...new Set(map.queryRenderedFeatures([[q.x-3,q.y-3],[q.x+3,q.y+3]]).filter(f=>f.layer.metadata?.atlasInternationalBorder).map(f=>f.source))].length})()'),1,'Colombia–Brazil has one precise border source before and after opening Colombia');
   const result=await ink(p,sample.paths);assert(result.tested>0,sample.pair+' visible source samples');assert.equal(result.missing,0,sample.pair+' continuous pixels at zoom '+zoom+' from '+country+' '+JSON.stringify(result));
   assert(await p.evaluate('mapScene.assertOrder()'));
  }
 }
 await p.screenshot('border-zoom-'+(mobile?'phone':'desktop'));
}}));
