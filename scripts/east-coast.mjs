import assert from 'node:assert/strict';
import fs from 'node:fs';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {alignCountry,polygons} from './international-topology.mjs';
import {collection,run,area} from './pearl-coast.mjs';
export const eastTarget=f=>f.properties.provinceCode===310000||f.properties.adcode===330900;
export const eastChangedCodes=new Set([310113,310115,310116,310120,310151,330900]);
export const eastCoastMethod='Original directed OpenStreetMap coastlines define physical land without simplification. Only Shanghai and Zhoushan display coverage changes. Existing shared administrative edges and Chongming’s Shanghai/Jiangsu split remain fixed. Whole physical islands replace coarse components when one existing jurisdiction or an unambiguous official island checkpoint establishes ownership. Islands shared with other jurisdictions retain the existing administrative partition. Source bounding-box edges never become display shorelines.';
const inRing=([x,y],r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
export const contains=(f,p)=>polygons(f.geometry).some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));
const key=p=>p.join(','),edge=(a,b)=>[key(a),key(b)].sort().join('|');
export async function refineEastCoast(features,land){
  const targets=features.filter(eastTarget),mask=structuredClone(land);
  mask.features.forEach((f,id)=>f.properties={landId:id,physicalArea:area(f.geometry)});
  const mainland=mask.features.reduce((a,b)=>area(a.geometry)>area(b.geometry)?a:b);
  const top=topology({regions:collection(features)}),shared=mesh(top,top.objects.regions,(a,b)=>a!==b),junctions=new Set(shared.coordinates.flat().map(key));
  const targetEdges=new Set(targets.flatMap(f=>polygons(f.geometry).flatMap(p=>p.flatMap(r=>r.slice(1).map((b,i)=>edge(r[i],b))))));
  const aligned=alignCountry(features,mainland,(a,b)=>a[0]>120.601&&b[0]>120.601&&a[0]<123.599&&b[0]<123.599&&a[1]>29.301&&b[1]>29.301&&a[1]<31.42&&b[1]<31.42,2500,(a,b)=>targetEdges.has(edge(a,b))&&!junctions.has(key(a))&&!junctions.has(key(b)));
  const owners=new Map();
  for(const f of features.filter(f=>[310000,320000,330000].includes(f.properties.provinceCode))){
    const overlap=await run('-i land.json -clip city.json',{'land.json':mask,'city.json':f});
    for(const p of overlap.features){const id=p.properties.landId;if(id===mainland.properties.landId||area(p.geometry)<1e-13)continue;if(!owners.has(id))owners.set(id,[]);owners.get(id).push(f.properties.adcode);}
  }
  const catalogue=JSON.parse(fs.readFileSync(new URL('./additional-sources/east-coast/island-catalogue.json',import.meta.url))),matches=[];
  for(const entry of catalogue.entries){
    const p=mask.features.find(f=>contains(f,entry.point));if(!p||p.properties.landId===mainland.properties.landId)continue;
    const id=p.properties.landId,existing=owners.get(id)||[];
    // Catalogue confirms Zhoushan ownership but never changes another mapped
    // jurisdiction. A conflict is recorded for review instead of reassignment.
    if(existing.some(code=>code!==330900)){matches.push({...entry,landId:id,conflict:existing});continue;}
    owners.set(id,[330900]);matches.push({...entry,landId:id,added:!existing.length});
  }
  const oldByCode=new Map(features.map(f=>[f.properties.adcode,f])),changed=new Map(),report={method:eastCoastMethod,alignment:aligned.report,catalogueSource:{url:catalogue.url,pdfSha256:catalogue.pdfSha256},catalogueMatches:matches,regions:[]};
  for(const f of aligned.features.filter(eastTarget)){
    const old=oldByCode.get(f.properties.adcode),code=old.properties.adcode;
    const preservedMain=code===310151?polygons(old.geometry).filter(p=>p[0].some(c=>c[1]>31.6)):[];
    if(code===310151)assert.equal(preservedMain.length,1,'Ambiguous existing main Chongming component');
    const input=code===310151?{...f,geometry:{type:'MultiPolygon',coordinates:polygons(f.geometry).filter(p=>!p[0].some(c=>c[1]>31.6))}}:f;
    const clipped=await run('-i input.json -clip land.json',{'input.json':input,'land.json':mask});
    const mainChongming=mask.features.find(p=>contains(p,[121.50,31.73]));assert(mainChongming);
    const whole=mask.features.filter(p=>owners.get(p.properties.landId)?.length===1&&owners.get(p.properties.landId)[0]===code&&(code!==310151||p!==mainChongming));
    let refined=await run('-i input.json -dissolve2',{'input.json':collection([...clipped.features,...whole.map(p=>({...p,properties:old.properties})),...preservedMain.map(p=>({type:'Feature',properties:old.properties,geometry:{type:'Polygon',coordinates:p}}))])});
    const neighbors=collection(features.filter(g=>g.properties.adcode!==code&&[310000,320000,330000].includes(g.properties.provinceCode)));
    refined=await run('-i city.json -erase neighbors.json',{'city.json':refined,'neighbors.json':neighbors});
    assert.equal(refined.features.length,1,'Missing coastal region '+code);
    const next={...old,geometry:refined.features[0].geometry};changed.set(code,next);
    report.regions.push({adcode:code,oldParts:polygons(old.geometry).length,newParts:polygons(next.geometry).length,oldVertices:polygons(old.geometry).flat(2).length,newVertices:polygons(next.geometry).flat(2).length,wholeIslandIds:whole.map(p=>p.properties.landId)});
  }
  return {features:features.map(f=>changed.get(f.properties.adcode)||f),report};
}
