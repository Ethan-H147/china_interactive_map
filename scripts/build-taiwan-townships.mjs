import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {readData} from './read-data.mjs';
import {describeRegion} from '../dist/china-sources.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {triangulateMapFill} from './triangulate-map-fill.mjs';
const source='scripts/additional-sources/taiwan-townships/';
const output='dist/data/taiwan-townships';fs.mkdirSync(output,{recursive:true});
const fc=features=>({type:'FeatureCollection',features});
const run=async(command,files={})=>JSON.parse((await mapshaper.applyCommands(command+' -o output.json format=geojson geojson-type=FeatureCollection precision=.000001',Object.fromEntries(Object.entries(files).map(([k,v])=>[k,JSON.stringify(v)]))))['output.json']);
const raw=await run('-i '+source+'TOWN_MOI_1120317.shp -proj wgs84');
const supplemental=await run('-i '+source+'Town_Majia_Sanhe.shp -proj wgs84');
assert.equal(raw.features.length,368);
const names={},records=raw.features.map(f=>{
 const p=f.properties,adcode='TW-T-'+p.TOWNCODE,parentCity='TW-'+p.COUNTYCODE;
 const adminType=p.TOWNNAME.endsWith('區')?'District':p.TOWNNAME.endsWith('市')?'County-administered City':p.TOWNNAME.endsWith('鎮')?'Urban Township':'Rural Township';
 names[adcode]={en:p.TOWNENG,zh:p.TOWNNAME,regional:[],source:'https://data.gov.tw/dataset/7441'};
 return {...f,properties:{adcode,officialCode:p.TOWNCODE,name:p.TOWNNAME,englishName:p.TOWNENG,level:'city-district',provinceCode:710000,parentCity,parent:{adcode:parentCity},adminType,geometrySource:'NLSC TOWN_MOI_1120317',searchAliases:p.COUNTYNAME+p.TOWNNAME+';'+p.TOWNENG+', '+p.COUNTYNAME}};
});
// The official archive supplies Sanhe separately; union it into Majia's feature.
for(const f of supplemental.features)records.push({...f,properties:{...records.find(r=>r.properties.officialCode===f.properties.TOWNCODE).properties}});
const fields=Object.keys(records[0].properties).filter(k=>k!=='adcode').join(',');
const simple=await run('-i input.json -dissolve2 adcode copy-fields='+fields+' -clean -simplify dp interval=30 keep-shapes -clean',{'input.json':fc(records)});
const parents=readData('display-boundaries.json').subdivisions.features.filter(f=>f.properties.level==='taiwan-region');
const all=[],report=[];
for(const parent of parents){
 const scope=parent.properties.adcode,sourceFeatures=simple.features.filter(f=>f.properties.parentCity===scope);
 let clipped=await run('-i input.json -clip parent.json -clean',{'input.json':fc(sourceFeatures),'parent.json':fc([parent])});
 const gaps=await run('-i parent.json -erase children.json -explode',{'parent.json':fc([parent]),'children.json':clipped});
 // Reconcile older displayed county coastlines using shared edges; keep every township ID.
 const combined=[...clipped.features.map((f,i)=>({...f,properties:{key:'c'+i}})),...gaps.features.map((f,i)=>({...f,properties:{key:'g'+i}}))];
 const top=topology({regions:fc(combined)}),owners=new Map(),shares=new Map();
 for(const g of top.objects.regions.geometries)for(const arc of (g.arcs||[]).flat(Infinity)){const id=arc<0?~arc:arc;if(!owners.has(id))owners.set(id,new Set());owners.get(id).add(g.properties.key);}
 for(const [arc,keys] of owners){const pts=top.arcs[arc];let length=0;for(let i=1;i<pts.length;i++)length+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);for(const g of keys)if(g[0]==='g')for(const c of keys)if(c[0]==='c'){if(!shares.has(g))shares.set(g,new Map());const m=shares.get(g);m.set(c,(m.get(c)||0)+length);}}
 const points=await run('-i input.json -points inner',{'input.json':clipped});
 const filled=gaps.features.filter(f=>f.geometry?.coordinates?.length).map(f=>{
  const i=gaps.features.indexOf(f),edge=[...(shares.get('g'+i)||[])].sort((a,b)=>b[1]-a[1])[0];
  let index=edge?Number(edge[0].slice(1)):null;
  if(index===null){let point=f.geometry.coordinates;while(Array.isArray(point[0]))point=point[0];let distance=Infinity;points.features.forEach((p,j)=>{const q=p.geometry.coordinates,d=Math.hypot(q[0]-point[0],q[1]-point[1]);if(d<distance){distance=d;index=j;}});}
  if(!clipped.features[index])throw Error(JSON.stringify({scope,index,gap:f,centers:points.features.map(p=>p.geometry)}));
  return {...f,properties:clipped.features[index].properties};
 });
 clipped=await run('-i input.json -dissolve2 adcode copy-fields='+fields+' -clean',{'input.json':fc([...clipped.features,...filled])});
 assert.equal(clipped.features.length,sourceFeatures.length,scope+' retained all divisions');
 const centers=await run('-i input.json -points inner',{'input.json':clipped});
 clipped.features.forEach((f,i)=>{f.properties.center=f.properties.centroid=centers.features[i].geometry.coordinates;});
 const t=topology({regions:clipped}),borders=fc([{type:'Feature',properties:{parentCity:scope},geometry:mesh(t,t.objects.regions,(a,b)=>a!==b)}]);
 const data={'city-districts':fc(clipped.features.flatMap(f=>triangulateMapFill(f).geometry.coordinates.map(coordinates=>({type:'Feature',properties:f.properties,geometry:{type:'Polygon',coordinates}})))),'city-district-boundaries':lineData(borders),'city-districts-selection-edges':lineData(clipped)};
 fs.mkdirSync(output+'/'+scope,{recursive:true});let bytes=0;
 for(const [id,value] of Object.entries(data)){const buffer=gzipSync(encodeGeo(value),{level:9});fs.writeFileSync(output+'/'+scope+'/'+id+'.bin',buffer);bytes+=buffer.length;}
 all.push(...clipped.features.map(describeRegion));report.push({parent:scope,divisions:clipped.features.length,bytes,coastlinePieces:filled.length});
 console.log(scope,clipped.features.length,'divisions',bytes,'bytes');
}
assert.equal(all.length,368);assert.equal(new Set(all.map(f=>f.properties.adcode)).size,368);
fs.writeFileSync(output+'/index.json',JSON.stringify({districts:all,names}));
fs.writeFileSync(output+'/sources.json',JSON.stringify({provider:'National Land Surveying and Mapping Center, Ministry of the Interior',url:'https://data.gov.tw/dataset/7441',download:'https://maps.nlsc.gov.tw/download/鄉鎮市區界線(TWD97經緯度).zip',sourceFile:'TOWN_MOI_1120317.shp',boundaryDate:'2023-03-17',supplement:'Town_Majia_Sanhe.shp (unioned into Majia Township)',license:'Taiwan Open Government Data License 1.0',licenseURL:'https://data.gov.tw/license',sha256:createHash('sha256').update(fs.readFileSync(source+'source.zip')).digest('hex'),processing:'Converted to WGS84, jointly simplified to 30 m, clipped to displayed county boundaries; uncovered parent pieces assigned by longest shared edge, or nearest township for detached islands. Fills use projection-repaired triangles; outlines retain the original rings.',divisions:368,parents:report},null,2));
console.log('Taiwan:',all.length,'divisions;',report.reduce((s,r)=>s+r.bytes,0),'total bytes across 22 parent areas.');

