import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {readData} from './read-data.mjs';
import {canonicalHongKongBorder,segmentDistanceIndex} from './shenzhen-hongkong.mjs';
const baseline='dad1949249582aea49ff9b9321a68c1e3726949b';
const show=name=>{const r=spawnSync('git',['-c','safe.directory='+process.cwd().replaceAll('\\','/'),'show',baseline+':dist/data/'+name],{maxBuffer:50e6});assert.equal(r.status,0,r.stderr.toString());return r.stdout;};
const metadata=JSON.parse(show('display-boundaries.parts.json'));
const before=JSON.parse(gunzipSync(Buffer.concat(metadata.parts.map(show)))),after=readData('display-boundaries.json');
assert.deepEqual(fs.readFileSync('dist/data/major-water.bin'),show('major-water.bin'),'River geometry must remain unchanged');
const previousRiverReport=JSON.parse(show('river-boundary-report.json')),currentRiverReport=readData('river-boundary-report.json');
delete previousRiverReport.administrativeSha256;delete currentRiverReport.administrativeSha256;
assert.deepEqual(currentRiverReport,previousRiverReport,'Reviewed river reaches and provenance must remain unchanged');
const districts=JSON.parse(gunzipSync(fs.readFileSync('dist/data/city-districts.bin'))),oldDistricts=JSON.parse(gunzipSync(show('city-districts.bin')));
const rings=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const coordinates=g=>rings(g).flat(2);
const inRing=([x,y],r)=>{let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const contains=(g,p)=>rings(g).some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));
for(const f of before.subdivisions.features){const current=after.subdivisions.features.find(c=>c.properties.adcode===f.properties.adcode);assert.deepEqual(current.properties,f.properties);if(f.properties.adcode!==440300)assert.deepEqual(current.geometry,f.geometry,'Unrelated region changed '+f.properties.adcode);}
for(const f of before.provinces.features){const current=after.provinces.features.find(c=>c.properties.adcode===f.properties.adcode);assert.deepEqual(current.properties,f.properties);if(f.properties.adcode!==440000)assert.deepEqual(current.geometry,f.geometry,'Unrelated province changed '+f.properties.adcode);}
for(const f of oldDistricts.regions.features){const current=districts.regions.features.find(c=>c.properties.adcode===f.properties.adcode);assert.deepEqual(current.properties,f.properties);if(f.properties.parentCity!==440300)assert.deepEqual(current.geometry,f.geometry,'Unrelated district changed '+f.properties.adcode);}
const oldCity=before.subdivisions.features.find(f=>f.properties.adcode===440300),city=after.subdivisions.features.find(f=>f.properties.adcode===440300);
assert(coordinates(city.geometry).length>10000,'Detailed shoreline points missing');
for(const p of [[113.87,22.47],[113.92,22.47],[113.94,22.48]]){assert(contains(oldCity.geometry,p),'Baseline sea sample');assert(!contains(city.geometry,p),'Sea still represented as Shenzhen land '+p);}
for(const p of [[113.93,22.49],[113.88,22.50],[114.05,22.55]])assert(contains(city.geometry,p),'Shenzhen land lost '+p);
const raw=gunzipSync(fs.readFileSync('dist/data/shenzhen-coast-source.bin')),source=readData('shenzhen-coast-source.json'),osm=JSON.parse(raw);
assert.equal(createHash('sha256').update(raw).digest('hex'),source.sha256);
assert.equal(osm.elements.length,source.ways);assert.equal(source.coordinateSystem,'WGS84');assert.equal(source.license,'ODbL 1.0');
const key=p=>p.map(n=>n.toFixed(8)).join(',');
const sourceKeys=new Set(osm.elements.flatMap(w=>w.geometry.map(p=>key([p.lon,p.lat]))));
const copied=coordinates(city.geometry).filter(p=>sourceKeys.has(key(p))).length;
assert(copied>10000,'Shoreline must retain original source vertices');
const project=([x,y])=>[x*102800,y*111200];
const distanceIndex=lines=>{
  const grid=new Map(),cell=200;
  for(const line of lines)for(let i=1;i<line.length;i++){
    const a=project(line[i-1]),b=project(line[i]);
    for(let x=Math.floor(Math.min(a[0],b[0])/cell);x<=Math.floor(Math.max(a[0],b[0])/cell);x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell);y<=Math.floor(Math.max(a[1],b[1])/cell);y++){const k=x+','+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push([a,b]);}
  }
  return point=>{const p=project(point),x=Math.floor(p[0]/cell),y=Math.floor(p[1]/cell);let distance=Infinity;for(let u=x-1;u<=x+1;u++)for(let v=y-1;v<=y+1;v++)for(const [a,b] of grid.get(u+','+v)||[]){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));distance=Math.min(distance,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy));}return distance;};
};
const originalDistrictLines=oldDistricts.boundaries.features.find(f=>f.properties.parentCity===440300).geometry.coordinates;
const distance=distanceIndex(originalDistrictLines),newDistrictLines=districts.boundaries.features.find(f=>f.properties.parentCity===440300).geometry.coordinates;
const sharedBorderDistance=segmentDistanceIndex([canonicalHongKongBorder(after.provinces.features.find(f=>f.properties.adcode===810000))]);
for(const line of newDistrictLines)for(const p of line)if(sharedBorderDistance(p)>.01)assert(distance(p)<.01,'Inland district boundary moved');
const top=topology({regions:before.subdivisions}),shared=mesh(top,top.objects.regions,(a,b)=>a!==b&&(a.properties.adcode===440300||b.properties.adcode===440300)&&a.properties.provinceCode!==810000&&b.properties.provinceCode!==810000);
const cityDistance=distanceIndex(rings(city.geometry).flat()),land=readData('shenzhen-land.json');
let inlandSegments=0;
for(const line of shared.coordinates)for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],p=[(a[0]+b[0])/2,(a[1]+b[1])/2];
  if(land.features.some(f=>contains(f.geometry,p))){assert(cityDistance(p)<.01,'Inland city border moved '+p);inlandSegments++;}
}
assert(inlandSegments>100,'Missing inland preservation checks');
console.log(JSON.stringify({unrelatedRegionsUnchanged:501,unrelatedProvincesUnchanged:33,unrelatedDistrictsUnchanged:45,shorelineSourceVertices:copied,inlandCitySegmentsChecked:inlandSegments,districtBordersPreserved:true,HongKongUnchanged:true}));
