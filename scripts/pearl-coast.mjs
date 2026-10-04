import assert from 'node:assert/strict';
import fs from 'node:fs';
import mapshaper from 'mapshaper';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {alignCountry,polygons} from './international-topology.mjs';
export const coastCities=new Set([440100,440400,441300]);
export const pearlCoastMethod='Retain original directed OpenStreetMap coastline vertices. Project only exterior mainland coast segments within 2.5 km; shared administrative edges and junctions remain fixed. Clip physical land and replace entire islands where existing jurisdiction or an unambiguous national catalogue match establishes ownership. Catalogue coordinates have 0.1 arcminute precision; a rounding cell is accepted only when it intersects one physical island. Retain partitions on islands shared by jurisdictions and the previously reviewed Zhuhai–Macau port window. Apply the same parent extent to Guangzhou districts; only Nansha coastal additions are filled.';
export const collection=features=>({type:'FeatureCollection',features});
export const area=g=>polygons(g).reduce((s,p)=>s+p.reduce((a,r,i)=>a+(i?-1:1)*Math.abs(r.slice(1).reduce((n,b,j)=>n+(r[j][0]-r[0][0])*(b[1]-r[0][1])-(b[0]-r[0][0])*(r[j][1]-r[0][1]),0)/2),0),0);
export const run=async(command,files)=>JSON.parse((await mapshaper.applyCommands(command+' -o out.json format=geojson geojson-type=FeatureCollection',structuredClone(files)))['out.json']);
const key=p=>p.join(','),edge=(a,b)=>[key(a),key(b)].sort().join('|');
const protectedPort=([x,y])=>x>=113.48&&x<=113.61&&y>=22.08&&y<=22.26;
const inRing=([x,y],r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
const contains=(f,p)=>polygons(f.geometry).some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));
function intersectsCoordinateCell(f,[x,y]){
  // Catalogue coordinates are rounded to 0.1 arcminute, so their actual
  // location may lie anywhere in this half-step rectangle. Accept a match
  // only when exactly one physical island intersects it.
  const d=1/1200,box=[x-d,y-d,x+d,y+d],inside=([a,b])=>a>=box[0]&&a<=box[2]&&b>=box[1]&&b<=box[3];
  for(const poly of polygons(f.geometry))for(const r of poly)for(let i=1;i<r.length;i++){
    const a=r[i-1],b=r[i];if(inside(a)||inside(b))return true;
    let lo=0,hi=1;
    for(let k=0;k<2;k++){const delta=b[k]-a[k];if(!delta){if(a[k]<box[k]||a[k]>box[k+2]){lo=2;break;}continue;}let t0=(box[k]-a[k])/delta,t1=(box[k+2]-a[k])/delta;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);}
    if(lo<=hi)return true;
  }
  return [[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]]].some(p=>contains(f,p));
}
export async function refinePearlCoast(features,land){
  const all=structuredClone(features),mask=structuredClone(land);
  mask.features.forEach((f,id)=>f.properties={landId:id,physicalArea:area(f.geometry)});
  const mainland=mask.features.reduce((a,b)=>area(a.geometry)>area(b.geometry)?a:b);
  const t=topology({regions:collection(structuredClone(features))});
  const shared=mesh(t,t.objects.regions,(a,b)=>a!==b),junctions=new Set(shared.coordinates.flat().map(key));
  const targetEdges=new Set(all.filter(f=>coastCities.has(f.properties.adcode)).flatMap(f=>polygons(f.geometry).flatMap(p=>p.flatMap(r=>r.slice(1).map((b,i)=>edge(r[i],b))))));
  // Only exterior coast edges move. Shared administrative edges and their
  // junctions retain their coordinates; the previously reviewed port is kept.
  const aligned=alignCountry(all,structuredClone(mainland),(a,b)=>a[0]>112.951&&b[0]>112.951&&a[0]<115.599&&b[0]<115.599&&a[1]>21.651&&b[1]>21.651&&a[1]<24.099&&b[1]<24.099,2500,(a,b)=>targetEdges.has(edge(a,b))&&!junctions.has(key(a))&&!junctions.has(key(b))&&!protectedPort(a)&&!protectedPort(b));
  const oldByCode=new Map(features.map(f=>[f.properties.adcode,f]));
  const owners=new Map();
  // Intersection establishes existing jurisdiction, never proximity alone.
  // An island shared by jurisdictions is partitioned using the retained border.
  for(const f of features.filter(f=>f.properties.provinceCode===440000||[810000,820000].includes(f.properties.provinceCode))){
    const overlap=await run('-i land.json -clip city.json',{'land.json':mask,'city.json':f});
    for(const p of overlap.features){if(p.properties.landId===mainland.properties.landId||area(p.geometry)<1e-14)continue;const id=p.properties.landId;if(!owners.has(id))owners.set(id,[]);owners.get(id).push(f.properties.adcode);}
  }
  const catalogue=JSON.parse(fs.readFileSync(new URL('./additional-sources/pearl-coast/island-catalogue.json',import.meta.url))),catalogueMatches=[];
  for(const entry of catalogue.entries){
    let island=mask.features.find(f=>contains(f,entry.point)),match='coordinate inside island';
    if(!island){const candidates=mask.features.filter(f=>intersectsCoordinateCell(f,entry.point));if(candidates.length===1){island=candidates[0];match='unique island in coordinate rounding cell';}}
    if(!island)continue;
    const id=island.properties.landId,existing=owners.get(id)||[];
    if(id===mainland.properties.landId)continue;
    assert(!existing.some(code=>code!==entry.adcode),'Official island assignment conflicts with existing geometry: '+entry.name);
    owners.set(id,[entry.adcode]);catalogueMatches.push({...entry,landId:id,match,added:existing.length===0});
  }
  const supplementalMatches=[];
  for(const entry of JSON.parse(fs.readFileSync(new URL('./additional-sources/pearl-coast/supplemental-islands.json',import.meta.url))).entries){
    const island=mask.features.find(f=>contains(f,entry.point));assert(island,'Supplemental island missing '+entry.name);
    const id=island.properties.landId,existing=owners.get(id)||[];assert(id!==mainland.properties.landId&&!existing.some(code=>code!==entry.adcode),'Conflicting supplemental assignment');
    owners.set(id,[entry.adcode]);supplementalMatches.push({...entry,landId:id,added:existing.length===0});
  }
  const matchedNames=new Set(catalogueMatches.map(m=>m.name+'|'+m.point));
  const report={alignment:aligned.report,catalogueMatches,catalogueUnmatched:catalogue.entries.filter(e=>!matchedNames.has(e.name+'|'+e.point)).map(({number,name,adcode,point,page})=>({number,name,adcode,point,page})),supplementalMatches,cities:[],catalogueNote:'Unmatched entries include reclaimed mainland sites, ambiguous small rocks and features without a corresponding physical island in this shoreline snapshot. They do not generate guessed polygons.',catalogueSource:{url:catalogue.url,mirror:catalogue.mirror,pdfSha256:catalogue.pdfSha256,coordinatePrecision:catalogue.coordinatePrecision}},changed=new Map();
  for(const f of aligned.features.filter(f=>coastCities.has(f.properties.adcode))){
    const code=f.properties.adcode,old=oldByCode.get(code);
    const clipped=await run('-i city.json -clip land.json',{'city.json':f,'land.json':mask});
    const whole=mask.features.filter(p=>owners.get(p.properties.landId)?.length===1&&owners.get(p.properties.landId)[0]===code);
    let refined=await run('-i input.json -dissolve2',{'input.json':collection([...clipped.features,...whole.map(p=>({...p,properties:old.properties}))])});
    if(code===440400){
      const window={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[113.48,22.08],[113.61,22.08],[113.61,22.26],[113.48,22.26],[113.48,22.08]]]}};
      const keep=await run('-i input.json -clip window.json',{'input.json':old,'window.json':window});
      const rest=await run('-i input.json -erase window.json',{'input.json':refined,'window.json':window});
      refined=await run('-i input.json -dissolve2',{'input.json':collection([...rest.features,...keep.features])});
    }
    // Whole island replacement must not overlap a neighbor's existing land.
    const neighbors=collection(features.filter(g=>g.properties.adcode!==code&&(g.properties.provinceCode===440000||[810000,820000].includes(g.properties.provinceCode))));
    refined=await run('-i city.json -erase neighbors.json',{'city.json':refined,'neighbors.json':neighbors});
    assert.equal(refined.features.length,1,'Missing refined city '+code);
    const next={...old,geometry:refined.features[0].geometry};changed.set(code,next);
    report.cities.push({adcode:code,oldParts:polygons(old.geometry).length,newParts:polygons(next.geometry).length,oldVertices:polygons(old.geometry).flat(2).length,newVertices:polygons(next.geometry).flat(2).length,wholeIslands:whole.length,wholeIslandIds:whole.map(p=>p.properties.landId)});
  }
  return {features:features.map(f=>changed.get(f.properties.adcode)||f),report};
}
export async function refineGuangzhouDistricts(features,city){
  const selected=features.filter(f=>f.properties.parentCity===440100),others=features.filter(f=>f.properties.parentCity!==440100);
  let local=await run('-i districts.json -clip city.json',{'districts.json':collection(selected),'city.json':city});
  const gaps=await run('-i city.json -erase districts.json',{'city.json':city,'districts.json':local});
  // Coastal additions belong to Nansha. Inland gaps from the older district
  // dataset are retained rather than reassigning unrelated administrative land.
  const additions=gaps.features.flatMap(f=>polygons(f.geometry).map(p=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:p}}))).filter(f=>polygons(f.geometry).flat(2).every(([x,y])=>x>113.25&&x<113.80&&y<22.90));
  const nansha=local.features.find(f=>f.properties.adcode===440115);assert(nansha);
  if(additions.length){const combined=await run('-i input.json -dissolve2',{'input.json':collection([nansha,...additions.map(f=>({...f,properties:nansha.properties}))])});nansha.geometry=combined.features[0].geometry;}
  const byCode=new Map(local.features.map(f=>[f.properties.adcode,f]));
  assert.equal(local.features.length,selected.length);
  return {features:features.map(f=>byCode.get(f.properties.adcode)||f),report:{coastalAdditions:additions.length,otherDistricts:others.length}};
}
