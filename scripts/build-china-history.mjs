// China's historical snapshots, from the Han to the Qing, as one dated mosaic built
// by the shared historic-mosaic.mjs (as Korea's). Han through Song use whole modern
// counties inside modern China and retain dated extensions beyond it. The Qing frame
// uses Stanford's historical provinces and frontier regions.
// Inputs are retained under scripts/boundary-sources/china-history/; nothing is downloaded.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {decodePack} from '../dist/china-pack.mjs';
import {decodeData} from '../dist/geo-pack.mjs';
import {command,fc,geographicBounds} from './build-regional-dataset.mjs';
import {landIndex} from './geo-index.mjs';
import {area,centre,largestCover,nearestUnit,polygons,writeMosaic} from './historic-mosaic.mjs';
import {addChinaCircuits} from './build-china-circuits.mjs';
const sources='scripts/boundary-sources/china-history/',out='dist/data/china/history/borders.bin';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const cliopatria=read(sources+'cliopatria.geojson'),polities=read(sources+'polities.json'),manifest=read(sources+'manifest.json');
const display=decodePack(gunzipSync(fs.readFileSync('dist/data/china-boundaries.pack.bin'))).display;
const counties=JSON.parse(gunzipSync(fs.readFileSync('dist/data/china-counties.bin'))).regions.features;

// Present-day pieces: the county-level divisions, and the displayed subdivisions that have none
// (the municipalities' districts, directly administered units, Taiwan, Hong Kong and Macau),
// cleaned into one tiling of the displayed provinces.
const provinceOf=new Map(display.subdivisions.features.map(f=>[f.properties.adcode,f.properties.provinceCode??f.properties.parent?.adcode]));
const divided=new Set(counties.map(f=>f.properties.parentCity));
const raw=[
 ...counties.map(f=>({type:'Feature',properties:{id:String(f.properties.adcode),province:f.properties.provinceCode},geometry:f.geometry})),
 ...display.subdivisions.features.filter(f=>!divided.has(f.properties.adcode)).map(f=>({type:'Feature',properties:{id:String(f.properties.adcode),province:provinceOf.get(f.properties.adcode)},geometry:f.geometry}))
];
const provinces=fc(display.provinces.features.map(f=>({type:'Feature',properties:{province:f.properties.adcode},geometry:f.geometry})));
// Overlaps go to the larger piece and small enclosed gaps to a neighbour; the result is clipped to
// the displayed land.
const cleaned=await command({'pieces.json':fc(raw),'provinces.json':provinces},'-clean gap-fill-area=2km2 -clip provinces.json');
const pieces=cleaned.features.filter(f=>f.geometry).map(f=>({id:f.properties.id,province:f.properties.province,polygons:polygons(f.geometry)}));
assert.equal(new Set(pieces.map(p=>p.id)).size,raw.length,'Every county-level division keeps land');
// Displayed land no piece covers (slivers where county outlines do not meet) joins the nearest
// piece of its province, so the snapshot fill has no holes.
const left=(await command({'provinces.json':provinces,'pieces.json':fc(cleaned.features)},'-erase pieces.json -explode')).features.filter(f=>f.geometry&&area(polygons(f.geometry))>=1e-6);
const boxOf=piece=>piece.box??=piece.polygons.reduce((b,polygon)=>{for(const [x,y] of polygon[0]){b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}return b;},[Infinity,Infinity,-Infinity,-Infinity]);

for(const f of left){
 const ring=polygons(f.geometry)[0][0],[x,y]=ring.reduce(([a,b],[u,v])=>[a+u/ring.length,b+v/ring.length],[0,0]);
 const candidates=pieces.filter(p=>!p.host&&p.province===f.properties.province),close=candidates.filter(p=>{const b=boxOf(p);return x>=b[0]-.1&&x<=b[2]+.1&&y>=b[1]-.1&&y<=b[3]+.1;});
 const host=(close.length?close:candidates).reduce((best,p)=>{let d=Infinity;for(const polygon of p.polygons)for(const [a,b] of polygon[0])d=Math.min(d,Math.hypot((a-x)*Math.cos(y*Math.PI/180),b-y));return d<best[1]?[p,d]:best;},[null,Infinity])[0];
 pieces.push({id:host.id+'+'+pieces.length,province:host.province,polygons:polygons(f.geometry),host});
}
// Holes left in the assembled land (gaps where the displayed provinces' own borders do not meet,
// and the few the cleaning leaves) also join the nearest piece.
const nearestPiece=([x,y],list)=>{const close=list.filter(p=>{const b=boxOf(p);return x>=b[0]-.1&&x<=b[2]+.1&&y>=b[1]-.1&&y<=b[3]+.1;});return (close.length?close:list).reduce((best,p)=>{let d=Infinity;for(const polygon of p.polygons)for(const [a,b] of polygon[0])d=Math.min(d,Math.hypot((a-x)*Math.cos(y*Math.PI/180),b-y));return d<best[1]?[p,d]:best;},[null,Infinity])[0];};
// A hole may hold an island of another piece, which keeps its land.
const assembled=fc(pieces.map(p=>({type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:p.polygons}})));
const rings=(await command(assembled,'-dissolve')).features.flatMap(f=>polygons(f.geometry)).flatMap(p=>p.slice(1)).filter(ring=>area([[ring]])<50);
const holes=(await command({'holes.json':fc(rings.map(ring=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[ring]}}))),'pieces.json':assembled},'-erase pieces.json -explode')).features.filter(f=>f.geometry&&area(polygons(f.geometry))>=1e-6);
for(const f of holes){const ring=polygons(f.geometry)[0][0],at=ring.reduce(([a,b],[u,v])=>[a+u/ring.length,b+v/ring.length],[0,0]),host=nearestPiece(at,pieces.filter(p=>!p.host));pieces.push({id:host.id+'+'+pieces.length,province:host.province,polygons:polygons(f.geometry),host});}
const own=pieces.filter(p=>!p.host);

