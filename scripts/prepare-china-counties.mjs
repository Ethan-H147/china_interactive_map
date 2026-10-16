// Every county-level division of mainland China's prefecture-level areas, for developer mode:
// districts, counties, county-level cities, banners and their autonomous forms. The public map
// keeps its five-city district overlay (prepare-city-districts.mjs); this dataset replaces it
// only in developer mode, and reuses that overlay's refined districts for those five cities.
// Geometry: AreaCity release 2025.251231.260403 (Amap, GCJ-02, converted to WGS84), simplified
// to about 60 m, then clipped to each prefecture's displayed outline, so counties nest exactly.
// Land of the prefecture that AreaCity leaves uncovered goes to the county sharing most of its
// edge (or the nearest one, for an island). The municipalities' districts are already the
// second level, and the directly administered county-level units are their own areas, so
// neither is repeated here.
// Usage: node scripts/prepare-china-counties.mjs [path to AreaCity ok_geo.csv]
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import mapshaper from 'mapshaper';
import {readData} from './read-data.mjs';
import {transformFeature} from './coordinates.mjs';
import {isPrefectureLevel} from '../dist/china-levels.mjs';

const csv=process.argv[2]||'artifacts/areacity/x/ok_geo.csv';
const archiveSHA256='675c3e9b8dec6444994d3ef53259a145304f6a957db8a5e601e55c0b9e61e21a';
const fc=features=>({type:'FeatureCollection',features});
const run=async(command,files)=>JSON.parse((await mapshaper.applyCommands(command+' -o output.json format=geojson geojson-type=FeatureCollection precision=.000001',Object.fromEntries(Object.entries(files).map(([k,v])=>[k,JSON.stringify(v)]))))['output.json']);
const polygons=g=>!g?[]:g.type==='Polygon'?[g.coordinates]:g.coordinates;
const metres=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111195;
const types=[[/自治旗$/,'Autonomous Banner'],[/旗$/,'Banner'],[/自治县$/,'Autonomous County'],[/县$/,'County'],[/林区$/,'Forestry District'],[/特区$/,'Special District'],[/区$/,'District'],[/市$/,'County-level City'],[/行政委员会$/,'Administrative Committee']];

const display=readData('display-boundaries.json');
const prefectures=display.subdivisions.features.filter(f=>isPrefectureLevel(f.properties)&&f.properties.provinceCode<710000);
const refined=JSON.parse(gunzipSync(fs.readFileSync('dist/data/city-districts.bin')));
const refinedCities=new Set(refined.regions.features.map(f=>f.properties.parentCity));

