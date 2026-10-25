import assert from 'node:assert/strict';
import {load} from '../geo-index.mjs';

const samples=[['europe/france','france-international'],['southern-africa/south-africa','south-africa-international']].map(([path,owner])=>{
 const paths=load('dist/data/'+path+'/international.bin').features.filter(f=>!f.properties.claimedBy&&!f.properties.claimants).flatMap(f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates);
 const line=paths.sort((a,b)=>b.length-a.length)[0];return {owner,point:line[Math.floor(line.length/2)]};
});
export default [1280,390].map(width=>({name:'Distant land borders survive close zoom and flat zoom has a floor '+width,options:{width,height:844,mobile:width===390},async run(p,base){
 await p.open(base,'#finland');
 for(const projection of ['mercator','globe']){
  await p.evaluate(`document.getElementById('globe-view').setAttribute('aria-pressed','${projection==='globe'}');syncGlobe(false);void 0`);
  if(projection==='mercator'){
   assert.equal(await p.evaluate('map.getMinZoom()'),.5,'Flat zoom floor is identical on phones and desktop');
   await p.evaluate('map.jumpTo({zoom:-20});void 0');await p.settle();assert(await p.evaluate('map.getZoom()>=.5'),'Camera cannot cross the flat-map floor');
   await p.viewport(width,960);assert.equal(await p.evaluate('map.getMinZoom()'),.5,'Resize keeps flat zoom bounded');
  }
  for(const {owner,point} of samples)for(const zoom of [5.5,8,12,16]){
   await p.evaluate(`map.jumpTo({center:${JSON.stringify(point)},zoom:${zoom}});void 0`);await p.settle();
   const report=await p.evaluate(`new Promise(resolve=>{map.once('render',()=>{const q=map.project(${JSON.stringify(point)}),canvas=map.getCanvas(),gl=canvas.getContext('webgl2'),scale=canvas.width/canvas.clientWidth,r=Math.ceil(7*scale),pixels=new Uint8Array((2*r+1)**2*4);gl.readPixels(Math.round(q.x*scale)-r,canvas.height-1-Math.round(q.y*scale)-r,2*r+1,2*r+1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let ink=0;for(let i=0;i<pixels.length;i+=4)if((pixels[i]+pixels[i+1]+pixels[i+2])/3<209)ink++;resolve({ink,coarse:AtlasGlobeOverviewController.snapshot().borders.coarse,owners:map.queryRenderedFeatures([[q.x-7,q.y-7],[q.x+7,q.y+7]],{layers:['country-border-previews']}).map(f=>f.properties.previewLayer)});});map.triggerRepaint();})`);
   assert(!report.coarse,'Detailed border representation takes over');
   // Desktop may already have warmed the country's adapter in the background.
   const native=await p.evaluate(`map.getLayer(${JSON.stringify(owner)})&&mapScene.baseVisibility(${JSON.stringify(owner)})!=='none'`);
   assert(native||report.owners.includes(owner),'Unopened country retains its border: '+owner+' '+projection+' '+zoom);
   assert(report.ink>0,'Border pixels stay visible: '+owner+' '+projection+' '+zoom);
  }
 }
 if(width===390)assert.equal(await p.evaluate('!!document.getElementById("france-sidebar")'),false,'Viewing a border does not create the country UI');
 await p.evaluate("changeAtlas('france',false)");await p.settle();
 const filter=await p.evaluate("map.getFilter('country-border-previews')");assert(filter[1][1][2][1].includes('france-international'),'Opening France transfers border ownership');
 await p.screenshot('zoom-borders-'+width);
}}));
