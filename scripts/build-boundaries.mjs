import fs from 'node:fs';
import {topology} from 'topojson-server';
import {merge, mesh} from 'topojson-client';
import mapshaper from 'mapshaper';

const root=new URL('../dist/data/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,root)));
const source=read('provinces.json');
const manifest=read('manifest.json');
let features=[];
for(const entry of manifest.coverage){
  const parts=entry.unavailable?[source.features.find(f=>f.properties.adcode===entry.adcode)]:read(entry.adcode+'.json').features;
  for(const f of parts)features.push({...f,properties:{...f.properties,provinceCode:entry.adcode}});
}
// Separate province files have slightly different copies of their common border.
// Resolve overlaps and enclosed narrow cracks before deriving every display layer.
// Do not simplify, round coordinates, or close coastal channels/open water gaps.
const fallback=features.filter(f=>f.properties.level==='province');
const normalized=await mapshaper.applyCommands(
  '-i input.json -clean gap-width=250m overlap-rule=min-area -o output.json format=geojson',
  {'input.json':{type:'FeatureCollection',features:features.filter(f=>f.properties.level!=='province')}}
);
features=[...JSON.parse(normalized['output.json']).features,...fallback];
const topo=topology({regions:{type:'FeatureCollection',features}});
const regions=topo.objects.regions;
const provinces={type:'FeatureCollection',features:manifest.coverage.map(entry=>({
  type:'Feature',
  properties:{...source.features.find(f=>f.properties.adcode===entry.adcode).properties,geometrySource:entry.unavailable?'province-fallback':'subdivisions'},
  geometry:entry.unavailable?source.features.find(f=>f.properties.adcode===entry.adcode).geometry:merge(topo,regions.geometries.filter(g=>g.properties.provinceCode===entry.adcode))
}))};
const isPrefecture=g=>g.properties.level==='city'&&String(g.properties.adcode).slice(2,4)!=='90';
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
fs.writeFileSync(new URL('display-boundaries.json',root),JSON.stringify(result));
console.log(JSON.stringify({provinces:provinces.features.length,sourceRegions:features.length,arcs:topo.arcs.length,meshes:Object.fromEntries(Object.entries(boundaries).map(([k,v])=>[k,v.coordinates.length]))}));
