// China's province outlines come from one mesh that includes every outer edge. Coasts (and lake
// and river shores with no other province near) are hidden, so coasts are drawn only around the
// selected place. An outer edge stays when another province's outline lies within 1.5 km (a
// river or a gap between the sources) or an international line within 3 km (China draws its own
// frontier while open: countries.js ownFrontier); such stretches shorter than 1 km with coast at
// both ends are coast passing near a neighbour, and are hidden too. The pack and its validator
// share this rule. Returns hide(path): the indices of a line path's segments to leave unstroked.
import {load,polygons,metres,landIndex,lineIndex,linesOf} from './geo-index.mjs';
import {outlineIndex} from './channel-lines.mjs';

export const shoreFrontierFiles=['shared-context-borders.bin','russia/international.bin','atlas-frontiers.bin'];
export function chinaShore(display){
 const provinces=new Map(display.provinces.features.map(f=>[String(f.properties.adcode),f])),neighbour=outlineIndex(provinces,1500);
 const boxes=[...provinces].map(([id,f])=>{const rings=polygons(f.geometry).flat(),b=[Infinity,Infinity,-Infinity,-Infinity];for(const r of rings)for(const p of r){b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.max(b[2],p[0]);b[3]=Math.max(b[3],p[1]);}return {id,rings,b,index:null};});
 const provinceAt=p=>{for(const u of boxes){if(p[0]<u.b[0]||p[0]>u.b[2]||p[1]<u.b[1]||p[1]>u.b[3])continue;u.index??=landIndex(u.rings);if(u.index(p))return u.id;}return null;};
 const frontier=lineIndex(shoreFrontierFiles.flatMap(file=>{const c=load('dist/data/'+file);return linesOf(file==='atlas-frontiers.bin'?{features:c.features.filter(f=>(' '+f.properties.countries+' ').includes(' china '))}:c);}));
 // 0: two provinces on its sides; 1: outer edge that stays; 2: shore (the same province on both
 // sides is a narrow inlet).
 const kind=(a,b)=>{
  if(!metres(a,b))return 0;
  const m=[(a[0]+b[0])/2,(a[1]+b[1])/2],c=Math.cos(m[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],n=Math.hypot(dx,dy),step=30/111195;
  const [left,right]=[1,-1].map(s=>provinceAt([m[0]-dy/n*step*s/c,m[1]+dx/n*step*s]));if(left&&right)return left===right?2:0;
  return neighbour(m,left||right)===null&&frontier(m)>3000?2:1;
 };
 return path=>{
  const kinds=path.slice(1).map((b,i)=>kind(path[i],b)),hidden=[];
  for(let i=0;i<kinds.length;){
   if(kinds[i]!==1){if(kinds[i]===2)hidden.push(i);i++;continue;}
   let j=i,length=0;while(j<kinds.length&&kinds[j]===1){length+=metres(path[j],path[j+1]);j++;}
   if(length<1000&&(i===0||kinds[i-1]===2)&&(j===kinds.length||kinds[j]===2))for(let k=i;k<j;k++)hidden.push(k);
   i=j;
  }
  return hidden;
 };
}
