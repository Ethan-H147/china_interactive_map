import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import mapshaper from 'mapshaper';
import earcut,{flatten} from 'earcut';
import {readData} from './read-data.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';

// Separate, disposable geometry for camera motion. The authoritative datasets
// and the precise sources used for picking and stationary views stay untouched.
const collection=features=>({type:'FeatureCollection',features});
const compressed=name=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/'+name)));
const display=readData('display-boundaries.json'),districts=compressed('city-districts.bin');
const prefectures=display.subdivisions.features.filter(f=>f.properties.level==='taiwan-region'||f.properties.level==='city'&&String(f.properties.adcode).slice(2,4)!=='90');
const sources={provinces:display.provinces,prefectures:collection(prefectures),others:collection(display.subdivisions.features.filter(f=>!prefectures.includes(f))),'city-districts':districts.regions};
const water=compressed('major-water.bin');
sources['major-water']=water;
for(const [id,geometry] of Object.entries(display.boundaries))sources[id+'-boundaries']=lineData(geometry);
sources['city-district-boundaries']=lineData(districts.boundaries);
for(const [country,file] of [['korea','korea-boundaries.bin'],['mongolia','mongolia-boundaries.bin']]){
 const data=compressed(file);
 for(const level of ['first','second'])sources[country+'-'+level]=data[level];
 for(const [level,geometry] of Object.entries(data.boundaries))sources[country+'-'+level+'-edges']=lineData(geometry);
 const outline=compressed(country+'-outline.bin');sources[country+'-portal']=outline;sources[country+'-portal-edges']=lineData(outline);
}
const count=g=>typeof g[0]==='number'?1:g.reduce((n,c)=>n+count(c),0);
let before=0,after=0;
const output={};
for(const [id,input] of Object.entries(sources)){
 const data=input.type==='FeatureCollection'?input:collection([input]);
 const polygon=data.features[0].geometry.type.includes('Polygon');
 if(!polygon)data.features=data.features.filter(f=>f.properties.visibleZoom===undefined||f.properties.visibleZoom<9);
 before+=data.features.reduce((n,f)=>n+count(f.geometry.coordinates),0);
 // Ground-distance tolerance, with smaller districts retaining finer detail.
 const interval=id==='city-districts'||id==='city-district-boundaries'||id==='others'||id==='other-boundaries'?12:id==='major-water'?80:id.includes('second')||id.startsWith('prefecture')?200:600;
 const result=await mapshaper.applyCommands(`-i input.json ${polygon?'-filter-islands min-area=1km2':''} -simplify dp interval=${interval} -o output.json format=geojson precision=0.000001`,{'input.json':JSON.stringify(data)});
 const simplified=collection(Object.values(result).flatMap(value=>JSON.parse(value).features));
 simplified.features=simplified.features.filter(f=>f.geometry);
 // Retain small complete administrative regions even below the island cutoff.
 if(polygon){const key=f=>f.properties.adcode??f.properties.id??'outline',ids=new Set(simplified.features.map(key));for(const f of data.features)if(!ids.has(key(f)))simplified.features.push(f);}
 for(const f of simplified.features)f.properties=Object.fromEntries(Object.entries(f.properties).filter(([key])=>['adcode','id','country','parentCity','visibleZoom','kind','rank'].includes(key)));
 after+=simplified.features.reduce((n,f)=>n+count(f.geometry.coordinates),0);
 output[id]=simplified;
 console.log(id,simplified.features.length,simplified.features.reduce((n,f)=>n+count(f.geometry.coordinates),0));
}
// Small, close-up territories need finer motion geometry than large provinces.
for(const code of [810000,820000]){const precise=display.provinces.features.find(f=>f.properties.adcode===code);output.provinces.features=output.provinces.features.filter(f=>f.properties.adcode!==code);output.provinces.features.push(precise);}
// Avoid the same tile-rounded touching-hole defect as the detailed Jilin fill.
output['fill-outlines']=collection(['provinces','prefectures'].flatMap(id=>output[id].features.filter(f=>[220000,222400].includes(f.properties.adcode))));
for(const id of ['provinces','prefectures'])output[id].features=output[id].features.flatMap(f=>{
 if(![220000,222400].includes(f.properties.adcode))return f;
 return (f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).flatMap(rings=>{
  const points=rings.flat(),projected=rings.map(r=>r.map(([x,y])=>[x,Math.log(Math.tan(Math.PI/4+y*Math.PI/360))*180/Math.PI]));
  const flat=flatten(projected),indices=earcut(flat.vertices,flat.holes,2),triangles=[];
  for(let i=0;i<indices.length;i+=3){const a=points[indices[i]],b=points[indices[i+1]],c=points[indices[i+2]];triangles.push({type:'Feature',properties:f.properties,geometry:{type:'Polygon',coordinates:[[a,b,c,a]]}});}
  return triangles;
 });
});
for(const id of ['provinces','prefectures']){output[id+'-fragments']=collection(output[id].features.filter(f=>[220000,222400].includes(f.properties.adcode)));output[id].features=output[id].features.filter(f=>![220000,222400].includes(f.properties.adcode));}
after=Object.entries(output).filter(([id])=>id!=='fill-outlines').reduce((n,[,data])=>n+data.features.reduce((sum,f)=>sum+count(f.geometry.coordinates),0),0);
const bytes=gzipSync(JSON.stringify(output),{level:9}),parts=[];
for(let offset=0;offset<bytes.length;offset+=3_000_000){const name=`motion-boundaries.part${parts.length+1}.bin`;fs.writeFileSync('dist/data/'+name,bytes.subarray(offset,offset+3_000_000));parts.push(name);}
fs.writeFileSync('dist/data/motion-boundaries.parts.json',JSON.stringify({parts})+'\n');
if(fs.existsSync('dist/data/motion-boundaries.bin'))fs.unlinkSync('dist/data/motion-boundaries.bin');
fs.writeFileSync('dist/data/motion-boundaries-report.json',JSON.stringify({before,after,reductionPercent:100*(1-after/before),compressedBytes:bytes.length,sourceIds:Object.keys(output)},null,2)+'\n');
console.log({before,after,reductionPercent:100*(1-after/before),compressedBytes:bytes.length});