// Offshore pieces: those on a landmass under 5,000 km² (Zhoushan, but not Hainan or Taiwan), and
// pieces under 1,000 km² on the coast (Dongtou, joined to the mainland by a causeway).
const pieceFeatures=fc(own.map(p=>({type:'Feature',properties:{id:p.id},geometry:{type:'MultiPolygon',coordinates:p.polygons}})));
const masses=(await command(pieceFeatures,'-dissolve -explode')).features.map(f=>polygons(f.geometry));
const small=masses.filter(list=>area(list)<5000).map(list=>landIndex(list.flat()));
const shore=new Set();for(const list of masses)for(const polygon of list)for(const ring of polygon)for(const [x,y] of ring)shore.add(x+','+y);
const coastal=new Set(own.filter(p=>area(p.polygons)<1000&&p.polygons.some(polygon=>polygon[0].some(([x,y])=>shore.has(x+','+y)))));
const inner=new Map((await command(pieceFeatures,'-points inner',{precision:null})).features.map(f=>[f.properties.id,f.geometry.coordinates]));
const islands=new Set(own.filter(p=>small.some(test=>test(inner.get(p.id)))));
// From a piece's centre to the nearest vertex of another piece, in degrees.
const toLand=(p,q)=>{const [x,y]=p.center??=centre(p),b=boxOf(q);if(x<b[0]-1||x>b[2]+1||y<b[1]-1||y>b[3]+1)return Infinity;let d=Infinity;for(const polygon of q.polygons)for(const [a,c] of polygon[0])d=Math.min(d,Math.hypot((a-x)*Math.cos(y*Math.PI/180),c-y));return d;};
// Shares are measured on a simplified copy; Cliopatria's polygons are far coarser.
const simple=new Map((await command(pieceFeatures,'-simplify interval=250 keep-shapes')).features.map(f=>[f.properties.id,polygons(f.geometry)]));
const snapshots=[];
for(const {year,field} of manifest.snapshots.filter(s=>s.year!==1820)){
 // Each polygon is widened by 10 km, about its vertex spacing, so a coarse coast or edge does not
 // leave the land beside it unrecorded.
 const current=cliopatria.features.filter(f=>f.properties.FromYear<=year&&f.properties.ToYear>=year);
 const widened=await command(fc(current.map((f,i)=>({type:'Feature',properties:{i},geometry:f.geometry}))),'-buffer radius=10000');
 const reference=widened.features.map(f=>({unit:polities[current[f.properties.i].properties.Name]?.key,name:current[f.properties.i].properties.Name,polygons:polygons(f.geometry)}));
 assert.equal(reference.length,current.length,year+': every polygon widened');
 const missing=reference.filter(r=>!r.unit).map(r=>r.name);
 assert(!missing.length,year+': polities without an entry in polities.json: '+missing.join(', '));
 largestCover(own,reference,{field,uncovered:true,shape:p=>simple.get(p.id)});
 // An offshore piece Cliopatria's coarse polygons leave out takes the polity of land within 0.5° (about 50 km).
 nearestUnit(own,field,{limit:.5,only:p=>islands.has(p)||coastal.has(p),distance:toLand});
 for(const [id,{unit}] of Object.entries(manifest.countyOverrides?.[year]||{})){
  const piece=own.find(p=>p.id===id);
  assert(piece&&reference.some(r=>r.unit===unit),'Valid historical county override: '+year+' '+id);
  piece[field]=unit;
 }
 for(const piece of pieces)if(piece.host)piece[field]=piece.host[field];
 const used=new Set(pieces.map(p=>p[field]).filter(Boolean));
 const units=Object.fromEntries(Object.values(polities).filter(p=>used.has(p.key)).map(({key,...unit})=>[key,unit]));
 snapshots.push({year,date:String(year).padStart(4,'0')+'-12-31',field,units});
}

// A last clean of every piece, fillers included, removes self-intersecting rings in the source
// outlines, which drew stray triangles.
const final=new Map((await command(fc(pieces.map(p=>({type:'Feature',properties:{id:p.id},geometry:{type:'MultiPolygon',coordinates:p.polygons}}))),'-clean gap-fill-area=0')).features.filter(f=>f.geometry).map(f=>[f.properties.id,polygons(f.geometry)]));
for(const p of pieces)p.polygons=final.get(p.id)||[];
assert(own.every(p=>p.polygons.length),'Every division keeps land after the last clean');
const feature=(properties,geometry)=>({type:'Feature',properties,geometry});
const multi=coordinates=>({type:'MultiPolygon',coordinates});
const early=(await command(fc(pieces.map(p=>feature({frame:snapshots.map(s=>p[s.field]||'').join('|')},multi(p.polygons)))),'-dissolve2 frame')).features;
const qing=JSON.parse(gunzipSync(fs.readFileSync(sources+manifest.qing1820.file))).features;
const jilin=qing.find(f=>f.properties.id===25026);
const islandsOfJilin=polygons(jilin.geometry);
const sakhalin=islandsOfJilin.find(p=>geographicBounds(multi([p]))[1][0]>144);
jilin.geometry=multi(islandsOfJilin.filter(p=>p!==sakhalin));
qing.push(feature({id:'sakhalin',name:'Sakhalin',zh:'庫頁島',type:'Qing claim',note:'The Qing claimed Sakhalin. Indigenous communities lived on the island, where Qing authority was limited.'},multi([sakhalin])));
const historic=qing.map(f=>feature({qing:String(f.properties.id)},f.geometry));

