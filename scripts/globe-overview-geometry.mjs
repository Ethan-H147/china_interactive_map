import {polygons} from './geo-index.mjs';
const ringArea=ring=>{const [x,y]=ring[0];let area=0;for(let i=1;i<ring.length;i++)area+=(ring[i-1][0]-x)*(ring[i][1]-y)-(ring[i][0]-x)*(ring[i-1][1]-y);return Math.abs(area)/2;};
function simplify(points,tolerance){
 const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]],limit=tolerance*tolerance;
 while(stack.length){const [start,end]=stack.pop(),a=points[start],b=points[end],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;let maximum=limit,index=-1;for(let i=start+1;i<end;i++){const p=points[i],u=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0,d=(p[0]-a[0]-u*dx)**2+(p[1]-a[1]-u*dy)**2;if(d>maximum){maximum=d;index=i;}}if(index>=0){keep.add(index);stack.push([start,index],[index,end]);}}
 const result=[...keep].sort((a,b)=>a-b).map(i=>points[i]);return result.length>=4||points[0][0]!==points.at(-1)[0]||points[0][1]!==points.at(-1)[1]?result:points;
}
export function overviewGeometry(geometry){const parts=polygons(geometry),largest=parts.reduce((best,p)=>ringArea(p[0])>ringArea(best[0])?p:best);const kept=parts.filter(p=>p===largest||ringArea(p[0])>=.0008).map(p=>p.map(r=>simplify(r,.006)));return {type:'MultiPolygon',coordinates:kept};}
