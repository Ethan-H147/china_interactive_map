import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import mapshaper from 'mapshaper';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {alignCountry,polygons} from './international-topology.mjs';

const myDir='dist/data/southeast-asia/',idDir='dist/data/archipelago/';
const read=file=>JSON.parse(gunzipSync(fs.readFileSync(file)));
const fc=features=>({type:'FeatureCollection',features});
const process=async(data,commands='')=>{const j=JSON.parse((await mapshaper.applyCommands('-i in.json '+commands+' -o out.json format=geojson precision=.000001 geojson-type=FeatureCollection',{'in.json':JSON.stringify(data)}))['out.json']);return j;};
function write(file,data){const json=JSON.stringify(data),bytes=gzipSync(json,{level:9});fs.writeFileSync(file,bytes);return {bytes:bytes.length,decodedBytes:Buffer.byteLength(json)};}
const ids=new Set(['ID61','ID62','ID63','ID64','ID65']);
// Packaged first-level shapes also preserve unmapped lake/forest context that
// is intentionally absent from the selectable regency layer.
const original=fs.existsSync('scripts/additional-sources/archipelago/indonesia-20m.bin')?read('scripts/additional-sources/archipelago/indonesia-20m.bin'):fc([...ids].flatMap(id=>{const chunk=read(idDir+'indonesia-'+id+'.bin');return [...chunk.second.features,...chunk.first.features.map(f=>({...f,properties:{id:id+'-context',parent:id,mapped:false}}))];}));
const idRegions=original.features.filter(f=>ids.has(f.properties.parent));
const land=(await process(fc(idRegions),'-dissolve')).features[0];
const rings=polygons(land.geometry).toSorted((a,b)=>b[0].length-a[0].length);
const main=rings[0][0];
const nearest=(ring,p)=>ring.slice(0,-1).map((q,i)=>({i,d:Math.hypot(q[0]-p[0],q[1]-p[1])})).sort((a,b)=>a.d-b.d)[0].i;
const edgeKey=(a,b)=>JSON.stringify([a,b]);
const metres=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111195;
function shortPath(ring,start,end){const n=ring.length-1,path=step=>{const output=[ring[start]];for(let i=(start+step+n)%n;i!==end;i=(i+step+n)%n)output.push(ring[i]);output.push(ring[end]);return output;};const length=p=>p.slice(1).reduce((sum,b,i)=>sum+metres(p[i],b),0),forward=path(1),backward=path(-1);return length(forward)<length(backward)?forward:backward;}
const edgesOf=path=>new Set(path.slice(1).flatMap((b,i)=>[edgeKey(path[i],b),edgeKey(b,path[i])]));
async function borderEdgesFor(features,endpoints=[main[east],main[west]]){
 const dissolved=(await process(fc(features),'-dissolve')).features;
 const score=ring=>endpoints.reduce((sum,p)=>sum+metres(ring[nearest(ring,p)],p),0);
 const ring=dissolved.flatMap(f=>polygons(f.geometry).map(p=>p[0])).sort((a,b)=>score(a)-score(b))[0];
 if(!ring)throw Error('Missing Borneo exterior');
 const start=nearest(ring,endpoints[0]),end=nearest(ring,endpoints[1]),keys=edgesOf(shortPath(ring,start,end));
 return {candidate:(a,b)=>keys.has(edgeKey(a,b)),anchors:new Map([[ring[start].join(','),endpoints[0]],[ring[end].join(','),endpoints[1]]])};
}
// The mainland endpoints are the two mouths where the land border meets the
// coast. Limit alignment to the intervening BPS border, never the coast itself.
const east=nearest(main,[117.595563,4.17028]),west=nearest(main,[109.644565,2.081301]);
const borderEdges=edgesOf(shortPath(main,east,west));
const raw=JSON.parse(fs.readFileSync('scripts/additional-sources/malaysia-singapore/administrative_2_district.geojson'));
let myRegions=(await process(fc(raw.features.filter(f=>[12,13].includes(f.properties.code_state)).map(f=>({...f,properties:{id:'MY-'+String(f.properties.code_state).padStart(2,'0')+'-'+String(f.properties.code_district).padStart(2,'0'),parent:'MY-'+String(f.properties.code_state).padStart(2,'0')}}))),'-clean -simplify dp interval=12 keep-shapes')).features;
const myBorder=await borderEdgesFor(myRegions);
const aligned=alignCountry(myRegions,land,(a,b)=>borderEdges.has(edgeKey(a,b)),20000,myBorder.candidate,{maxStretch:20,anchors:myBorder.anchors});
myRegions=aligned.features;
const sebatik=rings.find(p=>p[0].some(([x,y])=>x>117.85&&x<117.92&&y>4.165&&y<4.167));
if(!sebatik)throw Error('Missing Sebatik geometry');
const island={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:sebatik}};
const islandEndpoints=[[117.68345,4.166559],[117.90086,4.166669]];
const islandBorder=await borderEdgesFor(myRegions,islandEndpoints);
const alignedIsland=alignCountry(myRegions,island,(a,b)=>a[1]>4.165&&b[1]>4.165,2500,islandBorder.candidate,{anchors:islandBorder.anchors});
// Node both sides together so district junctions become vertices in both
// countries. This closes overlap slivers without changing distant coastlines.
const joint=await process(fc([...alignedIsland.features,...idRegions]),'-clean gap-width=0 snap-interval=0.0000000001 overlap-rule=min-area');
const malaysia=joint.features.filter(f=>f.properties.id.startsWith('MY-'));
const indonesia=joint.features.filter(f=>f.properties.id.startsWith('ID'));
const combined=topology({regions:joint});
const shared=mesh(combined,combined.objects.regions,(a,b)=>a!==b&&a.properties.id.slice(0,2)!==b.properties.id.slice(0,2));
if(shared.coordinates.length<2)throw Error('The two shared Borneo borders were not noded');

