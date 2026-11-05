// Scoped geometry clipping used only while the Upper Peninsula historical
// correction is active. It never changes the retained historical source.
const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
export function lineRegion(paths,bounds,inside=false){
 const [w,s,e,n]=bounds,out=[];let run;
 for(const path of paths){run=null;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1];let lo=0,hi=1,hit=true;
  for(const [p,q]of [[-dx,a[0]-w],[dx,e-a[0]],[-dy,a[1]-s],[dy,n-a[1]]]){if(p===0){if(q<0){hit=false;break;}}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi){hit=false;break;}}}
  const ranges=inside?(hit?[[lo,hi]]:[]):!hit?[[0,1]]:[[0,lo],[hi,1]];
  for(const [x,y]of ranges){if(y-x<1e-12)continue;const p=[a[0]+dx*x,a[1]+dy*x],q=[a[0]+dx*y,a[1]+dy*y];if(!run||!same(run.at(-1),p))out.push(run=[p]);run.push(q);}if(!ranges.length||ranges.at(-1)?.[1]!==1)run=null;
 }}return out;
}
