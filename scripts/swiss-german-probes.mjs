import {load,linesOf,metres} from './geo-index.mjs';
// Survey-edge normals sample the actual land on both sides, rather than only
// asking whether the border line itself exists in a render query.
export function swissGermanProbes(){const data=load('dist/data/europe/germany/international.bin'),probes=[];for(const path of linesOf({features:data.features.filter(f=>f.properties.pair==='CHE-DEU')}))for(let i=1;i<path.length;i+=3){const a=path[i-1],b=path[i],center=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(center[0]<8.3||center[0]>8.85||center[1]<47.6||metres(a,b)<2)continue;const c=Math.cos(center[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],length=Math.hypot(dx,dy),step=20/111195;probes.push({center,sides:[-1,1].map(s=>[center[0]-dy/length*step/c*s,center[1]+dx/length*step*s])});}return probes;}
