import assert from 'node:assert/strict';import fs from 'node:fs';
import {chooseMapView} from './map-view-dropdown.test.mjs';
const fixtures=JSON.parse(fs.readFileSync('scripts/boundary-sources/canada-lakes/check-points.json'));
export default [false,true].map(mobile=>({name:'Four Canadian lakes stay empty at every map level '+(mobile?'phone':'desktop'),options:{width:mobile?390:1280,height:mobile?844:900,mobile},async run(p,base){
 await p.open(base,'#canada');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");await p.waitFor('currentAtlas()?.ready');
 const position=async fixture=>{await p.evaluate('void map.fitBounds('+JSON.stringify(fixture.bounds)+',{padding:45,duration:0})');await p.settle();};
 const check=async(fixture,layers)=>{const result=await p.evaluate(`(()=>{const layers=${JSON.stringify(layers)}.filter(id=>map.getLayer(id)),water=map.project(${JSON.stringify(fixture.point)}),land=map.project(${JSON.stringify(fixture.land)});return {water:map.queryRenderedFeatures(water,{layers}).map(f=>f.properties.id),land:map.queryRenderedFeatures(land,{layers}).length}})()`);assert.deepEqual(result.water,[],fixture.name+' has no administrative land fill');assert(result.land>0,fixture.name+' nearby land is retained');};
 for(const fixture of fixtures){
  for(const [id,level]of [[fixture.province,1],[fixture.division,2],[fixture.unit,3]]){await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');await p.evaluate('currentAtlas().setMode('+level+')');await position(fixture);await check(fixture,['canada-first-fill','canada-second-fill','canada-third-fill']);}
  await p.screenshot('canada-'+fixture.name.toLowerCase().replaceAll(' ','-')+'-'+(mobile?'phone':'desktop'));
 }
 await chooseMapView(p,'area-codes');for(const fixture of fixtures){const code=fixture.province==='CA-NT'?'867':fixture.province==='CA-MB'?'431':'639';await p.evaluate('currentAtlas().restore('+JSON.stringify('CA-NPA-'+code)+',"area-codes")');await position(fixture);await check(fixture,['canada-first-fill','canada-area-codes-fill']);}
 await p.evaluate('location.hash="#china"');await p.waitFor('AtlasEntry.current==="china"');await position(fixtures[1]);const hits=await p.evaluate('map.queryRenderedFeatures(map.project('+JSON.stringify(fixtures[1].point)+'),{layers:map.getStyle().layers.filter(l=>l.type==="fill"&&l.layout?.visibility!=="none").map(l=>l.id)}).map(f=>f.layer.id)');assert.deepEqual(hits,[],'World/background previews retain the lake cutout after leaving Canada');
}}));