// Use a single clean modern land mask; dated county-group rings are not a land mask.
const chinaMask=await command(fc(provinces.features.map(f=>feature({land:1},f.geometry))),'-clean gap-width=0 -dissolve2 land');
// The historical source contributes divisions.
const contextFiles=['china-neighbours.bin','korea-context.bin','mongolia-context.bin','russia/context.bin','europe/bhutan/context.bin','japan-context.bin'];
const loadLand=async file=>(await decodeData(fs.readFileSync('dist/data/'+file))).features;
const context=await Promise.all(contextFiles.map(loadLand));
const world=(await loadLand('world-land.bin')).filter(f=>!['china','korea','mongolia','russia','vietnam'].includes(f.properties.country));
const vietnamLand=fc(await loadLand('europe/vietnam/context.bin'));
const vietnamProvinces=(await decodeData(fs.readFileSync('dist/data/europe/vietnam/first.bin'))).regions;
const nearEastAsia=f=>{const [[w,s],[e,n]]=geographicBounds(f.geometry);return w<148&&e>66&&s<59&&n>13;};
const neighbours=(await command({
 'context.json':fc([...world,...context.flat().filter(f=>f.properties.country!=='vietnam'),...vietnamLand.features].filter(f=>f.properties.country!=='china'&&nearEastAsia(f)).map(f=>feature({},f.geometry))),
 'china.json':chinaMask
},'-clip bbox=66,13,148,59 -erase china.json -dissolve2')).features;
const modernLand=(await command(fc([...chinaMask.features,...neighbours].map(f=>feature({},f.geometry))),'-dissolve2')).features;
const coast=fc(modernLand.map(f=>feature({},multi(polygons(f.geometry).map(([ring])=>[ring])))));
const inland=await command(coast,'-simplify interval=400 keep-shapes -buffer radius=-3000');
// Match small shoreline differences beyond modern China as well. Keep the
// correction in the coastal band so it cannot shift an inland frontier.
const coastalUnits=new Set(['25025','25026','sakhalin']);
const shoreCorrections=(await command({
 'coastal.json':fc(historic.filter(f=>coastalUnits.has(f.properties.qing))),
 'historical.json':fc(historic),'land.json':coast,'inland.json':inland
},'-buffer radius=2200 -erase historical.json -clip land.json -erase inland.json')).features;
const qingLand=(await command({'qing.json':fc([...historic,...shoreCorrections]),'land.json':coast},'-dissolve2 qing -clean gap-width=0 -clip land.json')).features;

