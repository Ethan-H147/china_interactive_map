// Historical political ownership is resolved on existing precise atlas land.
// All periods, including the Soviet republics, share one referenced partition.
import fs from 'node:fs';
import {resolvePhysicalLand,referenceTopology} from './russia-history-geometry.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=path.resolve(process.env.ATLAS_ROOT||'.');
const output=path.resolve(process.env.RUSSIA_HISTORY_OUTPUT||'dist/data/russia/history');
const retained=path.resolve(process.env.RUSSIA_HISTORY_SOURCE||'scripts/boundary-sources/russia-history/cliopatria.geojson.gz');
const runtime=process.env.RUSSIA_HISTORY_RUNTIME||path.join(root,'dist/russia-history.mjs');
const require=createRequire(path.join(root,'package.json'));
const mapshaper=require('mapshaper'),{topology}=require('topojson-server'),{feature}=require('topojson-client');
const {decodeData,encodeGeo}=await import(pathToFileURL(path.join(root,'dist/geo-pack.mjs')));
const {landIndex,polygons}=await import(pathToFileURL(path.join(root,'scripts/geo-index.mjs')));
const {geographicAreaKm2:area}=await import(pathToFileURL(path.join(root,'scripts/geographic-area.mjs')));
const {russiaPeriods}=await import(pathToFileURL(runtime));
const {sovietFlags}=await import(pathToFileURL(path.join(root,'dist/soviet-flags.mjs')));
const fc=features=>({type:'FeatureCollection',features});
const read=file=>decodeData(fs.readFileSync(path.join(root,'dist/data',file)));
const json=file=>JSON.parse(fs.readFileSync(file));
const command=async(data,cmd)=>{
 const inputs=Object.fromEntries(Object.entries(data.type?{'in.json':data}:data).map(([key,value])=>[key,JSON.stringify(value)]));
 const result=await mapshaper.applyCommands('-i '+Object.keys(inputs)[0]+' '+cmd+' -o out.json format=geojson geojson-type=FeatureCollection precision=.0000001',inputs);
 return JSON.parse(result['out.json']);
};
const unwrap=g=>{const p=structuredClone(g);const visit=v=>{if(typeof v[0]==='number'){if(v[0]<-100)v[0]+=360;}else v.forEach(visit);};visit(p.coordinates);return p;};
const bounds=g=>{const b=[Infinity,Infinity,-Infinity,-Infinity];for(const polygon of polygons(g))for(const [x,y]of polygon[0]){b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}return [[b[0],b[1]],[b[2],b[3]]];};
const retainedBytes=fs.readFileSync(retained);
const clio=JSON.parse((retained.endsWith('.gz')?gunzipSync(retainedBytes):retainedBytes).toString()).features;
const finland=(await read('europe/finland/first.bin')).regions;
function lookup(name,year){const f=clio.find(f=>f.properties.Name===name&&f.properties.FromYear<=year&&f.properties.ToYear>=year);assert(f,name+' in '+year);return f;}
const rows=russiaPeriods.filter(([year])=>year<1956),extents=[],frames=[];
for(const [year,state,title,note]of rows){
 const sourceYear=year===1478?1482:year===1485?1487:year===1648?1653:year===1922?1924:year===1945?1953:year===1914||year===1917?1913:year;
 const name=year<1294?"Kievan Rus'":year<1547?'Grand Principality of Moscow':year<1721?'Tsardom of Russia':year<=1917?'Russian Empire':'Union of Soviet Socialist Republics';
 const specs=[{name,year:sourceYear,id:'main',title:state,kind:'core',type:year<1547?'Principality':year<1721?'Tsardom':year<=1917?'Empire':'Soviet state'}];
 if(year>=1380&&year<=1505){for(const [name,id,title]of [['Novgorod Republic','novgorod','Novgorod Republic'],['Tver','tver','Principality of Tver'],['Pskov Republic','pskov','Pskov Republic'],['Ryazan','ryazan','Principality of Ryazan']]){if(id==='novgorod'&&year>=1478||id==='tver'&&year>=1485)continue;const f=clio.find(f=>f.properties.Name===name&&f.properties.FromYear<=year&&f.properties.ToYear>=year);if(f)specs.push({name,year,id,title,kind:'related',type:'Independent Rus’ polity'});}}
 if(year===1237){
  specs[0]={name:'Principality of Rostov-Suzdal',year,id:'main',title:'Vladimir-Suzdal',kind:'core',type:'Rus’ principality'};
  for(const [name,id,title]of [
   ['Novgorod Republic','novgorod','Novgorod Republic'],['Principality of Kiev','kyiv','Principality of Kyiv'],
   ['Principality of Chernigov','chernihiv','Principality of Chernihiv'],['Principality of Galicia-Volhynia','galicia-volhynia','Galicia-Volhynia'],
   ['Principality of Turov and Pinsk','turov-pinsk','Turov and Pinsk'],['Principality of Smolensk','smolensk','Principality of Smolensk'],
   ['Principality of Polotsky','polotsk','Principality of Polotsk'],['Principality of Pereyaslavl','pereiaslav','Principality of Pereiaslav'],
   ['Principality of Ryazan','ryazan','Principality of Ryazan']
  ])specs.push({name,year,id,title,kind:'related',type:'Rus’ principality'});
 }

 if(year>=1873&&year<=1917)specs.push(
  {name:'Emirate of Bukhara',year:1867,id:'bukhara',title:'Emirate of Bukhara',kind:'protectorate',type:'Protectorate'},
  {name:'Khanate of Khiva',year:1872,id:'khiva',title:'Khanate of Khiva',kind:'protectorate',type:'Protectorate'});
 if(year===1922)specs.push(
  {name:'Emirate of Bukhara',year:1867,id:'bukhara',title:'Bukharan People’s Soviet Republic',kind:'related',type:'Allied Soviet republic'},
  {name:'Khanate of Khiva',year:1872,id:'khiva',title:'Khorezm People’s Soviet Republic',kind:'related',type:'Allied Soviet republic'});
 const indices=[];
 for(const spec of specs){
  const source=lookup(spec.name,spec.year),id=extents.length;indices.push(id);
  extents.push({type:'Feature',properties:{id},geometry:unwrap(source.geometry)});
  if(spec.id==='main'&&year>=1809&&year<=1917){
   for(const f of finland.features)extents.push({type:'Feature',properties:{id},geometry:f.geometry});
  }
  if(year===1812&&spec.id==='main')extents.push({type:'Feature',properties:{id},geometry:unwrap(lookup('Russian Empire',1811).geometry)});
  Object.assign(spec,{source:source.properties,index:id,note:year===1922&&spec.id!=='main'?'An allied Soviet republic outside the four founding union republics in December 1922. Its approximate extent reuses the earlier Bukhara or Khiva reference.':spec.kind==='protectorate'?'A subordinate protectorate, not a directly annexed province. Its extent is generalized from the last independent source outline.':note});
 }
 frames.push({year,state,title,note,specs,indices});
}
console.log('Preparing',extents.length,'retained extents for',frames.length,'milestones');
const groups=new Map();for(const f of extents){const id=f.properties.id;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(f);}
const combined=[];for(const group of groups.values())combined.push(...(group.length>1?(await command(fc(group),'-clean -dissolve2 id')).features:group));
const romania=(await read('europe/romania/first.bin')).regions;
const samarkand=fc((await read('europe/uzbekistan/first.bin')).regions.features.filter(f=>f.properties.id==='UZ18'));
assert.equal(samarkand.features.length,1,'Reuse the existing Samarkand province reference');
for(const frame of frames){
 const index=combined.findIndex(f=>f.properties.id===frame.indices[0]);
 if(frame.year>=1809&&frame.year<=1917){
  let primary=fc([combined[index]]);
  if(frame.year===1809){
   // The raw map includes the occupied Ottoman frontier before the 1812 cession.
   // Remove only new land in this review window; earlier Russian land stays exact.
   const window=fc([{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[24,43],[33,43],[33,51],[24,51],[24,43]]]}}]);
   const prior=fc([{type:'Feature',properties:{},geometry:unwrap(lookup('Russian Empire',1795).geometry)}]);
   const occupation=await command({'now.json':primary,'window.json':window,'prior.json':prior},'-clip window.json -erase prior.json');
   primary=await command({'now.json':primary,'occupation.json':occupation},'-erase occupation.json');
  }
  // Romanian land was occupied in several wars, rather than annexed to Russia.
  primary=await command({'now.json':primary,'romania.json':romania},'-erase romania.json -dissolve2 id');
  combined[index]=primary.features[0];
 }
 if(frame.year===1866||frame.year===1867){
  // Cliopatria anticipates Samarkand's 1868 conquest. Scope the correction to
  // the atlas's existing province; the rest of Russian Turkestan is retained.
  combined[index]=(await command({'now.json':fc([combined[index]]),'samarkand.json':samarkand},'-erase samarkand.json')).features[0];
 }
}
// Soviet republics join the same ownership partition. Their original inland
// lines are retained, while their physical shore uses the same canonical land.
const sovietBase='europe/soviet-union-1988/';
const soviet=await read(sovietBase+'first.bin');
const catalogue=await read(sovietBase+'catalogue.bin'),statistics=await read(sovietBase+'statistics.json'),capitals=(await read(sovietBase+'capitals.json')).records;
const independent={'RU':'Russia','UA':'Ukraine','BY':'Belarus','UZ':'Uzbekistan','KZ':'Kazakhstan','GE':'Georgia','AZ':'Azerbaijan','LT':'Lithuania','MD':'Moldova','LV':'Latvia','KG':'Kyrgyzstan','TJ':'Tajikistan','AM':'Armenia','TM':'Turkmenistan','EE':'Estonia'};
const lateUnits=(year,note)=>catalogue.records.map(r=>{
 const st=statistics.regions['soviet-union-1988:'+r.id],capital=capitals.find(c=>c.parent===r.id);
 return {id:r.id,key:r.id,name:year===1991?independent[r.id.slice(3)]:r.en,local:year===1991?undefined:r.local,aliases:[...(r.aliases||[]),r.en,capital.en],type:year===1991?'Independent state':'Union republic',kind:year===1991?'independent':'republic',bounds:r.bounds,label:r.center,capital:year===1991&&r.id==='SU-KG'?'Bishkek':year===1991&&r.id==='SU-UA'?'Kyiv':capital.en,population:st.population.value,area:st.area.value,flag:sovietFlags['soviet-union-1988'].firstFlags[r.id],note:''};
});
const sovietIndices=new Map();for(const f of soviet.regions.features){const index=combined.length+1000;sovietIndices.set(f.properties.id,index);combined.push({...f,properties:{id:index}});}
for(const [year,state,title,note]of russiaPeriods.filter(([year])=>year>=1956)){
 const units=lateUnits(year,note),specs=units.map(u=>({...u,title:u.name,index:sovietIndices.get(u.id)}));
 frames.push({year,state,title,note,specs,indices:specs.map(s=>s.index),late:true});
}
const transfer=frames.find(f=>f.year===1867).indices[0];
combined.forEach(f=>{if(f.properties.id===transfer)f.geometry={type:'MultiPolygon',coordinates:polygons(f.geometry).filter(p=>p[0].every(([x])=>x<193))};});
const {merged,sources:geometrySources,sourcePaths,land:canonicalLand}=await resolvePhysicalLand({root,combined,frames,command,polygons,fc,landIndex});
// Russian America is a whole shared land reference, as in the US snapshots.
// The retained source determines when it is present; its rough Alaska coast
// and interior frontier are not used to cut a second version of that land.
const alaskaFile='europe/united-states/first.bin',alaskaSource=(await read(alaskaFile)).regions.features.find(f=>f.properties.id==='US-AK');
assert(alaskaSource,'Existing Alaska geometry');
const american=g=>polygons(g).some(p=>p[0].some(([x,y])=>x>195&&x<240&&y>50));
const alaskaSignature=frames.map(frame=>frame.specs.some(s=>s.id==='main'&&american(combined.find(f=>f.properties.id===s.index).geometry))?'main':'-').join('|');
const alaskaGeometry=unwrap(alaskaSource.geometry);
const alaskaInside=landIndex(polygons(alaskaGeometry).flat()),parts=[];
merged.features.forEach((f,face)=>polygons(f.geometry).forEach((polygon,part)=>{
 if(polygon[0].every(([x])=>x>=172))parts.push({type:'Feature',properties:{face,part,cell:parts.length},geometry:{type:'Polygon',coordinates:polygon}});
}));
const partPoints=new Map((await command(fc(parts),'-points inner')).features.filter(f=>f.geometry).map(f=>[f.properties.cell,f.geometry.coordinates]));
const americanParts=new Set(parts.flatMap((f,i)=>{
 const ring=f.geometry.coordinates[0],point=partPoints.get(i);
 return ring.some(([x])=>x>193)||ring.every(([x,y])=>x>=172&&y<55)||point&&alaskaInside(point)?[f.properties.face+':'+f.properties.part]:[];
}));
merged.features=merged.features.flatMap((f,face)=>{const coordinates=polygons(f.geometry).filter((_,part)=>!americanParts.has(face+':'+part));return coordinates.length?[{...f,geometry:{type:'MultiPolygon',coordinates}}]:[];});
merged.features.push({type:'Feature',properties:{signature:alaskaSignature},geometry:alaskaGeometry});
merged.features.forEach((f,i)=>f.properties.labelId=i);
const facePoints=new Map((await command(merged,'-points inner')).features.filter(f=>f.geometry).map(f=>[f.properties.labelId,f.geometry.coordinates]));
const signatures=merged.features.map(f=>f.properties.signature.split('|'));
const faceAreas=merged.features.map(f=>area(f.geometry));
const faceBounds=merged.features.map(f=>bounds(f.geometry));
const faces=fc(merged.features.map((f,id)=>({...f,properties:{id}})));
const top=topology({faces}),owners=new Map();
for(const [i,g]of top.objects.faces.geometries.entries())for(const a of new Set(g.arcs.flat(Infinity).map(a=>a<0?~a:a))){if(!owners.has(a))owners.set(a,[]);owners.get(a).push(i);}
assert([...owners.values()].every(ids=>ids.length<=2),'A chronology edge has at most two owners');
const edges=fc([...owners].map(([a,ids],id)=>({type:'Feature',properties:{id,l:ids[0],r:ids[1]??-1},geometry:feature(top,{type:'LineString',arcs:[a]}).geometry})));
const configs=[],years={},events={};
for(const [n,frame]of frames.entries()){
 const {year,state,title,note}=frame;
 const assignments=signatures.map((s,i)=>{
  const id=s[n];
  // New color denotes substantial territorial gain, not coastal digitizing noise.
  return id==='main'&&n&&year>=1547&&year<=1914&&s[n-1]==='-'&&faceAreas[i]>=250?'added':id;
 });
 const definitions=new Map(frame.specs.map(s=>[s.id,frame.late?{...s,name:s.title}:{id:s.id,key:s.id,name:s.title,type:s.type,kind:s.kind,note:s.note}]));
 definitions.set('added',{id:'added',key:'added',name:'Expansion, '+frames[n-1]?.year+'–'+year,type:'Territorial acquisition',kind:'added',note:'Land added since the preceding mapped milestone ('+frames[n-1]?.year+'). '+note});
 const active=[...new Set(assignments)].filter(id=>id!=='-');
 const units=active.map(id=>{
  const indices=assignments.flatMap((owner,i)=>owner===id?[i]:[]),largest=indices.reduce((a,b)=>faceAreas[b]>faceAreas[a]?b:a),boxes=indices.map(i=>faceBounds[i]);
  const label=facePoints.get(largest)||indices.map(i=>facePoints.get(i)).find(Boolean);assert(label,'An interior label for '+id+' in '+year);
  return {...definitions.get(id),bounds:[[Math.min(...boxes.map(b=>b[0][0])),Math.min(...boxes.map(b=>b[0][1]))],[Math.max(...boxes.map(b=>b[1][0])),Math.max(...boxes.map(b=>b[1][1]))]],label};
 });
 const byId=new Map(units.map((u,i)=>[u.id,i]));
 configs.push({units,face:assignments.map(id=>byId.get(id)??-1),partOf:{},shared:'chronology'});
 years[year]={date:year===1988?'1988-01-01':String(year).padStart(4,'0')+'-12-31',config:configs.length-1};
 events[year]=[{when:String(year),name:title,text:note}];
 console.log(year,units.length,'territories');
}
const hash=b=>createHash('sha256').update(b).digest('hex');
const sources={version:1,coverage:'Selected milestones from 882 through 1991. Earlier extents are approximate; related Rus’ states are distinct. The post-1917 map does not survey civil-war control. Soviet republic ownership and inland paths are reused for the explicit late-Soviet reference frames on the shared detailed atlas land.',sources:[
 {title:'Cliopatria v0.2.1, Seshat Global History Databank',url:'https://github.com/Seshat-Global-History-Databank/cliopatria/tree/v0.2.1',license:'CC BY 4.0',sha256:hash(fs.readFileSync(retained)),retained:'scripts/boundary-sources/russia-history/'+path.basename(retained),note:'Retained original polity geometries; selected date ranges and correction dates are recorded in the frame definitions.'},
 {title:'Russia: a country study, Federal Research Division, Library of Congress (1998)',url:'https://tile.loc.gov/storage-services/master/frd/frdcstdy/ru/russiacountrystu00curt/russiacountrystu00curt.pdf'},
 {title:'The Russian Discovery of Siberia, Library of Congress',url:'https://www.loc.gov/collections/meeting-of-frontiers/articles-and-essays/exploration/russian-discovery-of-siberia/'},
 {title:'Alaska Purchase treaty, National Archives',url:'https://www.archives.gov/education/lessons/alaska/purchase-treaty.html'},
 {title:'Dissolution of the USSR, US Department of State',url:'https://2001-2009.state.gov/r/pa/ho/time/pcw/108229.htm'},
 {title:'Existing MSU Soviet republic geometry, flags, capitals and 1989 census',url:'data/europe/soviet-union-1988/sources.json',license:'Research and other non-commercial use; MSU attribution retained',sha256:hash(fs.readFileSync(path.join(root,'dist/data',sovietBase+'first.bin')))}
 ],processing:'Detailed atlas first-level geometry supplies the physical land. Rough historical coasts are discarded in a coastal band; nearest inland ownership extends over canonical land within the same connected landmass. Detached islands without an inland core use retained ownership. The Sakhalin 50th-parallel frontier is preserved through the band. The source’s artificial 180-degree cut is resolved onto the connected Chukotka mainland when the retained extent reaches that cut. Exact atlas paths are stored as source-file, ring and vertex-run references. Only political lines and intersection vertices are stored locally. The world overview classifies physical coast versus inland frontier; its coordinates never enter the historical mesh. One topology resolves overlaps, and each date only changes ownership and color. 1478 uses the post-annexation 1482 source; 1485 uses 1487. The 1648 Pacific milestone uses the generalized 1653 source. Finland from 1809 reuses the existing Finnish land to repair omissions at the rough source coast; historical eastern extensions remain from Cliopatria. The 1812 extent unions the 1811 and 1812 sources to avoid treating French occupation of Moscow as a sovereign cession. 1867 removes Alaska from a source interval that ends in that year. The 1914 and 1917 references use the pre-war 1913 source. Protectorates reuse their last independent source outline and remain separately identified. 1922 uses the 1924 external outline after the Far Eastern Republic joined; Bukhara and Khorezm remain separately identified allied republics. The 1945 post-war reference uses the 1953 source to exclude occupation zones in Poland and Germany; small 1945–1953 frontier adjustments are generalized. Late Soviet frames reuse the original republic ownership and inland paths, resolved onto the same detailed physical land as the imperial frames. 1991 relabels the same republic reference as independent successor states.',frames:frames.map(f=>({year:f.year,sources:f.specs.map(s=>s.source).filter(Boolean)})),canonicalLand:{references:geometrySources}};
