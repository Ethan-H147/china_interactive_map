import {polygons,landIndex} from './geo-index.mjs';
const signedArea=ring=>ring.slice(1).reduce((sum,p,i)=>sum+ring[i][0]*p[1]-p[0]*ring[i][1],0)/2;
const box=ring=>ring.reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]);
export function normalizeCensusRings(geometry){
 const parts=polygons(geometry).map(rings=>({rings:rings.map(r=>r.slice()),area:signedArea(rings[0]),bounds:box(rings[0])})),removed=new Set();let repaired=0;
 // This service retains Esri winding: clockwise exteriors, counterclockwise holes.
 // Some holes arrive as separate MultiPolygon components. Attach only enclosed,
 // oppositely wound components; do not turn an independent island into a hole.
 for(const child of parts.filter(p=>p.area>0)){
  const candidates=parts.filter(p=>p.area<0&&Math.abs(p.area)>child.area&&child.bounds[0]>=p.bounds[0]&&child.bounds[1]>=p.bounds[1]&&child.bounds[2]<=p.bounds[2]&&child.bounds[3]<=p.bounds[3]).sort((a,b)=>Math.abs(a.area)-Math.abs(b.area));
  const parent=candidates.find(p=>{const inside=landIndex([p.rings[0]]);return child.rings[0].slice(0,-1).some(point=>inside(point));});
  if(!parent)continue;
  if(child.rings.length!==1)throw Error('Unexpected nested service component; review source geometry');
  parent.rings.push(child.rings[0]);removed.add(child);repaired++;
 }
 if(!repaired)return {geometry,repaired};
 const coordinates=parts.filter(p=>!removed.has(p)).map(p=>p.rings);
 return {geometry:coordinates.length===1?{type:'Polygon',coordinates:coordinates[0]}:{type:'MultiPolygon',coordinates},repaired};
}