const macau=polygons(display.provinces.features.find(f=>f.properties.adcode===820000).geometry);
const {key:macauKey,...macauUnit}=polities['Portuguese Colonies'];
const qingWithMacau=(await command({
 'qing.json':fc(qingLand),
 'macau.json':fc([feature({},multi(macau))])
},'-erase macau.json')).features;
qingWithMacau.push(feature({qing:macauKey},multi(macau)));
// Reuse Mapshaper's shared-edge data fill for connected pieces the historical outline misses.
// Macau has its own exact footprint, so it does not supply a value to adjoining land.
const merged=(await command(fc([
 ...early.map(f=>feature({layer:'early',frame:f.properties.frame,qing:null},f.geometry)),
 ...qingWithMacau.map(f=>feature({layer:'qing',frame:null,qing:f.properties.qing},f.geometry))
]),"-split layer -clean target=early gap-width=0 -clean target=qing gap-width=0 -union target=* fields=frame,qing -clean gap-width=0 -explode -each 'adjoining=qing_2 === \"macau\" ? null : qing_2' -data-fill field=adjoining")).features.filter(f=>f.geometry&&polygons(f.geometry).length);
const extended=merged.map(f=>{
 const keys=f.properties.frame_1?.split('|')||[];
 return {qing:f.properties.qing_2||(f.properties.frame_1!=null?f.properties.adjoining:undefined)||undefined,polygons:polygons(f.geometry),external:f.properties.frame_1==null,...Object.fromEntries(snapshots.map((s,i)=>[s.field,keys[i]]))};
});
// Reconcile the 1430 Đại Việt coast to the exact modern Vietnam land source.
// The retained Lê shape covers 1429–1474 and carries a later southern expansion.
// Keep its inland extent, but use the Hải Vân / Huế ridge as an approximate 1430
// southern limit; this is not a claim that modern provincial borders existed then.
const daiVietSource=fc(cliopatria.features.filter(f=>f.properties.Name==='Lê Dynasty'&&f.properties.FromYear<=1430&&f.properties.ToYear>=1430));
const vietnamNorth=fc(vietnamProvinces.features.filter(f=>Number(f.properties.id.slice(3))<=46));
const hue=vietnamProvinces.features.find(f=>f.properties.id==='VN-46');
const southLimit=geographicBounds(hue.geometry)[0][1];
const vietnamEnvelope=fc(vietnamLand.features.map(f=>feature({},multi(polygons(f.geometry).map(([ring])=>[ring])))));
const beyondVietnam=await command({'land.json':coast,'vietnam.json':vietnamEnvelope},'-erase vietnam.json -clip bbox=66,'+southLimit+',148,59');
const historicalNorth=await command(fc([...vietnamNorth.features,...beyondVietnam.features].map(f=>feature({},f.geometry))),'-dissolve2');
const coastInterior=await command(coast,'-simplify interval=400 keep-shapes -buffer radius=-15000');
const shoreFit=await command({'dated.json':daiVietSource,'vietnam.json':vietnamLand,'interior.json':coastInterior},'-buffer radius=25000 -clip vietnam.json -erase interior.json');
const daiViet1430=await command({'dated.json':fc([...daiVietSource.features,...shoreFit.features].map(f=>feature(daiVietSource.features[0].properties,f.geometry))),'land.json':coast,'north.json':historicalNorth},'-dissolve2 -clip land.json -clip north.json -clean gap-width=0');
const datedPolities=cliopatria.features.flatMap(f=>f===daiVietSource.features[0]?daiViet1430.features.map(g=>feature(f.properties,g.geometry)):[f]);
const southernNeighbours=new Set(['shan','lan-xang','dai-viet-1430']);
// Restore dated territory on the shared land mask outside modern China. Existing
// Chinese county assignments stay in place. The external mosaic is classified
// separately for every period, including land already present for the Qing frame.
const outsideChinese=(await command({
 'dated.json':fc(datedPolities.filter(f=>(polities[f.properties.Name]?.chinese&&snapshots.some(s=>f.properties.FromYear<=s.year&&f.properties.ToYear>=s.year))||(southernNeighbours.has(polities[f.properties.Name]?.key)&&f.properties.FromYear<=1430&&f.properties.ToYear>=1430))),
 'land.json':coast,'china.json':chinaMask
},'-dissolve2 -clip land.json -erase china.json')).features.filter(f=>f.geometry&&polygons(f.geometry).length);
const inside=extended.filter(p=>!p.external);
const qingOutside=(await command({'qing.json':fc(qingWithMacau),'china.json':chinaMask},'-erase china.json -clean gap-width=0 -explode')).features.filter(f=>f.geometry&&polygons(f.geometry).length);
// Normalize both footprints before combining them. Erasing a separately dissolved
// exterior ring can invert its holes at shared coast vertices and discard Vietnam.
const exteriorUnion=(await command(fc([
 ...qingOutside.map(f=>feature({layer:'qing',qing:f.properties.qing,domain:null},f.geometry)),
 ...outsideChinese.map(f=>feature({layer:'dated',qing:null,domain:1},f.geometry))
]),'-split layer -clean target=qing gap-width=0 -clean target=dated gap-width=0 -union target=* fields=qing,domain -clean gap-width=0')).features;
let external=exteriorUnion.filter(f=>f.geometry&&polygons(f.geometry).length).map(f=>({qing:f.properties.qing_1||undefined,external:true,polygons:polygons(f.geometry)}));
const externalMask=await command(fc(external.map(p=>feature({},multi(p.polygons)))),'-dissolve2');
const extensionAudit=[];
for(const snapshot of snapshots){
 const current=datedPolities.filter(f=>f.properties.FromYear<=snapshot.year&&f.properties.ToYear>=snapshot.year);
 const own=current.filter(f=>polities[f.properties.Name]?.chinese);
 const neighbours=current.filter(f=>!polities[f.properties.Name]?.chinese);
 const owned=await command({'own.json':fc(own),'mask.json':externalMask},'-clip mask.json -clean gap-width=0');
 const context=await command({'context.json':fc(neighbours),'own.json':owned,'mask.json':externalMask},'-clip mask.json'+(owned.features.some(f=>f.geometry)?' -erase own.json':''));
 const dated=fc([...owned.features,...context.features].filter(f=>f.geometry&&polygons(f.geometry).length).map(f=>feature({unit:polities[f.properties.Name].key},f.geometry)));
 for(const [year,point,key] of [[2,[105.84,21.03],'han'],[250,[105.84,21.03],'wu'],[742,[105.84,21.03],'tang'],[1430,[96.94,25.3],'shan'],[1430,[102.14,19.89],'lan-xang'],[1430,[107.59,16.46],'dai-viet-1430']])if(snapshot.year===year)assert(dated.features.some(f=>f.properties.unit===key&&landIndex(polygons(f.geometry).flat())(point)),year+' exterior footprint retains '+key+' at '+point);
 const frames=new Map();
 for(const p of external){
  const key=JSON.stringify([p.qing||null,...snapshots.map(period=>p[period.field]||null)]);
  if(!frames.has(key))frames.set(key,{...p,polygons:[]});
  frames.get(key).polygons.push(...p.polygons);
 }
 const overlay=(await command(fc([
  ...[...frames].map(([frame,p])=>feature({layer:'base',frame,unit:null},multi(p.polygons))),
  ...dated.features.map(f=>feature({layer:'dated',frame:null,unit:f.properties.unit},f.geometry))
 ]),'-split layer -clean target=base gap-width=0 -clean target=dated gap-width=0 -union target=* fields=frame,unit -clean gap-width=0 -explode')).features.filter(f=>f.geometry&&f.properties.frame_1!=null&&polygons(f.geometry).length);
 external=overlay.map(f=>({...frames.get(f.properties.frame_1),[snapshot.field]:f.properties.unit_2||undefined,external:true,polygons:polygons(f.geometry)}));
 extensionAudit.push({year:snapshot.year,modeledOwnAreaKm2:area(owned.features.filter(f=>f.geometry).flatMap(f=>polygons(f.geometry)))});
}
extended.splice(0,extended.length,...inside,...external);
for(const snapshot of snapshots){
 const used=new Set(extended.map(p=>p[snapshot.field]).filter(Boolean));
 snapshot.units=Object.fromEntries(Object.values(polities).filter(p=>used.has(p.key)).map(({key,...unit})=>[key,unit]));
}
console.log('Dated area outside modern China',JSON.stringify(extensionAudit));
// Separate modern coastal islands can take their nearest shore. Remote reefs
// without a nearby division keep the neutral land colour.
nearestUnit(extended.filter(p=>p.qing!==macauKey),'qing',{limit:.5,only:p=>!p.external,distance:toLand});
const qingFrontier=await command({
 'qing.json':fc(extended.filter(p=>p.qing).map(p=>feature({},multi(p.polygons)))),
 'inland.json':inland
},'-dissolve2 -lines -clip inland.json');
snapshots.push({year:1820,date:'1820-12-31',field:'qing',frontier:qingFrontier,fullLand:true,units:{
 ...Object.fromEntries(qing.map(({properties:{id,...unit}})=>[id,unit])),[macauKey]:macauUnit
}});
// Fit the ROC interior divisions to the same modern land used by the Qing frame.
// Keep substantive historical extensions and the earlier Mongolia reference outline.
const rocBase='dist/data/europe/china-1949/';
const [rocBoundaries,rocCatalogue]=await Promise.all(['first.bin','catalogue.bin'].map(async file=>decodeData(fs.readFileSync(rocBase+file))));
const rocUnits=Object.fromEntries(rocCatalogue.records.map(r=>[r.id,{name:r.en,zh:r.local,type:r.kind==='Province'?'ROC province':r.id==='ROC-MONGOLIA'?'ROC claim':'ROC area',kind:r.kind,aliases:r.aliases,capital:r.capital,note:r.id==='ROC-MONGOLIA'?'The ROC recognized Mongolian independence in January 1946. The map uses the atlas outline of independent Mongolia and shows the earlier claim for reference. Tuva, already part of the Soviet Union in 1949, has its own outline.':r.statusNote,statusSource:r.statusSource}]));
const referenceId='ROC-MONGOLIA',foreignId='ROC-FOREIGN',outsideId='ROC-OUTSIDE',burmaId='ROC-JIANGXINPO';
const original=rocBoundaries.regions.features;
const foreign=display.provinces.features.filter(f=>[810000,820000].includes(f.properties.adcode));
const rocLand=(await command({
 'roc.json':fc(original.filter(f=>f.properties.id!==referenceId)),
 'china.json':chinaMask,'foreign.json':fc(foreign)
},'-clip china.json -erase foreign.json')).features;
// A historical claim can cross today's border, but thin strips caused by
// two surveys tracing the same river or coast are not separate extensions.
const exteriorROC=(await command({
 'roc.json':fc(original),'china.json':chinaMask,'land.json':coast
},'-erase china.json -clip land.json -explode')).features.filter(f=>f.geometry);
async function substantial(shapes){
 const candidates=shapes.flatMap((f,i)=>f.geometry&&area(polygons(f.geometry))>=75?[feature({i},f.geometry)]:[]);
 const cores=(await command(fc(candidates),'-buffer radius=-2500')).features;
 return new Set(cores.filter(f=>f.geometry&&area(polygons(f.geometry))>0).map(f=>f.properties.i));
}
// The Khorgos sector follows the post-1881 border. In the western Pamirs the
// historical sheet also excludes several broad modern-only pieces.
const western=(await command({'china.json':chinaMask,'historical.json':fc(original)},'-clip bbox=72,37.5,81.4,43.3 -erase historical.json -explode')).features;
const [extensions,excluded]=await Promise.all([substantial(exteriorROC),substantial(western)]);
rocLand.push(...exteriorROC.filter((f,i)=>{
 const id=f.properties.id,[[w,s],[e,n]]=geographicBounds(f.geometry);
 return id===referenceId||extensions.has(i)&&!(id==='ROC-XINJIANG'&&w>=79.7&&e<=81.3&&s>=43.3&&n<=45);
}),...western.flatMap((f,i)=>excluded.has(i)?[feature({id:outsideId},f.geometry)]:[]),...foreign.map(f=>feature({id:foreignId},f.geometry)));
const {jiangxinpo,claimsReference}=read('scripts/boundary-sources/china-1949/manifest.json');
const claim=(id,name,zh,note,{aliases=[],selectionGroup}={})=>{
 rocUnits[id]={name,zh,type:'ROC claim',kind:'Historical claim',aliases,note,statusSource:claimsReference.url,...(selectionGroup?{selectionGroup}:{})};
 return geometry=>feature({id},geometry);
};
const claimRing=ring=>fc([feature({}, {type:'Polygon',coordinates:[ring]})]);
const clipClaim=async (ring,land)=>(await command({'trace.json':claimRing(ring),'land.json':fc(land)},'-clip land.json')).features[0].geometry;
const readRegions=async file=>(await decodeData(fs.readFileSync('dist/data/'+file))).regions.features;
const [india,russia,pakistan,afghanistan]=await Promise.all([
 readRegions('europe/india/first.bin'),readRegions('russia/first.bin'),loadLand('europe/pakistan/context.bin'),loadLand('europe/afghanistan/context.bin')
]);
const [borderBand,,mongolia,russianLand,bhutan,japan]=context;
const arunachal=india.find(f=>f.properties.id==='IN-AR').geometry;
const tuva=russia.find(f=>f.properties.id==='RU-TY').geometry;
const senkakuIslands=polygons(japan.find(f=>f.properties.id==='JP-47').geometry).filter(p=>{
 const [[w,s],[e,n]]=geographicBounds(multi([p]));
 return w>=123.4&&e<=124.65&&s>=25.5&&n<=26.1;
});
const {sectors}=claimsReference;
const [wakhan,karakoram,bhutanSector,amur]=await Promise.all([
 clipClaim(sectors.wakhan,afghanistan),
 clipClaim(sectors.karakoram,pakistan),
 clipClaim(sectors.bhutan,bhutan),
 clipClaim(sectors.amur,russianLand)
]);
const claims=[
 feature({id:referenceId},mongolia[0].geometry),
 claim('ROC-TUVA','Tannu Uriankhai','唐努烏梁海','The Soviet Union incorporated Tuva in 1944. The reference shows the earlier ROC claim.')(tuva),
 claim('ROC-PAMIRS','Eastern Pamirs','東帕米爾','The reference shows a historical claim in the eastern Pamirs, administered by the Soviet Union in 1949 and now part of Tajikistan.',{aliases:['Tajikistan','Gorno-Badakhshan']})(borderBand.find(f=>f.properties.country==='tajikistan').geometry),
 claim('ROC-WAKHAN','Eastern Wakhan','瓦罕走廊東部','Approximate Afghan-administered sector shown in the reference, near the eastern tip of the Wakhan Corridor.',{aliases:['Afghanistan']})(wakhan),
 claim('ROC-KARAKORAM','Karakoram frontier','喀喇崑崙邊區','Approximate Pakistan-administered sector shown in the reference. The 1963 China–Pakistan boundary agreement changed the alignment in this region.',{aliases:['Pakistan']})(karakoram),
 claim('ROC-ARUNACHAL','Arunachal Pradesh','藏南','The reference shows the Indian-administered eastern Himalayan claim. The atlas uses its existing Arunachal Pradesh outline.',{aliases:['India','South Tibet','NEFA']})(arunachal),
 claim('ROC-BHUTAN','Northern Bhutan frontier','不丹北部邊區','Approximate Bhutan-administered sector shown in the reference.',{aliases:['Bhutan']})(bhutanSector),
 claim('ROC-AMUR','Sixty-Four Villages East of the Amur','江東六十四屯','Approximate extent of the former villages across the Amur from Heihe. The Soviet Union administered the area in 1949.',{aliases:['Russia','Amur']})(amur),
 claim('ROC-DIAOYU','Diaoyutai / Senkaku Islands','釣魚臺列嶼','The reference shows the ROC claim to the islands. The United States administered them in 1949 and transferred administration to Japan in 1972.',{aliases:['Japan','Senkaku','Diaoyu']})(multi(senkakuIslands))
];
if(claims.some(f=>!f.geometry||!polygons(f.geometry).length))throw Error('Missing ROC claim geometry');
const burma=(await command({
 'claim.json':fc([feature({id:burmaId},{type:'Polygon',coordinates:[jiangxinpo.ring]})]),
 'burma.json':fc(world.filter(f=>f.properties.country==='myanmar')),
 'china.json':chinaMask
},'-clip burma.json -erase china.json')).features;
claim(burmaId,'Jiangxinpo','江心坡','Historical claim in northern Burma. Burma administered the area in 1949. The northern frontier was settled by the 1960 China–Burma boundary treaty.',{aliases:['Northern Burma','Kachin','江心坡']});
rocUnits[burmaId].statusSource=jiangxinpo.url;
claims.push(...burma);

