// Argentina's map draws the Malvinas (Falklands) as Argentina's IGN does, in Tierra del Fuego
// province; the United Kingdom's map draws them as a British territory and hides its own while
// Argentina's is open. The South America build kept only West Falkland (its western edge
// passed the test meant for the mainland), and later steps rewrite its outputs, so this step
// replaces the islands in place: IGN's Malvinas polygons, simplified as the build does, in
// Tierra del Fuego and in Argentina's flight silhouette. Running it again changes nothing.
// Usage: node scripts/prepare-argentina-malvinas.mjs (needs artifacts/south-america-source)
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {gzipSync,gunzipSync} from 'node:zlib';
const require=createRequire(import.meta.url),mapshaper=require('mapshaper');
const read=file=>JSON.parse(gunzipSync(fs.readFileSync(file))),write=(file,data)=>fs.writeFileSync(file,gzipSync(JSON.stringify(data),{level:9}));
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const bounds=p=>{const xs=p[0].map(q=>q[0]),ys=p[0].map(q=>q[1]);return [[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)]];};
// The same box as the South America build: the Malvinas, Beauchene included.
const malvinas=p=>{const b=bounds(p);return b[0][0]>=-61.6&&b[1][0]<=-57.5&&b[0][1]>=-53.1&&b[1][1]<=-50.9;};

const source=JSON.parse(fs.readFileSync('artifacts/south-america-source/argentina.geojson'));
const province=source.features.find(f=>String(f.properties.in1??f.properties.IN1)==='94');assert(province,'IGN Tierra del Fuego');
const islands=polygons(province.geometry).filter(malvinas);assert(islands.length>400,'IGN draws the Malvinas');
const simplifiedResult=JSON.parse((await mapshaper.applyCommands('-i input.json -clean -simplify dp interval=75 keep-shapes -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify({type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:islands}}]})}))['output.json']);
// A single feature without properties comes back as a geometry collection.
const islandGeometry=simplifiedResult.geometries[0];
const replace=geometry=>({type:'MultiPolygon',coordinates:[...polygons(geometry).filter(p=>!malvinas(p)),...polygons(islandGeometry)]});

const firstFile='dist/data/south-america/argentina-first.bin',first=read(firstFile);
const region=first.regions.features.find(f=>f.properties.id==='AR-94');region.geometry=replace(region.geometry);
// Selecting the province frames its main island and Isla de los Estados, not the Malvinas.
const home=polygons(region.geometry).filter(p=>!malvinas(p)).map(bounds),record=first.records.find(r=>r.id==='AR-94');
record.bounds=[[Math.min(...home.map(b=>b[0][0])),Math.min(...home.map(b=>b[0][1]))],[Math.max(...home.map(b=>b[1][0])),Math.max(...home.map(b=>b[1][1]))]].map(p=>p.map(v=>Math.round(v*1e4)/1e4));
write(firstFile,first);

const contextFile='dist/data/flight-context.bin',context=read(contextFile);
const argentina=context.features.find(f=>f.properties.country==='argentina');argentina.geometry=replace(argentina.geometry);
write(contextFile,context);

const sourcesFile='dist/data/south-america/argentina-sources.json',sources=JSON.parse(fs.readFileSync(sourcesFile));
sources.bytes=fs.statSync(firstFile).size;sources.decodedBytes=Buffer.byteLength(JSON.stringify(first));
sources.coverageNote='23 provinces and Buenos Aires autonomous city. Continental territory and nearby islands, and the Malvinas (Falklands) as IGN draws them, in Tierra del Fuego province; the Antarctic claim and South Georgia and the South Sandwich Islands are excluded from this view.';
fs.writeFileSync(sourcesFile,JSON.stringify(sources,null,2)+'\n');
console.log('Malvinas:',polygons(islandGeometry).length,'polygons in Tierra del Fuego; province camera',JSON.stringify(record.bounds));
