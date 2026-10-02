import fs from 'node:fs';
import assert from 'node:assert/strict';
import {readData} from './read-data.mjs';
const root=new URL('../dist/data/',import.meta.url);
const read=readData;
const {provinces,subdivisions,boundaries}=read('display-boundaries.json');
const manifest=read('manifest.json');
const sourceProvinces=read('provinces.json');
const supplementalTaiwan=read('taiwan-regions.json');
const supplementalXinjiang=read('xinjiang-additions.json');
const polygons=g=>g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
const key=p=>JSON.stringify(p);
const segment=(a,b)=>key(a)<key(b)?key(a)+'|'+key(b):key(b)+'|'+key(a);
function ringArea(r){let a=0;for(let i=1;i<r.length;i++)a+=(r[i-1][0]-r[0][0])*(r[i][1]-r[0][1])-(r[i][0]-r[0][0])*(r[i-1][1]-r[0][1]);return Math.abs(a/2);}
const area=g=>polygons(g).reduce((sum,p)=>sum+p.reduce((s,r,i)=>s+(i?-1:1)*ringArea(r),0),0);
function inRing(point,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const inPolygon=(point,rings)=>inRing(point,rings[0])&&!rings.slice(1).some(r=>inRing(point,r));
function retainedPart(part,geometry){const ring=part[0];for(let i=0;i<ring.length-2;i++){const point=[(ring[i][0]+ring[i+1][0]+ring[i+2][0])/3,(ring[i][1]+ring[i+1][1]+ring[i+2][1])/3];if(inPolygon(point,part)&&polygons(geometry).some(p=>inPolygon(point,p)))return true;}return false;}
const childrenByCode=new Map(subdivisions.features.map(f=>[f.properties.adcode,f]));
assert.equal(provinces.features.length,34);
assert.equal(childrenByCode.size,499);
const edgeOwners=new Map();
const provinceEdges=new Set();
let maxProvinceAreaChange=0,islandPartsChecked=0,overlappingPartsAssignedToNeighbor=0;
for(const entry of manifest.coverage){
  const f=provinces.features.find(f=>f.properties.adcode===entry.adcode);
  const original=sourceProvinces.features.find(f=>f.properties.adcode===entry.adcode);
  const sourceChildren=entry.adcode===710000?supplementalTaiwan.features:entry.unavailable?[original]:[...read(entry.adcode+'.json').features,...(entry.adcode===650000?supplementalXinjiang.features:[])];
  const children=subdivisions.features.filter(f=>f.properties.provinceCode===entry.adcode);
  assert.equal(children.length,sourceChildren.length,'Lost subdivisions: '+entry.adcode);
  for(const child of children)for(const p of polygons(child.geometry))for(const ring of p)for(let i=1;i<ring.length;i++){
    const edge=segment(ring[i-1],ring[i]);
    if(!edgeOwners.has(edge))edgeOwners.set(edge,[]);
    edgeOwners.get(edge).push({province:entry.adcode,code:child.properties.adcode});
  }
  for(const p of polygons(f.geometry))for(const ring of p){
    assert.deepEqual(ring[0],ring.at(-1),'Unclosed ring: '+entry.adcode);
    assert(ring.length>=4,'Degenerate ring: '+entry.adcode);
    for(let i=1;i<ring.length;i++)provinceEdges.add(segment(ring[i-1],ring[i]));
  }
  const childArea=children.reduce((s,c)=>s+area(c.geometry),0);
  assert(Math.abs(area(f.geometry)-childArea)<1e-7,'Province and subdivisions disagree: '+entry.adcode);
  const originalArea=sourceChildren.reduce((s,c)=>s+area(c.geometry),0);
  const change=Math.abs(area(f.geometry)-originalArea)/originalArea;
  maxProvinceAreaChange=Math.max(maxProvinceAreaChange,change);
  assert(change<0.005,'Excessive change in province coverage: '+entry.adcode);
  {
    assert.notDeepEqual(f.geometry,original.geometry,'Coarse geometry retained: '+entry.adcode);
    for(const originalChild of sourceChildren){
      const child=childrenByCode.get(originalChild.properties.adcode);
      assert(child.geometry,'Missing geometry: '+child.properties.adcode);
      for(const part of polygons(originalChild.geometry)){
        // Even small offshore islands must remain represented after border repair.
        if(!retainedPart(part,child.geometry)){
          assert(subdivisions.features.some(other=>retainedPart(part,other.geometry)),'Lost land polygon: '+child.properties.adcode);
          overlappingPartsAssignedToNeighbor++;
        }
        islandPartsChecked++;
      }
    }
  }
}
const drawnSegments=new Set();
for(const [name,geometry] of Object.entries(boundaries))for(const line of geometry.coordinates)for(let i=1;i<line.length;i++){
  if(key(line[i-1])===key(line[i]))continue;
  const s=segment(line[i-1],line[i]);
  assert(edgeOwners.has(s),'Boundary absent from display polygons: '+name);
  assert(!drawnSegments.has(s),'Boundary drawn more than once: '+name);
  if(name==='province')assert(provinceEdges.has(s),'Province line crosses its fill');
  drawnSegments.add(s);
}
for(const edge of provinceEdges)assert(drawnSegments.has(edge),'Province outline is incomplete');
const sharedProvinceEdges=[...edgeOwners.values()].filter(owners=>new Set(owners.map(o=>o.province)).size>1).length;
assert(sharedProvinceEdges>1000,'Shared province boundaries were not reconciled');
console.log(JSON.stringify({mergedProvinces:34,fallbackProvinces:0,subdivisions:499,islandPartsChecked,overlappingPartsAssignedToNeighbor,sharedProvinceEdges,uniqueBoundarySegments:drawnSegments.size,maxProvinceAreaChangePercent:maxProvinceAreaChange*100}));
