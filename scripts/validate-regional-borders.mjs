import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {lineData,lineSourceOptions} from '../dist/adaptive-lines.mjs';
import {configurations} from '../dist/southern-africa.mjs';

const require=createRequire(fs.existsSync('node_modules/@maplibre/geojson-vt')?path.resolve('package.json'):path.resolve('../../china-atlas/package.json'));
const {GeoJSONVT}=await import(pathToFileURL(path.join(path.dirname(require.resolve('@maplibre/geojson-vt')),'geojson-vt.mjs')));
const bundle=JSON.parse(gunzipSync(fs.readFileSync('dist/data/southern-africa/south-africa/all.bin')));
const key=(a,b)=>[a.join(','),b.join(',')].sort().join('|');
const edges=g=>new Set((g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat():g.type==='LineString'?[g.coordinates]:g.coordinates).flatMap(p=>p.slice(1).map((v,i)=>key(p[i],v))));
const ubuntu=bundle.levels[2].regions.features.find(f=>f.properties.id==='ZA-M-ubuntu');
const karoo=bundle.levels[2].regions.features.find(f=>f.properties.id==='ZA-M-karoo-hoogland');
const karooEdges=edges(karoo.geometry),shared=[...edges(ubuntu.geometry)].filter(e=>karooEdges.has(e));
const district=bundle.levels[1].boundaries.features.filter(f=>f.properties.owners.includes('ZA-D-namakwa')&&f.properties.owners.includes('ZA-D-pixley-ka-seme'));
const districtEdges=new Set(district.flatMap(f=>[...edges(f.geometry)]));
assert(shared.length>0);assert(shared.every(e=>districtEdges.has(e)),'The complete Ubuntu–Karoo Hoogland seam is supplied by the district outline');

const tolerance=configurations['south-africa'].lineTolerance;
const allLines=lineData({type:'FeatureCollection',features:bundle.levels.flatMap(p=>p.boundaries.features)});
const options=tolerance=>({maxZoom:lineSourceOptions.maxzoom,extent:8192,buffer:lineSourceOptions.buffer*16,tolerance:tolerance*16});
const previous=new GeoJSONVT(allLines,options(lineSourceOptions.tolerance)),current=new GeoJSONVT(allLines,options(tolerance));
const points=tile=>tile?.features.reduce((n,f)=>n+f.geometry.reduce((s,p)=>s+p.length,0),0)||0;
let before=0,after=0;
for(let x=8;x<=9;x++)for(let y=8;y<=10;y++){before+=points(previous.getTile(4,x,y));after+=points(current.getTile(4,x,y));}
assert(after<before*.8,'Country view removes substantially more subpixel bends');
const seamPath=district[0].geometry.coordinates.slice().sort((a,b)=>b.length-a.length)[0];
const point=seamPath[Math.floor(seamPath.length/2)],tileAt=(z)=>[Math.floor((point[0]+180)/360*2**z),Math.floor((1-Math.log(Math.tan(Math.PI/4+point[1]*Math.PI/360))/Math.PI)/2*2**z)];
const seamLines=lineData({type:'FeatureCollection',features:district}),detail=new GeoJSONVT(seamLines,options(tolerance)),exact=new GeoJSONVT(seamLines,options(0));
const high=tileAt(18),highDetail=detail.getTile(18,...high),highExact=exact.getTile(18,...high);
assert(highDetail&&highExact,'Representative shared border remains present up close');
assert.deepEqual(highDetail.features.map(f=>f.geometry),highExact.features.map(f=>f.geometry),'Maximum zoom restores original border detail');
console.log('Ubuntu–Karoo Hoogland:',shared.length,'shared segments present. Zoom 4 line vertices:',before,'→',after,'with full detail retained at zoom 18.');
