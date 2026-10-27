import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import polygonClipping from 'polygon-clipping';
import {root,countries} from './fetch-central-asian-frontiers.mjs';
import {load,polygons,lineIndex,linesOf,landIndex,metres} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
// Overlay slivers use a local planar area: splitting a long straight degree
// segment must not create spherical integration area on a zero-width ring.
const area=g=>polygons(g).reduce((total,p)=>{const ringArea=r=>{const[x,y]=r[0];let s=0;for(let i=1;i<r.length;i++)s+=(r[i-1][0]-x)*(r[i][1]-y)-(r[i][0]-x)*(r[i-1][1]-y);return Math.abs(s)*.5*111.31949**2*Math.cos(r.reduce((n,p)=>n+p[1],0)/r.length*Math.PI/180);};return total+Math.max(0,ringArea(p[0])-p.slice(1).reduce((n,r)=>n+ringArea(r),0));},0);
const names=Object.keys(countries),masks=load(root+'countries.bin'),envelope=load(root+'envelope.bin'),meta=load(root+'sources.json'),baseline=root+'atlas-reference/',osm=createRequire(import.meta.url)('osmtogeojson');
const geometry=coordinates=>({type:'MultiPolygon',coordinates}),sum=d=>d.features.reduce((s,f)=>s+area(f.geometry),0),coords=d=>d.features.flatMap(f=>polygons(f.geometry));
// A centimetre lattice avoids floating-point sweep ambiguity at almost coincident
// overlay vertices. Assertions allow less area than a single screen pixel here.
const lattice=v=>typeof v==='number'?Math.round(v*1e7):v.map(lattice),degrees=v=>typeof v==='number'?v/1e7:v.map(degrees);
const overlay=(op,...args)=>geometry(degrees(polygonClipping[op](...args.map(lattice))));
const perimeter=d=>coords(d).flat().reduce((s,r)=>s+r.slice(1).reduce((n,p,i)=>n+metres(r[i],p)/1000,0),0);
const tolerance=(...ds)=>.0001+ds.reduce((s,d)=>s+perimeter(d)*.00003,0);
function matchingEdges(a,b,label){const near=lineIndex(coords(b).flat());let max=0;for(const ring of coords(a).flat())for(let i=1;i<ring.length;i++)for(const p of [ring[i],[(ring[i][0]+ring[i-1][0])/2,(ring[i][1]+ring[i-1][1])/2]]){const d=near(p);max=Math.max(max,d);assert(d<.3,label+' boundary differs by '+d+'m');}return max;}
for(const[name,s]of Object.entries(meta.files)){const b=gunzipSync(fs.readFileSync(root+name+'.gz'));assert.equal(createHash('sha256').update(b).digest('hex'),s.sha256);}
for(const[name,s]of Object.entries(load(root+'atlas-reference.json').files))assert.equal(createHash('sha256').update(fs.readFileSync(baseline+name)).digest('hex'),s.sha256);
const dissolved=new Map(),edges=new Map(),statsByCountry=new Map();
for(const c of names){
 const base='dist/data/europe/'+c+'/',first=load(base+'first.bin').regions,cat=load(base+'catalogue.bin'),stats=load(base+'statistics.json'),before=load(baseline+c+'/statistics.json'),mask=masks.features.find(f=>f.properties.id===c),outline=await command(first,'-dissolve2 -clean gap-fill-area=0',{precision:null});dissolved.set(c,outline);edges.set(c,lineIndex(outline.features.flatMap(f=>polygons(f.geometry).flat())));statsByCountry.set(c,stats);
 assert.equal(first.features.length,load(baseline+c+'/first.bin').regions.features.length);assert.equal(cat.counts[1],first.features.length);
 const missing=area(overlay('difference',polygons(mask.geometry),coords(outline))),outside=area(overlay('difference',coords(outline),polygons(mask.geometry))),limit=tolerance(fc([mask]),outline);assert(missing<limit,c+' missing national fill '+missing);assert(outside<limit,c+' fill beyond national mask '+outside);matchingEdges(fc([mask]),outline,c);matchingEdges(outline,fc([mask]),c);
 for(const[id,s]of Object.entries(before.regions)){assert.deepEqual(stats.regions[id].population,s.population,c+' population retained '+id);assert.deepEqual(stats.regions[id].gdp,s.gdp);assert.deepEqual(stats.regions[id].gdpPerCapita,s.gdpPerCapita);if(s.area?.method==='reported')assert.deepEqual(stats.regions[id].area,s.area);}
 assert.deepEqual(load(base+'context.bin').features[0].geometry,mask.geometry,'Exact inactive-country context '+c);
 const records=new Map(cat.records.map(r=>[r.id,r]));for(const f of first.features)assert(landIndex(polygons(f.geometry).flat())(records.get(f.properties.id).center),'Interior label '+f.properties.id);
 for(const[parent,chunk]of Object.entries(cat.chunks||{})){const part=load(base+chunk.file),p=first.features.find(f=>f.properties.id===parent),limit=tolerance(part.regions,fc([p]));assert.equal(chunk.bytes,fs.statSync(base+chunk.file).size);assert.equal(chunk.count,part.regions.features.length);assert(part.regions.features.every(f=>records.get(f.properties.id).parent===parent));assert(area(overlay('difference',coords(part.regions),polygons(p.geometry)))<limit,parent+' outside fill');assert(area(overlay('difference',polygons(p.geometry),coords(part.regions)))<limit,parent+' uncovered parent');}
 console.log(c+': exact country/context coverage, parent coverage, label anchors and unchanged statistical values passed.');
}
for(let i=0;i<names.length;i++)for(let j=0;j<i;j++){const a=dissolved.get(names[i]),b=dissolved.get(names[j]),overlap=area(overlay('intersection',coords(a),coords(b)));assert(overlap<tolerance(a,b),names[i]+'/'+names[j]+' overlap '+overlap);}
assert(area(overlay('difference',coords(envelope),coords(masks)))<.005,'No holes in combined regional coverage');
let vertices=0,maxDistance=0;const pairs=new Set();
for(const f of load(root+'resolved.bin').features.filter(f=>f.properties.centralAsianReconciliation)){
 const owners=f.properties.countries.split(' ');assert.equal(owners.length,2);pairs.add(f.properties.pair);
 for(const path of linesOf(fc([f])))for(let i=1;i<path.length;i++)for(const t of [0,.5,1]){const a=path[i-1],b=path[i],p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];for(const c of owners){const d=edges.get(c)(p);maxDistance=Math.max(maxDistance,d);assert(d<.3,f.properties.pair+' stroke off '+c+' fill by '+d+'m');}vertices++;}
}
assert.equal(pairs.size,7,'Every internal country pair');
const samples=[];
for(const c of ['uzbekistan','tajikistan']){const data=load(root+c+'.json.gz'),f=osm(data).features.find(f=>f.id==='relation/'+meta.files[c+'.json'].relation),parts=polygons(f.geometry).filter(p=>area({type:'Polygon',coordinates:p})<1000).sort((a,b)=>area({type:'Polygon',coordinates:b})-area({type:'Polygon',coordinates:a}));assert.equal(parts.length,c==='uzbekistan'?4:3);const points=(await command(fc(parts.map(coordinates=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates}}))),'-points inner')).features;
 for(let i=0;i<parts.length;i++){const p=points[i].geometry.coordinates,own=dissolved.get(c);assert(landIndex(coords(own).flat())(p),c+' enclave present');for(const other of names.filter(n=>n!==c))assert(!landIndex(coords(dissolved.get(other)).flat())(p),'Enclave excluded from '+other);samples.push({country:c,center:p,bounds:(await import('./build-regional-dataset.mjs')).geographicBounds({type:'Polygon',coordinates:parts[i]}),name:(c==='uzbekistan'?['Sokh','Shohimardon','Chon-Qora','Jangy-Ayil']:['Tajik enclave 1','Tajik enclave 2','Tajik enclave 3'])[i],border:parts[i][0][Math.floor(parts[i][0].length/2)],pair:c==='uzbekistan'?'KGZ-UZB':i===1?'TJK-UZB':'KGZ-TJK'});}
}
const settlements=load('dist/data/europe/uzbekistan/settlements.json').records;assert.equal(settlements.length,1);assert.equal(settlements[0].id,'UZ24410');assert(landIndex(coords(dissolved.get('uzbekistan')).flat())(settlements[0].center),'Shirin point is within Uzbekistan');assert.equal(load('dist/data/europe/uzbekistan/catalogue.bin').counts[2],198);assert.equal(statsByCountry.get('uzbekistan').regions['uzbekistan:UZ24410'].area,null);
if(process.argv.includes('--write-samples'))fs.writeFileSync(root+'enclave-samples.json',JSON.stringify(samples,null,2)+'\n');
const world=load('dist/data/world-land.bin'),worldMeta=load('dist/data/world-land-sources.json');for(const[c,h]of Object.entries(worldMeta.centralAsianReconciliation.preservedInteractiveHashes))assert.equal(createHash('sha256').update(JSON.stringify(world.features.filter(f=>f.properties.country===c))).digest('hex'),h,'Unrelated world silhouette '+c);
console.log('Seven country pairs, seven exclaves, no country overlaps; '+vertices+' stroke samples stay within '+maxDistance.toFixed(6)+'m of both fills.');
