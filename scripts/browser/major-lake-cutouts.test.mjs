import assert from 'node:assert/strict';import fs from 'node:fs';import sharp from 'sharp';
import {chooseMapView} from './map-view-dropdown.test.mjs';
const {fixtures}=JSON.parse(fs.readFileSync('scripts/boundary-sources/major-lake-cutouts/checks.json'));
async function pixel(p,point){
 const position=await p.evaluate('(()=>{const p=map.project('+JSON.stringify(point)+'),r=map.getCanvas().getBoundingClientRect();return {x:Math.round(p.x+r.left),y:Math.round(p.y+r.top),sea:map.getPaintProperty("background","background-color")}})()');
 await p.evaluate('(()=>{const s=document.createElement("style");s.id="water-pixel-check";s.textContent="body *{visibility:hidden!important}#map,#map *{visibility:visible!important}#map .maplibregl-marker{visibility:hidden!important}";document.head.append(s)})()');
 try{const shot=await p.send('Page.captureScreenshot',{format:'png',clip:{x:position.x,y:position.y,width:1,height:1,scale:1}}),data=await sharp(Buffer.from(shot.data,'base64')).removeAlpha().raw().toBuffer();return {rgb:[...data.subarray(0,3)],sea:position.sea.slice(1).match(/../g).map(v=>parseInt(v,16))};}finally{await p.evaluate('document.getElementById("water-pixel-check").remove()');}
}
export default [...new Set(fixtures.map(f=>f.country))].flatMap(country=>[false,true].map(mobile=>({name:country+' lake surfaces preserve original borders '+(mobile?'phone':'desktop'),options:{width:mobile?390:1280,height:mobile?844:900,mobile},async run(p,base){
 await p.open(base,'#'+country);await p.evaluate('AtlasSettings.setSettings({motion:"reduce"})');const list=fixtures.filter(f=>f.country===country);
 const position=async f=>{await p.evaluate('void map.fitBounds('+JSON.stringify(f.bounds)+',{padding:45,duration:0})');await p.settle();};
 const check=async f=>{const result=await pixel(p,f.point);assert.deepEqual(result.rgb,result.sea,f.name+' matches the sea exactly');if(f.land){const land=await pixel(p,f.land);assert.notDeepEqual(land.rgb,land.sea,f.name+' nearby land remains visible');}
  const order=await p.evaluate('(()=>{const layers=map.getStyle().layers,i=layers.findIndex(l=>l.id==="major-lake-water");return {water:i,under:layers.every((l,n)=>l.type!=="line"||!["border","selection"].includes(l.metadata?.atlas?.role)||n>i)}})()');assert(order.water>=0&&order.under,'Permanent water is below every original border and selection line');
 };
 for(const f of list){
  if(country==='china'){
   await p.evaluate('selectRegion(provinceLayers.get(630000),630000,false)');
   for(const mode of ['province','prefecture']){await p.evaluate('setMode('+JSON.stringify(mode)+',true)');await position(f);await check(f);}
   await p.evaluate('document.getElementById("water-layer").checked=true;document.getElementById("water-layer").dispatchEvent(new Event("change"))');await p.waitFor('!!map.getLayer("major-lakes")');await p.settle();await check(f);
  }else{
   for(const level of f.levels){await p.evaluate('currentAtlas().restore('+JSON.stringify(level.id)+')');await p.evaluate('currentAtlas().setMode('+level.level+')');await position(f);await check(f);}
   if(f.borderPoints.length){await p.evaluate('currentAtlas().restore('+JSON.stringify(f.levels[0].id)+')');await p.evaluate('currentAtlas().setMode(1)');await position(f);const layers=await p.evaluate('('+JSON.stringify(f.borderPoints)+').map(point=>{const p=map.project(point);return map.queryRenderedFeatures([[p.x-3,p.y-3],[p.x+3,p.y+3]],{layers:['+JSON.stringify(country+'-first-lines')+','+JSON.stringify(country+'-first-selected')+']}).map(f=>f.layer.id)})');for(const hits of layers)assert(hits.includes(country+'-first-lines'),'Original border still crosses '+f.name);}
  }
  await p.screenshot('major-lake-'+f.name.toLowerCase().replaceAll(' ','-')+'-'+(mobile?'phone':'desktop'));
 }
 if(country==='canada'){await chooseMapView(p,'area-codes');for(const province of ['CA-SK','CA-MB']){const f=list.find(f=>f.levels[0].id===province);if(!f)continue;await p.evaluate('currentAtlas().restore('+JSON.stringify(province)+',"area-codes")');await position(f);await check(f);}}
 const satellite=await p.evaluate('(async()=>{const scene=(await import("./map-scene.mjs")).getMapScene(map);scene.setSatellite(true,1);const hidden=map.getPaintProperty("major-lake-water","fill-opacity");scene.setSatellite(false);return {hidden,restored:map.getPaintProperty("major-lake-water","fill-opacity")}})()');assert.deepEqual(satellite,{hidden:0,restored:1});
}})));
