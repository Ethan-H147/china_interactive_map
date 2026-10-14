import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {gzipSync} from 'node:zlib';
import {lineData} from '../dist/adaptive-lines.mjs';
import {alignCountry,polygons} from './international-topology.mjs';
// Country outlines only: each country is one level-1 region. Subdivisions come later.
const require=createRequire(import.meta.url);
const mapshaper=require('mapshaper');
const source=path.resolve(process.argv[2]||'artifacts/europe-source'),out='dist/data/europe';
const read=n=>JSON.parse(fs.readFileSync(path.join(source,n))),fc=features=>({type:'FeatureCollection',features});
async function command(data,commands,files={}){const result=JSON.parse((await mapshaper.applyCommands('-i input.json '+commands+' -o result.json format=geojson precision=.000001',{'input.json':JSON.stringify(data),...Object.fromEntries(Object.entries(files).map(([k,v])=>[k,JSON.stringify(v)]))}))['result.json']);return result.type==='FeatureCollection'?result:result.type==='Feature'?fc([result]):fc((result.type==='GeometryCollection'?result.geometries:[result]).map(geometry=>({type:'Feature',properties:{},geometry})));}
function bounds(g){const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);};walk(g.coordinates);return [[b[0],b[1]],[b[2],b[3]]];}
function write(country,name,data){const dir=out+'/'+country;fs.mkdirSync(dir,{recursive:true});const bytes=gzipSync(JSON.stringify(data),{level:9});fs.writeFileSync(dir+'/'+name,bytes);return bytes.length;}
const metres=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111195;
const single=collection=>{const geometries=collection.features.map(f=>f.geometry).filter(Boolean);return {type:'MultiPolygon',coordinates:geometries.flatMap(polygons)};};

// Camera bounds frame the main territory; Spain's Canary Islands remain in the data.
const countries={
 'united-kingdom':{id:'GB',en:'United Kingdom',local:'',file:'gbr-countries-2024-bgc.geojson',camera:[[-8.7,49.85],[1.8,60.9]],coverage:'Great Britain and Northern Ireland with their islands: the four countries of the Office for National Statistics December 2024 boundaries, generalised to 20 m and clipped to the coastline. Crown Dependencies (Isle of Man, Jersey, Guernsey) and overseas territories are not part of the United Kingdom and are excluded.'},
 spain:{id:'ES',en:'Spain',local:'España',file:'esp-adm0.geojson',camera:[[-9.4,35.9],[4.4,43.8]],coverage:'Peninsular Spain, the Balearic and Canary Islands, Ceuta, Melilla and the minor North African territories, from the Instituto Geográfico Nacional outline published by geoBoundaries. Llívia takes its shape from the matching enclave in the French outline.'},
 france:{id:'FR',en:'France',local:'',file:'fra-adm1.geojson',camera:[[-5.2,41.3],[9.6,51.1]],coverage:'Metropolitan France and Corsica, dissolved from the IGN regions published by geoBoundaries. Overseas regions are not yet included.'},
 italy:{id:'IT',en:'Italy',local:'Italia',file:'ita-adm0.geojson',camera:[[6.6,35.5],[18.6,47.1]],coverage:'Italy with Sicily, Sardinia and the smaller islands, from the ISTAT outline published by geoBoundaries. San Marino and Vatican City remain enclaves.'}
};
const outlines={};
for(const [country,c] of Object.entries(countries)){
 const raw=fc(read(c.file).features.map(f=>({type:'Feature',properties:{},geometry:f.geometry})));
 const outline=await command(raw,'-dissolve -clean -simplify dp interval=.0003 planar keep-shapes -clean');
 outlines[country]=single(outline);
 console.log(country,'polygons',outlines[country].coordinates.length,'holes',outlines[country].coordinates.reduce((s,p)=>s+p.length-1,0));
}
// France is the reference for its frontiers with Spain and Italy: their border
// edges within the Pyrenees and Alpine corridors move onto France's line, and any
// remaining overlap is erased, so each pair shares exactly one edge.
const inBox=(w,s,e,n)=>(a,b)=>[a,b].every(p=>p[0]>=w&&p[0]<=e&&p[1]>=s&&p[1]<=n);
const france={type:'Feature',properties:{},geometry:outlines.france};
// Spain's Llívia is the hole in France near Puigcerdà; use that ring exactly.
const llivia=polygons(outlines.france).flatMap(p=>p.slice(1)).find(r=>{const b=bounds({type:'Polygon',coordinates:[r]});return b[0][0]>1.9&&b[1][0]<2.05&&b[0][1]>42.42&&b[1][1]<42.5;});
assert(llivia,'France has the Llívia enclave hole');
outlines.spain.coordinates=outlines.spain.coordinates.filter(p=>{const b=bounds({type:'Polygon',coordinates:p});return !(b[0][0]>1.9&&b[1][0]<2.05&&b[0][1]>42.42&&b[1][1]<42.5);});
const seamReports={};
for(const [country,allowed] of [['spain',inBox(-2,42.2,3.3,43.45)],['italy',inBox(6.5,43.7,7.8,46)]]){
 const result=alignCountry([{type:'Feature',properties:{country},geometry:outlines[country]}],france,allowed,3000);
 seamReports[country+'-france']=result.report;console.log('Aligned',country,'to France',result.report.changedEdges,'edges, max',Math.round(result.report.maxDisplacementMetres),'m');
 const erased=await command(fc(result.features),'-erase france.json -clean',{'france.json':fc([france])});
 outlines[country]=single(erased);
}
outlines.spain.coordinates.push([[...llivia].reverse()]);