// County-level rows: six-digit codes outside the municipalities, Taiwan, Hong Kong and Macau.
const rows=[];
for(const line of fs.readFileSync(csv,'utf8').split(/\r?\n/)){
 const m=line.match(/^(\d{6}),(\d+),2,"([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
 // Kinmen (350527), which the PRC lists under Quanzhou, is Taiwan's Kinmen County on this map.
 // Dongguan, Zhongshan, Jiayuguan and Danzhou have no county-level divisions; AreaCity repeats
 // each as one (its own code), which is left out.
 if(!m||/^(11|12|31|50|71|81|82)/.test(m[1])||m[1]==='350527'||m[1].endsWith('00'))continue;
 const [,code,parent,name,,center,shape]=m;
 const coordinates=shape.split(';').map(p=>p.split('~').map(r=>{const ring=r.split(',').map(q=>q.trim().split(/\s+/).map(Number));if(String(ring[0])!==String(ring.at(-1)))ring.push([...ring[0]]);return ring;}));
 const city=Number(parent)*100;
 rows.push(transformFeature({type:'Feature',properties:{adcode:Number(code),name,level:'city-district',parentCity:city,parent:{adcode:city},provinceCode:Math.floor(Number(code)/10000)*10000,adminType:types.find(([re])=>re.test(name))?.[1]||'County-level division',center:center.split(' ').map(Number)},geometry:{type:'MultiPolygon',coordinates}}));
}
console.log('AreaCity county-level rows:',rows.length);
// Simplified as one layer, so neighbouring counties keep shared edges.
const simplified=(await run('-i input.json -clean -simplify dp interval=60 keep-shapes -clean',{'input.json':fc(rows)})).features;
const byCity=new Map();for(const f of simplified){if(!byCity.has(f.properties.parentCity))byCity.set(f.properties.parentCity,[]);byCity.get(f.properties.parentCity).push(f);}
for(const code of byCity.keys())assert(prefectures.some(p=>p.properties.adcode===code),'AreaCity parent '+code+' is a displayed prefecture');

const features=[],lines=[],report=[];
for(const parent of prefectures){
 const code=parent.properties.adcode,source=byCity.get(code)||[];
 if(refinedCities.has(code)){
  const own=refined.regions.features.filter(f=>f.properties.parentCity===code);features.push(...own);
  lines.push(...refined.boundaries.features.filter(f=>f.properties.parentCity===code));
  report.push({city:code,counties:own.length,source:'city-districts.bin (refined)'});continue;
 }
 // Prefecture-level cities without county-level divisions (Dongguan, Zhongshan, Jiayuguan,
 // Danzhou) have none.
 if(!source.length){report.push({city:code,counties:0});continue;}
 const primary=(await run('-i input.json -clean gap-width=250m overlap-rule=min-area -clip parent.json',{'input.json':fc(source),'parent.json':fc([parent])})).features.filter(f=>f.geometry);
 const pieces=(await run('-i parent.json -erase primary.json -explode',{'parent.json':fc([parent]),'primary.json':fc(primary)})).features.filter(f=>f.geometry&&polygons(f.geometry)[0]?.[0]?.length>3);
 // Each uncovered piece joins the county it shares most edge with.
 const all=[...primary.map(f=>({...f,properties:{id:'c'+f.properties.adcode}})),...pieces.map((f,i)=>({...f,properties:{id:'p'+i}}))];
 const t=topology({regions:fc(all)}),shared=new Map();
 const arcLength=i=>{const arc=t.arcs[i<0?~i:i];let s=0;for(let k=1;k<arc.length;k++)s+=metres(arc[k-1],arc[k]);return s;};
 const owners=new Map();
 t.objects.regions.geometries.forEach(g=>{for(const arc of (g.arcs||[]).flat(Infinity)){const i=arc<0?~arc:arc;if(!owners.has(i))owners.set(i,new Set());owners.get(i).add(g.properties.id);}});
 for(const [arc,ids] of owners){const list=[...ids];for(const a of list)if(a[0]==='p')for(const b of list)if(b[0]==='c'){const m=shared.get(a)||new Map();m.set(b,(m.get(b)||0)+arcLength(arc));shared.set(a,m);}}
 const points=primary.map(f=>({adcode:f.properties.adcode,points:polygons(f.geometry).flat(2).filter((p,i)=>i%3===0)}));
 const nearest=p=>{let best=null,d=Infinity;for(const c of points)for(const q of c.points){const m=metres(p,q);if(m<d){d=m;best=c.adcode;}}return best;};
 const filled=pieces.map((f,i)=>{const m=shared.get('p'+i);const adcode=m?Number([...m].sort((a,b)=>b[1]-a[1])[0][0].slice(1)):nearest(polygons(f.geometry)[0][0][0]);return {...f,properties:{...primary.find(c=>c.properties.adcode===adcode).properties}};});
 let clean=await run('-i input.json -dissolve2 adcode copy-fields=name,level,parentCity,parent,provinceCode,adminType,center -clean',{'input.json':fc([...primary,...filled])});
 // Where AreaCity's county edge wanders across the prefecture's outline, clipping leaves small
 // detached slivers of a county inside its neighbours' land. A detached part under 2 km² (and
 // under a tenth of its county) that borders another county joins the one it shares most edge
 // with; islands, which border none, stay.
 const parts=(await run('-i input.json -explode',{'input.json':clean})).features.filter(f=>f.geometry);
 const ringArea=r=>Math.abs(r.slice(1).reduce((u,p,i)=>u+r[i][0]*p[1]-p[0]*r[i][1],0))/2*Math.cos(r[0][1]*Math.PI/180)*111.195**2;
 const partArea=f=>polygons(f.geometry).reduce((s,p)=>s+ringArea(p[0]),0),totals=new Map();
 for(const f of parts)totals.set(f.properties.adcode,Math.max(totals.get(f.properties.adcode)||0,partArea(f)));
 const pt=topology({regions:fc(parts.map((f,i)=>({...f,properties:{i}})))}),partOwners=new Map();
 pt.objects.regions.geometries.forEach(g=>{for(const arc of (g.arcs||[]).flat(Infinity)){const k=arc<0?~arc:arc;if(!partOwners.has(k))partOwners.set(k,[]);partOwners.get(k).push(g.properties.i);}});
 const borders=new Map();
 for(const [arc,list] of partOwners)if(list.length===2){const [a,b]=list,length=(()=>{const c=pt.arcs[arc];let s=0;for(let k=1;k<c.length;k++)s+=metres(c[k-1],c[k]);return s;})();for(const [x,y] of [[a,b],[b,a]]){const m=borders.get(x)||new Map();m.set(y,(m.get(y)||0)+length);borders.set(x,m);}}
 let moved=0;
 for(const [i,f] of parts.entries()){
  const own=f.properties.adcode,a=partArea(f);if(a>=totals.get(own)||a>=2||a>=totals.get(own)/10)continue;
  const next=[...(borders.get(i)||[])].filter(([j])=>parts[j].properties.adcode!==own).sort((x,y)=>y[1]-x[1])[0];
  if(next){f.properties={...parts[next[0]].properties};moved++;continue;}
  // Slivers whose vertices do not quite meet the neighbour's: one within 20 m of another county.
  let best=null,d=20;
  for(const p of polygons(f.geometry).flat(2))for(const g of parts)if(g.properties.adcode!==own)for(const q of polygons(g.geometry).flat(2)){if(Math.abs(q[0]-p[0])>.0003||Math.abs(q[1]-p[1])>.0003)continue;const m=metres(p,q);if(m<d){d=m;best=g;}}
  if(best){f.properties={...best.properties};moved++;}
 }
 if(moved)clean=await run('-i input.json -dissolve2 adcode copy-fields=name,level,parentCity,parent,provinceCode,adminType,center -clean',{'input.json':fc(parts)});
 const centroids=await run('-i input.json -points inner',{'input.json':clean});
 clean.features.forEach((f,i)=>{f.properties.centroid=centroids.features[i].geometry.coordinates.map(v=>Math.round(v*1e6)/1e6);});
 assert.equal(clean.features.length,new Set(source.map(f=>f.properties.adcode)).size,code+': every county keeps a shape');
 const top=topology({regions:clean});
 lines.push({type:'Feature',properties:{parentCity:code},geometry:mesh(top,top.objects.regions,(a,b)=>a!==b)});
 features.push(...clean.features);
 report.push({city:code,counties:clean.features.length,filledPieces:pieces.length,movedSlivers:moved});
}
const dataset={regions:fc(features),boundaries:fc(lines)};
fs.writeFileSync('dist/data/china-counties.bin',gzipSync(JSON.stringify(dataset),{level:9}));
fs.writeFileSync('dist/data/china-county-sources.json',JSON.stringify({provider:'AreaCity / Amap (GCJ-02, converted to WGS84); the five refined city overlays from city-district-sources.json',release:'https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov/releases/tag/2025.251231.260403',archive:'ok_geo.csv.7z',archiveSHA256,license:'MIT',processing:'Simplified to about 60 m as one layer, clipped to each displayed prefecture; uncovered prefecture land joins the county sharing most of its edge, or the nearest county for an island.',counties:features.length,prefectures:report},null,1)+'\n');
console.log('China counties:',features.length,'in',report.filter(r=>r.counties).length,'prefectures;',(fs.statSync('dist/data/china-counties.bin').size/1048576).toFixed(2),'MB');
