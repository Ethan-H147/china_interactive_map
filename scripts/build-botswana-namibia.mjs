import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import mapshaper from 'mapshaper';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {alignCountry} from './international-topology.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';

const input=path.resolve(process.argv[2]||'scripts/boundary-sources/botswana-namibia'),out='dist/data/southern-africa';
const fc=features=>({type:'FeatureCollection',features});
const read=name=>{const file=path.join(input,name),bytes=fs.readFileSync(fs.existsSync(file)?file:file+'.gz');return JSON.parse(fs.existsSync(file)?bytes:gunzipSync(bytes));};
const compressed=file=>JSON.parse(gunzipSync(fs.readFileSync(file)));
const slug=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
async function command(data,commands,files={}){
 const output=await mapshaper.applyCommands('-i input.json '+commands+' -o result.json format=geojson',{ 'input.json':JSON.stringify(data),...Object.fromEntries(Object.entries(files).map(([k,v])=>[k,JSON.stringify(v)]))});
 const result=JSON.parse(output['result.json']);return result.type==='FeatureCollection'?result:result.type==='Feature'?fc([result]):fc((result.type==='GeometryCollection'?result.geometries:[result]).map(geometry=>({type:'Feature',properties:{},geometry})));
}
function bounds(geometry){const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);};walk(geometry.coordinates);return [[b[0],b[1]],[b[2],b[3]]];}
function borders(regions){
 const t=topology({regions}),owners=new Map(),groups=new Map();
 for(const g of t.objects.regions.geometries)for(const arc of new Set(g.arcs.flat(Infinity).map(a=>a<0?~a:a))){if(!owners.has(arc))owners.set(arc,new Set());owners.get(arc).add(g.properties.id);}
 for(const [arc,ids]of owners){if(ids.size<2)continue;const list=[...ids].sort(),key=list.join('|');if(!groups.has(key))groups.set(key,{owners:list,arcs:[]});groups.get(key).arcs.push([arc]);}
 return fc([...groups.values()].map(({owners,arcs})=>({type:'Feature',properties:{owners},geometry:mesh(t,{type:'MultiLineString',arcs})})));
}
function write(country,file,data){const destination=out+'/'+country+'/'+file;fs.mkdirSync(path.dirname(destination),{recursive:true});const bytes=gzipSync(JSON.stringify(data),{level:9});fs.writeFileSync(destination,bytes);return bytes.length;}
const inBox=(w,s,e,n)=>(a,b)=>[a,b].every(p=>p[0]>=w&&p[0]<=e&&p[1]>=s&&p[1]<=n);
const specs={botswana:{prefix:'BW',levels:['District','Census subdistrict','Census locality'],expected:[10,28]},namibia:{prefix:'NA',levels:['Region','Constituency'],expected:[14,121]}};
const lowest={};
for(const [country,spec]of Object.entries(specs)){
 lowest[country]=fc(read(country+'-second.geojson').features.map(f=>({...f,properties:{...f.properties,id:spec.prefix+'-C-'+slug(f.properties.en),province:spec.prefix+'-'+slug(f.properties.provinceName),country}})));
 assert(lowest[country].features.every(f=>f.properties.en&&f.properties.provinceName),'Every boundary has its sourced name and parent');
 assert.equal(new Set(lowest[country].features.map(f=>f.properties.id)).size,lowest[country].features.length,'Unique subdivision names');
 lowest[country]=await command(lowest[country],'-clean gap-width=0 -simplify dp interval=.0003 planar keep-shapes');
}
const south=compressed(out+'/south-africa/context.bin').features[0],reports={};
for(const [country,allowed]of [['namibia',inBox(16,-29.2,20.5,-21.7)],['botswana',inBox(19.6,-27.5,29.6,-21.5)]]){
 const aligned=alignCountry(lowest[country].features,south,allowed,8000);lowest[country]=fc(aligned.features);reports[country+'-south-africa']=aligned.report;
 assert(aligned.report.changedEdges>0,'Shared frontier was reconciled');
 lowest[country]=await command(lowest[country],'-erase south.json -clean gap-width=0',{'south.json':fc([south])});
}
const namibiaOutline=await command(lowest.namibia,'-dissolve');
const aligned=alignCountry(lowest.botswana.features,namibiaOutline.features[0],inBox(19.5,-27,25.5,-17.5),8000);
lowest.botswana=fc(aligned.features);reports['botswana-namibia']=aligned.report;
lowest.botswana=await command(lowest.botswana,'-erase namibia.json -clean gap-width=0',{'namibia.json':namibiaOutline});
const combined=await command(fc([...lowest.botswana.features,...lowest.namibia.features]),'-clean gap-width=100m snap-interval=.000001 overlap-rule=min-area');
for(const country of Object.keys(specs))lowest[country]=fc(combined.features.filter(f=>f.properties.country===country));
const contexts={};
for(const [country,spec]of Object.entries(specs)){
 const second=lowest[country],first=await command(second,'-dissolve province copy-fields=provinceName -each "id=province"'),records=[],chunks={};
 for(const [regions,level]of [[first,1],[second,2]]){
  const points=await command(regions,'-points inner'),areas=await command(regions,'-each "areaKm2=$.area/1000000"');
  for(let i=0;i<regions.features.length;i++){const f=regions.features[i],p=f.properties;records.push({id:p.id,parent:level===1?null:p.province,level,en:level===1?p.provinceName:p.en,local:level===1?p.provinceName:p.en,kind:level===1?spec.levels[0]:p.kind||spec.levels[1],center:points.features[i].geometry.coordinates,bounds:bounds(f.geometry),areaKm2:Math.round(areas.features[i].properties.areaKm2*10)/10});}
 }
 const payload=regions=>({regions:fc(regions.features.map(f=>({...f,properties:{id:f.properties.id}}))),boundaries:borders(regions)}),firstPayload=payload(first),secondPayload=payload(second),thirdParts=[];
 for(const parent of first.features){const regions=fc(second.features.filter(f=>f.properties.province===parent.properties.id)),data=payload(regions),file='second/'+parent.properties.id+'.bin';chunks[parent.properties.id]={file,count:regions.features.length,level:2,bytes:write(country,file,data),decodedBytes:Buffer.byteLength(JSON.stringify(data))};}
 if(country==='botswana'){
  const raw=read('botswana-third.geojson');
  for(const parent of second.features){
   const children=fc(raw.features.filter(f=>f.properties.parentSourceCode===parent.properties.sourceCode).map(f=>({...f,properties:{...f.properties,id:'BW-L-'+f.properties.sourceCode}})));
   if(!children.features.length)continue;
   const clipped=await command(children,'-simplify dp interval=.0003 planar keep-shapes -clip parent.json -clean gap-width=0',{'parent.json':fc([parent])});
   const points=await command(clipped,'-points inner'),areas=await command(clipped,'-each "areaKm2=$.area/1000000"');
   for(let i=0;i<clipped.features.length;i++){const f=clipped.features[i];records.push({id:f.properties.id,parent:parent.properties.id,level:3,en:f.properties.en,local:f.properties.en,kind:'Census locality',center:points.features[i].geometry.coordinates,bounds:bounds(f.geometry),areaKm2:Math.round(areas.features[i].properties.areaKm2*10)/10});}
   const data=payload(clipped),file='third/'+parent.properties.id+'.bin';thirdParts.push(data);chunks[parent.properties.id]={file,count:clipped.features.length,level:3,bytes:write(country,file,data),decodedBytes:Buffer.byteLength(JSON.stringify(data))};
  }
  assert.equal(records.filter(r=>r.level===3).length,519,'Every locality polygon is retained');
 }
 const counts={1:first.features.length,2:second.features.length,3:records.filter(r=>r.level===3).length};assert.deepEqual([counts[1],counts[2]],spec.expected,'Complete national subdivision coverage');
 const levels=[{level:1,...firstPayload},{level:2,...secondPayload}];if(thirdParts.length)levels.push({level:3,regions:fc(thirdParts.flatMap(p=>p.regions.features)),boundaries:fc(thirdParts.flatMap(p=>p.boundaries.features))});
 write(country,'first.bin',firstPayload);write(country,'all.bin',{levels});
 contexts[country]=await command(first,'-dissolve');for(const f of contexts[country].features)f.properties={country};write(country,'context.bin',contexts[country]);
 write(country,'catalogue.bin',{records,chunks,counts,levels:spec.levels});
 const manifest=read('boundary-manifest.json');fs.writeFileSync(out+'/'+country+'/sources.json',JSON.stringify({retrieved:manifest.retrievedAt,counts,coverage:manifest.countries[country].note,processing:'Shared topology, district and region polygons dissolved from census subdistricts and constituencies. Locality polygons form a complete census geography partition, clipped to their aligned parent; these census areas are distinct from built-up settlement outlines. The new country exterior follows the existing South African frontier within an 8 km inland digitization corridor; existing South African polygons are unchanged. Botswana is aligned to Namibia, and residual overlaps are erased. Shared subdivision edges only: coastlines are unoutlined. Detailed geometry loads as one country bundle. Spherical geometry area is an estimate, superseded by published census areas where available.',seamReports:reports,sources:[manifest.countries[country]]},null,2)+'\n');
 console.log(country,counts,'bundle bytes',fs.statSync(out+'/'+country+'/all.bin').size);
}
// South Africa already owns the complete southern frontier. Only the new
// Namibia–Botswana seam is added, so a shared international edge draws once.
const t=topology({countries:fc([...contexts.botswana.features,...contexts.namibia.features])});
const seam=mesh(t,t.objects.countries,(a,b)=>a!==b);
assert(seam.coordinates.length>0,'Botswana and Namibia share a fully noded frontier');
write('namibia','international.bin',lineData(fc([{type:'Feature',properties:{countries:['namibia','botswana']},geometry:seam}])));
write('botswana','international.bin',fc([]));
fs.writeFileSync(out+'/botswana-namibia-border-report.json',JSON.stringify(reports,null,2)+'\n');