// Land frontiers. An outline edge is a frontier when foreign land lies just beyond it:
// a point 100 m or 300 m outward falls inside a neighbouring country (another outline
// here, or a geoBoundaries outline used only for this test), and a Natural Earth 1:10m
// land boundary line passes within 4 km. Coastline has sea beyond it. Probing out to
// 600 m, and closing short gaps inland, tolerates neighbouring sources that sit apart.
const ne=read('ne-10m-land-boundaries.geojson').features.flatMap(f=>(f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates)).filter(line=>line.some(p=>p[0]>-20&&p[0]<25&&p[1]>25&&p[1]<62));
const grid=new Map(),cell=.05,reach=4000;
ne.forEach((line,l)=>{for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];for(let x=Math.floor(Math.min(a[0],b[0])/cell)-1;x<=Math.floor(Math.max(a[0],b[0])/cell)+1;x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell)-1;y<=Math.floor(Math.max(a[1],b[1])/cell)+1;y++){const k=x+','+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push([l,i]);}}});
// Distance to the nearest Natural Earth boundary line.
function frontierDistance(p){
 let best=Infinity;
 for(const [l,i] of grid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]){
  const line=ne[l],a=line[i-1],b=line[i],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1];
  const u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),d=metres(p,[a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])]);
  best=Math.min(best,d);
 }
 return best;
}
// Even-odd point-in-polygon, with edges bucketed by 0.01° latitude rows.
function landIndex(rings){
 const rows=new Map(),row=.01,box=[Infinity,Infinity,-Infinity,-Infinity];
 for(const ring of rings)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];box[0]=Math.min(box[0],a[0]);box[1]=Math.min(box[1],a[1]);box[2]=Math.max(box[2],a[0]);box[3]=Math.max(box[3],a[1]);if(a[1]===b[1])continue;for(let y=Math.floor(Math.min(a[1],b[1])/row);y<=Math.floor(Math.max(a[1],b[1])/row);y++){if(!rows.has(y))rows.set(y,[]);rows.get(y).push([a,b]);}}
 return p=>{if(p[0]<box[0]||p[0]>box[2]||p[1]<box[1]||p[1]>box[3])return false;let inside=false;for(const [a,b] of rows.get(Math.floor(p[1]/row))||[])if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;return inside;};
}
const rings=geometry=>polygons(geometry).flat();
// The Moroccan, Monégasque and Slovenian outlines include territorial waters, so a probe
// inside them counts only within 200 m of an OpenStreetMap land border way.
const maritime=new Set(['mar-adm0','mco-adm0','svn-adm2']);
const landWays=[];
for(const name of fs.readdirSync(source).filter(n=>n.startsWith('osm-relation-'))){
 const elements=read(name).elements,nodes=new Map(elements.filter(e=>e.type==='node').map(e=>[e.id,[e.lon,e.lat]]));
 for(const way of elements.filter(e=>e.type==='way')){const t=way.tags||{};if(t.admin_level==='2'&&t.maritime!=='yes'&&t.natural!=='coastline')landWays.push(way.nodes.map(id=>nodes.get(id)));}
}
const wayEdges=[],wayGrid=new Map();
for(const way of landWays)for(let i=1;i<way.length;i++){const a=way[i-1],b=way[i],k=wayEdges.push([a,b])-1;for(let x=Math.floor(Math.min(a[0],b[0])/cell)-1;x<=Math.floor(Math.max(a[0],b[0])/cell)+1;x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell)-1;y<=Math.floor(Math.max(a[1],b[1])/cell)+1;y++){const key=x+','+y;if(!wayGrid.has(key))wayGrid.set(key,[]);wayGrid.get(key).push(k);}}
function nearLandWay(p,limit=200){for(const k of wayGrid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]){const [a,b]=wayEdges[k],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));if(metres(p,[a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])])<=limit)return true;}return false;}
const neighbours=['prt-adm0','and-adm0','gib-adm0','mar-adm0','bel-adm2','lux-adm0','deu-adm0','che-adm0','mco-adm0','aut-adm0','svn-adm2','smr-adm0','vat-adm0','irl-adm1'].map(file=>({maritime:maritime.has(file),inside:landIndex(read('neighbour-'+file+'.geojson').features.flatMap(f=>rings(f.geometry)))}));
const atlasLand=Object.fromEntries(Object.entries(outlines).map(([country,g])=>[country,landIndex(rings(g))]));
const signedArea=ring=>ring.slice(1).reduce((s,p,i)=>s+ring[i][0]*p[1]-p[0]*ring[i][1],0);
function frontierPaths(country,exclude=()=>false){
 const foreign=[...neighbours,...Object.entries(atlasLand).filter(([c])=>c!==country).map(([,inside])=>({maritime:false,inside}))];
 const paths=[];
 for(const poly of polygons(outlines[country]))for(const [r,ring] of poly.entries()){
  const n=ring.length-1;if(n<3)continue;
  // Foreign side: outside an exterior ring, inside a hole.
  const side=(signedArea(ring)>0)===(r===0)?-1:1;
  const distance=ring.map(p=>frontierDistance(p)),onLandWay=ring.map(p=>nearLandWay(p));
  const flags=Array.from({length:n},(_,i)=>{
   const a=ring[i],b=ring[i+1];if(distance[i]>reach||distance[i+1]>reach)return false;
   const c=Math.cos((a[1]+b[1])*Math.PI/360),dx=(b[0]-a[0])*c,dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)return false;
   const m=[(a[0]+b[0])/2,(a[1]+b[1])/2],nx=-dy/len*side,ny=dx/len*side;
   const shoreSafe=onLandWay[i]&&onLandWay[i+1];
   return [100,300,600].some(d=>{const p=[m[0]+nx*d/111195/c,m[1]+ny*d/111195];return foreign.some(f=>(!f.maritime||shoreSafe)&&f.inside(p));});
  });
  if(!flags.some(Boolean))continue;
  // Close gaps of up to 3 km where neighbouring sources sit further apart or a river
  // meanders. A gap facing open sea (points 300 m, 600 m and 1.5 km beyond all belong
  // to no country, this one included) is coastline and stays open.
  const anyone=[...foreign.map(f=>f.inside),atlasLand[country]];
  const beyond=i=>{const a=ring[i],b=ring[i+1],c=Math.cos((a[1]+b[1])*Math.PI/360),dx=(b[0]-a[0])*c,dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)return true;return [300,600,1500].some(d=>{const p=[(a[0]+b[0])/2-dy/len*side*d/111195/c,(a[1]+b[1])/2+dx/len*side*d/111195];return anyone.some(inside=>inside(p));});};
  const start=flags.indexOf(true);
  for(let k=1;k<=n;k++){
   const i=(start+k)%n;if(flags[i])continue;
   const span=[];let length=0,j=i;while(!flags[j]&&length<=3000){span.push(j);length+=metres(ring[j],ring[j+1]);j=(j+1)%n;}
   if(length<=3000&&span.every(beyond))span.forEach(t=>flags[t]=true);
   k+=span.length-1;
  }
  for(let i=0;i<n;i++)if(flags[i]&&exclude(ring[i],ring[i+1]))flags[i]=false;
  if(flags.every(Boolean)){paths.push(ring.slice());continue;}
  const first=flags.indexOf(false);let current=null;
  for(let k=1;k<=n;k++){const i=(first+k)%n;if(flags[i]){if(!current){current=[ring[i]];paths.push(current);}current.push(ring[i+1]);}else current=null;}
 }
 // Open pieces under 1 km are shoreline beside a frontier's end (a harbour mole, a lough
 // shore), not a frontier of their own; enclave rings are kept whatever their size.
 return paths.filter(p=>metres(p[0],p.at(-1))<1||p.slice(1).reduce((t,q,i)=>t+metres(p[i],q),0)>=1000);
}
// Shared frontiers with France belong to France, so each edge is drawn once.
const franceEdges=[];for(const poly of polygons(outlines.france))for(const ring of poly)for(let i=1;i<ring.length;i++)franceEdges.push([ring[i-1],ring[i]]);
const fGrid=new Map();franceEdges.forEach(([a,b],i)=>{for(let x=Math.floor(Math.min(a[0],b[0])/cell);x<=Math.floor(Math.max(a[0],b[0])/cell);x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell);y<=Math.floor(Math.max(a[1],b[1])/cell);y++){const k=x+','+y;if(!fGrid.has(k))fGrid.set(k,[]);fGrid.get(k).push(i);}});
function nearFrance(p){for(const i of fGrid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]){const [a,b]=franceEdges[i],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));if(metres(p,[a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])])<2)return true;}return false;}
const sharedWithFrance=(a,b)=>nearFrance(a)&&nearFrance(b)&&nearFrance([(a[0]+b[0])/2,(a[1]+b[1])/2]);

