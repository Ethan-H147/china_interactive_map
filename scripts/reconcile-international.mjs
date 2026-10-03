import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {topology} from 'topojson-server';
import {merge,mesh} from 'topojson-client';
import mapshaper from 'mapshaper';
import {readData} from './read-data.mjs';
import {alignCountry} from './international-topology.mjs';
const root=new URL('../dist/data/',import.meta.url),fc=features=>({type:'FeatureCollection',features});
const korea=JSON.parse(gunzipSync(fs.readFileSync(new URL('korea-boundaries.bin',root))));
const china=readData('display-boundaries.json');
const north=korea.countries.features.find(f=>f.properties.country==='KP');
const south=korea.second.features.filter(f=>f.properties.country==='KR');
// Sejong is a first-level area without second-level divisions.
const sejong=korea.first.features.find(f=>f.properties.id==='KR-36');
const sk=alignCountry([...south,sejong],north,(a,b)=>a[0]>126.65&&b[0]>126.65&&a[1]<38.63&&b[1]<38.63);
const cn=alignCountry(china.subdivisions.features,north,(a,b)=>a[1]>39.75&&b[1]>39.75);
console.log({south:sk.report,china:cn.report});
const clean=async features=>JSON.parse((await mapshaper.applyCommands('-i input.json -clean gap-width=0 snap-interval=0.0000000001 overlap-rule=min-area -o output.json format=geojson geojson-type=FeatureCollection',{'input.json':fc(features)}))['output.json']).features;
// Node the new shared junctions together, removing only numerical overlay noise.
const together=await clean([...korea.second.features.filter(f=>f.properties.country==='KP'),...sk.features]);
korea.second=fc(together.filter(f=>f.properties.level===2));
const children=korea.second.features;
for(const f of korea.first.features){
 const matches=f.properties.id==='KR-36'?together.filter(c=>c.properties.id==='KR-36'):children.filter(c=>c.properties.parent===f.properties.id);
 if(f.properties.country==='KR'){const local=topology({r:fc(matches)});f.geometry=merge(local,local.objects.r.geometries);}
}
const changedCodes=new Set(cn.report.changedRegions);
const sharedTopology=await clean([...korea.first.features,...cn.features.filter(f=>changedCodes.has(f.properties.adcode))]);
korea.first=fc(sharedTopology.filter(f=>f.properties.country));
const repairedByCode=new Map(sharedTopology.filter(f=>!f.properties.country).map(f=>[f.properties.adcode,f]));
china.subdivisions=fc(cn.features.map(f=>repairedByCode.get(f.properties.adcode)||f));
// North Korean first-level polygons retain unmapped land as in the source build.
const top=topology({first:korea.first,second:korea.second});
const countries=fc(['KP','KR'].map(country=>({type:'Feature',properties:{country},geometry:merge(top,top.objects.first.geometries.filter(g=>g.properties.country===country))})));
korea.countries=countries;
const kt=topology({first:korea.first,second:korea.second,countries});
korea.boundaries={first:mesh(kt,kt.objects.first,(a,b)=>a!==b&&a.properties.country===b.properties.country),second:mesh(kt,kt.objects.second,(a,b)=>a!==b&&a.properties.parent===b.properties.parent),countries:mesh(kt,kt.objects.countries)};
const ct=topology({regions:china.subdivisions});
for(const f of china.provinces.features)f.geometry=merge(ct,ct.objects.regions.geometries.filter(g=>g.properties.provinceCode===f.properties.adcode));
const pref=g=>g.properties.level==='taiwan-region'||g.properties.level==='city'&&String(g.properties.adcode).slice(2,4)!=='90';
const same=(a,b)=>a.properties.provinceCode===b.properties.provinceCode;
china.boundaries={province:mesh(ct,ct.objects.regions,(a,b)=>a===b||!same(a,b)),prefecture:mesh(ct,ct.objects.regions,(a,b)=>a!==b&&same(a,b)&&(pref(a)||pref(b))),other:mesh(ct,ct.objects.regions,(a,b)=>a!==b&&same(a,b)&&!pref(a)&&!pref(b))};
// Recompute navigation extents and interior label points for changed Korean areas.
const all=fc([...korea.first.features,...korea.second.features]);
const points=JSON.parse((await mapshaper.applyCommands('-i all.json -points inner -o out.json format=geojson geojson-type=FeatureCollection',{'all.json':all}))['out.json']);
for(const [i,f] of all.features.entries()){
 f.properties.center=points.features[i].geometry.coordinates;
 const bounds=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){bounds[0]=Math.min(bounds[0],c[0]);bounds[1]=Math.min(bounds[1],c[1]);bounds[2]=Math.max(bounds[2],c[0]);bounds[3]=Math.max(bounds[3],c[1]);}else c.forEach(walk);};walk(f.geometry.coordinates);f.properties.bounds=[[bounds[0],bounds[1]],[bounds[2],bounds[3]]];
}
const serialized=Buffer.from(JSON.stringify(china)),compressed=gzipSync(serialized,{level:9}),parts=[];
for(let offset=0,index=0;offset<compressed.length;offset+=4*1024*1024,index++){const name='display-boundaries.'+String(index).padStart(2,'0')+'.bin';parts.push(name);fs.writeFileSync(new URL(name,root),compressed.subarray(offset,offset+4*1024*1024));}
fs.writeFileSync(new URL('display-boundaries.parts.json',root),JSON.stringify({compression:'gzip',parts,compressedBytes:compressed.length,uncompressedBytes:serialized.length,sha256:createHash('sha256').update(serialized).digest('hex')},null,2));
fs.writeFileSync(new URL('korea-boundaries.bin',root),gzipSync(JSON.stringify(korea)));
fs.writeFileSync(new URL('korea-outline.bin',root),gzipSync(JSON.stringify(countries)));
fs.writeFileSync(new URL('international-border-report.json',root),JSON.stringify({source:'https://www.openstreetmap.org/relation/192734',method:'Adjacent exterior polygon edges within 2.5 km are projected onto the existing North Korean boundary and inherit its intervening vertices. Interior junctions follow their shared exterior endpoint. Coastlines outside the corridor retain source geometry.',south:sk.report,china:cn.report},null,2));