// The Beibu Gulf coast and Leizhou were part of Guangdong in 1949. Use
// whole coastal districts so the province line meets the land without steps.
const coastalPrefectures=display.subdivisions.features.filter(f=>[440800,450500,450600,450700].includes(f.properties.adcode));
// Shangsi joined Fangchenggang much later and was already part of Guangxi in 1949.
const shangsi=counties.filter(f=>f.properties.adcode===450621);
const cantonCoast=(await command({'coast.json':fc(coastalPrefectures),'shangsi.json':fc(shangsi)},'-erase shangsi.json')).features;
const coastCorrection=[
 ...cantonCoast.map(f=>feature({id:'ROC-GUANGDONG'},f.geometry)),
 ...shangsi.map(f=>feature({id:'ROC-GUANGXI'},f.geometry))
];
// Claim polygons take precedence over the coarse nominal divisions, but the
// reference's exaggerated offshore marker is replaced by the islands' land.
const diaoyuBox=(await command(fc(early),'-clip bbox=123.4,25.5,124.65,26.1')).features;
const fittedROC=(await command({
 'roc.json':fc(rocLand.filter(f=>f.properties.id!==referenceId)),
 'overrides.json':fc([...claims,...coastCorrection,...diaoyuBox])
},'-erase overrides.json')).features;
fittedROC.push(...claims,...coastCorrection,...diaoyuBox.map(f=>feature({id:'ROC-DIAOYU'},f.geometry)));
const fitted=(await command(fc(fittedROC),'-dissolve2 id -clean gap-width=0')).features;
rocUnits[foreignId]={name:'Hong Kong and Macau',zh:'香港及澳門',type:'ROC reference',kind:'Other land',note:'Shown on their modern land outlines.'};

