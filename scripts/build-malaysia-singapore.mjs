import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import mapshaper from 'mapshaper';

const folder='scripts/additional-sources/malaysia-singapore',out='dist/data/southeast-asia';
await fs.mkdir(out+'/malaysia',{recursive:true});
const read=async file=>JSON.parse(await fs.readFile(folder+'/'+file,'utf8'));
const fc=features=>({type:'FeatureCollection',features});
const process=async(data,commands='')=>{const j=JSON.parse((await mapshaper.applyCommands('-i input.json '+commands+' -o output.json format=geojson precision=.000001',{'input.json':JSON.stringify(data)}))['output.json']);return j.type==='FeatureCollection'?j:j.type==='Feature'?fc([j]):fc((j.type==='GeometryCollection'?j.geometries:[j]).map(geometry=>({type:'Feature',properties:{},geometry})));};
const write=async(file,data)=>{const bytes=gzipSync(JSON.stringify(data),{level:9});await fs.writeFile(out+'/'+file,bytes);return bytes.length;};
const bbox=geometry=>{const b=[Infinity,Infinity,-Infinity,-Infinity];const visit=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(visit);};visit(geometry.coordinates);return [[b[0],b[1]],[b[2],b[3]]];};
const record=async(f,extra)=>{const points=await process(fc([f]),'-points inner'),bounds=bbox(f.geometry);return {...extra,bounds,center:points.features[0].geometry.coordinates};};
const names={7:['Penang','Pulau Pinang'],4:['Malacca','Melaka'],14:['Kuala Lumpur',''],15:['Labuan',''],16:['Putrajaya','']};
const raw=await read('administrative_2_district.geojson');
// Perlis and the federal territories are whole first-level units in DOSM's
// district statistical table. Do not invent duplicate district jurisdictions.
const unpartitioned=new Set([9,14,15,16]);
const regions=await process(fc(raw.features.map(f=>({...f,properties:{id:unpartitioned.has(f.properties.code_state)?'MY-'+String(f.properties.code_state).padStart(2,'0'):'MY-'+String(f.properties.code_state).padStart(2,'0')+'-'+String(f.properties.code_district).padStart(2,'0'),parent:'MY-'+String(f.properties.code_state).padStart(2,'0'),state:f.properties.state,code:f.properties.code_state,name:f.properties.district}}))),'-clean -simplify dp interval=12 keep-shapes');
const first=await process(regions,'-dissolve parent copy-fields=state,code');
const records=[],chunks={};
for(const f of first.features){
 const id=f.properties.parent,code=f.properties.code,[en,local]=names[code]||[f.properties.state,''];f.properties={id};
 records.push(await record(f,{id,en,local,level:1,kind:code>=14?'Federal territory':'State',aliases:code>=14?['W.P. '+en,'Wilayah Persekutuan '+en]:[],flag:id}));
 const children=regions.features.filter(p=>p.properties.parent===id&&!unpartitioned.has(code));
 for(const child of children){const {name,id}=child.properties;child.properties={id,parent:f.properties.id};records.push(await record(child,{id,parent:f.properties.id,en:name,local:name,level:2,kind:'District',aliases:['Daerah '+name]}));}
 if(children.length){const file='malaysia/'+id+'.bin',bytes=await write(file,fc(children));chunks[id]={file,bytes,decodedBytes:Buffer.byteLength(JSON.stringify(fc(children))),count:children.length};}
}
const country=await process(first,'-dissolve');
const context=await process(country,'-simplify dp interval=150 keep-shapes');
await write('malaysia-context.bin',context);
await write('malaysia-first.bin',first);
await write('malaysia-catalogue.bin',{records,chunks});

const singapore=await read('singapore.geojson');
// The national map also contains Malaysian shores, waterways, parks and an
// inset frame. Only its Singapore coastal polygons belong in this outline.
const coast=fc(singapore.features.filter(f=>f.properties.FOLDERPATH==='Layers/Coastal_Outlines'&&!/JOHOR|MALAYSIA/.test(f.properties.NAME||'')).map(f=>({...f,properties:{id:'SG'}})));
const sg=await process(coast,'-clean -dissolve -simplify dp interval=2 keep-shapes');
sg.features[0].properties={id:'SG'};
const sgRecord=await record(sg.features[0],{id:'SG',en:'Singapore',local:'新加坡',aliases:['Singapura','சிங்கப்பூர்'],level:1,kind:'City-state'});
await write('singapore-first.bin',sg);await write('singapore-context.bin',await process(sg,'-simplify dp interval=25 keep-shapes'));
await write('singapore-catalogue.bin',{records:[sgRecord],chunks:{}});
const provenance=await read('sources.json');
for(const country of ['malaysia','singapore'])await fs.writeFile(out+'/'+country+'-sources.json',JSON.stringify({country,retrieved:provenance.retrieved,sources:country==='malaysia'?Object.fromEntries(Object.entries(provenance.sources).filter(([key])=>key.startsWith('administrative'))):{nationalMap:provenance.sources.singapore},coverage:country==='malaysia'?'13 states, 3 federal territories and 156 district jurisdictions from DOSM’s published geometry. Perlis and the three federal territories have no separate district layer. These are the source’s statistical boundaries; subsequent administrative changes may not be included.':'Singapore coastal outline from SLA National Map Polygon, June 2025; parks, water polygons, inset annotations and Malaysian shores excluded. No subdivisions.',processing:'Shared topology; state silhouettes dissolved from the same district geometry. Detail loaded only for the selected state.'},null,2)+'\n');
await fs.writeFile('dist/data/malaysia-flag-sources.json',JSON.stringify({retrieved:provenance.retrieved,flags:provenance.flags},null,2)+'\n');
await fs.writeFile('dist/malaysia-flags.mjs','export const malaysiaFlags='+JSON.stringify(Object.fromEntries(Object.entries(provenance.flags).filter(([id])=>id.startsWith('MY-')).map(([id,f])=>[id,{file:f.file,page:f.page,license:f.license,credit:f.author}])))+';\n');
console.log('Malaysia',records.filter(r=>r.level===1).length,'first-level units;',records.filter(r=>r.level===2).length,'districts; Singapore coastal outline.');
