// Outline lines without coastlines for the countries whose units were stroked as whole
// polygons: Japan (prefectures and municipal chunks), the Philippines, Indonesia and Malaysia. Each
// FeatureCollection gains `edgeRuns`, vertex ranges of its own polygons (see dist/edge-runs.mjs)
// covering the edges its units share with another unit, plus the stretches of their outline that
// follow a land frontier (near a Natural Earth land boundary line, with land on both sides).
// Coasts are left to the selected outline. Every chunk of a level comes from one
// simplification of the whole country or region by region, so a unit's edge either matches its
// neighbour's vertices or lies within the simplification tolerance of the neighbour's outline.
// Archipelago and Japan units each stroke their own edges, as their polygon outlines did;
// Malaysia's and Japan's prefecture-overview edges are drawn once.
// Run after the archipelago, southeast-asia and Japan municipal builds (and reconcile-borneo).
// Usage: node scripts/build-unit-edges.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {load,polygons,metres,landIndex,lineIndex,land,boundaryLines} from './natural-earth.mjs';
import {outlineIndex} from './channel-lines.mjs';
import {edgeLines} from '../dist/edge-runs.mjs';

const data='dist/data/';
const write=(file,value)=>{const json=JSON.stringify(value),bytes=gzipSync(json,{level:9});fs.writeFileSync(data+file,bytes);return {bytes:bytes.length,decodedBytes:Buffer.byteLength(json)};};
const key=(a,b)=>a[0]<b[0]||a[0]===b[0]&&a[1]<b[1]?a+';'+b:b+';'+a;
// Units with a shape of their own (the Philippines' Isabela City is drawn over Basilan with its own dashed line).
const drawn=f=>f.geometry&&!f.properties.special;