// Combine the date assignments once. Only modern Chinese pieces take a missing
// ROC division from a neighbor, so Qing land across the frontier stays separate.
const states=new Map();
for(const p of extended){
 const id=JSON.stringify([p.external,...snapshots.map(s=>p[s.field])]);
 if(!states.has(id))states.set(id,{...p,polygons:[]});
 for(const polygon of p.polygons)states.get(id).polygons.push(polygon);
}
const overlay=(await command(fc([
 ...[...states].map(([id,p])=>feature({layer:'previous',frame:id,roc:null},multi(p.polygons))),
 ...fitted.map(f=>feature({layer:'republic',frame:null,roc:f.properties.id},f.geometry))
]),"-split layer -clean target=previous gap-width=0 -clean target=republic gap-width=0 -union target=* fields=frame,roc -clean gap-width=0 -explode")).features.filter(f=>f.geometry&&polygons(f.geometry).length);
const combined=overlay.map(f=>{
 const previous=states.get(f.properties.frame_1),external=previous?.external??true;
 const id=f.properties.roc_2,excluded=id===outsideId;
 const roc=excluded||!external&&id===referenceId?undefined:id||undefined;
 return {...previous,roc,excluded,external,polygons:polygons(f.geometry),box:null,center:null};
});
// Resolve each uncovered piece from its own location. A shared-edge fill can
// propagate across an entire frontier strip and give it to a distant province.
const gaps=combined.filter(p=>!p.roc&&!p.external&&!p.excluded);
const locations=await command(fc(gaps.map((p,i)=>feature({i},multi(p.polygons)))),'-points inner',{precision:null});
for(const f of locations.features)if(f.geometry)gaps[f.properties.i].center=f.geometry.coordinates;
const nearby=fitted.filter(f=>['ROC province','ROC area'].includes(rocUnits[f.properties.id]?.type)).map(f=>({roc:f.properties.id,polygons:polygons(f.geometry)}));
function distanceToEdge(p,q){
 const [x,y]=p.center??=centre(p),[w,s,e,n]=boxOf(q),scale=Math.cos(y*Math.PI/180);
 if(x<w-3||x>e+3||y<s-3||y>n+3)return Infinity;
 let distance=Infinity;
 for(const polygon of q.polygons)for(const ring of polygon)for(let i=1;i<ring.length;i++){
  const [a,b]=ring[i-1],[c,d]=ring[i],dx=(c-a)*scale,dy=d-b,px=(x-a)*scale,py=y-b;
  const t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy||1)));
  distance=Math.min(distance,(px-t*dx)**2+(py-t*dy)**2);
 }
 return Math.sqrt(distance);
}
nearestUnit([...nearby,...gaps],'roc',{distance:distanceToEdge,limit:1});
// A detached modern seam can be closest to a province tip even though it
// sits beside another province's main body. Keep source-backed islands and
// repair inferred pockets for inland divisions drawn as one piece.
const singleProvinces=new Set(original.filter(f=>polygons(f.geometry).length===1&&rocUnits[f.properties.id]?.type==='ROC province').map(f=>f.properties.id));
const joined=await command(fc(combined.filter(p=>p.roc&&singleProvinces.has(p.roc)).map(p=>feature({id:p.roc},multi(p.polygons)))),'-dissolve2 id');
const mainBodies=new Map();
for(const f of joined.features){
 const parts=polygons(f.geometry);
 if(parts.length<2)continue;
 const main=parts.reduce((a,b)=>area([a])>area([b])?a:b);
 mainBodies.set(f.properties.id,{polygons:[main],contains:landIndex(main)});
}
for(const gap of gaps){
 const main=mainBodies.get(gap.roc);
 if(!main||main.contains(gap.center)||distanceToEdge(gap,main)<.03)continue;
 let closest=distanceToEdge(gap,main),replacement=gap.roc;
 for(const candidate of nearby){
  if(candidate.roc===gap.roc)continue;
  const distance=distanceToEdge(gap,mainBodies.get(candidate.roc)||candidate);
  if(distance<closest){closest=distance;replacement=candidate.roc;}
 }
 gap.roc=replacement;
}
const rocFrontier=await command({
 'roc.json':fc(combined.filter(p=>p.roc).map(p=>feature({},multi(p.polygons)))),
 'inland.json':inland
},'-dissolve2 -lines -clip inland.json');
const readROC=file=>JSON.parse(fs.readFileSync(rocBase+file,'utf8')).records;
snapshots.push({year:1949,date:'1949-12-31',field:'roc',frontier:rocFrontier,fullLand:true,dissolvedBoundaries:true,units:rocUnits,
 frontierBetween:(a,b)=>['ROC reference','ROC claim'].includes(a.type)!==['ROC reference','ROC claim'].includes(b.type),
 points:{capitals:readROC('capitals.json'),municipalities:readROC('settlements.json')}});
