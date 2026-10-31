import assert from 'node:assert/strict';import fs from 'node:fs';
import sharp from 'sharp';
import {load,landIndex,polygons,linesOf,lineIndex} from '../geo-index.mjs';
import {chooseMapView} from './map-view-dropdown.test.mjs';
const fixtures=JSON.parse(fs.readFileSync('scripts/boundary-sources/canada-lakes/check-points.json'));
const water=load('scripts/boundary-sources/canada-lakes/lakes.geojson.gz'),inside=landIndex(water.features.flatMap(f=>polygons(f.geometry).flat())),shore=lineIndex(water.features.flatMap(f=>polygons(f.geometry).flat())),reference=load('scripts/boundary-sources/canada-lakes/alberta-saskatchewan-border.json.gz');
const borderPoints=linesOf(reference).flatMap(path=>path.slice(1).flatMap((b,i)=>{const a=path[i],steps=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/.01);return Array.from({length:steps},(_,k)=>a.map((v,j)=>v+(b[j]-v)*(k+.5)/steps));})).filter(p=>inside(p)&&shore(p)>500);
assert(borderPoints.length>0);
export default [false,true].map(mobile=>({name:'Four Canadian lakes stay empty at every map level '+(mobile?'phone':'desktop'),options:{width:mobile?390:1280,height:mobile?844:900,mobile},async run(p,base){
 await p.open(base,'#canada');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");await p.waitFor('currentAtlas()?.ready');
 const position=async fixture=>{await p.evaluate('void map.fitBounds('+JSON.stringify(fixture.bounds)+',{padding:45,duration:0})');await p.settle();};
 const pixelCheck=async fixture=>{
  const point=await p.evaluate('(()=>{const p=map.project('+JSON.stringify(fixture.point)+'),r=map.getCanvas().getBoundingClientRect();return {x:Math.round(p.x+r.left),y:Math.round(p.y+r.top),sea:map.getPaintProperty("background","background-color")}})()');
  // Hide controls without changing layout: the phone sheet's shadow can tint
  // otherwise correct sea pixels near its edge.
  await p.evaluate('(()=>{const s=document.createElement("style");s.id="pixel-check-ui";s.textContent="body *{visibility:hidden!important}#map,#map *{visibility:visible!important}#map .maplibregl-marker{visibility:hidden!important}";document.head.append(s)})()');
  let data;try{const shot=await p.send('Page.captureScreenshot',{format:'png',clip:{x:point.x,y:point.y,width:1,height:1,scale:1}});({data}=await sharp(Buffer.from(shot.data,'base64')).removeAlpha().raw().toBuffer({resolveWithObject:true}));}finally{await p.evaluate('document.getElementById("pixel-check-ui").remove()');}
  const expected=point.sea.slice(1).match(/../g).map(v=>parseInt(v,16));assert.deepEqual([...data.subarray(0,3)],expected,fixture.name+' pixels match the sea background exactly');
 };
 const check=async(fixture,layers)=>{const result=await p.evaluate(`(()=>{const layers=${JSON.stringify(layers)}.filter(id=>map.getLayer(id)),water=map.project(${JSON.stringify(fixture.point)}),land=map.project(${JSON.stringify(fixture.land)});return {water:map.queryRenderedFeatures(water,{layers}).map(f=>f.properties.id),land:map.queryRenderedFeatures(land,{layers}).length}})()`);assert.deepEqual(result.water,[],fixture.name+' has no administrative land fill');assert(result.land>0,fixture.name+' nearby land is retained');await pixelCheck(fixture);};
 for(const fixture of fixtures){
  for(const [id,level]of [[fixture.province,1],[fixture.division,2],[fixture.unit,3]]){await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');await p.evaluate('currentAtlas().setMode('+level+')');await position(fixture);await check(fixture,['canada-first-fill','canada-second-fill','canada-third-fill']);}
  await p.screenshot('canada-'+fixture.name.toLowerCase().replaceAll(' ','-')+'-'+(mobile?'phone':'desktop'));
 }
 // Selecting either side must retain the legal border through the water,
 // without turning the rest of the lake shore into a selected outline.
 for(const id of ['CA-SK','CA-AB']){await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');await p.evaluate('currentAtlas().setMode(1)');await position(fixtures[3]);
  const hits=await p.evaluate('('+JSON.stringify(borderPoints)+').map(point=>{const p=map.project(point);return map.queryRenderedFeatures([[p.x-2,p.y-2],[p.x+2,p.y+2]],{layers:["canada-first-lines","canada-first-selected"]}).map(f=>f.layer.id)})');
  for(const layers of hits){assert(layers.includes('canada-first-lines'),'Original province mesh crosses the water');assert(layers.includes('canada-first-selected'),'Selected province outline crosses the water');}
  await pixelCheck(fixtures[3]);await p.screenshot('canada-athabasca-original-border-'+id+'-'+(mobile?'phone':'desktop'));
 }
 await chooseMapView(p,'area-codes');for(const fixture of fixtures){const code=fixture.province==='CA-NT'?'867':fixture.province==='CA-MB'?'431':'639';await p.evaluate('currentAtlas().restore('+JSON.stringify('CA-NPA-'+code)+',"area-codes")');await position(fixture);await check(fixture,['canada-first-fill','canada-area-codes-fill']);}
 const satellite=await p.evaluate('(async()=>{const scene=(await import("./map-scene.mjs")).getMapScene(map);scene.setSatellite(true,1);const hidden=map.getPaintProperty("canada-lake-water","fill-opacity");scene.setSatellite(false);return {hidden,restored:map.getPaintProperty("canada-lake-water","fill-opacity")}})()');assert.deepEqual(satellite,{hidden:0,restored:1},'Sea surfaces reveal satellite imagery and restore afterwards');
 await p.evaluate('location.hash="#china"');await p.waitFor('AtlasEntry.current==="china"');await p.settle();await position(fixtures[1]);const hits=await p.evaluate('map.queryRenderedFeatures(map.project('+JSON.stringify(fixtures[1].point)+'),{layers:map.getStyle().layers.filter(l=>l.type==="fill"&&l.layout?.visibility!=="none").map(l=>l.id)}).map(f=>f.layer.id)');assert(await p.evaluate('!!map.getLayer("canada-lake-water")'),'Permanent lake water remains installed after leaving Canada');assert.deepEqual(hits.filter(id=>id!=='canada-lake-water'),[],'World/background previews retain the lake cutout after leaving Canada');await pixelCheck(fixtures[1]);
}}));
