import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {encodeLocalitySearch} from '../dist/locality-search-index.mjs';

export function buildMexicoLocalityStream(data,catalogue){
 const root='dist/data/europe/mexico/localities/',units=new Map(catalogue.records.map(r=>[r.id,r])),parents=Object.fromEntries(catalogue.records.filter(r=>r.level===2).map(r=>[+r.code,[r.en,r.parent,units.get(r.parent).en]]));fs.mkdirSync(root+'tiles',{recursive:true});fs.mkdirSync(root+'locate',{recursive:true});
 const write=(file,value,binary=false)=>{const bytes=gzipSync(binary?value:JSON.stringify(value),{level:9});fs.writeFileSync(root+file,bytes);return bytes.length;};
 const tiles=[],locations=new Map(),bands=[7,10,13,25];let tileId=0;
 function split(records,depth=0){if(records.length>256&&depth<20){const boxes=[[],[],[],[]],b=[Infinity,Infinity,-Infinity,-Infinity];for(const r of records){b[0]=Math.min(b[0],r.center[0]);b[1]=Math.min(b[1],r.center[1]);b[2]=Math.max(b[2],r.center[0]);b[3]=Math.max(b[3],r.center[1]);}const x=(b[0]+b[2])/2,y=(b[1]+b[3])/2;for(const r of records)boxes[(r.center[0]>=x?1:0)+(r.center[1]>=y?2:0)].push(r);if(boxes.some(b=>b.length===records.length))return leaf(records);for(const box of boxes)if(box.length)split(box,depth+1);}else leaf(records);}
 function leaf(records){const id=String(tileId++),bounds=[Infinity,Infinity,-Infinity,-Infinity];let minzoom=25;const tuples=records.map(r=>{const code=+r.id.slice(7);bounds[0]=Math.min(bounds[0],r.center[0]);bounds[1]=Math.min(bounds[1],r.center[1]);bounds[2]=Math.max(bounds[2],r.center[0]);bounds[3]=Math.max(bounds[3],r.center[1]);minzoom=Math.min(minzoom,r.dotzoom);const state=r.id.slice(7,9);if(!locations.has(state))locations.set(state,[]);locations.get(state).push([code,+id]);return [code,r.en,...r.center,+r.parentId.slice(7),r.population.value,r.dotzoom,r.replacesLabel?1:0];});const bytes=write('tiles/'+id+'.bin',tuples);tiles.push({id,bounds,minzoom,count:records.length,bytes});}
 for(let i=0;i<bands.length;i++)split(data.records.filter(r=>r.dotzoom<=(bands[i])&&(!i||r.dotzoom>bands[i-1])));
 const locators={};for(const [state,rows]of locations){rows.sort((a,b)=>a[0]-b[0]);locators[state]={file:'locate/'+state+'.bin',bytes:write('locate/'+state+'.bin',rows)};}
 const packed=encodeLocalitySearch(data.records,parents),searchBytes=write('search.bin',packed,true);
 const manifest={version:1,count:data.records.length,recordDefaults:data.recordDefaults,metricDefaults:data.metricDefaults,parents,tiles,locators,parentCounts:Object.fromEntries(catalogue.records.filter(r=>r.level===2).map(r=>[r.id,0])),zooms:[...new Set(data.records.map(r=>r.dotzoom))].sort((a,b)=>a-b),search:{file:'search.bin',bytes:searchBytes,decodedBytes:packed.length},cacheTiles:12};for(const r of data.records)manifest.parentCounts[r.parentId]++;
 write('manifest.bin',manifest);console.log('Streamed Mexico:',tiles.length,'chunks of at most 256 points; compact search',searchBytes,'bytes compressed,',packed.length,'decoded.');return manifest;
}
