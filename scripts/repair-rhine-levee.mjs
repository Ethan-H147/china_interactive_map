import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {load,polygons,landIndex} from './geo-index.mjs';
import {command,fc,sharedBorders,geographicBounds} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {waterFreeLines} from './central-europe-frontiers.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';

const source='scripts/boundary-sources/alpine-lakes/rhine-levee-land.json.gz';
const inLevee=poly=>poly[0].every(([x,y])=>x>9.64&&x<9.655&&y>47.518&&y<47.53);
const geometry=parts=>({type:'MultiPolygon',coordinates:parts});
const probes=[[9.647,47.522],[9.6428,47.5276]];
export async function repairRhineLevee(){
 if(!fs.existsSync(source))return;
 const levee=load(source),changed=[];
 function save(file,data){const text=JSON.stringify(data);if(gunzipSync(fs.readFileSync(file)).toString()===text)return;fs.writeFileSync(file,gzipSync(text,{level:9}));changed.push(file);const compact=file.replace('dist/data/','dist/data/compact/');if(fs.existsSync(compact)){fs.writeFileSync(compact,gzipSync(encodeGeo(data,{source:createHash('sha256').update(text).digest('hex')}),{level:9}));changed.push(compact);}}
 for(const country of ['germany','austria']){
  const base='dist/data/europe/'+country+'/',cat=load(base+'catalogue.bin'),stats=load(base+'statistics.json'),updates=new Map();
  const ids=new Set(country==='germany'?['DE2','DE27A','DE_09776120']:['AT-B-8','AT-D-802','AT-M-80215']);
  const files=['first.bin',...(fs.existsSync(base+'all.bin')?['all.bin']:[]),'political.bin',...Object.values(cat.chunks).filter(ch=>country==='germany'?['second/DE2.bin','third/DE27A.bin'].includes(ch.file):['second/AT-B-8.bin','third/AT-D-802.bin'].includes(ch.file)).map(ch=>ch.file)].filter(f=>fs.existsSync(base+f));
  for(const file of files){const d=load(base+file);for(const part of d.levels||[d]){const regions=part.regions||part;if(!regions.features)continue;let altered=false;
   for(const f of regions.features){if(!ids.has(f.properties.id))continue;let next=updates.get(f.properties.id);
    if(!next){if(country==='germany'){const parts=polygons(f.geometry),keep=parts.filter(p=>!inLevee(p));next=keep.length===parts.length?f:{...f,geometry:geometry(keep)};}
     else{const inside=landIndex(polygons(f.geometry).flat());next=probes.every(inside)?f:{...f,geometry:(await command(fc([f,...levee.features]),'-dissolve',{precision:.000001})).features[0].geometry};}
     updates.set(f.properties.id,next);
    }
    if(JSON.stringify(f.geometry)!==JSON.stringify(next.geometry)){f.geometry=next.geometry;altered=true;}
   }
   if(altered&&part.regions){part.boundaries=lineData(waterFreeLines(sharedBorders(regions)));part.selectionOutlines=waterFreeLines(fc(regions.features.flatMap(f=>polygons(f.geometry).flat().map(coordinates=>({type:'Feature',properties:f.properties,geometry:{type:'LineString',coordinates}})))));}
  }save(base+file,d);}
  for(const r of cat.records){const f=updates.get(r.id);if(!f)continue;r.bounds=geographicBounds(f.geometry);const area=stats.regions[country+':'+r.id]?.area;if(area?.method==='mapped')r.areaKm2=area.value=geographicAreaKm2(f.geometry);}
  for(const ch of Object.values(cat.chunks)){if(!files.includes(ch.file))continue;const b=fs.readFileSync(base+ch.file);ch.bytes=b.length;ch.decodedBytes=gunzipSync(b).length;}save(base+'catalogue.bin',cat);
  const text=JSON.stringify(stats);if(fs.readFileSync(base+'statistics.json','utf8')!==text){fs.writeFileSync(base+'statistics.json',text);changed.push(base+'statistics.json');}
  const first=load(base+'first.bin'),home=await command(first.regions,'-dissolve'),context=load(base+'context.bin');save(base+'context.bin',fc([...home.features.map(f=>({...f,properties:{country}})),...context.features.filter(f=>f.properties.region)]));
  const meta=load(base+'sources.json');meta.rhineLevee={source:'data/lake-constance-levee.json',policy:'The two Rhine river-mouth levee fragments belong to the Austrian land display (Hard, Bregenz, Vorarlberg), not German Nonnenhorn. Retain the existing lake shoreline geometry; do not draw a sovereign boundary across open Lake Constance.'};const json=JSON.stringify(meta,null,2)+'\n';if(fs.readFileSync(base+'sources.json','utf8')!==json){fs.writeFileSync(base+'sources.json',json);changed.push(base+'sources.json');}
 }
 // Remove the old lake-sector cutoff where it crosses exposed Austrian land,
 // including the resident overview used during fast zooms.
 for(const file of ['dist/data/europe/austria/international.bin','dist/data/globe-overview-borders.bin']){const d=load(file),features=[];for(const f of d.features){if(f.properties.pair!=='AUT-DEU'){features.push(f);continue;}const runs=[],paths=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;let touched=false;for(const points of paths){let run;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;if(x>9.64&&x<9.655&&y>47.518&&y<47.53){touched=true;run=null;continue;}if(!run)runs.push(run=[a]);run.push(b);}}features.push(...(touched?runs.map(coordinates=>({...f,geometry:{type:'LineString',coordinates}})):[f]));}save(file,{...d,features});}
 const overviewFile='dist/data/globe-overview.json',overview=load(overviewFile),borderBytes=fs.statSync('dist/data/globe-overview-borders.bin').size;if(overview.borderBytes!==borderBytes){overview.borderBytes=borderBytes;fs.writeFileSync(overviewFile,JSON.stringify(overview,null,2)+'\n');changed.push(overviewFile);}
 const metadata={corrected:'2026-10-23',land:'Rhine river-mouth levee extension (Rheinvorstreckung), Hard, Vorarlberg, Austria',geometry:source,geometrySha256:createHash('sha256').update(gunzipSync(fs.readFileSync(source))).digest('hex'),source:'https://www.ris.bka.gv.at/eli/lgbl/VO/1992/57/P2/LVB40006599',evidence:'Vorarlberg Rheindelta reserve boundary explicitly includes both river-mouth mole heads and the right Rhine embankment. The previous German lake-sector geometry incorrectly captured the exposed levee tips.',policy:'Correct exposed land only. Keep open lake water unfilled and unstroked; infer no international boundary through the lake.'};const file='dist/data/lake-constance-levee.json',json=JSON.stringify(metadata,null,2)+'\n';if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==json){fs.writeFileSync(file,json);changed.push(file);}
 console.log('Rhine levee land correction:',changed.length,'changed files');return changed;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await repairRhineLevee();