// Exterior outline segments that follow a land frontier of the country.
function frontierTest(own){
 const near=lineIndex(boundaryLines.filter(b=>b.sides.filter(s=>own.includes(s)).length===1).flatMap(b=>b.lines));
 return (a,b)=>{
  const m=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(near(m)>4000||!metres(a,b))return false;
  // Land 800 m out on both sides: a frontier (or a border river), never a coast.
  const c=Math.cos(m[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],n=Math.hypot(dx,dy),step=800/111195;
  return [1,-1].every(s=>land([m[0]-dy/n*step*s/c,m[1]+dx/n*step*s]));
 };
}

// Gives each collection of a level its edge runs, from every unit of that level in the country.
// tolerance: how far apart (m) two units' edges may sit after simplification.
function attach(collections,frontier,once,stats,tolerance){
 const units=new Map();for(const c of collections)for(const f of c.features)if(drawn(f)&&!units.has(f.properties.id))units.set(f.properties.id,f);
 const owners=new Map();
 for(const [id,f] of units)for(const polygon of polygons(f.geometry))for(const ring of polygon)for(let i=1;i<ring.length;i++){const k=key(ring[i-1],ring[i]);const o=owners.get(k);if(!o)owners.set(k,id);else if(o!==id&&!(o instanceof Set&&o.has(id)))owners.set(k,o instanceof Set?o.add(id):new Set([o,id]));}
 // Diagnostic: a dropped segment with different units on its two sides is a shared edge left
 // unmatched (the same unit on both sides is a channel cut into the coast).
 const nearOther=outlineIndex(units,tolerance),boxes=[...units].map(([id,f])=>{const rings=polygons(f.geometry).flat(),b=[Infinity,Infinity,-Infinity,-Infinity];for(const r of rings)for(const p of r){b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.max(b[2],p[0]);b[3]=Math.max(b[3],p[1]);}return {id,rings,b,index:null};});
 const unitAt=p=>{for(const u of boxes){if(p[0]<u.b[0]||p[0]>u.b[2]||p[1]<u.b[1]||p[1]>u.b[3])continue;u.index??=landIndex(u.rings);if(u.index(p))return u.id;}return null;};
 for(const c of collections){
  const runs=[];
  c.features.forEach((f,fi)=>{if(!drawn(f))return;const id=f.properties.id;polygons(f.geometry).forEach((polygon,pi)=>polygon.forEach((ring,ri)=>{
   let start=-1;
   const take=i=>{const a=ring[i-1],b=ring[i],o=owners.get(key(a,b));
    if(o instanceof Set){stats.shared++;return !once||[...o].sort()[0]===id;}
    stats.exterior++;if(frontier(a,b)){stats.frontier++;return true;}
    const m=[(a[0]+b[0])/2,(a[1]+b[1])/2],other=nearOther(m,id);
    // Drawn once, the edge pair near each other keeps the lower id's copy.
    if(other!==null){stats.near++;return !once||id<other;}
    const c=Math.cos(m[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],n=Math.hypot(dx,dy)||1,step=30/111195;
    const [left,right]=[1,-1].map(s=>unitAt([m[0]-dy/n*step*s/c,m[1]+dx/n*step*s]));if(left&&right&&left!==right)stats.unmatched+=metres(a,b);
    return false;};
   for(let i=1;i<ring.length;i++){if(take(i)){if(start<0)start=i-1;}else if(start>=0){runs.push([fi,pi,ri,start,i-1]);start=-1;}}
   if(start>=0)runs.push([fi,pi,ri,start,ring.length-1]);
  }));});
  c.edgeRuns=runs;
 }
}

const report={};
const run=(name,collections,frontier,once,tolerance=60)=>{const stats=report[name]??={shared:0,exterior:0,frontier:0,near:0,unmatched:0};attach(collections,frontier,once,stats,tolerance);};
// Philippines and Indonesia: an overview (every unit of each level) and one chunk per region or province.
for(const [country,own] of [['philippines',['PHL']],['indonesia',['IDN']]]){
 const frontier=frontierTest(own),catalogueFile='archipelago/'+country+'-catalogue.bin',catalogue=load(data+catalogueFile);
 const overview=load(data+'archipelago/'+country+'-overview.bin'),chunks=Object.fromEntries(Object.entries(catalogue.chunks).map(([id,e])=>[id,load(data+'archipelago/'+e.file)]));
 for(const [level,tolerance] of [['first',600],['second',1000]]){run(country,[overview[level]],frontier,false,tolerance);run(country,Object.values(chunks).map(c=>c[level]),frontier,false);}
 write('archipelago/'+country+'-overview.bin',overview);
 for(const [id,chunk] of Object.entries(chunks))Object.assign(catalogue.chunks[id],write('archipelago/'+catalogue.chunks[id].file,chunk));
 write(catalogueFile,catalogue);
}
// Japan's prefecture overview: its prefectures were simplified apart, so neighbours' edges only
// nearly meet; each near pair is drawn once, replacing the build's own shared edges.
{
 const overview=load(data+'japan-boundaries.bin');run('japan',[overview.first],()=>false,true,300);
 overview.boundaries={type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'MultiLineString',coordinates:edgeLines(overview.first).features.flatMap(f=>f.geometry.coordinates)}}]};
 delete overview.first.edgeRuns;write('japan-boundaries.bin',overview);
}
// Japan's municipal chunks.
{
 const catalogue=load(data+'japan-local/catalogue.bin'),chunks=Object.fromEntries(Object.entries(catalogue.chunks).map(([id,e])=>[id,load(data+'japan-local/'+e.file)]));
 for(const level of new Set(Object.values(chunks).flatMap(Object.keys)))run('japan',Object.values(chunks).filter(c=>c[level]).map(c=>c[level]),()=>false,false);
 for(const [id,chunk] of Object.entries(chunks))Object.assign(catalogue.chunks[id],write('japan-local/'+catalogue.chunks[id].file,chunk));
 write('japan-local/catalogue.bin',catalogue);
}
// Malaysia: states and districts. Singapore counts as Malaysia's own, so the Johor Strait stays a coast.
{
 const frontier=frontierTest(['MYS','SGP']),first=load(data+'southeast-asia/malaysia-first.bin'),catalogue=load(data+'southeast-asia/malaysia-catalogue.bin');
 const chunks=Object.fromEntries(Object.entries(catalogue.chunks).map(([id,e])=>[id,load(data+'southeast-asia/'+e.file)]));
 run('malaysia',[first],frontier,true,300);run('malaysia',Object.values(chunks),frontier,true);
 write('southeast-asia/malaysia-first.bin',first);
 for(const [id,chunk] of Object.entries(chunks))Object.assign(catalogue.chunks[id],write('southeast-asia/'+catalogue.chunks[id].file,chunk));
 write('southeast-asia/malaysia-catalogue.bin',catalogue);
}
for(const [name,s] of Object.entries(report)){console.log(name.padEnd(12),`${s.shared} shared, ${s.exterior} exterior (${s.frontier} frontier) segments, ${s.near} near a neighbour; unmatched inside ${Math.round(s.unmatched/1000)} km`);assert(s.unmatched<1000,name+': shared edges left unmatched');assert(s.frontier||name!=='malaysia');}
