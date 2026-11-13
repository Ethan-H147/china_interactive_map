import {createRequire} from 'node:module';
import {fc,command} from './build-regional-dataset.mjs';
import {polygons,linesOf} from './geo-index.mjs';
import {bounds,box,overlay,dissolve,fillRegions,near} from './maine-border-fill.mjs';
const require=createRequire(import.meta.url),{topology}=require('topojson-server'),{feature}=require('topojson-client');
const line=coordinates=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}});
function realRuns(path){const parts=[];let run=[];for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],artificial=bounds.some((v,k)=>Math.abs(a[k%2]-v)<1e-7&&Math.abs(b[k%2]-v)<1e-7);if(artificial){if(run.length>1)parts.push(run);run=[];}else{if(!run.length)run.push(a);run.push(b);}}if(run.length>1)parts.push(run);return parts;}
export async function fillHistorical(data,configs,mask,oldPhysical,{neutral=false,reference}={}){
 const used=new Set(configs.flatMap(c=>c.face.flatMap((u,f)=>u>=0?[f]:[])));
 const positive=data.faces.features.filter(f=>f.properties.f>=0&&used.has(f.properties.f));
 const selected=positive.filter(f=>f.geometry&&near(f.geometry));
 if(!selected.length)return data;
 const local=await overlay(fc(selected),box,'clip');
 const oldLand=await overlay(oldPhysical,box,'clip');
 const remainder=await overlay(oldLand,await dissolve(local),'erase');
 const seeds=fc([...local.features.map(f=>({...f,properties:{id:String(f.properties.f)}})),...(neutral?remainder.features:[]).map(f=>({...f,properties:{id:'-1'}}))]);
 const dividers=fc([...data.arcs.features.filter(f=>!f.properties.coast),...(reference?.features||[])]);
 const filled=await fillRegions(seeds,dividers,mask);
 const assigned=filled.regions.features.filter(f=>f.properties.id!=='-1');
 const additions=await overlay(fc(assigned),mask,'clip');
 const merged=await command(fc([...selected.map(f=>({...f,properties:{id:String(f.properties.f)}})),...additions.features]),'-dissolve2 id',{precision:.0000001});
 const updated=new Map(merged.features.map(f=>[+f.properties.id,f.geometry]));
 data.faces.features=data.faces.features.map(f=>updated.has(f.properties.f)?{...f,geometry:updated.get(f.properties.f)}:f);
 const target=await dissolve(fc([...oldLand.features,...mask.features]));
 const inside=await overlay(fc(data.faces.features.filter(f=>used.has(f.properties.f)&&f.geometry&&near(f.geometry))),box,'clip');
 const missing=await overlay(target,await dissolve(inside),'erase');
 const mesh=topology({land:fc([...inside.features,...missing.features.map(f=>({...f,properties:{f:-1}}))])}),sides=new Map();
 for(const cell of mesh.objects.land.geometries)for(const a of new Set(cell.arcs.flat(Infinity).map(a=>a<0?~a:a))){if(!sides.has(a))sides.set(a,[]);sides.get(a).push(cell.properties.f);}
 let next=data.arcs.features.reduce((n,f,i)=>Math.max(n,f.properties.a??i),-1)+1;
 const added=[];
 for(const[a,owners]of sides){const[l,r=-1]=owners;const path=feature(mesh,{type:'LineString',arcs:[a]}).geometry.coordinates;for(const coordinates of realRuns(path))added.push({type:'Feature',properties:{a:next++,l,r,coast:owners.length===1,exact:true},geometry:{type:'LineString',coordinates}});}
 const oldArcs=data.arcs.features.map((f,i)=>({...f,properties:{...f.properties,a:f.properties.a??i}}));
 const nearby=[],outside=[];
 for(const f of oldArcs){const b=linesOf(fc([f])).flat().reduce((b,[x,y])=>[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)],[Infinity,Infinity,-Infinity,-Infinity]),hit=b[0]<=bounds[2]&&b[2]>=bounds[0]&&b[1]<=bounds[3]&&b[3]>=bounds[1];(hit?nearby:outside).push(f);}
 const cut=await overlay(fc(nearby),box,'erase');data.arcs={...data.arcs,features:[...outside,...cut.features,...added]};
 const available=new Set(data.arcs.features.map(f=>f.properties.a));
 if(data.configs)for(const c of data.configs){c.lines=c.lines.filter(a=>available.has(a));c.frontiers=c.frontiers.filter(a=>available.has(a));for(const{properties:p}of added){const l=c.face[p.l]??-1,r=c.face[p.r]??-1;if(l===r||l<0&&r<0)continue;(l<0||r<0||c.units[l].sovereign!==c.units[r].sovereign?c.frontiers:c.lines).push(p.a);}}
 if(data.water)data.water=await overlay(data.water,mask,'erase');
 if(neutral){const all=await dissolve(fc([...data.faces.features.filter(f=>f.properties.f===-1),...mask.features]));data.faces.features=[...all.features.map(f=>({...f,properties:{f:-1,sharedSource:true}})),...data.faces.features.filter(f=>f.properties.f!==-1)];}
 return data;
}
