import assert from 'node:assert/strict';
import polygonClipping from 'polygon-clipping';
import fs from 'node:fs';
import {source} from './fetch-caucasus-gulf.mjs';
import {metres} from './geo-index.mjs';

export const khorBounds=[51.18,24.47,51.65,24.85];
export const khorPatch=[[[[51.18,24.47],[51.65,24.47],[51.65,24.85],[51.18,24.85],[51.18,24.47]]]];
export function khorReference(){
 const data=JSON.parse(source('qatar-khor-al-adaid-coast-osm.json'));
 const nodes=new Map(data.elements.filter(e=>e.type==='node').map(e=>[e.id,[e.lon,e.lat]]));
 const paths=data.elements.filter(e=>e.type==='way'&&e.tags?.natural==='coastline').map(w=>[...w.nodes]);
 for(let change=true;change;){change=false;outer:for(let i=0;i<paths.length;i++)for(let j=i+1;j<paths.length;j++){
  const a=paths[i],b=paths[j];if(a.at(-1)===b[0])a.push(...b.slice(1));else if(b.at(-1)===a[0])a.unshift(...b.slice(0,-1));else continue;
  paths.splice(j,1);change=true;break outer;
 }}
 const open=paths.filter(p=>p[0]!==p.at(-1));assert.equal(open.length,1,'Complete continuous inlet shoreline');
 const coast=open[0].map(id=>nodes.get(id)),land=JSON.parse(fs.readFileSync('scripts/boundary-sources/caucasus-gulf/qatar-khor-land-frontier.json')).path;
 assert(coast[0][1]<khorBounds[1]&&coast.at(-1)[1]>khorBounds[3],'Coast extends beyond both patch edges');
 const end=land[0],previous=land[1],dx=end[0]-previous[0],dy=end[1]-previous[1],hits=[];
 for(let i=1;i<coast.length;i++){
  const a=coast[i-1],b=coast[i],ex=b[0]-a[0],ey=b[1]-a[1],det=dx*ey-dy*ex;if(!det)continue;
  const x=a[0]-previous[0],y=a[1]-previous[1],t=(x*ey-y*ex)/det,u=(x*dy-y*dx)/det;
  if(u>=0&&u<=1){const p=[previous[0]+t*dx,previous[1]+t*dy],distance=metres(p,end);if(distance<500)hits.push({i,p,distance});}
 }
 assert.equal(hits.length,1,'Single local land-border intersection with the shoreline');
 const {i,p:intersection,distance}=hits[0],junction=intersection.map(x=>+x.toFixed(6)),border=[junction,...land.slice(1)];
 const ring=[...coast,[50.7,coast.at(-1)[1]],[50.7,24.4],[coast[0][0],24.4],coast[0]];
 const saudiRing=[...coast.slice(0,i),junction,...land.slice(1),[50.7,land.at(-1)[1]],[50.7,24.4],[coast[0][0],24.4],coast[0]];
 const mainland=polygonClipping.intersection([[ring]],khorPatch),saudi=polygonClipping.intersection([[saudiRing]],khorPatch);
 const islands=paths.filter(p=>p[0]===p.at(-1)).map(p=>[p.map(id=>nodes.get(id))]);
 return {coast,border,junction,endpointAdjustmentMetres:distance,mainland,saudi,qatar:polygonClipping.difference(mainland,saudi),islands,
  qatarCoast:[junction,...coast.slice(i)],saudiCoast:[...coast.slice(0,i),junction]};
}
