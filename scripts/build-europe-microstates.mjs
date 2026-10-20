// Rebuild the three additions from pinned, retained sources; no network is used.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {load,polygons,lineIndex,landIndex} from './geo-index.mjs';
import {command,fc,sharedBorders,buildRegionalDataset} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
const root='scripts/additional-sources/europe-microstates/',manifest=load(root+'manifest.json');
const put=(file,data)=>{fs.mkdirSync(file.slice(0,file.lastIndexOf('/')),{recursive:true});fs.writeFileSync(file,gzipSync(JSON.stringify(data),{level:9}));};
const area=d=>d.features.reduce((s,f)=>s+geographicAreaKm2(f.geometry),0);
const clean=collection=>command(collection,'-clean gap-fill-area=0');
const countryOutline=d=>command(d,'-dissolve');
const exactCommand=(data,commands)=>command(data,commands,{precision:null});
const units=new Map(),lu=load(root+'luxembourg.geojson'),cantonIds=new Map();
assert.equal(lu.cantons.features.length,12);assert.equal(lu.communes.features.length,100);
for(const f of lu.cantons.features){const p=f.properties,id='LU-CANTON-'+p.LAU1;cantonIds.set(p.CANTON,id);units.set(id,{id,sourceCode:p.LAU1,en:p.CANTON,local:p.CANTON,kind:'Canton',level:1,parent:null});}
let communes=await clean(fc(lu.communes.features.map(f=>{const p=f.properties,id='LU-COM-'+p.LAU2,parent=cantonIds.get(p.CANTON);assert(parent);units.set(id,{id,sourceCode:p.LAU2,en:p.COMMUNE,local:p.COMMUNE,kind:'Commune',level:2,parent,aliases:[p.LAU2]});return{...f,properties:{id,parent}};})));
// The display uses one shared outer edge with the existing neighboring maps.
const luOriginal=await countryOutline(communes),neighborFeatures=[];
for(const neighbor of ['france','germany','belgium'])neighborFeatures.push(...(await exactCommand(load('dist/data/europe/'+neighbor+'/first.bin').regions,'-clip bbox=5.65,49.4,6.6,50.25')).features);
const luNeighbors=await exactCommand(fc(neighborFeatures),'-dissolve2'),luBuffer=await exactCommand(luOriginal,'-buffer 300m'),luMask=await exactCommand({'lu.json':luBuffer,'neighbors.json':luNeighbors},'-erase neighbors.json -clean gap-fill-area=0');
assert(Math.abs(area(luMask)-area(luOriginal))<area(luOriginal)*.005,'Luxembourg display correction is under half a percent');
communes=await exactCommand({'communes.json':communes,'mask.json':luMask},'-clip mask.json -clean gap-fill-area=0');
const luMissing=await exactCommand({'mask.json':luMask,'communes.json':communes},'-erase communes.json -explode'),luEdges=communes.features.map(f=>({id:f.properties.id,distance:lineIndex(polygons(f.geometry).flat())}));
for(const f of luMissing.features){const p=(await exactCommand(fc([f]),'-points inner')).features[0].geometry.coordinates;f.properties={id:luEdges.reduce((a,b)=>a.distance(p)<b.distance(p)?a:b).id};}
communes=await exactCommand(fc([...communes.features,...luMissing.features]),'-dissolve id -clean gap-fill-area=0');
for(const f of communes.features)f.properties.parent=units.get(f.properties.id).parent;
assert(Math.abs(area(communes)-area(luMask))<.01,'Luxembourg communes cover the reconciled outer mask');
const luAlignment={corridorMetres:300,reference:'Existing France, Germany and Belgium detailed display outlines',officialSourceAreaKm2:area(luOriginal),displayAreaKm2:area(communes),policy:'Only national-edge source differences are reconciled; administrative identities and the internal commune edges remain from ACT.'};
const cantons=await exactCommand(fc(communes.features.map(f=>({...f,properties:{id:f.properties.parent}}))),'-dissolve id');
await buildRegionalDataset({country:'luxembourg',units,byLevel:{1:cantons,2:communes},year:2026,retrieved:manifest.retrieved,levels:['Cantons','Communes'],sources:{displayAlignment:luAlignment,boundaries:{...manifest.files['luxembourg.geojson'],provider:'Administration du cadastre et de la topographie',license:'CC0',page:'https://data.public.lu/fr/datasets/limites-administratives-du-grand-duche-de-luxembourg/'}},coverage:'12 current cantons and 100 communes from the official ACT dataset updated 5 October 2026. Canton fills are dissolved from the same commune polygons so their edges agree at both levels. External display edges follow the existing France, Germany and Belgium outlines within a 300 m candidate corridor; original ACT geometry is retained unchanged among the sources. Historical districts in the download are intentionally excluded: districts were abolished in 2015. Identifiers preserve the source LAU codes; no population or economic values are inferred.'});
put('dist/data/europe/luxembourg/context.bin',fc((await countryOutline(cantons)).features.map(f=>({...f,properties:{country:'luxembourg'}}))));
const luOuter=await countryOutline(cantons);put('dist/data/europe/luxembourg/international.bin',fc(luOuter.features.flatMap(f=>polygons(f.geometry).map(p=>({type:'Feature',properties:{countries:['luxembourg'],visibleZoom:-8},geometry:{type:'LineString',coordinates:p[0]}})))));
// The Italian display's existing enclave ring is the common external reference.
const italy=await countryOutline(load('dist/data/europe/italy/first.bin').regions),rings=italy.features.flatMap(f=>polygons(f.geometry).flat()).filter(r=>r.every(([x,y])=>x>12.38&&x<12.54&&y>43.87&&y<44));assert.equal(rings.length,1);
const mask=fc([{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[rings[0]]}}]),smUnits=new Map(),raw=load(root+'san-marino.geojson');assert.equal(raw.features.length,9);
for(const f of raw.features){const p=f.properties,id=p.shapeISO;f.properties={id};smUnits.set(id,{id,sourceCode:id,en:p.shapeName==='Città di San Marino'?'City of San Marino':p.shapeName,local:p.shapeName,kind:'Castello',level:1,parent:null,aliases:p.shapeName==='Città di San Marino'?['San Marino']:[]});}
let castelli=await command({'castelli.json':raw,'mask.json':mask},'-clip mask.json -clean gap-fill-area=0');
const missing=await command({'mask.json':mask,'castelli.json':castelli},'-erase castelli.json -explode');
const edges=castelli.features.map(f=>({id:f.properties.id,distance:lineIndex(polygons(f.geometry).flat())}));
for(const f of missing.features){const p=(await command(fc([f]),'-points inner')).features[0].geometry.coordinates;f.properties={id:edges.reduce((a,b)=>a.distance(p)<b.distance(p)?a:b).id};}
castelli=await command(fc([...castelli.features,...missing.features]),'-dissolve id -clean gap-fill-area=0');
console.log('San Marino audit',{castelliArea:area(castelli),maskArea:area(mask),pieces:missing.features.length,missingArea:area(missing)});assert(Math.abs(area(castelli)-area(mask))<.001,'Castelli cover the full Italian enclave mask');
await buildRegionalDataset({country:'san-marino',units:smUnits,byLevel:{1:castelli},year:2017,retrieved:manifest.retrieved,levels:['Castelli'],sources:{boundaries:{...manifest.files['san-marino.geojson'],metadata:manifest.files['san-marino-api.json'],provider:'geoBoundaries / OpenStreetMap / Wambacher',license:'ODbL 1.0',representedYear:2017},displayAlignment:{reference:'Existing detailed Italy first-level enclave ring',policy:'Clip external slivers and assign uncovered edge fragments to the nearest existing castello. Internal source divisions are retained; the shared national outline is identical to Italy.'}},coverage:'All nine castelli. The retained geoBoundaries source represents 2017, not a 2026 boundary survey. External display edges are reconciled to the existing Italian enclave outline. Area is calculated from the display geometry; no local population or economic data is inferred.'});
put('dist/data/europe/san-marino/context.bin',fc([{...mask.features[0],properties:{country:'san-marino'}}]));
// Italy already draws the shared frontier; San Marino's selection uses the same ring.
put('dist/data/europe/san-marino/international.bin',fc([]));
// Join current directed coastline ways, excluding the territorial sea from land fill.
const remaining=new Map(load(root+'monaco-coast.json').elements.map(w=>[w.id,w])),paths=[];
while(remaining.size){const w=remaining.values().next().value;remaining.delete(w.id);let ids=[...w.nodes],points=w.geometry.map(p=>[p.lon,p.lat]),added=true;while(added){added=false;for(const [id,v]of remaining){if(v.nodes[0]===ids.at(-1)){ids.push(...v.nodes.slice(1));points.push(...v.geometry.slice(1).map(p=>[p.lon,p.lat]));remaining.delete(id);added=true;}else if(v.nodes.at(-1)===ids[0]){ids=[...v.nodes.slice(0,-1),...ids];points=[...v.geometry.slice(0,-1).map(p=>[p.lon,p.lat]),...points];remaining.delete(id);added=true;}}}paths.push(points);}
const open=paths.filter(p=>JSON.stringify(p[0])!==JSON.stringify(p.at(-1)));assert.equal(open.length,1);const main=open[0],land=fc([{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[...main,[main.at(-1)[0],44],[main[0][0],44],main[0]]]}},...paths.filter(p=>p!==main).map(p=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[p]}}))]);
const physical=await command({'mc.json':fc([{type:'Feature',properties:{},geometry:load(root+'monaco-current.geojson')}]),'land.json':land},'-clip land.json -clean gap-fill-area=0');assert(area(physical)>2&&area(physical)<2.2,'Monaco is physical land, not territorial sea');
const france=load('dist/data/europe/france/first.bin').regions,localFrance=await command(france,'-clip bbox=7.39,43.71,7.46,43.76'),corridor=await command(physical,'-buffer 100m');
let monaco=await command({'mc.json':corridor,'land.json':land,'france.json':localFrance},'-clip land.json -erase france.json -dissolve -clean gap-fill-area=0');assert(Math.abs(area(monaco)-area(physical))<.03,'Monaco alignment stays in the audited narrow border corridor');
monaco=fc(monaco.features.map(f=>({...f,properties:{id:'MC'}})));const mcUnits=new Map([['MC',{id:'MC',en:'Monaco',local:'Principauté de Monaco',kind:'Sovereign city-state',level:1,parent:null,aliases:['Monte Carlo','Monte-Carlo'],note:'Independent sovereign state, grouped under France for atlas navigation only.'}]]);
await buildRegionalDataset({country:'monaco',units:mcUnits,byLevel:{1:monaco},year:2026,retrieved:manifest.retrieved,levels:['Country'],sources:{boundary:manifest.files['monaco-current.geojson'],coastline:{...manifest.files['monaco-coast.json'],license:'ODbL 1.0',credit:'© OpenStreetMap contributors'},displayAlignment:{reference:'Existing France regional outline',corridorMetres:100,physicalAreaKm2:area(physical),displayAreaKm2:area(monaco)}},coverage:'Independent sovereign Monaco, grouped under France for navigation only. Current OSM coastline includes the Mareterra reclamation and port basins; territorial waters are excluded. A 100 m corridor reconciles differing land-border surveys to the existing French display. One country shape is provided, not invented administrative subdivisions. Only Monaco’s national flag is shown.'});
put('dist/data/europe/monaco/context.bin',fc(monaco.features.map(f=>({...f,properties:{country:'monaco'}}))));
const frontier=sharedBorders(fc([...localFrance.features,...monaco.features])).features.map(f=>({...f,properties:{countries:'monaco',resolvedFrontier:'FRA-MCO',visibleZoom:-8}}));assert(frontier.length,'Continuous shared France–Monaco frontier');put('dist/data/europe/monaco/international.bin',fc(frontier));
// The coarse French context receives the same detailed local edge as the live fills.
const franceContext=load('dist/data/europe/france/context.bin'),home=franceContext.features.filter(f=>!f.properties.region),outside=await command(fc(home),'-erase bbox=7.39,43.71,7.46,43.76');
const patched=await command(fc([...outside.features,...localFrance.features.map(f=>({...f,properties:{country:'france'}}))]),'-dissolve');put('dist/data/europe/france/context.bin',fc([...patched.features.map(f=>({...f,properties:{country:'france'}})),...franceContext.features.filter(f=>f.properties.region)]));
// National artwork retains verified dimensions and the shared flag-viewer metadata.
const flags=load('dist/data/europe/flag-sources.json'),metadata=load(root+'flags-metadata.json');
for(const page of Object.values(metadata.query.pages)){const info=page.imageinfo[0],id=page.title.includes('Monaco')?'mc':page.title.includes('Luxembourg')?'lu':'sm',country={mc:'monaco',lu:'luxembourg',sm:'san-marino'}[id],bytes=fs.readFileSync(root+'flag-'+id+'.svg');assert(/<svg[\s>]/.test(bytes.toString())&&!/<script|<foreignObject|javascript:/i.test(bytes.toString()));fs.writeFileSync('dist/vendor/flag-'+id+'.svg',bytes);flags.flags[country]={file:'vendor/flag-'+id+'.svg',full:'vendor/flag-'+id+'.svg',width:info.width,height:info.height,source:info.descriptionurl,page:info.descriptionurl,original:info.url,credit:'Wikimedia Commons',license:info.extmetadata.LicenseShortName.value,sha256:manifest.files['flag-'+id+'.svg'].sha256};}
fs.writeFileSync('dist/data/europe/flag-sources.json',JSON.stringify(flags,null,2)+'\n');
await import('./prepare-europe-microstate-statistics.mjs');
console.log('Monaco land-only area',area(monaco).toFixed(4),'km²; all three national flags sourced.');
