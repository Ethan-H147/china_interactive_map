import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {load,polygons} from './geo-index.mjs';
import {command,fc,buildRegionalDataset} from './build-regional-dataset.mjs';
import {centralWater,waterFreeLines,save} from './central-europe-frontiers.mjs';
import {prepareCentralOptionalViews} from './central-europe-optional.mjs';
export async function repairVorarlbergWater(){
 const base='dist/data/europe/austria/',current=load(base+'catalogue.bin'),old=load(base+'statistics.json'),sources=load(base+'sources.json'),prepared=JSON.parse(gunzipSync(fs.readFileSync('artifacts/central-europe-prepared.bin'))).find(d=>d.country==='austria'),units=new Map(prepared.units),state=id=>{let r=units.get(id);while(r.parent)r=units.get(r.parent);return r.id;},original=new Map(prepared.bottom.features.map(f=>[f.properties.id,f]));
 let bottom=fc(Object.values(current.chunks).filter(ch=>ch.level===3).flatMap(ch=>load(base+ch.file).regions.features).map(f=>state(f.properties.id)==='AT-B-8'?original.get(f.properties.id):f));
 bottom=await command({'land.json':bottom,'water.json':centralWater()},'-erase water.json -clean gap-fill-area=0');
 const second=await command(fc(bottom.features.map(f=>({...f,properties:{id:units.get(f.properties.id).parent}}))),'-dissolve id'),first=await command(fc(second.features.map(f=>({...f,properties:{id:units.get(f.properties.id).parent}}))),'-dissolve id'),statistics={};
 for(const r of current.records.filter(r=>r.level===1)){const s=old.regions['austria:'+r.id];statistics[r.id]={gdp:s.gdp,gdpPerCapita:s.gdpPerCapita};}
 await buildRegionalDataset({country:'austria',units,byLevel:{1:first,2:second,3:bottom},sources:sources.sources,coverage:sources.coverage,statisticsSources:old.sources,statistics,retrieved:'2026-10-22',year:2026,levels:current.levels});
 save(base+'political.bin',first);save(base+'context.bin',fc((await command(first,'-dissolve')).features.map(f=>({...f,properties:{country:'austria'}}))));await prepareCentralOptionalViews();
 console.log('Restored the Austrian shore from official municipal geometry; only the detailed Alpine water surface is excluded.');
}
export async function refreshCentralSelectionOutlines(){
 for(const country of ['austria','hungary','slovenia','germany','switzerland','italy','ukraine','czechia','slovakia']){const base='dist/data/europe/'+country+'/',cat=load(base+'catalogue.bin');
  for(const file of ['first.bin',...(fs.existsSync(base+'all.bin')?['all.bin']:[]),...Object.values(cat.chunks).map(ch=>ch.file)]){const data=load(base+file);let changed=false;for(const part of data.levels||[data]){if(!part.regions)continue;if(!part.selectionOutlines&&!['austria','hungary','slovenia'].includes(country))continue;const next=waterFreeLines(fc(part.regions.features.flatMap(f=>polygons(f.geometry).flat().map(coordinates=>({type:'Feature',properties:f.properties,geometry:{type:'LineString',coordinates}})))));if(JSON.stringify(next)!==JSON.stringify(part.selectionOutlines)){part.selectionOutlines=next;changed=true;}}if(changed)save(base+file,data);}
  for(const ch of Object.values(cat.chunks)){ch.bytes=fs.statSync(base+ch.file).size;ch.decodedBytes=gunzipSync(fs.readFileSync(base+ch.file)).length;}save(base+'catalogue.bin',cat);
 }
}
if(process.argv[1]?.endsWith('finalize-central-water.mjs')){if(process.argv.includes('--repair-vorarlberg'))await repairVorarlbergWater();await refreshCentralSelectionOutlines();}
