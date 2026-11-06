import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import polygonClipping from 'polygon-clipping';
import {decodeData,encodeGeo} from '../dist/geo-pack.mjs';
import {command,fc,geographicBounds} from './build-regional-dataset.mjs';
import {landIndex} from './geo-index.mjs';
import {selectionLineData} from '../dist/outline-detail.mjs';
import {area,cleanFrontier,polygons} from './historic-mosaic.mjs';

const source='scripts/boundary-sources/china-history/';
const feature=(properties,geometry)=>({type:'Feature',properties,geometry});
const multi=coordinates=>({type:'MultiPolygon',coordinates});
const steps=14;
const tidy=value=>value.replaceAll("'",'’').replace(/\s+(Zhou|zhou|Fu|fu|Jun|jun|Jian|jian|Xian|Xain)\b/g,(_,suffix)=>suffix.toLowerCase());
const distinct=(value,other)=>[...new Set(value.filter(name=>name&&name!==other))];

export async function addChinaCircuits(file){
 const history=await decodeData(fs.readFileSync(file));
 // Reconcile the three face rings at the Qocho junction before they reach the tile
 // triangulator. The unassigned face reverses along a nearly zero-width spur.
 const corner=[92.702363,39.714493],south=[92.688119,39.662524],north=[92.731771,39.821824];
 const spike=[92.723099,39.790148];
 const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
 for(const [id,start,end,middle] of [[166,corner,south,[]],[351,south,north,[corner]],[355,north,corner,[]]]){
  const face=history.faces.features.find(f=>f.properties.f===id);
  for(const polygon of polygons(face.geometry)){
   const ring=polygon[0],i=ring.findIndex(p=>same(p,start)),j=ring.findIndex(p=>same(p,end));
   if(i>=0&&j>i)ring.splice(i+1,j-i-1,...middle);
  }
  if(id===166&&face.geometry.type==='MultiPolygon'){
   face.geometry.coordinates=face.geometry.coordinates.filter(([ring])=>!(ring.length===4&&same(ring[0],spike)));
  }
 }
 const definitions=JSON.parse(fs.readFileSync(source+'circuits.json','utf8').replace(/^\uFEFF/,''));
 const {prefectures,points}=JSON.parse(gunzipSync(fs.readFileSync(source+'tang-song-circuits.geojson.gz')));
 for(const [year,sourceYear,polity] of [[742,'742AD','tang'],[1100,'1102AD','song']]){
  const config=history.configs[history.years[year].config], period=definitions[year];
  const index=config.units.findIndex(unit=>unit.key===polity);
  assert(index>=0,year+' dynasty in mosaic');
  const land=await command(fc(history.faces.features.filter(f=>config.face[f.properties.f]===index)),'-dissolve');
  const mappedLand=history.faces.features.map(f=>landIndex(polygons(f.geometry).flat()));
  const landContains=land.features.map(f=>landIndex(polygons(f.geometry).flat()));
  const reference=fc(prefectures.filter(f=>f.properties.circuit.startsWith(sourceYear+':')).map(f=>{
   const key=f.properties.circuit.split(':')[1],spec=period.circuits[key];
   assert(spec,key+' circuit metadata');
   return feature({key,width:spec[3]||40},f.geometry);
  }));
  assert.equal(reference.features.length,Object.keys(period.circuits).length);

  // The outer envelope comes from reconstructed prefectures. Inset before clipping so
  // modern shoreline and county detail do not change the width of the historical fade.
  // Full nested contours avoid the narrow, touching holes of the old difference
  // rings. The renderer blends incremental alpha to reproduce the intended fade.
  const bands=[];
  let contours=new Map(reference.features.map(f=>[f.properties.key,polygons(f.geometry)]));
  let previous=0;
  for(let i=1;i<=steps;i++){
   if(i>1){
    const shrunk=await command(reference,`-buffer radius="-width*1000*${i-1}/${steps}" tolerance=220m quad-segs=5`,{precision:.0001});
    const inner=new Map(shrunk.features.filter(f=>f.geometry).map(f=>[f.properties.key,polygons(f.geometry)]));
    contours=new Map([...contours].filter(([key])=>inner.has(key)).map(([key,shape])=>[key,polygonClipping.intersection(shape,inner.get(key))]));
   }
   const t=(i-.5)/(steps-1),shade=i===steps?.28:+(.28*t*t*(3-2*t)).toFixed(4);
   const opacity=+(1-(1-shade)/(1-previous)).toFixed(6);
   previous=shade;
   for(const [key,shape] of contours)if(shape.length)bands.push(feature({key,step:i,opacity,shade},multi(shape)));
  }
  const coverage=(await command({'bands.json':fc(bands),'land.json':land},'-clip land.json -clean allow-overlaps rewind',{precision:.0001})).features.filter(f=>f.geometry);
  const byKey=Map.groupBy(coverage,f=>f.properties.key);
  const cores=await command(fc(coverage.filter(f=>f.properties.step===5)),'-dissolve key allow-overlaps -points inner',{precision:.0001});
  const centers=new Map(cores.features.filter(f=>f.geometry).map(f=>[f.properties.key,f.geometry.coordinates]));
  const circuits=Object.entries(period.circuits).map(([key,[name,local,seat,width,kind=period.type]])=>{
   const shapes=byKey.get(key);assert(shapes?.length&&centers.has(key),year+' mapped core for '+key);
   const id=year+'-circuit-'+name.toLowerCase().replaceAll(' ','-');
   for(const f of shapes){f.properties.id=id;delete f.properties.key;}
   const chapter=Object.entries(period.geographies||{}).find(([,prefixes])=>prefixes.some(prefix=>name.startsWith(prefix)))?.[0];
   return {id,key,en:name,local,kind,seat,center:centers.get(key),aliases:[key],bounds:geographicBounds(multi(shapes.flatMap(f=>polygons(f.geometry)))),
    statusNote:year===742?'Tang inspection circuit in 742. Shading shows its approximate extent.':'Northern Song '+(kind==='Capital district'?'capital district':'circuit')+' in 1100. Shading shows its approximate extent.',
    primary:chapter?period.primary.replace(/085$/,chapter):period.primary};
  });
  const records=new Map(circuits.map(c=>[c.key,c])),used=new Set(),municipalities=[];
  const vicinity=new Set(period.audit.vicinity),documentedCircuit=new Set(period.audit.circuit);
  const sourcePoints=points.filter(f=>f.properties.YEAR===sourceYear);
  const namesUsed=new Set();
  for(const {properties:{CountyID,ProvNAM,PrefNAM,CountyNAM},geometry:{coordinates:originalCenter}} of sourcePoints){
   const correction=period.audit.fixes[CountyID];
   const center=correction?.center||originalCenter;
   const circuit=records.get(correction?.circuit||ProvNAM);assert(circuit,ProvNAM+' city circuit');
   const nameKey=PrefNAM+'|'+CountyNAM,defined=period.cities[nameKey];
   if(defined)namesUsed.add(nameKey);
   const outside=!landContains.some(contains=>contains(center));
   // A recorded frontier seat can disagree with the coarse polity polygon. Show the
   // documented city as a point and let the card explain the conflicting reconstructions.
   if(outside&&(!(period.frontierSeats.includes(nameKey)||correction?.center)||!mappedLand.some(contains=>contains(center))))continue;
   if(used.has(center.join())||/Fort|tribes/i.test(CountyNAM))continue;
   used.add(center.join());
   // The gazetteer locates the seat, which often shared a name with its county.
   const seatName=period.seatNames[CountyID];
   const [chinese,romanized]=Array.isArray(seatName)?seatName:[seatName];
   const [en,local,modern,kind='Prefectural seat']=defined||[romanized||tidy(CountyNAM.replace(/\s+Xia[nm]$/i,'')),chinese];
   assert(local&&/^\p{Script=Han}+$/u.test(local),year+' Chinese city name for '+nameKey);
   const aliases=distinct([modern,CountyNAM,tidy(CountyNAM),...(!PrefNAM.includes(',')?[PrefNAM,tidy(PrefNAM)]:[])],en);
   const locationVerified=correction?.center?!!correction.verifiedLocation:vicinity.has(CountyID)||!!correction?.verifiedLocation;
   const circuitVerified=documentedCircuit.has(CountyID)||!!(correction?.circuit||correction?.verifiedCircuit);
   const audit={location:locationVerified?'corroborated':'uncertain',circuit:circuitVerified?'corroborated':'uncertain'};
   const notes=[
    correction?.note||(modern&&modern!==en?'Historical site near present-day '+modern+'.':'Approximate location of the historical seat.'),
    !locationVerified&&'Seat location uncertain.',
    !circuitVerified&&'Circuit assignment uncertain.',
    outside&&'The sources place this seat and the surrounding frontier differently.'
   ].filter(Boolean);
   municipalities.push({audit,primary:correction?.source,id:year+'-city-'+CountyID,en,local,localLang:'zh-Hant',names:{'zh-Hant':local},kind,aliases,center,circuit:circuit.id,
    minzoom:kind.includes('capital')?3.15:defined?4.25:5.75,
    statusNote:notes.join(' '),
    ...(outside?{frontier:true}:{})});
  }
  const missing=Object.keys(period.cities).filter(key=>!namesUsed.has(key));
  if(missing.length)console.log(year+' check curated keys: '+missing.join('; '));
  for(const circuit of circuits){delete circuit.key;circuit.seats=municipalities.filter(p=>p.circuit===circuit.id).length;}
  const protectorates=(period.protectorates||[]).map(([id,en,local,center,statusNote,statusSource,replaces])=>({
   id:year+'-protectorate-'+id,en,local,center,kind:'Protectorate',localLang:'zh-Hant',names:{'zh-Hant':local},
   minzoom:3.4,statusNote,statusSource,statusSourceLabel:'Protectorate reference',replaces,aliases:[en.split(' ')[0],...(replaces?[replaces]:[])]
  }));
  config.points={...config.points,municipalities,protectorates,circuits,coverage:fc(coverage),source:definitions.source,attribution:definitions.attribution,polity};
  console.log(year+': '+circuits.length+' divisions, '+municipalities.length+' cities, '+coverage.length+' bands; '+Math.round(area(coverage.filter(f=>f.properties.step===1).flatMap(f=>polygons(f.geometry))))+' km²');
 }
 // Qocho's mosaic arcs include backtracking seams between filled faces.
 // Outline the dissolved fill instead, using the shared small-ring visibility policy.
 const song=history.configs[history.years[1100].config],qocho=song.units.findIndex(u=>u.id==='qocho');
 assert(qocho>=0);
 const qochoLand=await command(fc(history.faces.features.filter(f=>song.face[f.properties.f]===qocho)),'-dissolve -clean gap-width=0');
 const outline=cleanFrontier(selectionLineData(qochoLand),qochoLand);
 // Two almost collinear arcs overlap the real edge below this junction and then
 // double back inside Qocho. Keep the exposed span between the junction vertices.
 const junction=[south,corner];
 song.selectionLines={...song.selectionLines,qocho:fc(outline.features.filter(f=>f.geometry.coordinates.length))};
 // Apply the same seam check to the ordinary border underneath the selection.
 const previousArcs=history.arcs.features.filter(f=>f.properties.qochoOriginal!==undefined);
 const originals=new Map(previousArcs.map(f=>[f.properties.a,f.properties.qochoOriginal]));
 history.arcs.features=history.arcs.features.filter(f=>!originals.has(f.properties.a));
 let nextArc=history.arcs.features.reduce((n,f)=>Math.max(n,f.properties.a),-1)+1;
 for(const key of ['lines','frontiers']){
  const restored=[...new Set(song[key].map(id=>originals.get(id)??id))];
  const ids=new Set(restored);
  const candidates=history.arcs.features.filter(f=>ids.has(f.properties.a)&&(song.face[f.properties.l]===qocho||song.face[f.properties.r]===qocho));
  const trimmed=cleanFrontier(fc(candidates),qochoLand);
  for(const [i,f] of trimmed.features.entries()){
   const runs=f.geometry.coordinates,original=candidates[i];
   if(f.properties.a===13021)runs.push(junction);
   if(runs.length===1&&runs[0].length===original.geometry.coordinates.length)continue;
   ids.delete(f.properties.a);
   for(const coordinates of runs){
    if(coordinates.length<2)continue;
    const a=nextArc++;
    history.arcs.features.push(feature({...f.properties,a,drawOnly:true,qochoOriginal:f.properties.a},{type:'LineString',coordinates}));
    ids.add(a);
   }
  }
  song[key]=[...ids];
 }

 fs.writeFileSync(file,gzipSync(encodeGeo(history,{source:'China dated boundaries'},{scale:1e6}),{level:9}));
}
