import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readData} from './read-data.mjs';
import {lineIndex,polygons,landIndex,metres} from './geo-index.mjs';
const d=readData('display-boundaries.json'),refs=JSON.parse(fs.readFileSync('dist/data/remaining-seams.json')),drawn=lineIndex([...d.boundaries.province.coordinates,...d.boundaries.prefecture.coordinates]);
let checks=0;
for(const r of refs){
 const reference=d.subdivisions.features.find(f=>f.properties.adcode===r.reference),aligned=r.group==='province'?d.provinces.features.find(f=>f.properties.adcode===r.aligned):d.subdivisions.features.find(f=>f.properties.adcode===r.aligned),edge=lineIndex(polygons(aligned.geometry).flat()),aInside=landIndex(polygons(reference.geometry).flat()),bInside=landIndex(polygons(aligned.geometry).flat());
 for(let i=1;i<r.path.length;i++){
  const a=r.path[i-1],b=r.path[i],mid=a.map((v,j)=>(v+b[j])/2);assert(edge(mid)<.3,'Neighbor shares reference border');assert(drawn(mid)<.6,'No missing outline');checks++;
  if(metres(a,b)<50)continue;const c=Math.cos(mid[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],n=Math.hypot(dx,dy);
  for(const side of [-1,1]){const p=[mid[0]-dy/n*side*.00003/c,mid[1]+dx/n*side*.00003];assert.notEqual(aInside(p),bInside(p),'No gap or overlap along corrected border');}
 }
}
console.log(JSON.stringify({remainingSeamsVerified:true,sharedEdgeChecks:checks}));