// Historical province geometry partitions the existing Ming land mask. The source
// shoreline never becomes a second land fill.
console.log('Fitting Ming provinces to atlas land.');
const mingSource=JSON.parse(gunzipSync(fs.readFileSync(sources+'ming-provinces.geojson.gz')));
const mingPeriod=read(sources+'circuits.json')[1430];
const mingSnapshot=snapshots.find(s=>s.year===1430);
const provinceShapes=(await command(mingSource,'-dissolve key -clean gap-width=0 -simplify interval=1200 keep-shapes')).features;
const mingUnits=Object.fromEntries(provinceShapes.map(f=>{
 const key=f.properties.key,[name,zh,capital]=mingPeriod.circuits[key],kind=mingPeriod.circuits[key][4]||mingPeriod.type;
 const id='1430-circuit-'+name.toLowerCase().replaceAll(' ','-');
 return [id,{name,zh,capital,type:kind==='Capital district'?'Capital district':kind==='Military commission'?'Military commission':'Province',
  note:'Boundary position unverified for 1430. Based on the approximate Hartwell Ming reconstruction, labelled 1391 but containing later divisions. Fitted to atlas land.',
  boundaryStatus:'unverified-1430',statusSource:manifest.ming1430.source,statusSourceLabel:'Hartwell / CHGIS Ming reconstruction'}];
}));
const mingLand=fc(combined.filter(p=>p[mingSnapshot.field]==='ming').map(p=>feature({},multi(p.polygons))));
const partition=(await command({'provinces.json':fc(provinceShapes),'land.json':mingLand},'-clip land.json -clean gap-width=0 -dissolve key')).features.filter(f=>f.geometry&&polygons(f.geometry).length);
const uncovered=(await command({'land.json':mingLand,'provinces.json':fc(partition)},'-erase provinces.json -explode')).features.filter(f=>f.geometry&&polygons(f.geometry).length);
assert(uncovered.length||Math.abs(area(mingLand.features.flatMap(f=>polygons(f.geometry)))-area(partition.flatMap(f=>polygons(f.geometry))))<1,'Ming missing land must remain available for coastline reconciliation');
// Differences between reconstructed and current coastlines belong to coastal
// provinces. Keep this correction in a coastal band so it cannot spread north
// over the actual frontier. These assignments retain the 1430 uncertainty flag.
const coastProvince={130000:'Northern Metropolitan Region',120000:'Northern Metropolitan Region',210000:'Liaodong',
 310000:'Southern Metropolitan Region',320000:'Southern Metropolitan Region',330000:'Zhejiang',350000:'Fujian',
 370000:'Shandong',440000:'Guangdong',450000:'Guangdong',460000:'Guangdong',710000:'Fujian',810000:'Guangdong',820000:'Guangdong'};
const coastalInland=await command(coast,'-simplify interval=400 keep-shapes -buffer radius=-50000');
const coastalRepairs=(await command({
 'provinces.json':fc(provinces.features.filter(f=>coastProvince[f.properties.province]).map(f=>feature({key:coastProvince[f.properties.province]},f.geometry))),
 'gaps.json':fc(uncovered),'inland.json':coastalInland
},'-clip gaps.json -erase inland.json')).features.filter(f=>f.geometry&&polygons(f.geometry).length);
const remaining=(await command({'gaps.json':fc(uncovered),'coastal.json':fc(coastalRepairs)},'-erase coastal.json -explode')).features.filter(f=>f.geometry&&polygons(f.geometry).length);
partition.push(...coastalRepairs);
const reference=partition.map(f=>({province:f.properties.key,polygons:polygons(f.geometry)}));
const missing=remaining.map(f=>({polygons:polygons(f.geometry)}));
nearestUnit([...reference,...missing],'province',{limit:.25,only:p=>area(p.polygons)<1500,distance:(p,q)=>{
 const [x,y]=p.center??=centre(p);let best=Infinity;
 for(const polygon of q.polygons)for(const ring of polygon)for(const [a,b] of ring)best=Math.min(best,Math.hypot((a-x)*Math.cos(y*Math.PI/180),b-y));return best;
}});
const fittedMing=fc([...partition,...missing.filter(p=>p.province).map(p=>feature({key:p.province},multi(p.polygons)))]);
const previous=new Map(combined.map((p,i)=>[String(i),p]));
const dividedMing=(await command(fc([
 ...combined.map((p,i)=>feature({layer:'previous',piece:String(i),province:null},multi(p.polygons))),
 ...fittedMing.features.map(f=>feature({layer:'ming',piece:null,province:'1430-circuit-'+f.properties.key.toLowerCase().replaceAll(' ','-')},f.geometry))
]),'-split layer -clean target=previous gap-width=0 -clean target=ming gap-width=0 -union target=* fields=piece,province -clean gap-width=0 -explode')).features.filter(f=>f.geometry&&polygons(f.geometry).length);
const provincePieces=dividedMing.filter(f=>f.properties.piece_1!=null).map(f=>{
 const p=previous.get(String(f.properties.piece_1));assert(p,'Ming split remains on atlas land');
 return {...p,[mingSnapshot.field]:p[mingSnapshot.field]==='ming'?(f.properties.province_2||'ming'):p[mingSnapshot.field],polygons:polygons(f.geometry)};
});
// Reconcile southern Yunnan after the final overlay: its narrow residuals can be
// recreated by the independent province/land topologies during that overlay.
// Reassign whole small pieces already belonging to Ming, without moving any edge.
// Both atlas Yunnan and the nearby historical reconstruction must contain the
// interior probe; northern/western frontier land and foreign states stay intact.
const yunnanBand=await command(fc(provinceShapes.filter(f=>f.properties.key==='Yunnan')),'-buffer radius=10000');
const inYunnan=landIndex(provinces.features.filter(f=>f.properties.province===530000).flatMap(f=>polygons(f.geometry)).flat());
const nearYunnan=landIndex(yunnanBand.features.flatMap(f=>polygons(f.geometry)).flat());
const yunnanResiduals=provincePieces.flatMap((p,i)=>{
 if(p[mingSnapshot.field]!=='ming'||area(p.polygons)>=1500)return [];
 const [[w,s],[e,n]]=geographicBounds(multi(p.polygons));
 return w>=98&&e<=106.5&&s>=21&&n<25?[feature({i},multi(p.polygons))]:[];
});
const yunnanProbes=await command(fc(yunnanResiduals),'-points inner');
let yunnanRepairs=0;
for(const f of yunnanProbes.features)if(f.geometry&&inYunnan(f.geometry.coordinates)&&nearYunnan(f.geometry.coordinates)){
 provincePieces[f.properties.i][mingSnapshot.field]='1430-circuit-yunnan';yunnanRepairs++;
}
console.log('Southern Yunnan: '+yunnanRepairs+' residual pieces returned to the province.');
// Check source-backed extensions as well as the province ownership after all overlays.
for(const [point,field,key] of [
 [[105.85,21.03],'han','han'],[[105.85,21.03],'threeKingdoms','wu'],[[105.85,21.03],'tang','tang'],
 [[125.716,38.958],'han','han'],[[125.716,38.958],'threeKingdoms','cao-wei'],
 [[136.34,47.09],'ming','ming']
])assert(provincePieces.some(p=>p[field]===key&&landIndex(p.polygons.flat())(point)),field+' retains dated land at '+point);
// A coastal repair must not absorb another province.
for(const [point,ming,qing,roc] of [
 [[115.86,28.68],'1430-circuit-jiangxi','25043','ROC-JIANGXI'],
 [[119.3,26.08],'1430-circuit-fujian','25034','ROC-FUJIAN'],
 [[120.15,30.27],'1430-circuit-zhejiang','25035','ROC-ZHEJIANG']
]){
 const hits=provincePieces.filter(p=>landIndex(p.polygons.flat())(point));
 assert.equal(hits.length,1,'Exactly one owner at '+point);
 assert.equal(hits[0][mingSnapshot.field],ming,'Ming owner at '+point);
 assert.equal(hits[0].qing,qing,'Qing owner at '+point);
 assert.equal(hits[0].roc,roc,'ROC owner at '+point);
}
// Beyond the provincial reconstruction, retain the dated polity rather than
// extending a nearby province over the frontier.
mingSnapshot.units.ming={...mingSnapshot.units.ming,name:'Ming frontier areas',zh:'明朝邊疆',type:'Frontier region',note:'Provincial assignment and boundary position unverified for 1430. This area retains the existing dated polity reconstruction.'};
mingSnapshot.units={...mingSnapshot.units,...mingUnits};
mingSnapshot.dissolvedBoundaries=true;
const exterior=combined.filter(p=>p.external).map(p=>p.polygons).flat();

