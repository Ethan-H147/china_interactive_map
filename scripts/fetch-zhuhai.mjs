import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir=new URL('additional-sources/',import.meta.url);
const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(45000),headers:{'User-Agent':'ChinaBoundaryAtlas/1.0'}});assert(r.ok,'HTTP '+r.status+': '+url);return r.text();};
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w:]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
async function coastline(id){
 const xml=await get('https://api.openstreetmap.org/api/0.6/way/'+id+'/full');
 const nodes=new Map([...xml.matchAll(/<node\s+([^>]+)>?/g)].map(m=>{const a=attrs(m[1]);return [a.id,[+a.lon,+a.lat]]}));
 const way=[...xml.matchAll(/<way\s+([^>]+)>([\s\S]*?)<\/way>/g)].find(m=>attrs(m[1]).id===String(id));
 assert(way&&/k="natural" v="coastline"/.test(way[2]),'Coastline tag changed: '+id);
 const refs=[...way[2].matchAll(/<nd ref="(\d+)"/g)].map(m=>m[1]);
 return {id,refs,coordinates:refs.map(ref=>{assert(nodes.has(ref));return nodes.get(ref)})};
}
const districtText=await get('https://geo.datav.aliyun.com/areas_v3/bound/440400_full.json');
assert.equal(JSON.parse(districtText).features.length,3);
await fs.writeFile(new URL('zhuhai-districts.json',dir),districtText);
const ids=[230560846,1227614103,1227614101,667085646,915139248];
const ways=await Promise.all(ids.map(coastline));
const join=selected=>{const refs=[...selected[0].refs],coordinates=[...selected[0].coordinates];for(const w of selected.slice(1)){assert.equal(refs.at(-1),w.refs[0],'Disconnected coastline');refs.push(...w.refs.slice(1));coordinates.push(...w.coordinates.slice(1));}return {refs,coordinates};};
const port=join(ways.slice(0,3));assert.equal(port.refs[0],port.refs.at(-1),'Port island must be closed');
const land={type:'FeatureCollection',license:'OpenStreetMap contributors, ODbL 1.0',features:[{type:'Feature',properties:{osmWays:ids.slice(0,3).map(String),source:'https://www.openstreetmap.org/copyright'},geometry:{type:'Polygon',coordinates:[port.coordinates]}}]};
const west=join(ways.slice(3));
const shore={type:'Feature',properties:{osmWays:ids.slice(3).map(String),license:'OpenStreetMap contributors, ODbL 1.0'},geometry:{type:'LineString',coordinates:west.coordinates}};
for(const [name,data] of [['zhuhai-port-land.json',land],['wanzai-coastline.json',shore]]){
 const text=JSON.stringify(data);await fs.writeFile(new URL(name,dir),text);await fs.writeFile(new URL('../dist/data/'+name,import.meta.url),text);
}
console.log(JSON.stringify({districts:3,portVertices:port.coordinates.length,wanzaiVertices:west.coordinates.length}));
