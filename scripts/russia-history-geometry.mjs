import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';

// The political source supplies ownership. The atlas supplies the physical
// land. Coarse historical coasts are discarded inside a coastal reconciliation
// band, then the nearest inland ownership is extended over the exact land.
export async function resolvePhysicalLand({root,combined,frames,command,polygons,fc,landIndex}){
 const require=createRequire(path.join(root,'package.json')),clip=require('polygon-clipping');
 const {decodeData}=await import(pathToFileURL(path.join(root,'dist/geo-pack.mjs')));
 const sourceFiles=['russia/first.bin',...['ukraine','belarus','moldova','estonia','latvia','lithuania','finland','poland','armenia','azerbaijan','georgia','kazakhstan','kyrgyzstan','tajikistan','turkmenistan','uzbekistan','romania','turkey','iran','sweden','norway','united-states'].map(c=>'europe/'+c+'/first.bin'),'china-mobile/provinces.bin','scoped/mongolia/mongolia-first.bin','scoped/korea/korea-first.bin','japan-boundaries.bin'];
 const sources=[],inputs=[],sourcePaths=[],hosts=[];
 const box=g=>{const b=[Infinity,Infinity,-Infinity,-Infinity];for(const p of polygons(g))for(const [x,y]of p[0]){b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}return b;};
 const inScope=([w,s,e,n])=>w<=238&&e>=15&&s<=86&&n>=29;
 for(const file of sourceFiles){
  const full=path.join(root,'dist/data',file);assert(fs.existsSync(full),'Canonical land file '+file);
  const bytes=fs.readFileSync(full),data=await decodeData(bytes),member=data.regions?'regions':data.first?'first':null;
  const collection=member?data[member]:data;
  assert(collection.features,'Canonical collection '+file);
  const paths=collection.features.flatMap(f=>polygons(f.geometry).flat());
  sourcePaths.push(paths);sources.push({file,member,sha256:createHash('sha256').update(bytes).digest('hex')});
  for(const f of collection.features){
   if(file.includes('united-states')&&f.properties.id!=='US-AK')continue;
   const host=hosts.length,hostPolygons=[];
   for(const polygon of polygons(f.geometry)){
   // Russia already stores its date-line paths eastward. Reuse American
   // vertices with an explicit longitude shift for Russian America.
   const shift=file.includes('united-states')?360:0;
   const coordinates=shift?polygon.map(r=>r.map(([x,y])=>[x+shift,y])):polygon;
   if(inScope(box({type:'Polygon',coordinates}))){hostPolygons.push(coordinates);inputs.push({type:'Feature',properties:{host},geometry:{type:'Polygon',coordinates}});}
   }
   if(hostPolygons.length)hosts.push({file,id:f.properties.id,box:box({type:'MultiPolygon',coordinates:hostPolygons}),inside:landIndex(hostPolygons.flat())});
  }
 }
 const sovietFile='europe/soviet-union-1988/first.bin',sovietBytes=fs.readFileSync(path.join(root,'dist/data',sovietFile)),sovietData=await decodeData(sovietBytes);
 sources.push({file:sovietFile,member:'regions',sha256:createHash('sha256').update(sovietBytes).digest('hex')});sourcePaths.push(sovietData.regions.features.flatMap(f=>polygons(f.geometry).flat()));
 const cache=process.env.RUSSIA_HISTORY_CACHE,cacheKey=createHash('sha256').update(JSON.stringify(['physical-v6-point-ids',sources,combined,frames.map(f=>[f.year,f.specs.map(s=>[s.id,s.index])])])).digest('hex');
 if(cache&&fs.existsSync(cache)){const stored=JSON.parse(gunzipSync(fs.readFileSync(cache)));if(stored.key===cacheKey){console.log('Reusing verified local physical partition');return {merged:stored.merged,sources,sourcePaths};}}
 console.log('Resolving exact physical land from',sources.length,'existing atlas files');
 const landFile=cache&&cache+'.land',landKey=createHash('sha256').update(JSON.stringify(['canonical-v1',sources])).digest('hex');
 let land;
 if(landFile&&fs.existsSync(landFile)){const stored=JSON.parse(gunzipSync(fs.readFileSync(landFile)));if(stored.key===landKey)land=stored.land;}
 if(!land){land=await command(fc(inputs),'-dissolve2 -clean gap-fill-area=0 -explode');if(landFile){fs.mkdirSync(path.dirname(landFile),{recursive:true});fs.writeFileSync(landFile,gzipSync(JSON.stringify({key:landKey,land}),{level:3}));}}
 const components=land.features.map((f,i)=>{f.properties={physical:i};return {id:i,box:box(f.geometry),inside:landIndex(polygons(f.geometry).flat())};});
 const componentGrid=new Map();for(const c of components)for(let x=Math.floor(c.box[0]/2);x<=Math.floor(c.box[2]/2);x++)for(let y=Math.floor(c.box[1]/2);y<=Math.floor(c.box[3]/2);y++){const k=x+','+y;if(!componentGrid.has(k))componentGrid.set(k,[]);componentGrid.get(k).push(c);}
 const physicalAt=point=>(componentGrid.get(Math.floor(point[0]/2)+','+Math.floor(point[1]/2))||[]).find(c=>c.inside(point))?.id;
 const hostGrid=new Map();for(const [i,h]of hosts.entries())for(let x=Math.floor(h.box[0]/2);x<=Math.floor(h.box[2]/2);x++)for(let y=Math.floor(h.box[1]/2);y<=Math.floor(h.box[3]/2);y++){const k=x+','+y;if(!hostGrid.has(k))hostGrid.set(k,[]);hostGrid.get(k).push(i);}
 const hostAt=point=>(hostGrid.get(Math.floor(point[0]/2)+','+Math.floor(point[1]/2))||[]).find(i=>hosts[i].inside(point));
 const republicCodes={russia:'RU',ukraine:'UA',belarus:'BY',moldova:'MD',estonia:'EE',latvia:'LV',lithuania:'LT',armenia:'AM',azerbaijan:'AZ',georgia:'GE',kazakhstan:'KZ',kyrgyzstan:'KG',tajikistan:'TJ',turkmenistan:'TM',uzbekistan:'UZ'};
 const republic=host=>{const file=hosts[host]?.file,country=file==='russia/first.bin'?'russia':/^europe\/([^/]+)\/first.bin$/.exec(file||'')?.[1];return republicCodes[country]&&'SU-'+republicCodes[country];};
 const sakhalin=physicalAt([142.9,51.5]);assert.notEqual(sakhalin,undefined,'Sakhalin is present in the canonical geometry');
 const mainland=physicalAt([174,66]);assert.notEqual(mainland,undefined,'The date-line mainland is present');
 const dateLineCuts=new Set(combined.filter(f=>polygons(f.geometry).some(p=>p[0].some(([x,y])=>Math.abs(x-180)<1e-7&&y>=62&&y<=74))).map(f=>f.properties.id));
 // The coarse world file is only a water/land classifier here. None of its
 // coordinates enter the historical mesh or the resolved map sources.
 const world=await decodeData(fs.readFileSync(path.join(root,'dist/data/world-land.bin')));
 const worldRings=world.features.flatMap(f=>polygons(f.geometry).flat()).map(r=>r.map(([x,y])=>[x<0?x+360:x,y]));
 const worldInside=landIndex(worldRings),rows=new Map(),scale=8;
 const add=(x,y)=>{for(let row=y-1;row<=y+1;row++){if(!rows.has(row))rows.set(row,new Set());for(let col=x-1;col<=x+1;col++)rows.get(row).add(col);}};
 for(const f of land.features)for(const polygon of polygons(f.geometry))for(const ring of polygon)for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  if(!length)continue;
  const p=[(a[0]+b[0])/2,(a[1]+b[1])/2],cos=Math.cos(p[1]*Math.PI/180),normal=[-dy/(length*cos)*.045,dx/length*.045];
  // A country boundary surrounded by land is not a physical coast. Leave
  // inland historical frontiers untouched by the coastal reconciliation.
  if(worldInside([p[0]+normal[0],p[1]+normal[1]])&&worldInside([p[0]-normal[0],p[1]-normal[1]]))continue;
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))*scale*2));
  for(let j=0;j<=steps;j++)add(Math.floor((a[0]+dx*j/steps)*scale),Math.floor((a[1]+dy*j/steps)*scale));
 }
 const strips=[];
 for(const [y,cols]of rows){const xs=[...cols].sort((a,b)=>a-b);for(let i=0;i<xs.length;){const start=xs[i++];while(i<xs.length&&xs[i]===xs[i-1]+1)i++;const w=start/scale,e=(xs[i-1]+1)/scale,s=y/scale,n=(y+1)/scale;strips.push({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}});}}
 const band=await command(fc(strips),'-dissolve2');
 const inland=await command({'land.json':land,'band.json':band},'-erase band.json');
 const masks=await command({'extents.json':fc(combined),'inland.json':inland},'-clip inland.json');
 const tests=new Map(combined.map(f=>[f.properties.id,landIndex(polygons(f.geometry).flat())]));
 const assignment=(frame,point,physical)=>[...frame.specs].reverse().find(s=>tests.get(s.index)?.(point)||s.id==='main'&&physical===mainland&&point[0]>180&&point[0]<192&&dateLineCuts.has(s.index))?.id||'-';
 const mosaic=await command(fc([...inland.features,...masks.features]),'-clean allow-overlaps gap-fill-area=0 -mosaic');
 mosaic.features.forEach((f,i)=>f.properties={cell:i});
 const points=(await command(mosaic,'-points inner')).features;
 const pointByCell=new Map(points.filter(f=>f.geometry).map(f=>[f.properties.cell,f.geometry.coordinates]));
 const inlandContains=landIndex(inland.features.flatMap(f=>polygons(f.geometry).flat()));
 const core=mosaic.features.flatMap((f,i)=>{
  const point=pointByCell.get(i);if(!point||!inlandContains(point))return [];
  const physical=physicalAt(point);if(physical===undefined)return [];
  const signature=frames.map(frame=>assignment(frame,point,physical)).join('|');
  return [{...f,properties:{signature,physical}}];
 });
 console.log('Inland ownership cells:',core.length);
 const nearestIndex=new Map(),cell=.25;
 core.forEach(({geometry,properties:{signature,physical}},f)=>{for(const polygon of polygons(geometry))for(const ring of polygon)for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i],segment={a,b,signature,f,physical};
  for(let x=Math.floor(Math.min(a[0],b[0])/cell)-1;x<=Math.floor(Math.max(a[0],b[0])/cell)+1;x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell)-1;y<=Math.floor(Math.max(a[1],b[1])/cell)+1;y++){const k=x+','+y;if(!nearestIndex.has(k))nearestIndex.set(k,[]);nearestIndex.get(k).push(segment);}
 }});
 const nearest=([x,y],physical)=>{
  let best=Infinity,owner,cos=Math.cos(y*Math.PI/180);const col=Math.floor(x/cell),row=Math.floor(y/cell);
  for(let radius=0;radius<=8&&!owner;radius++)for(let i=col-radius;i<=col+radius;i++)for(let j=row-radius;j<=row+radius;j++){
   if(radius&&Math.max(Math.abs(i-col),Math.abs(j-row))!==radius)continue;
   for(const {a,b,signature,physical:host}of nearestIndex.get(i+','+j)||[]){if(host!==physical)continue;const dx=(b[0]-a[0])*cos,dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*cos*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1))),distance=((x-a[0]-t*(b[0]-a[0]))*cos)**2+(y-a[1]-t*dy)**2;if(distance<best){best=distance;owner=signature;}}
  }
  const host=hostAt([x,y]);
  if(!owner&&host!==undefined){
   for(let radius=0;radius<=5;radius++)for(let i=col-radius;i<=col+radius;i++)for(let j=row-radius;j<=row+radius;j++){
    if(radius&&Math.max(Math.abs(i-col),Math.abs(j-row))!==radius)continue;
    for(const segment of nearestIndex.get(i+','+j)||[]){const {a,b,signature}=segment;if(!('host'in segment))segment.host=hostAt([(a[0]+b[0])/2,(a[1]+b[1])/2]);if(segment.host!==host)continue;const dx=(b[0]-a[0])*cos,dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*cos*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1))),distance=((x-a[0]-t*(b[0]-a[0]))*cos)**2+(y-a[1]-t*dy)**2;if(distance<best&&distance<(50/111.195)**2){best=distance;owner=signature;}}
   }
  }
  const signature=(owner||frames.map(frame=>assignment(frame,[x,y],physical)).join('|')).split('|');
  const late=republic(host);if(late)frames.forEach((frame,i)=>{if(frame.late)signature[i]=late;});
  // Preserve the retained source's actual 50th-parallel frontier through the
  // coastal band. Nearest ownership must not turn it into a staircase.
  if(physical===sakhalin)frames.forEach((frame,i)=>{if(frame.year>=1905&&frame.year<=1936)signature[i]=y>=50?'main':'-';});
  return signature.join('|');
 };
 const fringe=await command({'land.json':land,'band.json':band},'-clip band.json');
 let additions=[];
 const rectangle=([w,s,e,n])=>[[[w,s],[e,s],[e,n],[w,n],[w,s]]];
 const split=(polygon,physical)=>{
  const [w,s,e,n]=box({type:'Polygon',coordinates:polygon});
  if(physical===sakhalin&&s<50&&n>50){for(const b of [[w,s,e,50],[w,50,e,n]])for(const part of clip.intersection([polygon],[rectangle(b)]))split(part,physical);return;}
  if(Math.max(e-w,n-s)>.0625){const boxes=e-w>n-s?[[w,s,(w+e)/2,n],[(w+e)/2,s,e,n]]:[[w,s,e,(s+n)/2],[w,(s+n)/2,e,n]];for(const b of boxes)for(const part of clip.intersection([polygon],[rectangle(b)]))split(part,physical);return;}
  additions.push({type:'Feature',properties:{physical},geometry:{type:'Polygon',coordinates:polygon}});
 };
 const fringeFile=cache&&cache+'.fringe',fringeKey=landKey+'-band8-sakhalin50';
 let storedFringe;if(fringeFile&&fs.existsSync(fringeFile))storedFringe=JSON.parse(gunzipSync(fs.readFileSync(fringeFile)));
 if(storedFringe?.key===fringeKey)additions=storedFringe.additions;
 else{for(const f of fringe.features)for(const polygon of polygons(f.geometry))split(polygon,f.properties.physical);if(fringeFile)fs.writeFileSync(fringeFile,gzipSync(JSON.stringify({key:fringeKey,additions}),{level:3}));}
 console.log('Extending inland ownership over',additions.length,'exact coastal pieces');
 additions.forEach((f,i)=>f.properties.cell=i);
 const centres=(await command(fc(additions),'-points inner')).features;
 const centreByCell=new Map(centres.filter(f=>f.geometry).map(f=>[f.properties.cell,f.geometry.coordinates]));
 additions.forEach((f,i)=>f.properties={signature:centreByCell.has(i)?nearest(centreByCell.get(i),f.properties.physical):frames.map(()=>'-').join('|')});
 // Detached small islands can have no inland core. Their nearest canonical
 // mainland inherits ownership, while every island path remains untouched.
 const merged=await command(fc([...core,...additions]),'-dissolve2 signature');
 merged.features=merged.features.filter(f=>f.properties.signature.split('|').some(v=>v!=='-'));
 if(cache){fs.mkdirSync(path.dirname(cache),{recursive:true});fs.writeFileSync(cache,gzipSync(JSON.stringify({key:cacheKey,merged}),{level:3}));}
 return {merged,sources,sourcePaths,land};
}