// Simplification affects only the largest-share selection lookup, never drawn land.
const lookupProvinces=(await command(provinces,'-simplify interval=1500 keep-shapes')).features.map(f=>({id:String(f.properties.province),polygons:polygons(f.geometry)}));
const lookupRegions=(await command(fc(provincePieces.filter(p=>p[mingSnapshot.field]).map(p=>feature({key:p[mingSnapshot.field]},multi(p.polygons)))),'-dissolve2 key -simplify interval=1500 keep-shapes')).features;
// Measure largest-share ownership with the same normalized topology overlay used
// for the drawn mosaic. Independent polygon intersections can fail on coincident
// vertices of the detailed shared Vietnam/China coastline.
const lookupFaces=(await command(fc([
 ...lookupProvinces.map(p=>feature({layer:'province',province:p.id,owner:null},multi(p.polygons))),
 ...lookupRegions.map(f=>feature({layer:'dated',province:null,owner:f.properties.key},f.geometry))
]),'-split layer -clean target=province gap-width=0 -clean target=dated gap-width=0 -union target=* fields=province,owner -clean gap-width=0')).features;
const lookupShares={};
for(const f of lookupFaces){const {province_1:province,owner_2:owner}=f.properties;if(!f.geometry||!province||!owner)continue;const totals=lookupShares[province]??={};totals[owner]=(totals[owner]||0)+area(polygons(f.geometry));}
const mingLookup=Object.fromEntries(Object.entries(lookupShares).map(([id,totals])=>[id,Object.entries(totals).sort((a,b)=>b[1]-a[1])[0][0]]));
for(const snapshot of snapshots.filter(s=>s.year<1430)){
 const covered=fc(provincePieces.filter(p=>p[snapshot.field]).map(p=>feature({},multi(p.polygons))));
 snapshot.frontier=await command({'regions.json':covered,'inland.json':inland},'-dissolve2 -lines -clip inland.json');
 snapshot.dissolvedBoundaries=true;
}
console.log('Writing the shared historical mosaic.');
const result=await writeMosaic({
 pieces:provincePieces,snapshots,out,label:'China dated boundaries',tolerance:250,cleanRoundedFaces:true,
 firstLevel:[...display.provinces.features.map(f=>({id:String(f.properties.adcode),polygons:polygons(f.geometry)})),{polygons:exterior}],

 partOf:(s,units)=>{
  if(s.fullLand)return {};
  const index=new Map(units.map((u,i)=>[u.key,i]));
  if(s.year===1430)return Object.fromEntries(Object.entries(mingLookup).map(([id,key])=>[id,index.get(key)]));
  const totals={};
  for(const p of pieces)if(p[s.field]){const t=totals[p.province]??={};t[p[s.field]]=(t[p[s.field]]||0)+area(p.polygons);}
  return Object.fromEntries(Object.entries(totals).map(([id,t])=>[id,index.get(Object.entries(t).sort((a,b)=>b[1]-a[1])[0][0])]));
 },
 source:{landAreaKm2:display.provinces.features.reduce((n,f)=>n+area(polygons(f.geometry)),0)+area(exterior),name:'Cliopatria (Seshat Global History Databank)',url:manifest.cliopatria.url,lastDate:snapshots.at(-1).date}
});
await addChinaCircuits(out);
console.log('China history: '+own.length+' pieces, '+left.length+' slivers and '+holes.length+' holes filled ('+islands.size+' on small islands, '+coastal.size+' small and coastal), '+result.faces+' faces, '+result.edges+' edges, '+fs.statSync(out).size+' bytes; land '+result.land.toFixed(0)+' km², faces '+result.faceArea.toFixed(0)+' km².');
for(const s of snapshots){
 const tally={};for(const p of combined){const k=p[s.field]||'none';tally[k]=(tally[k]||0)+area(p.polygons);}
 console.log(s.year+': '+Object.entries(tally).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+Math.round(v/1000)+'k').join(', '));
}
