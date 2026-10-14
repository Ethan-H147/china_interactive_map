import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {lineData,lineSourceOptions,internationalLineSourceOptions,regionalLineWidth,internationalBorderPaint,addInternationalBorder,borderSegments,omitBorderSegments} from '../dist/adaptive-lines.mjs';
import {configurations} from '../dist/southern-africa.mjs';

const require=createRequire(import.meta.url);
const {GeoJSONVT}=await import(pathToFileURL(path.join(path.dirname(require.resolve('@maplibre/geojson-vt')),'geojson-vt.mjs')));
const bundle=JSON.parse(gunzipSync(fs.readFileSync('dist/data/southern-africa/south-africa/all.bin')));
const key=(a,b)=>[a.join(','),b.join(',')].sort().join('|');
const edges=g=>new Set((g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat():g.type==='LineString'?[g.coordinates]:g.coordinates).flatMap(p=>p.slice(1).map((v,i)=>key(p[i],v))));
const ubuntu=bundle.levels[2].regions.features.find(f=>f.properties.id==='ZA-M-ubuntu');
const karoo=bundle.levels[2].regions.features.find(f=>f.properties.id==='ZA-M-karoo-hoogland');
const karooEdges=edges(karoo.geometry),shared=[...edges(ubuntu.geometry)].filter(e=>karooEdges.has(e));
const district=bundle.levels[1].boundaries.features.filter(f=>f.properties.owners.includes('ZA-D-namakwa')&&f.properties.owners.includes('ZA-D-pixley-ka-seme'));
const districtEdges=new Set(district.flatMap(f=>[...edges(f.geometry)]));
assert(shared.length>0);assert(shared.every(e=>districtEdges.has(e)),'The complete Ubuntu–Karoo Hoogland seam is supplied by the district outline');

const tolerance=configurations['south-africa'].lineTolerance;
const allLines=lineData({type:'FeatureCollection',features:bundle.levels.flatMap(p=>p.boundaries.features)});
const options=tolerance=>({maxZoom:lineSourceOptions.maxzoom,extent:8192,buffer:lineSourceOptions.buffer*16,tolerance:tolerance*16});
const previous=new GeoJSONVT(allLines,options(lineSourceOptions.tolerance)),current=new GeoJSONVT(allLines,options(tolerance));
const points=tile=>tile?.features.reduce((n,f)=>n+f.geometry.reduce((s,p)=>s+p.length,0),0)||0;
let before=0,after=0;
for(let x=8;x<=9;x++)for(let y=8;y<=10;y++){before+=points(previous.getTile(4,x,y));after+=points(current.getTile(4,x,y));}
assert(after<before*.8,'Country view removes substantially more subpixel bends');
const seamPath=district[0].geometry.coordinates.slice().sort((a,b)=>b.length-a.length)[0];
const point=seamPath[Math.floor(seamPath.length/2)],tileAt=(z)=>[Math.floor((point[0]+180)/360*2**z),Math.floor((1-Math.log(Math.tan(Math.PI/4+point[1]*Math.PI/360))/Math.PI)/2*2**z)];
const seamLines=lineData({type:'FeatureCollection',features:district}),detail=new GeoJSONVT(seamLines,options(tolerance)),exact=new GeoJSONVT(seamLines,options(0));
const high=tileAt(18),highDetail=detail.getTile(18,...high),highExact=exact.getTile(18,...high);
assert(highDetail&&highExact,'Representative shared border remains present up close');
assert.deepEqual(highDetail.features.map(f=>f.geometry),highExact.features.map(f=>f.geometry),'Maximum zoom restores original border detail');
console.log('Ubuntu–Karoo Hoogland:',shared.length,'shared segments present. Zoom 4 line vertices:',before,'→',after,'with full detail retained at zoom 18.');

