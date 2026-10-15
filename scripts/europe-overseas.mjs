// Land of the overseas territories, Crown Dependencies, French Southern Lands and Clipperton,
// from OpenStreetMap: coastline ways joined into island rings, and each territory's boundary
// relation (which includes territorial waters) as the polygon the land is clipped to.
import fs from 'node:fs';
import path from 'node:path';

const key=p=>p[0]+','+p[1];
const line=way=>way.geometry.map(p=>[p.lon,p.lat]);
export const signedArea=ring=>ring.slice(1).reduce((s,p,i)=>s+ring[i][0]*p[1]-p[0]*ring[i][1],0)/2;
function inside(p,ring){let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}

// Joins open lines end to end (by shared end points) into closed rings. Coastline ways keep
// their direction; boundary ways may run either way.
export function joinRings(lines){
 const pool=new Map(lines.filter(l=>l.length>1).map((l,i)=>[i,l])),byEnd=new Map();
 const add=(k,i)=>{if(!byEnd.has(k))byEnd.set(k,new Set());byEnd.get(k).add(i);};
 for(const [i,l] of pool){add(key(l[0]),i);add(key(l.at(-1)),i);}
 const take=i=>{const l=pool.get(i);pool.delete(i);byEnd.get(key(l[0]))?.delete(i);byEnd.get(key(l.at(-1)))?.delete(i);return l;};
 const rings=[],unclosed=[];
 while(pool.size){
  let ring=take(pool.keys().next().value);
  while(key(ring[0])!==key(ring.at(-1))){
   const next=byEnd.get(key(ring.at(-1)))?.values().next().value;if(next===undefined)break;
   let l=take(next);if(key(l[0])!==key(ring.at(-1)))l=l.slice().reverse();
   ring=ring.concat(l.slice(1));
  }
  (key(ring[0])===key(ring.at(-1))&&ring.length>=4?rings:unclosed).push(ring);
 }
 return {rings,unclosed};
}
// Exterior rings with the holes that fall inside them, as MultiPolygon coordinates.
function nest(outers,holes){
 const polys=outers.map(r=>[r]);
 for(const h of holes){const owner=polys.find(p=>inside(h[0],p[0]));if(owner)owner.push(h);}
 return polys;
}
// Coastline: land lies to the left of each way, so counter-clockwise rings are land and
// clockwise rings are water enclosed by land.
export function coastLand(ways,label){
 const {rings,unclosed}=joinRings(ways.filter(w=>w.tags?.natural==='coastline').map(line));
 if(unclosed.length)throw Error(`${label}: ${unclosed.length} coastline pieces do not close`);
 return nest(rings.filter(r=>signedArea(r)>0),rings.filter(r=>signedArea(r)<0));
}
// A boundary relation's polygon from its outer and inner member ways.
export function relationArea(relation,label){
 const part=role=>{const {rings,unclosed}=joinRings(relation.members.filter(m=>m.type==='way'&&m.role===role&&m.geometry).map(line));if(unclosed.length)throw Error(`${label}: ${role} boundary does not close`);return rings;};
 return nest(part('outer'),part('inner'));
}
export function readTerritory(source,name){
 const elements=JSON.parse(fs.readFileSync(path.join(source,'osm-territory-'+name+'.json'))).elements;
 const relation=elements.find(e=>e.type==='relation');if(!relation)throw Error(name+': no boundary relation');
 return {relation,coastline:elements.filter(e=>e.type==='way')};
}