const sharedGeometry=referenceTopology(top,owners,geometrySources,sourcePaths);
const data={sharedGeometry,source:{name:'Cliopatria v0.2.1 and Boundary Atlas',firstDate:'0882-01-01',lastDate:'1991-12-31'},versions:[],years,events,configs,faces:fc([]),arcs:fc([]),borders:fc([]),sharedLand:true,external:{soviet:{file:'data/europe/soviet-union-1988/first.bin',catalogue:'data/europe/soviet-union-1988/catalogue.bin'}}};
fs.mkdirSync(output,{recursive:true});
sources.corrections=[
 'Russian America directly references the existing US Alaska land, using its present-day boundary as a generalized reference. The retained historical extent determines which milestones include it; the year-end 1867 frame excludes it.',
 'The 1237 frame uses the distinct retained Rus’ principalities rather than the source’s small remnant labelled Kievan Rus’. The artificial 180-degree source cut is resolved onto the connected Chukotka mainland.',
 'The 1809 Ottoman-frontier occupation is removed using the difference from the 1795 source within the Bessarabian review window. Bessarabia first enters the territorial reference at the 1812 stop.',
 'The existing Romanian land reference excludes temporary occupations from the imperial frames.',
 'Samarkand is removed from the 1866 and 1867 frames before its 1868 conquest. The correction uses the existing modern Samarkand province as an explicit generalized boundary proxy; Tashkent remains inside the empire.'
];
sources.canonicalReferences=geometrySources;
sources.sources.push(
 {title:'Uzbekistan Ministry of Foreign Affairs, history: Samarkand in 1868 and Khiva in 1873',url:'https://gov.uz/en/mfa/sections/view/14508'},
 {title:'Museum With No Frontiers, Treaty of Bucharest, 1812',url:'https://sharinghistory.museumwnf.org/database_item.php?id=object%3BAWE%3Brm%3B38%3Ben'}
);
const bytes=gzipSync(encodeGeo(data,{source:sources.sources[0].url},{scale:1e6}),{level:9});
fs.writeFileSync(path.join(output,'borders.bin'),bytes);fs.writeFileSync(path.join(output,'sources.json'),JSON.stringify(sources,null,2)+'\n');
console.log('Russia timeline:',Object.keys(years).length,'milestones,',faces.features.length,'shared faces,',edges.features.length,'shared edges,',bytes.length,'bytes; USSR geometry referenced, not copied.');
