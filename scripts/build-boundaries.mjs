import fs from 'node:fs';
import {topology} from 'topojson-server';
import {merge, mesh} from 'topojson-client';
import mapshaper from 'mapshaper';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {transformFeature} from './coordinates.mjs';
import {applyChongmingCoast} from './chongming-overlay.mjs';
import {reconcileMacau} from './macau-topology.mjs';
import {correctJiamusi} from './jiamusi-correction.mjs';
import {clipShenzhenLand} from './shenzhen-coast.mjs';
import {reconcileShenzhenHongKong} from './shenzhen-hongkong.mjs';
import {refinePearlCoast,pearlCoastMethod} from './pearl-coast.mjs';
import {refineEastCoast,eastCoastMethod} from './east-coast.mjs';

const root=new URL('../dist/data/',import.meta.url);
const read=name=>{const file=new URL(name,root);return JSON.parse(fs.existsSync(file)?fs.readFileSync(file):gunzipSync(fs.readFileSync(new URL(name+'.gz',root))));};
const source={...read('provinces.json'),features:read('provinces.json').features.map(transformFeature)};
const manifest=read('manifest.json');
const taiwan=read('taiwan-regions.json');
const additions={...read('xinjiang-additions.json'),features:read('xinjiang-additions.json').features.map(transformFeature)};
const sar=[...read('sar-810000.json').features,...(await reconcileMacau(read('sar-820000.json'))).features];
const zhuhaiDetailed=read('zhuhai-detailed.json');
let features=[];
for(const entry of manifest.coverage){
  const parts=entry.unavailable?[source.features.find(f=>f.properties.adcode===entry.adcode)]:read(entry.adcode+'.json').features;
  for(const f of parts)features.push({...f,properties:{...f.properties,provinceCode:entry.adcode}});
}
// Separate province files have slightly different copies of their common border.
// Resolve overlaps and enclosed narrow cracks before deriving every display layer.
// Do not simplify, round coordinates, or close coastal channels/open water gaps.
const normalized=await mapshaper.applyCommands(
  '-i input.json -clean gap-width=250m overlap-rule=min-area -o output.json format=geojson',
  {'input.json':{type:'FeatureCollection',features:features.filter(f=>f.properties.level!=='province')}}
);
features=JSON.parse(normalized['output.json']).features;
// Convert the reconciled mainland mesh before overlaying WGS84 supplements.
// Converting only Zhuhai would break its shared edges with neighboring cities.
features=features.map(transformFeature);
// Apply new sources after the existing border repair so unrelated geometry stays exact.
const base=topology({regions:{type:'FeatureCollection',features}});
const xinjiangExtent={type:'Feature',properties:{},geometry:merge(base,base.objects.regions.geometries.filter(g=>g.properties.provinceCode===650000))};
const clipped=await mapshaper.applyCommands('-i new.json -clip extent.json -o output.json format=geojson',{'new.json':additions,'extent.json':xinjiangExtent});
const newCities=JSON.parse(clipped['output.json']);
const polygons=g=>g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
function polygonArea(g){let sum=0;for(const poly of polygons(g))for(const [index,ring] of poly.entries()){let a=0;for(let i=1;i<ring.length;i++)a+=ring[i-1][0]*ring[i][1]-ring[i][0]*ring[i-1][1];sum+=(index?-1:1)*Math.abs(a/2);}return sum;}
// DataV also assigns Kinmen/Matsu island shapes to Fujian. Replace those whole
// components with NLSC's outlines; partial erasure would leave a coarse coastal rim.
const fujianParts=features.filter(f=>f.properties.provinceCode===350000).flatMap(f=>polygons(f.geometry).map((coordinates,index)=>({type:'Feature',properties:{...f.properties,partId:f.properties.adcode+'-'+index},geometry:{type:'Polygon',coordinates}})));
const overlap=await mapshaper.applyCommands('-i old.json -clip taiwan.json -o output.json format=geojson',{'old.json':{type:'FeatureCollection',features:fujianParts},'taiwan.json':taiwan});
const overlapArea=new Map(JSON.parse(overlap['output.json']).features.map(f=>[f.properties.partId,polygonArea(f.geometry)]));
const replaced=new Set(fujianParts.filter(f=>(overlapArea.get(f.properties.partId)||0)/polygonArea(f.geometry)>0.5).map(f=>f.properties.partId));
for(const f of features.filter(f=>f.properties.provinceCode===350000))f.geometry={type:'MultiPolygon',coordinates:polygons(f.geometry).filter((_,i)=>!replaced.has(f.properties.adcode+'-'+i))};
for(const code of [650000,350000]){
  const parts=features.filter(f=>f.properties.provinceCode===code),cutouts=code===650000?newCities:taiwan;
  const erased=await mapshaper.applyCommands('-i old.json -erase cutouts.json -o output.json format=geojson',{'old.json':{type:'FeatureCollection',features:parts},'cutouts.json':cutouts});
  features=features.filter(f=>f.properties.provinceCode!==code).concat(JSON.parse(erased['output.json']).features,code===650000?newCities.features:[]);
}
// Overlay intersections calculated in separate operations may differ by floating-point
// noise. Join coincident vertices within about 0.01 mm, without simplifying borders.
const repaired=await mapshaper.applyCommands('-i input.json -clean gap-width=0 snap-interval=0.0000000001 overlap-rule=min-area -o output.json format=geojson',{'input.json':{type:'FeatureCollection',features:features.filter(f=>f.properties.provinceCode===650000)}});
features=features.filter(f=>f.properties.provinceCode!==650000).concat(JSON.parse(repaired['output.json']).features);
features.push(...taiwan.features);
// Insert government SAR data after the legacy gap repair, which must never
// bridge their narrow coastal channels or remove small islands.
features=features.filter(f=>![810000,820000].includes(f.properties.provinceCode));
// Replace coastal coverage beside Macau with the detailed district-derived land.
// Keep Zhuhai's inland city boundaries and its neighbors' shared edges unchanged.
const coastWindow={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[113.48,22.08],[113.61,22.08],[113.61,22.26],[113.48,22.26],[113.48,22.08]]]}};
const zhuhai=features.find(f=>f.properties.adcode===440400);
const coastal=await mapshaper.applyCommands('-i input.json -clip extent.json -o output.json format=geojson',{'input.json':{...zhuhaiDetailed,features:zhuhaiDetailed.features.map(f=>({...f,properties:zhuhai.properties}))},'extent.json':coastWindow});
const inland=await mapshaper.applyCommands('-i input.json -erase extent.json -o output.json format=geojson',{'input.json':{type:'FeatureCollection',features:[zhuhai]},'extent.json':coastWindow});
const joined=await mapshaper.applyCommands('-i input.json -dissolve2 adcode copy-fields=name,level,provinceCode,center,centroid -o output.json format=geojson',{'input.json':{type:'FeatureCollection',features:[...JSON.parse(inland['output.json']).features,...JSON.parse(coastal['output.json']).features]}});
features=features.filter(f=>f.properties.adcode!==440400).concat(JSON.parse(joined['output.json']).features);
// Join only numerical overlay differences at the coastal coverage seam.
const joinedGuangdong=await mapshaper.applyCommands('-i input.json -clean gap-width=0 snap-interval=0.0000000001 overlap-rule=min-area -o output.json format=geojson',{'input.json':{type:'FeatureCollection',features:features.filter(f=>f.properties.provinceCode===440000)}});
features=features.filter(f=>f.properties.provinceCode!==440000).concat(JSON.parse(joinedGuangdong['output.json']).features);
const guangdong=await mapshaper.applyCommands('-i old.json -erase sar.json -o output.json format=geojson',{'old.json':{type:'FeatureCollection',features:features.filter(f=>f.properties.provinceCode===440000)},'sar.json':{type:'FeatureCollection',features:sar}});
features=features.filter(f=>f.properties.provinceCode!==440000).concat(JSON.parse(guangdong['output.json']).features,sar);
// Insert detailed Chongming shorelines after gap repair, preserving river water.
features=await applyChongmingCoast(features,read('chongming-island.json'),read('chongming-north-bank.json'));
features=correctJiamusi(features);
features=await clipShenzhenLand(features,read('shenzhen-land.json'));
const hkTopology=topology({regions:{type:'FeatureCollection',features:sar.filter(f=>f.properties.provinceCode===810000)}});
features=reconcileShenzhenHongKong(features,{geometry:merge(hkTopology,hkTopology.objects.regions.geometries)}).features;
features=(await refinePearlCoast(features,JSON.parse(gunzipSync(fs.readFileSync(new URL('pearl-coast-land.bin',root)))))).features;
features=(await refineEastCoast(features,JSON.parse(gunzipSync(fs.readFileSync(new URL('east-coast-land.bin',root)))))).features;
const topo=topology({regions:{type:'FeatureCollection',features}});
const regions=topo.objects.regions;
const provinces={type:'FeatureCollection',features:manifest.coverage.map(entry=>({
  type:'Feature',
  properties:{...source.features.find(f=>f.properties.adcode===entry.adcode).properties,...({710000:{name:'臺灣'},810000:{name:'香港特別行政區',searchAliases:'香港特别行政区'},820000:{name:'澳門特別行政區',searchAliases:'澳门特别行政区 Macau'}}[entry.adcode]||{}),geometrySource:entry.unavailable&&entry.adcode!==710000?'province-fallback':'subdivisions'},
  geometry:entry.unavailable&&entry.adcode!==710000?source.features.find(f=>f.properties.adcode===entry.adcode).geometry:merge(topo,regions.geometries.filter(g=>g.properties.provinceCode===entry.adcode))
}))};
const isPrefecture=g=>g.properties.level==='taiwan-region'||g.properties.level==='city'&&String(g.properties.adcode).slice(2,4)!=='90';
const sameProvince=(a,b)=>a.properties.provinceCode===b.properties.provinceCode;
const boundaries={
  province:mesh(topo,regions,(a,b)=>a===b||!sameProvince(a,b)),
  prefecture:mesh(topo,regions,(a,b)=>a!==b&&sameProvince(a,b)&&(isPrefecture(a)||isPrefecture(b))),
  other:mesh(topo,regions,(a,b)=>a!==b&&sameProvince(a,b)&&!isPrefecture(a)&&!isPrefecture(b))
};
// Preserve the provider's separate territorial annotation, not its coarse province shapes.
const annotations={type:'FeatureCollection',features:source.features.filter(f=>!f.properties.name)};
const subdivisions={type:'FeatureCollection',features:features.filter(f=>f.properties.level!=='province')};
const result={provinces,subdivisions,boundaries,annotations};
const serialized=Buffer.from(JSON.stringify(result)),compressed=gzipSync(serialized,{level:9});
const parts=[];for(let offset=0,index=0;offset<compressed.length;offset+=4*1024*1024,index++){
  const name='display-boundaries.'+String(index).padStart(2,'0')+'.bin';parts.push(name);
  fs.writeFileSync(new URL(name,root),compressed.subarray(offset,offset+4*1024*1024));
}
fs.writeFileSync(new URL('display-boundaries.parts.json',root),JSON.stringify({compression:'gzip',parts,compressedBytes:compressed.length,uncompressedBytes:serialized.length,sha256:createHash('sha256').update(serialized).digest('hex')},null,2));
const provenance=read('additional-sources.json');
provenance.processing={simplification:false,zhuhai:'Detailed DataV district union replaces coastal coverage within [113.48,22.08,113.61,22.26]. The entire old port island is replaced by the connected OpenStreetMap shoreline; Macau government polygons retain jurisdiction.',displayCoordinateSystem:'WGS84',mainland:'DataV and AreaCity GCJ-02 coordinates numerically converted to WGS84, retaining every source vertex before government overlays.',coordinateReference:'https://help.aliyun.com/en/datav/datav-7-0/user-guide/map-data-format-1',xinjiang:'New cities clipped to the existing detailed Xinjiang extent, then erased from the older prefectures. Coincident overlay vertices joined within 1e-10 degrees.',taiwan:'Official county/city polygons replace the coarse Taiwan outline. Overlapping older Fujian island components are replaced as whole components to prevent residual coastlines.',sar:'Official Hong Kong land-clipped districts and Macau parish/area polygons replace previous SAR geometry after legacy gap repair. Their land polygons are erased from neighboring Guangdong to prevent overlapping fills.',replacedFujianIslandParts:[...replaced],retainedOtherProvinceBordersAfterCoordinateConversion:26};
provenance.processing.macau="Macau shared parish edges are reconciled with 1e-8 degree vertex snapping and a 0.5 m sliver-gap threshold before coastline extraction. No simplification is applied; validation bounds boundary displacement to 0.5 m.";
provenance.processing.shenzhen='Shenzhen display coverage is clipped to detailed OpenStreetMap physical land. Original administrative sources and Hong Kong polygons remain unchanged. No coastline simplification is applied; offshore jurisdiction is not depicted as land.';
provenance.processing.pearlCoast=pearlCoastMethod;
provenance.processing.eastCoast=eastCoastMethod;
provenance.processing.nanhuiShore=read("nanhui-shore.json").processing;
provenance.processing.chongming='OpenStreetMap island relation 3292765 replaces only the main Chongming island. The existing Shanghai/Jiangsu administrative split is retained on the island. Connected north-bank coastline ways remove North Branch river water from Nantong within [121.10,31.42,122.05,31.93]. Changxing, Hengsha and all other subdivisions retain their previous geometry.';
provenance.sources=provenance.sources.filter(s=>!['chongming-island.json','chongming-north-bank.json'].includes(s.sourceFile));
for(const [file,label,extra] of [
  ['chongming-island.json','Chongming Island',{url:'https://www.openstreetmap.org/relation/3292765',download:'https://api.openstreetmap.org/api/0.6/relation/3292765/full',osmRelation:'3292765',osmVersion:read('chongming-island.json').properties.osmVersion,vertices:read('chongming-island.json').geometry.coordinates[0].length}],
  ['chongming-north-bank.json','Chongming North Branch mainland bank',{url:'https://www.openstreetmap.org/way/10004875',osmWays:read('chongming-north-bank.json').properties.osmWays,vertices:read('chongming-north-bank.json').geometry.coordinates.length}]
])provenance.sources.push({provider:'OpenStreetMap '+label,...extra,sourceFile:file,sha256:createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex'),coordinateSystem:'WGS84',retrieved:'2026-10-02',license:'ODbL 1.0',licenseURL:'https://www.openstreetmap.org/copyright',reusableDataset:'data/'+file,sourceVersions:'data/chongming-source-versions.json',processing:'Connected original node references; every source shoreline vertex retained without simplification. Physical land is partitioned by the existing administrative boundary.'});
fs.writeFileSync(new URL('additional-sources.json',root),JSON.stringify(provenance,null,2));
console.log(JSON.stringify({provinces:provinces.features.length,sourceRegions:features.length,arcs:topo.arcs.length,meshes:Object.fromEntries(Object.entries(boundaries).map(([k,v])=>[k,v.coordinates.length]))}));
