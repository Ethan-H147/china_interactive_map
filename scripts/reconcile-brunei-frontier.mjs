import {geographicAreaKm2} from './geographic-area.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {load,polygons,linesOf,lineIndex,metres} from './geo-index.mjs';
import {command,fc,geographicBounds} from './build-regional-dataset.mjs';
import {countryContext} from './country-context.mjs';
import {alignCountry} from './international-topology.mjs';
import {selectFrontierArc,segmentKey} from './frontier-arcs.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
export async function reconcileBruneiFrontier(){
 const base='dist/data/europe/brunei/',file=base+'frontier-reference.json';if(!fs.existsSync(file))return;
 const paths=load(file).paths,first=load(base+'first.bin').regions,canonical=(await command(first,'-dissolve2')).features[0];
 const write=(file,value)=>{const json=JSON.stringify(value),bytes=gzipSync(json,{level:9});fs.writeFileSync(file,bytes);return{bytes:bytes.length,decodedBytes:Buffer.byteLength(json)};};
 const reports=[];
 async function protect(collection){
  let output=collection;
  // Western Brunei and Temburong are separate mainland rings. Align each against its own ring.
  for(const path of paths){
   const parts=polygons(canonical.geometry).map(coordinates=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates}})),part=parts.map(f=>({f,near:lineIndex(polygons(f.geometry).flat())})).sort((a,b)=>(a.near(path[0])+a.near(path.at(-1)))-(b.near(path[0])+b.near(path.at(-1))))[0].f;
   const outline=await command(output,'-dissolve2'),own=selectFrontierArc(outline,path).path,anchors=new Map([[own[0].join(','),path[0]],[own.at(-1).join(','),path.at(-1)]]),candidates=lineIndex([own]),keys=new Set(path.slice(1).map((b,i)=>segmentKey(path[i],b)));
   const result=alignCountry(output.features,part,(a,b)=>keys.has(segmentKey(a,b)),8000,(a,b)=>[0,.25,.5,.75,1].every(t=>candidates([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])<1),{anchors,allowCollapse:true,maxStretch:40});reports.push(result.report);output=fc(result.features);
  }
  return command({'own.json':output,'brunei.json':first},'-erase brunei.json -clean');
 }
 // Retain complete meanders when nearest-edge projection collapses a tight bend.
 async function closeArcGaps(collection){
  const desired=await command(collection,'-dissolve2');
  for(const path of paths){
   const own=selectFrontierArc(desired,path).path;let replaced=false;
   for(const f of desired.features)for(const polygon of polygons(f.geometry)){
    const ring=polygon[0].slice(0,-1),n=ring.length,a=ring.findIndex(p=>p.join(',')===own[0].join(',')),b=ring.findIndex(p=>p.join(',')===own.at(-1).join(','));if(a<0||b<0)continue;
    const forward=ring[(a+1)%n].join(',')===own[1].join(','),from=forward?a:b,to=forward?b:a,replacement=forward?path:[...path].reverse(),next=[...replacement];for(let i=(to+1)%n;i!==from;i=(i+1)%n)next.push(ring[i]);next.push(next[0]);polygon[0]=next;replaced=true;break;
   }
   assert(replaced,'Complete frontier arc is on the Sarawak exterior');
  }
  const gaps=await command({'desired.json':desired,'districts.json':collection},'-erase districts.json -explode'),gapArea=gaps.features.reduce((n,f)=>n+geographicAreaKm2(f.geometry),0);assert(gapArea<5,'Only small border meander gaps may be repaired; got '+gapArea+' km²');
  const boundary=collection.features.map(f=>({f,near:lineIndex(polygons(f.geometry).flat())}));for(const gap of gaps.features){const samples=polygons(gap.geometry).flat().flat(),score=entry=>samples.reduce((n,p)=>n+entry.near(p),0)/samples.length,owner=boundary.toSorted((a,b)=>score(a)-score(b))[0].f;gap.properties={...owner.properties};}
  console.log('Sarawak meander repair',gapArea.toFixed(6),'km²');return command(fc([...collection.features,...gaps.features]),'-clean -dissolve2 id copy-fields=parent');
 }
 const my='dist/data/southeast-asia/',cat=load(my+'malaysia-catalogue.bin'),chunk=cat.chunks['MY-13'],detail=await closeArcGaps(await protect(load(my+chunk.file)));Object.assign(chunk,write(my+chunk.file,detail));
 const state=(await command(detail,'-dissolve2 parent')).features;assert.equal(state.length,1);state[0].properties={id:'MY-13'};
 const states=load(my+'malaysia-first.bin');states.features=states.features.map(f=>f.properties.id==='MY-13'?state[0]:f);write(my+'malaysia-first.bin',states);
 const points=await command(fc([...state,...detail.features]),'-points inner');for(const [i,f]of [...state,...detail.features].entries()){const r=cat.records.find(r=>r.id===f.properties.id);assert(r);r.bounds=geographicBounds(f.geometry);r.center=points.features[i].geometry.coordinates;}write(my+'malaysia-catalogue.bin',cat);
 write(my+'malaysia-context.bin',await command(states,'-dissolve2'));
 const records=new Map(load(base+'catalogue.bin').records.map(r=>[r.id,r]));write(base+'context.bin',await countryContext('brunei',first,records,command));
 const atlasFile='dist/data/atlas-frontiers.bin',atlas=load(atlasFile),inside=([x,y])=>x>113.95&&x<115.5&&y>3.95&&y<5.15;
 atlas.features=atlas.features.filter(f=>f.properties.canonicalBorder!=='MYS-BRN'&&!String(f.properties.countries).split(' ').includes('brunei')&&!(String(f.properties.countries).split(' ').includes('malaysia')&&linesOf(fc([f])).some(p=>p.some(inside))));
 atlas.features.push(...lineData(fc(paths.map(path=>({type:'Feature',properties:{countries:'malaysia brunei',canonicalBorder:'MYS-BRN',referenceOwner:'brunei'},geometry:{type:'LineString',coordinates:path}})))).features);write(atlasFile,atlas);
 const infoFile='dist/data/atlas-frontiers-sources.json',info=load(infoFile);info.brunei={source:'europe/brunei/frontier-reference.json',method:'Nadi.BN land frontier reconciled with Sarawak districts, state overview and context. Complete common border retained as one shared stroke.'};info.pieces=atlas.features.length;info.frontierKm=Math.round(linesOf(atlas).reduce((n,p)=>n+p.slice(1).reduce((s,b,i)=>s+metres(p[i],b),0),0)/1000);fs.writeFileSync(infoFile,JSON.stringify(info,null,2)+'\n');
 fs.writeFileSync(base+'malaysia-alignment-report.json',JSON.stringify({owner:'brunei',reports},null,2)+'\n');console.log('Malaysia–Brunei frontier reconciled',reports);
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/reconcile-brunei-frontier.mjs'))await reconcileBruneiFrontier();