const manifest=read('manifest.json');
const processing='Each national outline is dissolved from its source and simplified to about 33 m north-south. Spanish and Italian frontier edges within 3 km of the French outline are moved onto it and overlap is erased, so shared frontiers coincide. An outline edge is a land frontier when a point 100, 300 or 600 m beyond it lies inside a neighbouring country and a Natural Earth 1:10m land boundary line passes within 4 km. The Moroccan, Monégasque and Slovenian outlines include territorial waters, so edges facing them must also lie within 200 m of an OpenStreetMap land border way. Gaps of up to 3 km between frontier edges are closed unless they face open sea, and open pieces under 1 km are dropped. Neighbouring outlines (geoBoundaries) and the OpenStreetMap ways are used only for this test; none of their geometry is published. Each shared frontier is stored once (France holds its frontiers with Spain and Italy). Coastlines are not outlined. Area is a spherical polygon area rounded to 1 square kilometre.';
for(const [country,c] of Object.entries(countries)){
 const geometry=outlines[country],feature={type:'Feature',properties:{id:c.id},geometry};
 const [point]=(await command(fc([feature]),'-points inner')).features,[area]=(await command(fc([feature]),'-each "areaKm2=$.area/1000000"')).features;
 const records=[{id:c.id,parent:null,level:1,en:c.en,local:c.local||c.en,kind:'Country',center:point.geometry.coordinates,bounds:c.camera,areaKm2:Math.round(area.properties.areaKm2)}];
 write(country,'first.bin',{regions:fc([feature]),boundaries:fc([])});
 write(country,'context.bin',fc([{type:'Feature',properties:{country},geometry}]));
 write(country,'catalogue.bin',{records,chunks:{},counts:{1:1},levels:['Country']});
 const paths=frontierPaths(country,country==='spain'||country==='italy'?sharedWithFrance:()=>false);
 const length=paths.reduce((s,p)=>s+p.slice(1).reduce((t,q,i)=>t+metres(p[i],q),0),0);
 write(country,'international.bin',lineData(fc(paths.map(coordinates=>({type:'Feature',properties:{countries:[country]},geometry:{type:'LineString',coordinates}})))));
 const files=[c.file,'ne-10m-land-boundaries.geojson',...Object.keys(manifest.files).filter(n=>n.startsWith('neighbour-'))];
 fs.writeFileSync(out+'/'+country+'/sources.json',JSON.stringify({retrieved:manifest.retrieved,counts:{1:1},coverage:c.coverage,processing,frontierKm:Math.round(length/1000),seamReports:Object.fromEntries(Object.entries(seamReports).filter(([k])=>k.includes(country))),sources:files.map(n=>({file:n,...manifest.files[n]}))},null,2)+'\n');
 console.log(country,'area',records[0].areaKm2,'km²; land frontier',Math.round(length/1000),'km in',paths.length,'paths');
}
console.log('Europe outline build complete.');
