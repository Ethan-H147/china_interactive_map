import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';

const source='scripts/statistics-sources/south-africa-settlement-boundaries';
const output='dist/data/southern-africa/south-africa/settlement-boundaries';
const topoFile=path.join(source,'mainplaces.topojson');
const records=JSON.parse(fs.readFileSync('dist/data/southern-africa/south-africa/settlements.json')).records;
const pinned=JSON.parse(fs.readFileSync('scripts/statistics-sources/south-africa-settlements/settlement-source.json')).files['MP_SA_20.zip'].sha256;
const archive=path.join(source,'MP_SA_20.zip');
if(!fs.existsSync(archive))throw Error('Download the pinned census archive and extract into '+source+'/raw; see README.md.');
if(createHash('sha256').update(fs.readFileSync(archive)).digest('hex')!==pinned)throw Error('Census archive hash changed; review source before rebuilding.');
if(!fs.existsSync(topoFile)||process.argv.includes('--rebuild')){
 let require=createRequire(import.meta.url),mapshaper;
 try{mapshaper=require.resolve('mapshaper/bin/mapshaper');}catch{require=createRequire(path.resolve('../../china-atlas/package.json'));mapshaper=require.resolve('mapshaper/bin/mapshaper');}
 execFileSync(process.execPath,[mapshaper,path.join(source,'raw/MP_SA_20.SHP'),'-proj','wgs84','-simplify','dp','interval=5','keep-shapes','-o',topoFile,'format=topojson','no-quantization'],{stdio:'inherit'});
}
const topology=JSON.parse(fs.readFileSync(topoFile));
if(topology.transform)throw Error('Expected unquantized topology');
const geometries=Object.values(topology.objects)[0].geometries;
const byCode=new Map(geometries.map(g=>[String(g.properties.MP_CODE),g]));
const arcOwners=new Map();
function ids(g){return g.type==='Polygon'?g.arcs.flat():g.arcs.flat(2);}
for(const g of geometries)for(const signed of ids(g)){
 const arc=signed<0?~signed:signed;
 if(!arcOwners.has(arc))arcOwners.set(arc,new Set());
 arcOwners.get(arc).add(String(g.properties.MP_CODE));
}
function coordinates(g){
 const ring=arcs=>{const points=[];for(const signed of arcs){const a=topology.arcs[signed<0?~signed:signed],p=signed<0?[...a].reverse():a;points.push(...(points.length?p.slice(1):p));}return points.map(p=>p.map(n=>+n.toFixed(6)));};
 return g.type==='Polygon'?g.arcs.map(ring):g.arcs.map(poly=>poly.map(ring));
}
function contains(p,g){
 const inside=ring=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
 return (g.type==='Polygon'?[g.coordinates]:g.coordinates).some(poly=>inside(poly[0])&&!poly.slice(1).some(inside));
}
const bounds=g=>{const points=g.coordinates.flat(g.type==='Polygon'?1:2);return [[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1]))],[Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]];};
const fc=features=>({type:'FeatureCollection',features});
const manifest={year:2011,scope:'Census main place',source:'https://stuff.adrianfrith.com/MP_SA_20.zip',documentation:'https://www.statssa.gov.za/?page_id=3955',archiveSha256:pinned,simplification:{algorithm:'Douglas–Peucker with shared topology and retained shapes',intervalMetres:5},coastline:'Outer census coverage arcs are omitted; city outlines show boundaries shared with other main places.',provinces:{},cities:{}};
fs.mkdirSync(output,{recursive:true});
let totalBytes=0,totalEdges=0,shared=0;
for(const provinceId of [...new Set(records.map(r=>r.provinceId))].sort()){
 const members=records.filter(r=>r.provinceId===provinceId),features=[],selectedArcs=new Map();
 for(const r of members){
  const g=byCode.get(r.provenance.mainPlaceCode);if(!g)throw Error('Missing census polygon '+r.id);
  const geometry={type:g.type,coordinates:coordinates(g)};
  if(!contains(r.center,geometry))throw Error('Simplification displaced settlement point outside '+r.id);
  features.push({type:'Feature',properties:{id:r.id,name:r.en,year:2011,scope:'Census main place'},geometry});
  manifest.cities[r.id]={provinceId,bounds:bounds(geometry)};
  for(const signed of ids(g)){const a=signed<0?~signed:signed;if(arcOwners.get(a).size<2)continue;if(!selectedArcs.has(a))selectedArcs.set(a,new Set());selectedArcs.get(a).add(r.id);}
 }
 const edges=[...selectedArcs].map(([a,owners])=>({type:'Feature',properties:{owners:[...owners].sort()},geometry:{type:'LineString',coordinates:topology.arcs[a].map(p=>p.map(n=>+n.toFixed(6)))}}));
 for(const edge of edges)if(edge.properties.owners.length>1)shared++;
 const payload={year:2011,scope:'Census main place',regions:fc(features),boundaries:fc(edges)};
 const bin=zlib.gzipSync(JSON.stringify(payload),{level:9}),file=provinceId+'.bin';
 fs.writeFileSync(path.join(output,file),bin);
 manifest.provinces[provinceId]={file,count:members.length,bytes:bin.length,edgeCount:edges.length};
 totalBytes+=bin.length;totalEdges+=edges.length;
 console.log(provinceId,members.length,'cities',edges.length,'edges',bin.length,'gzip bytes');
}
if(Object.keys(manifest.cities).length!==500)throw Error('Expected every 500 settlement polygon');
if(totalBytes>8_000_000)throw Error('Settlement boundary budget exceeded');
manifest.validation={settlements:500,centersContained:500,edges:totalEdges,sharedSelectedCityArcs:shared,totalGzipBytes:totalBytes};
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Verified all 500 source polygons, center containment and shared topology;',totalBytes,'total gzip bytes.');

