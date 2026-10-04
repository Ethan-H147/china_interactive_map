import assert from 'node:assert/strict';
import fs from 'node:fs';
import mapshaper from 'mapshaper';
import {alignCountry,polygons} from './international-topology.mjs';

const key=p=>p.join(',');
export const borderRule=JSON.parse(fs.readFileSync(new URL('additional-sources/shenzhen/hongkong-border.json',import.meta.url)));
export function canonicalHongKongBorder(hongKong){
  const ring=polygons(hongKong.geometry).find(poly=>poly[0].some(p=>key(p)===key(borderRule.start)))?.[0];
  assert(ring,'Hong Kong border start is missing from the official source');
  const start=ring.findIndex(p=>key(p)===key(borderRule.start)),end=ring.findIndex(p=>key(p)===key(borderRule.end));
  assert(end>start,'Official Hong Kong land-border endpoints changed');
  return ring.slice(start,end+1);
}
export function segmentDistanceIndex(lines){
  const grid=new Map(),cell=.002,scaleX=102800,scaleY=111200;
  for(const line of lines)for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i];
    for(let x=Math.floor(Math.min(a[0],b[0])/cell);x<=Math.floor(Math.max(a[0],b[0])/cell);x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell);y<=Math.floor(Math.max(a[1],b[1])/cell);y++){
      const k=x+','+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push([a,b]);
    }
  }
  return p=>{
    let best=Infinity;const x=Math.floor(p[0]/cell),y=Math.floor(p[1]/cell);
    for(let u=x-1;u<=x+1;u++)for(let v=y-1;v<=y+1;v++)for(const [a,b] of grid.get(u+','+v)||[]){
      const dx=(b[0]-a[0])*scaleX,dy=(b[1]-a[1])*scaleY,px=(p[0]-a[0])*scaleX,py=(p[1]-a[1])*scaleY,t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy||1)));
      best=Math.min(best,Math.hypot(px-t*dx,py-t*dy));
    }
    return best;
  };
}
export function reconcileShenzhenHongKong(features,hongKong){
  const canonical=canonicalHongKongBorder(hongKong);
  const city=features.find(f=>f.properties.adcode===440300);
  if(city){
    let replaced=0;
    const coords=polygons(city.geometry).map(poly=>poly.map(ring=>{
      const a=ring.findIndex(p=>key(p)===key(borderRule.start)),b=ring.findIndex(p=>key(p)===key(borderRule.end));
      if(a<0||b<0)return ring;
      assert(b>a,'Shenzhen land-border ordering changed');replaced++;
      return [...ring.slice(0,a),...canonical,...ring.slice(b+1)];
    }));
    assert.equal(replaced,1,'Expected one Shenzhen mainland land-border path');
    const replacement={...city,geometry:{type:city.geometry.type,coordinates:city.geometry.type==='Polygon'?coords[0]:coords}};
    return {features:features.map(f=>f===city?replacement:f),report:{canonicalVertices:canonical.length,city:440300}};
  }
  const sourceDistance=segmentDistanceIndex([borderRule.previousCityPath,canonical]);
  const canonicalEdges=new Set(canonical.slice(1).map((p,i)=>[key(canonical[i]),key(p)].sort().join('|')));
  const selected=structuredClone(features.filter(f=>f.properties.parentCity===440300));
  assert(selected.length,'Missing Shenzhen districts');
  const repaired=alignCountry(selected,structuredClone(hongKong),(a,b)=>canonicalEdges.has([key(a),key(b)].sort().join('|')),1000,(a,b)=>sourceDistance(a)<.1&&sourceDistance(b)<.1);
  const changedCodes=new Set(repaired.report.changedRegions);
  const byCode=new Map(repaired.features.filter(f=>changedCodes.has(f.properties.adcode)).map(f=>[f.properties.adcode,f]));
  return {features:features.map(f=>byCode.get(f.properties.adcode)||f),report:repaired.report};
}

export async function finishShenzhenDistrictBorder(features,city,hongKong,changedCodes){
  const fc=features=>({type:'FeatureCollection',features});
  const run=async(command,files)=>JSON.parse((await mapshaper.applyCommands(command+' -o output.json format=geojson geojson-type=FeatureCollection',structuredClone(files)))['output.json']);
  const changed=new Set(changedCodes);
  const adjusted=await run('-i input.json -clean gap-width=0 snap-interval=0.0000000001 -clip parent.json',{'input.json':fc(features.filter(f=>changed.has(f.properties.adcode))),'parent.json':city});
  const byCode=new Map(adjusted.features.map(f=>[f.properties.adcode,f]));
  let result=features.map(f=>byCode.get(f.properties.adcode)||f);
  const children=result.filter(f=>f.properties.parentCity===440300);
  const gaps=await run('-i parent.json -erase children.json',{'parent.json':city,'children.json':fc(children)});
  const canonicalDistance=segmentDistanceIndex([canonicalHongKongBorder(hongKong)]);
  const neighbors=children.map(f=>({feature:f,distance:segmentDistanceIndex(polygons(f.geometry).flat())}));
  const additions=[];
  for(const poly of gaps.features.flatMap(f=>f.geometry?polygons(f.geometry):[])){
    if(!poly[0].some(p=>canonicalDistance(p)<.01))continue;
    const adjacent=new Set();
    for(let i=1;i<poly[0].length;i++){
      const a=poly[0][i-1],b=poly[0][i],p=[(a[0]+b[0])/2,(a[1]+b[1])/2];
      if(Math.hypot((a[0]-b[0])*102800,(a[1]-b[1])*111200)<.001)continue;
      for(const n of neighbors)if(n.distance(p)<.01)adjacent.add(n.feature);
    }
    assert.equal(adjacent.size,1,'A border sliver has ambiguous district ownership');
    const owner=[...adjacent][0];assert(changed.has(owner.properties.adcode));
    additions.push({type:'Feature',properties:owner.properties,geometry:{type:'Polygon',coordinates:poly}});
  }
  for(const code of new Set(additions.map(f=>f.properties.adcode))){
    const original=result.find(f=>f.properties.adcode===code);
    const union=await run('-i input.json -dissolve',{'input.json':fc([original,...additions.filter(f=>f.properties.adcode===code)])});
    assert.equal(union.features.length,1);
    result=result.map(f=>f===original?{...f,geometry:union.features[0].geometry}:f);
  }
  return {features:result,filledBorderSlivers:additions.length};
}