// Store references to consecutive canonical vertices rather than copying a
// second coastline into the chronology asset. Only new political paths and
// overlay intersection points need local coordinates.
export function referenceTopology(top,owners,sources,sourcePaths){
 const key=p=>Math.round(p[0]*1e7)+','+Math.round(p[1]*1e7),lookup=new Map();
 sourcePaths.forEach((paths,source)=>paths.forEach((points,path)=>points.forEach((p,index)=>{
  const shift=sources[source].file.includes('united-states')?360:0,k=key([p[0]+shift,p[1]]);
  if(!lookup.has(k))lookup.set(k,[source,path,index,shift]);
 })));
 let shared=0,local=0;
 const arcs=top.arcs.map((points,a)=>{
  const runs=[];let pending=[];
  const flush=()=>{if(pending.length){runs.push({geometry:{type:'LineString',coordinates:pending}});local+=pending.length;pending=[];}};
  for(let i=0;i<points.length;){
   const ref=lookup.get(key(points[i]));
   if(!ref){pending.push(points[i++]);continue;}
   const [source,path,start,shift]=ref,canonical=sourcePaths[source][path];
   let length=1,step=0;
   for(const direction of [1,-1]){let count=1;while(i+count<points.length&&canonical[start+count*direction]&&key([canonical[start+count*direction][0]+shift,canonical[start+count*direction][1]])===key(points[i+count]))count++;if(count>length){length=count;step=direction;}}
   if(length===1)step=1;
   flush();runs.push({ref:[source,path,start,length,step,shift]});shared+=length;i+=length;
  }
  flush();const ids=owners.get(a)||[];return {l:ids[0],r:ids[1]??-1,runs};
 });
 console.log('Geometry references:',shared,'existing vertices;',local,'new political/intersection vertices');
 return {version:1,sources,arcs,faces:top.objects.faces.geometries.map(({type,arcs})=>({type,arcs})),sharedVertices:shared,localVertices:local};
}
