import fs from 'node:fs';
import assert from 'node:assert/strict';
import mapshaper from 'mapshaper';
import {createHash} from 'node:crypto';
import {transformFeature} from './coordinates.mjs';
const sourceDir='scripts/additional-sources/';
const collection=d=>d.type==='FeatureCollection'?d:{type:'FeatureCollection',features:(d.type==='GeometryCollection'?d.geometries:[d]).map(g=>({type:'Feature',properties:{},geometry:g}))};
const districts=JSON.parse(fs.readFileSync(sourceDir+'zhuhai-districts.json'));
assert.equal(districts.features.length,3);
const converted={...districts,features:districts.features.map(transformFeature)};
const merged=await mapshaper.applyCommands('-i input.json -dissolve2 -o output.json format=geojson',{'input.json':converted});
const detailed=collection(JSON.parse(merged['output.json']));
const port=JSON.parse(fs.readFileSync(sourceDir+'zhuhai-port-land.json'));
const polygons=g=>g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
const originalParts=polygons(detailed.features[0].geometry);
// Replace the entire obsolete port component, including its coarse shoreline.
// This extent only identifies a component; all replacement edges come from OSM.
const obsolete=originalParts.filter(p=>p[0].every(([x,y])=>x>113.56&&x<113.60&&y>22.19&&y<22.23));
assert.equal(obsolete.length,1,'Expected one old port island component');
const remaining=originalParts.filter(p=>!obsolete.includes(p));
const combined=await mapshaper.applyCommands('-i input.json -dissolve2 -o output.json format=geojson',{'input.json':{type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:remaining}},...port.features]}});
const shoreline=JSON.parse(fs.readFileSync(sourceDir+'wanzai-coastline.json'));
const path=shoreline.geometry.coordinates;
const exit=path.findIndex(p=>p[0]>113.5365);
assert(exit>100,'Wanzai coastline must leave the coverage window');
const coast=path.slice(0,exit+1),first=coast[0],last=coast.at(-1);
// Close the land mask inland, outside the shoreline replacement window.
// Every visible coastal edge is a retained OSM coastline segment.
const land={type:'Feature',properties:{coverage:'Wanzai physical land'},geometry:{type:'Polygon',coordinates:[[...coast,[last[0],22.26],[113.48,22.26],[113.48,first[1]],first]]}};
const window={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[113.515,22.17],[113.5365,22.17],[113.5365,22.216],[113.515,22.216],[113.515,22.17]]]}};
const west=await mapshaper.applyCommands('-i input.json -clip window.json -o output.json format=geojson',{'input.json':{type:'FeatureCollection',features:[land]},'window.json':window});
const rest=await mapshaper.applyCommands('-i input.json -erase window.json -o output.json format=geojson',{'input.json':collection(JSON.parse(combined['output.json'])),'window.json':window});
const joined=await mapshaper.applyCommands('-i input.json -dissolve2 -o output.json format=geojson',{'input.json':{type:'FeatureCollection',features:[...collection(JSON.parse(rest['output.json'])).features,...collection(JSON.parse(west['output.json'])).features]}});
fs.writeFileSync('dist/data/zhuhai-detailed.json',JSON.stringify(collection(JSON.parse(joined['output.json']))));
const checksum=name=>createHash('sha256').update(fs.readFileSync(sourceDir+name)).digest('hex');
const provenance=JSON.parse(fs.readFileSync('dist/data/additional-sources.json'));
provenance.sources=provenance.sources.filter(s=>!['DataV Zhuhai districts','OpenStreetMap Zhuhai port coastline','OpenStreetMap Wanzai coastline'].includes(s.provider));
provenance.sources.push(
 {provider:'DataV Zhuhai districts',download:'https://geo.datav.aliyun.com/areas_v3/bound/440400_full.json',sourceFile:'zhuhai-districts.json',sha256:checksum('zhuhai-districts.json'),coordinateSystem:'GCJ-02, numerically converted to WGS84',processing:'Districts dissolved into one city outline; used only in the coastal coverage window beside Macau.'},
 {provider:'OpenStreetMap Zhuhai port coastline',url:'https://www.openstreetmap.org/way/230560846',download:'https://api.openstreetmap.org/api/0.6/map?bbox=113.57,22.195,113.599,22.224',sourceFile:'zhuhai-port-land.json',sha256:checksum('zhuhai-port-land.json'),coordinateSystem:'WGS84',retrieved:'2026-10-02',ways:port.features[0].properties.osmWays,license:'ODbL 1.0',licenseURL:'https://www.openstreetmap.org/copyright',reusableDataset:'data/zhuhai-port-land.json',processing:'Connected coastline ways form the physical port island. Macau government jurisdiction is retained and erased from the Zhuhai portion.'},
 {provider:'OpenStreetMap Wanzai coastline',url:'https://www.openstreetmap.org/way/667085646',sourceFile:'wanzai-coastline.json',sha256:checksum('wanzai-coastline.json'),coordinateSystem:'WGS84',retrieved:'2026-10-02',ways:shoreline.properties.osmWays,license:'ODbL 1.0',licenseURL:'https://www.openstreetmap.org/copyright',reusableDataset:'data/wanzai-coastline.json',coverageWindow:[113.515,22.17,113.5365,22.216],processing:'Physical shoreline replaces the coarse land fill beside Macau. Closure edges are inland or outside the replacement window.'}
 );
fs.writeFileSync('dist/data/additional-sources.json',JSON.stringify(provenance,null,2));
console.log(JSON.stringify({districts:3,replacedPortComponents:obsolete.length,portVertices:port.features[0].geometry.coordinates[0].length}));
