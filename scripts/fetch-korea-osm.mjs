import fs from 'node:fs/promises';
import osmtogeojson from 'osmtogeojson';
const dir=new URL('./korea-sources/osm/',import.meta.url);await fs.mkdir(dir,{recursive:true});
async function get(id){
 const path=new URL(id+'.json',dir);try{return JSON.parse(await fs.readFile(path,'utf8'));}catch{}
 const url=`https://api.openstreetmap.org/api/0.6/relation/${id}/full.json`;
 const r=await fetch(url,{headers:{'User-Agent':'ChinaKoreaAtlas/1.0'},signal:AbortSignal.timeout(90000)});
 if(!r.ok)throw Error(url+' '+r.status);const d=await r.json();await fs.writeFile(path,JSON.stringify(d));return d;
}
const country=JSON.parse(await fs.readFile(new URL('./korea-sources/north-country.json',import.meta.url),'utf8')).elements[0];
const features=[],hierarchy=[];
for(const m of country.members.filter(m=>m.role==='subarea'&&m.type==='relation')){
 const data=await get(m.ref),rel=data.elements.find(e=>e.type==='relation'&&e.id===m.ref);
 const parent=osmtogeojson(data).features.find(f=>f.id==='relation/'+m.ref);if(!parent?.geometry||parent.properties.tainted)throw Error('Incomplete province '+m.ref);
 features.push(parent);const ids=rel.members.filter(m=>m.role==='subarea'&&m.type==='relation').map(m=>m.ref);
 hierarchy.push({id:m.ref,children:ids});
 for(let i=0;i<ids.length;i+=3){await Promise.all(ids.slice(i,i+3).map(async id=>{const raw=await get(id),f=osmtogeojson(raw).features.find(f=>f.id==='relation/'+id);if(!f?.geometry||f.properties.tainted)throw Error('Incomplete district '+id);f.properties.parent=m.ref;features.push(f);}));}
 console.log(rel.tags['name:en']||rel.tags.name,ids.length);
}
await fs.writeFile(new URL('./korea-sources/north-detailed.geojson',import.meta.url),JSON.stringify({type:'FeatureCollection',features}));
await fs.writeFile(new URL('./korea-sources/north-hierarchy.json',import.meta.url),JSON.stringify({retrieved:new Date().toISOString(),source:'https://www.openstreetmap.org/relation/192734',license:'ODbL 1.0',hierarchy},null,2));
console.log('Features',features.length);