const myFirst=await process(fc(malaysia),'-dissolve parent');
myFirst.features.forEach(f=>f.properties={id:f.properties.parent});
const first=read(myDir+'malaysia-first.bin');first.features=first.features.map(f=>myFirst.features.find(n=>n.properties.id===f.properties.id)||f);write(myDir+'malaysia-first.bin',first);
const myCatalogue=read(myDir+'malaysia-catalogue.bin');
const bounds=f=>{const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);};walk(f.geometry.coordinates);return [[b[0],b[1]],[b[2],b[3]]];};
async function updateRecords(features,records){const points=await process(fc(features),'-points inner');for(const [i,f] of features.entries()){const r=records.find(r=>r.id===f.properties.id);if(r){r.bounds=bounds(f);r.center=points.features[i].geometry.coordinates;}}}
await updateRecords([...myFirst.features,...malaysia],myCatalogue.records);
for(const id of ['MY-12','MY-13']){const chunk=myCatalogue.chunks[id],data=fc(malaysia.filter(f=>f.properties.parent===id));Object.assign(chunk,write(myDir+chunk.file,data));}
write(myDir+'malaysia-catalogue.bin',myCatalogue);
// Protect the shared line in every level of detail. Simplification elsewhere
// still reduces coastline and internal-boundary downloads for small devices.
const canonical=(await process(fc(indonesia),'-dissolve')).features[0];
const canonicalMain=polygons(canonical.geometry).toSorted((a,b)=>b[0].length-a[0].length)[0][0];
const from=nearest(canonicalMain,main[east]),to=nearest(canonicalMain,main[west]);
const permitted=edgesOf(shortPath(canonicalMain,from,to));
const canonicalIsland=polygons(canonical.geometry).find(p=>p[0].some(([x,y])=>x>117.85&&x<117.92&&y>4.165&&y<4.167));
async function protect(features){
 features=features.map(f=>({...f,properties:f.properties||{}}));
 const border=await borderEdgesFor(features);
 let output=alignCountry(features,canonical,(a,b)=>permitted.has(edgeKey(a,b)),1500,border.candidate,{maxStretch:20,anchors:border.anchors}).features;
 const islandBorder=await borderEdgesFor(output,islandEndpoints);
 output=alignCountry(output,{...island,geometry:{type:'Polygon',coordinates:canonicalIsland}},(a,b)=>a[1]>4.165&&b[1]>4.165,500,islandBorder.candidate,{anchors:islandBorder.anchors}).features;
 return fc(output);
}
const myContext=await process(first,'-dissolve -simplify dp interval=150 keep-shapes');write(myDir+'malaysia-context.bin',await protect(myContext.features));
const idFirst=await process(fc(indonesia),'-dissolve parent');
const catalogue=read(idDir+'indonesia-catalogue.bin');
const idRecords=idFirst.features.map(f=>({...catalogue.records.find(r=>r.id===f.properties.parent)}));
idFirst.features.forEach((f,i)=>f.properties=idRecords[i]);
await updateRecords([...idFirst.features,...indonesia],catalogue.records);
for(const f of idFirst.features)f.properties={...catalogue.records.find(r=>r.id===f.properties.id)};
for(const f of indonesia){const r=catalogue.records.find(r=>r.id===f.properties.id);if(r){f.properties.center=r.center;f.properties.bounds=r.bounds;}}
for(const id of ids){const chunk=catalogue.chunks[id],old=read(idDir+chunk.file);old.first=fc(idFirst.features.filter(f=>f.properties.id===id));old.second=fc(indonesia.filter(f=>f.properties.parent===id&&f.properties.mapped));Object.assign(chunk,write(idDir+chunk.file,old));}
const overview=read(idDir+'indonesia-overview.bin');
overview.first.features=overview.first.features.filter(f=>!ids.has(f.properties.id)).concat((await protect((await process(idFirst,'-simplify dp interval=250 keep-shapes')).features)).features);
overview.second.features=overview.second.features.filter(f=>!ids.has(f.properties.parent)).concat((await protect((await process(fc(indonesia.filter(f=>f.properties.mapped)),'-simplify dp interval=500 keep-shapes')).features)).features);
write(idDir+'indonesia-overview.bin',overview);
const context=read(idDir+'indonesia-context.bin');context.features=context.features.filter(f=>!ids.has(f.properties.id)).concat((await protect((await process(idFirst,'-simplify dp interval=800 keep-shapes')).features)).features);write(idDir+'indonesia-context.bin',context);
write(idDir+'indonesia-catalogue.bin',catalogue);
const report={canonicalSource:'https://data.humdata.org/dataset/cod-ab-idn',adjacentSource:'https://github.com/dosm-malaysia/data-open/tree/main/datasets/geodata',method:'For display consistency, DOSM exterior district edges within 20 km of the mainland land-border corridor inherit BPS’s 20 m path. Sebatik is aligned separately within 2.5 km. Both sides are noded together, then states, contexts and overview layers inherit the same border. Other coastlines and interior district boundaries retain their source geometry. This reconciles published datasets; it is not a surveyed boundary determination.',mainland:aligned.report,sebatik:alignedIsland.report,shared};
fs.writeFileSync(myDir+'borneo-border-report.json',JSON.stringify(report,null,2)+'\n');
for(const file of [myDir+'malaysia-sources.json',idDir+'indonesia-sources.json']){const source=JSON.parse(fs.readFileSync(file));source.borderReconciliation={report:'../southeast-asia/borneo-border-report.json',method:report.method,canonicalSource:report.canonicalSource};if(source.chunks)source.chunks=catalogue.chunks;fs.writeFileSync(file,JSON.stringify(source,null,2)+'\n');}
console.log('Reconciled Borneo mainland and Sebatik:',aligned.report,alignedIsland.report,'shared paths',shared.coordinates.length);
