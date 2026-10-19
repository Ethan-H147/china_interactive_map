import assert from 'node:assert/strict';
import {load} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';

// Rural coverage is a reference estimate. Verified town polygons override it.
export async function southAfricaReferenceRegions(places,towns){
 const cosine=Math.cos(30*Math.PI/180),seeds=places.map(p=>({id:'ZA-PHONE-'+p.codes.join('-'),point:[p.center[0]*cosine,p.center[1]]}));
 const cells=seeds.map((seed,i)=>{
  let ring=[[15*cosine,-36],[34*cosine,-36],[34*cosine,-21],[15*cosine,-21]];
  for(let j=0;j<seeds.length&&ring.length;j++){
   if(i===j)continue;const other=seeds[j],a=other.point[0]-seed.point[0],b=other.point[1]-seed.point[1],c=(other.point[0]**2+other.point[1]**2-seed.point[0]**2-seed.point[1]**2)/2;
   assert(a||b,'Reference towns need distinct anchor points');const clipped=[];
   for(let k=0;k<ring.length;k++){const p=ring[k],q=ring[(k+1)%ring.length],dp=a*p[0]+b*p[1]-c,dq=a*q[0]+b*q[1]-c;if(dp<=0)clipped.push(p);if((dp<=0)!==(dq<=0)){const t=dp/(dp-dq);clipped.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}}ring=clipped;
  }
  assert(ring.length>=3);ring=ring.map(p=>[p[0]/cosine,p[1]]);ring.push(ring[0]);return {type:'Feature',properties:{id:seed.id},geometry:{type:'Polygon',coordinates:[ring]}};
 });
 const land=load('dist/data/southern-africa/south-africa/context.bin');
 const rural=await command({'cells.json':fc(cells),'towns.json':towns,'land.json':land},'-clean -erase towns.json -clip land.json');
 return command({'combined.json':fc([...rural.features,...towns.features]),'land.json':land},'-clean -dissolve2 id -clip land.json');
}
