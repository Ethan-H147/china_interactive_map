// Inland hydrography is independent of the administrative state envelopes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import mapshaper from 'mapshaper';
import {load,landIndex,polygons} from './geo-index.mjs';
const dir='artifacts/mexico-water-source',base='dist/data/europe/mexico/';
const fc=features=>({type:'FeatureCollection',features});
const signedArea=ring=>ring.slice(1).reduce((n,p,i)=>n+ring[i][0]*p[1]-p[0]*ring[i][1],0)/2;
function esriPolygon(rings){
 const parts=rings.filter(r=>signedArea(r)<0).map(r=>[r]),holes=rings.filter(r=>signedArea(r)>=0);
 const outers=parts.map(p=>({part:p,area:Math.abs(signedArea(p[0])),contains:landIndex([p[0]])}));
 for(const hole of holes){const outer=outers.filter(o=>o.contains(hole[0])).sort((a,b)=>a.area-b.area)[0];assert(outer,'Every water island belongs to an outer water ring');outer.part.push(hole);}
 assert(parts.length,'Every water polygon has an outer ring');return parts.length===1?{type:'Polygon',coordinates:parts[0]}:{type:'MultiPolygon',coordinates:parts};
}
const features=[];
for(const file of fs.readdirSync(dir).filter(f=>/^water-\d/.test(f)).sort()){
 for(const f of JSON.parse(fs.readFileSync(dir+'/'+file)).features){
  const p=f.attributes;
  features.push({type:'Feature',properties:{kind:'lake',name:p.NOMBRE.trim(),sourceId:'semarnat-water-'+p.OBJECTID,category:p.DESCRIBE_T.trim(),state:p.NOM_EDO,seasonal:/Intermitente/.test(p.DESCRIBE),rank:1},geometry:esriPolygon(f.geometry.rings)});
 }
}
for(const file of fs.readdirSync(dir).filter(f=>/^rivers-\d/.test(f)).sort()){
 for(const f of JSON.parse(fs.readFileSync(dir+'/'+file)).features){
  const p=f.attributes;
  features.push({type:'Feature',properties:{kind:'river',name:p.nom_rio,sourceId:'semarnat-river-'+p.OBJECTID,rank:Math.max(1,8-p.orden_rio)},geometry:{type:'MultiLineString',coordinates:f.geometry.paths}});
 }
}
async function process(data,commands,mask){
 const input={'water.json':JSON.stringify(data),...(mask?{'mask.json':JSON.stringify(mask)}:{})};
 const result=await mapshaper.applyCommands('-i water.json '+commands+' -o water.json format=geojson precision=0.000001',input);
 const parsed=JSON.parse(result['water.json']);return parsed.type==='FeatureCollection'?parsed:fc([parsed]);
}
const mask=load(base+'context.bin');
const lakes=await process(fc(features.filter(f=>f.properties.kind==='lake')),'-clean -clip mask.json -simplify dp interval=.00015 planar keep-shapes -clean',mask);
// A small corridor preserves international boundary rivers; unlike a state split it cannot cut a river in half.
const buffered=await process(mask,'-dissolve -buffer 500');
const rivers=await process(fc(features.filter(f=>f.properties.kind==='river')),'-clip mask.json -simplify dp interval=.00015 planar keep-shapes',buffered);
const data=fc([...lakes.features,...rivers.features]);
const points=c=>typeof c[0]==='number'?[c]:c.flatMap(points);
for(const f of data.features){
 const list=points(f.geometry.coordinates),xs=list.map(p=>p[0]),ys=list.map(p=>p[1]);
 const dx=(Math.max(...xs)-Math.min(...xs))/360,dy=(Math.max(...ys)-Math.min(...ys))/360;
 f.properties.visibleZoom=Math.log2(1.5/(Math.hypot(dx,dy)*512));
}
const bytes=gzipSync(JSON.stringify(data),{level:9});fs.writeFileSync(base+'water.bin',bytes);
const pins=JSON.parse(fs.readFileSync('scripts/mexico-water-sources.json'));
fs.writeFileSync(base+'water-sources.json',JSON.stringify({
 retrieved:pins.retrieved,provider:'SEMARNAT INFOTECA / CONAGUA national hydrography',license:'Mexican government open geographic information; attribution: SEMARNAT / CONAGUA; underlying INEGI hydrography',
 sources:[{title:'National water bodies (lakes, lagoons, reservoirs and intermittent waters)',url:'https://geomatica.semarnat.gob.mx/arcgis/rest/services/INFOTECA/Agua/MapServer/2',sourceFeatures:features.filter(f=>f.properties.kind==='lake').length},{title:'Principal rivers, CONAGUA 2016 series',url:'https://geomatica.semarnat.gob.mx/arcgis/rest/services/INFOTECA/Agua/MapServer/1',sourceFeatures:features.filter(f=>f.properties.kind==='river').length}],
 coverage:'National water-body polygons and principal rivers. Seasonal/intermittent water shapes are geographic context, not current water levels. The dataset does not contain every tributary. Polygon islands are preserved, polygons are clipped to Mexico, and boundary rivers use a 500 m corridor.',
 processing:'Esri clockwise outer rings and counterclockwise islands converted to GeoJSON, clipped independently of administrative subdivisions, simplified about 17 m in latitude. Toggling water never changes the state polygons or their border meshes.',
 lakes:lakes.features.length,rivers:rivers.features.length,compressedBytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),sourcePins:pins
},null,2)+'\n');
console.log('Mexico water:',lakes.features.length,'water-body polygons,',rivers.features.length,'principal river features;',bytes.length,'bytes.');