// Compare the rendered stroke against the actual filled frontier in CSS pixels.
// Vertex-count tests alone do not catch a smooth line drifting off a detailed fill.
const readCountry=(country,file)=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/southern-africa/'+country+'/'+file)));
const international=readCountry('south-africa','international.bin');
const corrected=new GeoJSONVT(international,options(internationalLineSourceOptions.tolerance));
const legacy=new GeoJSONVT(international,options(tolerance));
const widthAt=zoom=>{const expression=regionalLineWidth(1),stops=[];for(let i=3;i<expression.length;i+=2)stops.push([expression[i],expression[i+1]]);if(zoom<=stops[0][0])return stops[0][1];for(let i=1;i<stops.length;i++)if(zoom<=stops[i][0]){const [z,a]=stops[i-1],[next,b]=stops[i];return a+(b-a)*(zoom-z)/(next-z);}return stops.at(-1)[1];};
const mercator=lat=>(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2;
function segmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function frontierError(tiles,coordinates,zoom){
 const cache=new Map();let maximum=0;
 for(const p of coordinates){const projected=[(p[0]+180)/360*2**zoom*8192,mercator(p[1])*2**zoom*8192],tile=projected.map(v=>Math.floor(v/8192)),id=tile.join(','),local=projected.map((v,i)=>v-tile[i]*8192);
  if(!cache.has(id))cache.set(id,tiles.getTile(zoom,...tile)?.features.flatMap(f=>f.geometry)||[]);
  let nearest=Infinity;for(const path of cache.get(id))for(let i=1;i<path.length;i++)nearest=Math.min(nearest,segmentDistance(local,path[i-1],path[i]));maximum=Math.max(maximum,nearest/16);
 }return maximum;
}

const compressed=file=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/'+file)));
const chinaShared=compressed('shared-context-borders.bin'),russiaShared=compressed('russia/international.bin');
for(const [name,collection] of [['China–Mongolia',chinaShared],['Russia–Mongolia',russiaShared]]){
 const lines={type:'FeatureCollection',features:collection.features.filter(f=>f.properties.neighbor==='mongolia')};
 assert(lines.features.length,'The representative frontier exists');
 const coordinates=lines.features.flatMap(f=>f.geometry.coordinates),tiles=new GeoJSONVT(lines,options(internationalLineSourceOptions.tolerance));
 for(const zoom of [3,4,5,6])assert(frontierError(tiles,coordinates,zoom)<widthAt(zoom)/2,name+' stays inside the common stroke');
 console.log(name+': identical gray, width and simplification; low-zoom stroke covers the original frontier.');
}
const excluded=borderSegments({features:[...chinaShared.features,...russiaShared.features]});
const display=(await import('./read-data.mjs')).readData('display-boundaries.json');
const filtered=omitBorderSegments(display.boundaries.province,excluded);
assert([...borderSegments(lineData(filtered))].every(key=>!excluded.has(key)),'China subdivision strokes never duplicate resolved international segments');
assert(filtered.coordinates.length>0,'Ordinary provincial boundaries remain');
const callbacks=new Map(),layers=[];
const map={addLayer:l=>layers.push(l),on:(event,fn)=>callbacks.set(event,fn),getStyle:()=>({layers:layers.slice()}),moveLayer(id){const i=layers.findIndex(l=>l.id===id);layers.push(...layers.splice(i,1));}};
for(const id of ['shared-context-borders','russia-international','south-land-boundaries','korea-countries-lines'])addInternationalBorder(map,id,id);
for(const layer of layers)assert.deepEqual(layer.paint,internationalBorderPaint(),'Every renderer uses exactly the same paint');
layers.push({id:'later-country-fill',type:'fill'});callbacks.get('styledata')();await new Promise(resolve=>queueMicrotask(resolve));
assert.equal(layers[0].id,'later-country-fill','New country fills stay below every international stroke');
for(const file of ['dist/regional-country.mjs','dist/south-america.mjs','dist/korea.js','dist/app.js'])assert(fs.readFileSync(file,'utf8').includes('addInternationalBorder('),file+' uses the universal border renderer');
assert(!fs.readFileSync('dist/mongolia.mjs','utf8').includes("['second','first','countries']"),'Mongolia has no duplicate exterior stroke');
assert(fs.readFileSync('dist/motion.mjs','utf8').includes('if(layer.metadata?.atlasInternationalBorder)continue'),'Camera movement retains exact international geometry');
for(const country of ['lesotho','eswatini']){
 const outline=readCountry(country,'context.bin'),coordinates=outline.features.flatMap(f=>(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).flat().flat());
 let oldWorst=0,newWorst=0;
 for(const zoom of [3,4,5,6]){
  const prior=frontierError(legacy,coordinates,zoom),error=frontierError(corrected,coordinates,zoom),halfStroke=widthAt(zoom)/2;oldWorst=Math.max(oldWorst,prior);newWorst=Math.max(newWorst,error);
  assert(prior>halfStroke,'Reproduce the original line/fill drift at low zoom');assert(error<halfStroke,country+' frontier stays covered by the thin stroke at zoom '+zoom);
 }
 const detail=lineData(outline),simplified=new GeoJSONVT(detail,options(internationalLineSourceOptions.tolerance)),raw=new GeoJSONVT(detail,options(0)),p=coordinates[0],tile=[Math.floor((p[0]+180)/360*16),Math.floor(mercator(p[1])*16)];
 assert(points(simplified.getTile(4,...tile))<points(raw.getTile(4,...tile))*.5,'International strokes still discard subpixel detail');
 const highTile=[Math.floor((p[0]+180)/360*2**18),Math.floor(mercator(p[1])*2**18)];assert.deepEqual(simplified.getTile(18,...highTile)?.features.map(f=>f.geometry),raw.getTile(18,...highTile)?.features.map(f=>f.geometry),'Full international detail returns at maximum zoom');
 console.log(country+' frontier: worst low-zoom drift '+oldWorst.toFixed(2)+' → '+newWorst.toFixed(2)+' px; stays inside the stroke.');
}
