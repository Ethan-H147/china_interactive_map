import assert from 'node:assert/strict';

// The historical source cut Chukotka and Wrangel Island at 180°, with
// projection offsets on either side. Join only those paired cut edges.
export function stitchSovietDateLine(regions){
 const russian=regions.features.find(f=>f.properties.id==='SU-RU');
 const polygons=russian.geometry.type==='Polygon'?[russian.geometry.coordinates]:russian.geometry.coordinates;
 const cuts=[];
 for(const polygon of polygons)for(const ring of polygon){
  const count=ring.length-1,cut=Array.from({length:count},(_,i)=>{const a=ring[i],b=ring[(i+1)%count];return Math.abs(a[0]-180)<.01&&Math.abs(b[0]-180)<.01&&Math.abs(a[1]-b[1])>.1;});
  for(let i=0;i<count;i++)if(cut[i]&&!cut[(i+count-1)%count]){
   const indices=[i];let next=i;
   do{next=(next+1)%count;indices.push(next);}while(cut[next]&&next!==i);
   const ends=[ring[indices[0]],ring[indices.at(-1)]].sort((a,b)=>a[1]-b[1]);
   cuts.push({ring,indices,ends});
  }
 }
 assert.equal(cuts.length,4,'Two paired historical date-line cuts');
 const pending=new Set(cuts);
 while(pending.size){
  const a=pending.values().next().value;pending.delete(a);
  const matches=[...pending].filter(b=>a.ends.every((p,i)=>Math.abs(p[1]-b.ends[i][1])<.01));
  assert.equal(matches.length,1,'Each cut has one matching shore-to-shore edge');
  const b=matches[0];pending.delete(b);
  for(let i=0;i<2;i++){const latitude=Math.round((a.ends[i][1]+b.ends[i][1])/2*1e6)/1e6;a.ends[i][1]=b.ends[i][1]=latitude;}
  for(const c of [a,b]){for(const i of c.indices)c.ring[i][0]=180;c.ring[c.ring.length-1]=[...c.ring[0]];}
 }
 return regions;
}
