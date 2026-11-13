// Reuse the website's retained display geometry, names, facts, audio and artwork.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url));
const arg=name=>process.argv.find(a=>a.startsWith('--'+name+'='))?.split('=').slice(1).join('=');
const root=path.resolve(arg('atlas')||path.join(here,'../../..'));
const output=path.resolve(arg('output')||path.join(here,'../BoundaryAtlas.swiftpm/Sources/AtlasCore/Resources'));
const require=createRequire(root+'/package.json'),sharp=require('sharp');
const {default:earcut,flatten,deviation}=await import(pathToFileURL(root+'/node_modules/earcut/src/earcut.js'));
const {decodePack}=await import(pathToFileURL(root+'/dist/china-pack.mjs'));
const {withoutSegments}=await import(pathToFileURL(root+'/dist/adaptive-lines.mjs'));
const {placePronunciations}=await import(pathToFileURL(root+'/dist/place-pronunciations.mjs'));
const read=async f=>JSON.parse(await fs.readFile(root+'/dist/'+f));
const pack=decodePack(gunzipSync(await fs.readFile(root+'/dist/data/china-boundaries.pack.bin')));
const pop=await read('data/province-population.json');
const colors=await read('data/region-colors/china.json');
const regionalNames=(await read('data/region-names.json')).regions;
const app=await fs.readFile(root+'/dist/app.js','utf8');
const english=Function('return '+app.match(/const english=(\{[^;]+\});/)[1])();
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
const outputFiles=[];
async function write(file,data){await fs.mkdir(path.dirname(output+'/'+file),{recursive:true});await fs.writeFile(output+'/'+file,data);outputFiles.push(file);}
const fills=[],edges=new Map(),deviations=[];let subpixelDegeneracies=0;
// Recursively split triangle interiors as well as edges; a curved globe cannot
// faithfully display giant planar earcut triangles without this subdivision.
function triangle(a,b,c,region,depth=0){
 const pairs=[[a,b,c],[b,c,a],[c,a,b]],longest=pairs.reduce((v,p)=>Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1])>Math.hypot(v[0][0]-v[1][0],v[0][1]-v[1][1])?p:v);
 if(depth<16&&Math.hypot(longest[0][0]-longest[1][0],longest[0][1]-longest[1][1])>2){
  const [x,y,z]=longest,m=[(x[0]+y[0])/2,(x[1]+y[1])/2];triangle(x,m,z,region,depth+1);triangle(m,y,z,region,depth+1);return;
 }
 for(const p of [a,b,c])fills.push(p[0],p[1],region,0);
}
function mesh(poly,region,fallback){
 const flat=flatten(poly),indices=earcut(flat.vertices,flat.holes,flat.dimensions);
 const dev=deviation(flat.vertices,flat.holes,flat.dimensions,indices);
 if((!Number.isFinite(dev)||dev>=.01)&&fallback)return mesh(fallback,region);
 const ringArea=ring=>{const o=ring[0];let area=0;for(let i=1;i<ring.length;i++)area+=(ring[i-1][0]-o[0])*(ring[i][1]-o[1])-(ring[i][0]-o[0])*(ring[i-1][1]-o[1]);return Math.abs(area)/2;};
 if((!Number.isFinite(dev)||dev>=.01)&&poly.reduce((n,r)=>n+ringArea(r),0)<1e-7){subpixelDegeneracies++;return;}
 deviations.push(dev);
 assert(Number.isFinite(dev)&&dev<.01,'Triangulation lost area for region '+region+': '+dev);
 const point=i=>flat.vertices.slice(i*2,i*2+2);
 for(let i=0;i<indices.length;i+=3)triangle(point(indices[i]),point(indices[i+1]),point(indices[i+2]),region);
}
// Simplify the neutral world backdrop only. China retains the website overview's
// exact shared province coordinates and holes, including tiny offshore islands.
function simplify(ring,tolerance=.12){
 if(ring.length<5)return ring;
 const open=ring.slice(0,-1),keep=new Set([0,open.length-1]),stack=[[0,open.length-1]];
 while(stack.length){const [a,b]=stack.pop(),p=open[a],q=open[b],dx=q[0]-p[0],dy=q[1]-p[1],den=dx*dx+dy*dy;let max=tolerance*tolerance,at=-1;
  for(let i=a+1;i<b;i++){const t=den?Math.max(0,Math.min(1,((open[i][0]-p[0])*dx+(open[i][1]-p[1])*dy)/den)):0,d=(open[i][0]-p[0]-t*dx)**2+(open[i][1]-p[1]-t*dy)**2;if(d>max){max=d;at=i;}}
  if(at>=0){keep.add(at);stack.push([a,at],[at,b]);}
 }
 const result=[...keep].sort((a,b)=>a-b).map(i=>open[i]);return result.length>=3?[...result,result[0]]:ring;
}
const worldSource=JSON.parse(gunzipSync(await fs.readFile(root+'/dist/data/globe-overview-land.bin')));
const mapshaper=require('mapshaper');
const cleaned=await new Promise((resolve,reject)=>mapshaper.applyCommands('-i world.geojson -clean -o clean.geojson format=geojson',{'world.geojson':JSON.stringify(worldSource)},(error,out)=>error?reject(error):resolve(out)));
const world=JSON.parse(cleaned['clean.geojson']);
for(const feature of world.features)for(const polygon of polygons(feature.geometry)){
 // A polar polygon is not planar in longitude/latitude. Fan its coastline to
 // the pole instead of drawing a spurious triangle across the date line.
 if(polygon[0].every(p=>p[1]<-60)){
  const ring=simplify(polygon[0]);for(let i=1;i<ring.length;i++){
   const a=ring[i-1],b=[...ring[i]];while(b[0]-a[0]>180)b[0]-=360;while(b[0]-a[0]<-180)b[0]+=360;
   triangle(a,b,[(a[0]+b[0])/2,-90],0);
  }continue;
 }
 mesh(polygon.map(r=>simplify(r)),0,polygon);
}
const worldFloatCount=fills.length;
const regions=[];
const codeKey=p=>p.map(n=>n.toFixed(6)).join(',');
const provinceFeatures=pack.display.provinces.features;
for(const [i,feature]of provinceFeatures.entries()){
 const p=feature.properties,id=String(p.adcode),index=i+1,geometry=polygons(feature.geometry);
 const fragments=pack.fragments?.[id];
 for(const polygon of fragments?.coordinates?.length?fragments.coordinates:geometry)mesh(polygon,index);
 for(const polygon of geometry)for(const ring of polygon)for(let j=1;j<ring.length;j++){
  const a=ring[j-1],b=ring[j],ka=codeKey(a),kb=codeKey(b);if(ka===kb)continue;
  const key=[ka,kb].sort().join('|');if(!edges.has(key))edges.set(key,{a,b,owners:[]});edges.get(key).owners.push(index);
 }
 const record=pop.china[id],metrics=colors.records.find(r=>r.id===id)?.metrics||{};
 const facts=[];
 if(record)facts.push({label:'Population',value:record.total.toLocaleString('en-US'),detail:record.dateLabel.replaceAll(' · ',' — '),source:record.sourceUrl});
 if(metrics.populationDensity)facts.push({label:'Population density',value:Math.round(metrics.populationDensity.value).toLocaleString('en-US')+' / km²',detail:String(metrics.populationDensity.year),source:metrics.populationDensity.sourceUrl});
 if(metrics.gdp)facts.push({label:'GDP',value:'US$'+(metrics.gdp.value/1e9).toFixed(1)+' billion',detail:metrics.gdp.year+' estimate',source:metrics.gdp.sourceUrl});
 const en=regionalNames[id]?.en||english[id],local=p.name,audio=placePronunciations['china:'+id];assert(audio);
 const names=(regionalNames[id]?.regional||[]).map(n=>({language:n.lang,label:n.language,text:n.text}));
 const short=local.replace(/壮族自治区|壯族自治區|回族自治区|维吾尔自治区|維吾爾自治區|自治区|自治區|特别行政区|特別行政區|省|市/g,'');
 const aliases=[en,english[id],local,short,...names.map(n=>n.text),...(id==='810000'?['香港','香港特别行政区']:id==='820000'?['澳门','澳門','Macao','Macau']:id==='540000'?['Xizang','西藏']:id==='150000'?['Nei Mongol','内蒙古']:[])];
 const filename='Audio/'+id+'.mp3';await write(filename,await fs.readFile(root+'/dist/'+audio.src));
 const flag=id==='810000'?'Flags/hong-kong.png':id==='820000'?'Flags/macao.png':id==='710000'?'Flags/taiwan.png':null;
 regions.push({id,index,english:en,local,kind:['110000','120000','310000','500000'].includes(id)?'Municipality':['150000','450000','540000','640000','650000'].includes(id)?'Autonomous region':['810000','820000'].includes(id)?'Special administrative region':'Province',center:p.centroid||p.center,names,aliases,facts,audio:filename,flag,polygons:geometry});
}
assert.equal(regions.length,34);
for(const region of regions){const box=[Infinity,Infinity,-Infinity,-Infinity];for(const polygon of region.polygons)for(const ring of polygon)for(const [x,y]of ring){box[0]=Math.min(box[0],x);box[1]=Math.min(box[1],y);box[2]=Math.max(box[2],x);box[3]=Math.max(box[3],y);}region.hitArea=(box[2]-box[0])*(box[3]-box[1]);}
// Shared edges only: coastlines and water-only administrative limits are not stroked.
const visible=withoutSegments(pack.display.boundaries.province,pack.lineOmissions.province||[]),kept=new Set();
for(const line of visible.coordinates)for(let i=1;i<line.length;i++)kept.add([codeKey(line[i-1]),codeKey(line[i])].sort().join('|'));
const lines=[];for(const [key,edge]of edges){const owners=[...new Set(edge.owners)];if(owners.length<2||!kept.has(key))continue;lines.push(...edge.a,...edge.b,owners[0],owners[1],0,0);}
const f32=values=>{const b=Buffer.alloc(values.length*4);values.forEach((n,i)=>b.writeFloatLE(n,i*4));return b;};
function indexMesh(input){const vertexIndex=new Map(),vertices=[],indices=[];
for(let i=0;i<input.length;i+=4){const v=input.slice(i,i+4).map(Math.fround),key=v.slice(0,3).join(':');let index=vertexIndex.get(key);if(index===undefined){index=vertices.length/4;vertexIndex.set(key,index);vertices.push(...v);}indices.push(index);}return{vertices,indices};}
const background=indexMesh(fills.slice(0,worldFloatCount)),{vertices,indices}=indexMesh(fills.slice(worldFloatCount));
const worldIndices=Buffer.alloc(background.indices.length*4);background.indices.forEach((n,i)=>worldIndices.writeUInt32LE(n,i*4));
await write('Global/world-fills.bin',f32(background.vertices));await write('Global/world-indices.bin',worldIndices);
const u32=Buffer.alloc(indices.length*4);indices.forEach((n,i)=>u32.writeUInt32LE(n,i*4));
await write('Geometry/fills.bin',f32(vertices));await write('Geometry/indices.bin',u32);await write('Geometry/lines.bin',f32(lines));
const flags=[['china','vendor/flag-prc.svg'],['hong-kong','vendor/flag-hk.svg'],['macao','vendor/flag-mo.svg'],['taiwan','vendor/flag-roc.svg']];
const national=(await import(pathToFileURL(root+'/dist/national-flags.mjs'))).nationalFlagImages;
flags[0][1]=national['vendor/flag-prc.svg'].full;
// The website's national flag may be stored under its ISO key.
try{await fs.access(root+'/dist/'+flags[0][1]);}catch{const candidates=Object.entries(national).filter(([k,v])=>/flag-(cn|china)\./.test(k));assert(candidates.length);flags[0][1]=candidates[0][1].full;}
for(const [name,file]of flags)await write('Flags/'+name+'.png',await sharp(root+'/dist/'+file,{density:180}).resize({width:1200}).png().toBuffer());
for(const file of ['noto-sans-mongolian.ttf','noto-sans-mongolian-OFL.txt','noto-serif-tibetan.ttf','noto-serif-tibetan-OFL.txt'])await write('Fonts/'+file,await fs.readFile(root+'/dist/vendor/'+file));
const manifest={schemaVersion:1,id:'china',english:'China',local:'中国',flag:'Flags/china.png',singular:'province',plural:'Provincial divisions',center:[104,35],regions,background:{fills:'Global/world-fills.bin',indices:'Global/world-indices.bin',fillVertices:background.vertices.length/4,indexCount:background.indices.length},geometry:{fills:'Geometry/fills.bin',fillVertices:vertices.length/4,indices:'Geometry/indices.bin',indexCount:indices.length,lines:'Geometry/lines.bin',lineInstances:lines.length/8,vertexStride:16,lineStride:32},sources:[{title:'Boundary Atlas retained geography and source notes',url:'https://github.com/Ethan-H147/china_interactive_map'},{title:'2020 census: National Bureau of Statistics',url:'https://www.stats.gov.cn/english/PressRelease/202105/t20210510_1817188.html'},{title:'National flag artwork: Wikimedia Commons',url:'https://commons.wikimedia.org/wiki/File:Flag_of_the_People%27s_Republic_of_China.svg'},{title:'Regional names: retained Wikidata forms, CC0',url:'https://www.wikidata.org'},{title:'Noto fonts: SIL Open Font License',url:'https://openfontlicense.org'},{title:'AI pronunciation: ElevenLabs, Daniel',url:'https://elevenlabs.io'}]};
await write('Countries/china/catalogue.json',JSON.stringify(manifest));
await write('source-notes.json',JSON.stringify({geometry:'Website full China pack: 1e-7 degree coordinate precision. Neutral world cleaned and simplified to 0.12 degrees where triangulation retains area; native globe triangles subdivided to <=2 degrees. Only exact shared provincial edges are stroked.',scope:'Same 34 present-day provincial-level cards as the website. No historical data or lower administrative levels.',audio:regions.map(r=>{const p=placePronunciations['china:'+r.id];return{id:r.id,text:p.text,voice:p.voice,model:p.model,sha256:p.sha256,synthetic:true,reviewed:p.reviewed}})},null,2));
const inventory=[];for(const file of outputFiles){const b=await fs.readFile(output+'/'+file);inventory.push({file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}
await fs.writeFile(path.join(here,'../asset-inventory.json'),JSON.stringify({files:inventory,totalBytes:inventory.reduce((n,f)=>n+f.bytes,0),fillVertices:vertices.length/4,indices:'Geometry/indices.bin',indexCount:indices.length,lineInstances:lines.length/8,maxTriangulationDeviation:Math.max(...deviations),subpixelDegeneracies},null,2));
console.log('Exported',regions.length,'provinces;',fills.length/4,'vertices;',lines.length/8,'shared border segments;',inventory.reduce((n,f)=>n+f.bytes,0),'bytes');
