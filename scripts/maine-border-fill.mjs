import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {decodeData,encodeGeo,decodeGeoStructure} from '../dist/geo-pack.mjs';
import {fc,command,geographicBounds} from './build-regional-dataset.mjs';
import {polygons,linesOf,metres} from './geo-index.mjs';
import {coastalCodePartitions} from './canada-area-code-topology.mjs';
export const bounds=[-68.12,45.23,-67.08,46.02];
export const box=fc([{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[bounds[0],bounds[1]],[bounds[2],bounds[1]],[bounds[2],bounds[3]],[bounds[0],bounds[3]],[bounds[0],bounds[1]]]]}}]);
export const read=async file=>decodeData(fs.readFileSync(file));
export const backup=file=>{const dest='artifacts/stability/maine-all-maps-backup/'+file;fs.mkdirSync(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});if(!fs.existsSync(dest))fs.copyFileSync(file,dest);};
export function save(file,data){backup(file);const old=gunzipSync(fs.readFileSync('artifacts/stability/maine-all-maps-backup/'+file)),raw=old[0]===123||old[0]===91?JSON.stringify(data):encodeGeo(data,{...decodeGeoStructure(old,{select:()=>null}).meta,maineBorderFill:true}, {scale:1e7});fs.writeFileSync(file,gzipSync(raw,{level:9}));const compact=file.replace('dist/data/','dist/data/compact/');if(fs.existsSync(compact)){backup(compact);fs.writeFileSync(compact,gzipSync(encodeGeo(data,{source:createHash('sha256').update(raw).digest('hex')},{scale:1e7}),{level:9}));}}
export async function overlay(a,b,operation){if(!a.features.length)return a;if(!b.features.length)return operation==='clip'?fc([]):a;const d=await command({'a.json':a,'b.json':b},'-'+operation+' b.json',{precision:.0000001});return fc(d.features.filter(f=>f.geometry));}
export const dissolve=async d=>d.features.length?command(d,'-dissolve2',{precision:.0000001}):fc([]);
export const near=g=>{const [[w,s],[e,n]]=geographicBounds(g);return w<=bounds[2]&&e>=bounds[0]&&s<=bounds[3]&&n>=bounds[1];};
export async function policy(){
 const file='scripts/boundary-sources/us-canada/maine-display-fill.json.gz';
 if(!fs.existsSync(file)){const world=await read('dist/data/world-land.bin');const mask=fc(world.features.filter(f=>f.properties.borderLakeBackground));if(!mask.features.length)throw Error('Retained Maine fill mask required');fs.writeFileSync(file,gzipSync(JSON.stringify(mask),{level:9}));}
 const mask=await read(file),survey=await read('scripts/boundary-sources/us-canada/ibc-v1.3.geojson.gz');
 const reference=fc(survey.features.filter(f=>[2,3].includes(f.properties.SectionNum))),paths=linesOf(await overlay(reference,box,'clip')).map(p=>p.map(q=>[...q]));
 let path=[],remaining=[...paths];
 while(remaining.length){let index=0,reverse=false;if(!path.length){let highest=-Infinity;remaining.forEach((p,i)=>{for(const [end,rev]of [[p[0],false],[p.at(-1),true]])if(end[1]>highest){highest=end[1];index=i;reverse=rev;}});}else{let closest=Infinity;remaining.forEach((p,i)=>{for(const [end,rev]of [[p[0],false],[p.at(-1),true]]){const distance=metres(path.at(-1),end);if(distance<closest){closest=distance;index=i;reverse=rev;}}});if(closest>1)throw Error('Survey section join exceeds one metre');}
 const next=remaining.splice(index,1)[0];if(reverse)next.reverse();path.push(...(path.length?next.slice(1):next));}
 const east=fc([{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[...path,[bounds[2],bounds[1]],[bounds[2],bounds[3]],path[0]]]}}]);
 return {mask,reference,countries:{canada:await overlay(mask,east,'clip'),'united-states':await overlay(mask,east,'erase')}};
}
export async function fillRegions(regions,boundaries,mask,{overlap=false}={}){
 const selected=regions.features.filter(f=>f.geometry&&near(f.geometry));if(!selected.length)return {regions,changed:[]};
 const local=await overlay(fc(selected),box,'clip');
 const fringe=await overlay(mask,await dissolve(local),'erase');if(!fringe.features.length)return {regions,changed:[]};
 const target=await dissolve(fc([...local.features,...mask.features]));
 let additions;
 if(overlap){const features=[];for(const f of selected){const localOwn=local.features.find(g=>g.properties.id===f.properties.id);if(!localOwn)continue;const parent=await dissolve(fc([localOwn,...mask.features]));const assigned=await coastalCodePartitions([localOwn],parent,fc([]));features.push(...(await overlay(assigned.get(f.properties.id),fringe,'clip')).features);}additions=fc(features);}
 else{const dividers=boundaries?.features?.length?await overlay(boundaries,box,'clip'):fc([]);const assigned=await coastalCodePartitions(local.features,target,dividers);additions=await overlay(fc([...assigned.values()].flatMap(d=>d.features)),fringe,'clip');}
 const ids=new Set(additions.features.map(f=>f.properties.id));if(!ids.size)return {regions,changed:[]};
 const merged=await command(fc([...selected.filter(f=>ids.has(f.properties.id)),...additions.features]),'-dissolve2 id',{precision:.0000001}),byId=new Map(merged.features.map(f=>[f.properties.id,f.geometry]));
 return {regions:{...regions,features:regions.features.map(f=>byId.has(f.properties.id)?{...f,geometry:byId.get(f.properties.id)}:f)},changed:[...ids]};
}
export async function clearWater(data,mask){return {...data,...await overlay(data,mask,'erase')};}
