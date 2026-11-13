import {GeoJSONVT} from '@maplibre/geojson-vt';
import {boundHistoricalTileIndex,installHistoricalTileIndexBudget} from '../dist/historical-tile-index.mjs';
import {createSelectionVisibility} from '../dist/selection-visibility.mjs';
import assert from 'node:assert/strict';
import {createHistoricalGeometryBudget,createHistoricalTileBudget} from '../dist/historical-geometry-budget.mjs';
import {encodeGeo,decodeGeo,createGeoDecoder} from '../dist/geo-pack.mjs';
import {contextPolygons,contextLinePaths} from '../dist/modern-context-geometry.mjs';
import {paddedView,reusableHistoricalScope,disjointScopes,changedScopes} from '../dist/context-visibility.mjs';

const workers=[];
const makeWorker=()=>{const worker={terminated:false,postMessage(data){this.data=data;},terminate(){this.terminated=true;}};workers.push(worker);return worker;};
const budget=createHistoricalGeometryBudget({makeWorker,timeoutMs:200,maxBytes:100,maxPoints:20});
const first=budget.run('coast','one').catch(error=>error),second=budget.run('outline','two').catch(error=>error);
assert.equal(workers.length,1,'Only one heavy geometry job starts at a time');
const latest=budget.run('coast','three');
assert.equal((await first).name,'AbortError');assert(workers[0].terminated,'Superseded workers are terminated immediately');
await Promise.resolve();assert.equal(workers.length,2);workers[1].onmessage({data:{blob:new Blob(['ok'])}});await second;await Promise.resolve();assert.equal(workers.length,3);
workers[2].onmessage({data:{blob:new Blob(['latest'])}});assert.equal((await latest).size,6);assert(workers[2].terminated,'Completed workers release their decoded files');
const huge=budget.run('coast','oversized').catch(error=>error);workers.at(-1).onmessage({data:{blob:new Blob(['x'.repeat(101)])}});assert.match((await huge).message,/memory budget/);
const broken=budget.run('outline','crashed').catch(error=>error);workers.at(-1).onerror({message:'worker crashed'});assert.match((await broken).message,/crashed/);
const stalled=budget.run('coast','stalled').catch(error=>error);assert.match((await stalled).message,/time budget/);assert(workers.at(-1).terminated);
const a=budget.run('coast','closing').catch(error=>error),b=budget.run('outline','queued').catch(error=>error);budget.clear();assert.equal((await a).name,'AbortError');assert.equal((await b).name,'AbortError');
assert.equal(budget.snapshot().active+budget.snapshot().queued,0);assert.equal(budget.snapshot().peakActive,1);
const again=budget.run('coast','reopen');workers.at(-1).onmessage({data:{blob:new Blob(['ok'])}});await again;

const feature=(id,coordinates)=>({type:'Feature',properties:{id},geometry:{type:'Polygon',coordinates:[coordinates]}});
const near=feature('visible',[[0,0],[2,0],[2,2],[0,2],[0,0]]),far=feature('offscreen',[[50,50],[52,50],[52,52],[50,52],[50,50]]);
const input={regions:{type:'FeatureCollection',features:[near,far]},settings:[1,2,3]},packed=encodeGeo(input),decoded=decodeGeo(packed,{scope:[.5,.5,1.5,1.5]});
assert.deepEqual(decoded.regions.features,[near],'Offscreen paths are excluded before coordinate expansion');assert.deepEqual(decoded.settings,input.settings);
assert.deepEqual(decodeGeo(packed),input,'Unscoped data keeps all original geometry');
const wrapped=feature('wrapped',[[179,0],[181,0],[181,2],[179,2],[179,0]]);assert.equal(decodeGeo(encodeGeo({type:'FeatureCollection',features:[wrapped]}),{scope:[-181,0,-179,2]}).features.length,1,'Viewport decoding respects longitude wrapping');
const flat={...near,geometry:{...near.geometry,coordinates:[Float64Array.from(near.geometry.coordinates[0].flat())]}};
const clipped=contextPolygons([flat],[.5,.5,1.5,1.5],null,null,null,{preserveProperties:true,clipThreshold:0});
assert(clipped.length);assert(clipped[0].geometry.coordinates[0].every(([x,y])=>x>=.5&&x<=1.5&&y>=.5&&y<=1.5));
assert.deepEqual(contextLinePaths([Float64Array.from([-2,1,2,1])],[0,0,1,2]),[[[0,1],[1,1]]],'Clipped lines retain their real segment');
assert.deepEqual(contextLinePaths([Float64Array.from([-2,3,2,3])],[0,0,1,2]),[],'No line is invented along a viewport boundary');
const scope=paddedView([10,20,10.1,20.1],{minimum:.03});assert(scope[2]-scope[0]<.2,'Close-up history does not load ten degrees of extra land');
console.log('Historical memory safeguards: serial jobs, cancellation, worker crash/timeout/size recovery, reentry, exact scoped decoding, wrapping and clipped geometry passed.');

const manager=limit=>({_maxTileCacheSize:limit,_outOfViewCache:{setMaxSize(value){this.max=value;}},updateCacheSize(){this.restored=true;}});
const historical=manager(null),background=manager(2),listeners=new Map(),map={_camera:{transform:{}},style:{tileManagers:{'uk-history-faces':historical,background}},on(name,fn){listeners.set(name,fn);},off(name){listeners.delete(name);}};
const tiles=createHistoricalTileBudget(map,'uk-history');tiles.start();assert.equal(historical._maxTileCacheSize,32);assert.equal(background._maxTileCacheSize,2,'A tighter existing budget stays tighter');
map.style.tileManagers['uk-history-detail']=manager(null);listeners.get('styledata')();assert.equal(map.style.tileManagers['uk-history-detail']._outOfViewCache.max,4,'New detail sources inherit the cache cap');
delete map.style.tileManagers['uk-history-detail'];listeners.get('styledata')();assert.equal(tiles.snapshot().sources,2,'Removed sources are not retained by the guard');
tiles.stop();assert.equal(historical._maxTileCacheSize,null);assert(historical.restored);assert.equal(background._maxTileCacheSize,2);assert.equal(listeners.size,0);
console.log('Historical tile caches are bounded without changing visible tiles, release removed sources and restore normal settings on exit.');

let refreshes=0;const stateMap={setFeatureState(){},removeFeatureState(){}},visibility=createSelectionVisibility(stateMap,()=>refreshes++);
visibility.batch(()=>{for(let id=0;id<10000;id++)stateMap.setFeatureState({source:'empire',id},{selected:true});});assert.equal(refreshes,1,'Thousands of historical faces cause one visibility refresh');assert.equal(visibility.ids('empire',['selected']).length,10000);
visibility.batch(()=>{for(let id=0;id<10000;id++)stateMap.removeFeatureState({source:'empire',id},'selected');});assert.equal(refreshes,2);assert.equal(visibility.active('empire',['selected']),false);assert.equal(visibility.ids('empire',['selected']).length,0);
console.log('Ten thousand selected faces refresh visibility once and release their state records on deselection.');

assert(!reusableHistoricalScope([-180,-80,180,80],[174.7,-36.9,174.8,-36.8]),'Zooming into a contained city releases the old global loading window');assert(reusableHistoricalScope(paddedView([174.7,-36.9,174.8,-36.8],{minimum:.03}),[174.7,-36.9,174.8,-36.8]));

const ring=[];for(let i=0;i<1500;i++){const a=i/1500*Math.PI*2,r=2+.1*Math.sin(a*37);ring.push([-73+r*Math.cos(a),42+r*Math.sin(a)]);}ring.push(ring[0]);
const shapes={type:'FeatureCollection',features:[{type:'Feature',properties:{id:1},geometry:{type:'Polygon',coordinates:[ring,[[-73,41.9],[-73,42.1],[-72.8,42.1],[-72.8,41.9],[-73,41.9]]]}},{type:'Feature',properties:{id:2},geometry:{type:'LineString',coordinates:[[-179,0],[179,0]]}}]};
const options={tolerance:0,maxZoom:16,indexMaxPoints:100,extent:8192,buffer:128,promoteId:'id'},normal=new GeoJSONVT(shapes,{...options,indexMaxZoom:5}),bounded=boundHistoricalTileIndex(new GeoJSONVT(shapes,{...options,indexMaxZoom:0}),{maxTiles:4,maxPoints:10000});
for(let repeat=0;repeat<4;repeat++)for(const z of [0,3,5,8,12,14,6,9,4])for(const [lng,lat]of [[-73,42],[-74,41],[178,0],[-179,0],[174,-37]]){
 const n=2**z,x=Math.floor((lng+180)/360*n),y=Math.floor((1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2*n),expected=normal.getTile(z,x,y),actual=bounded.getTile(z,x,y);
 assert.deepEqual(actual?.features,expected?.features,'Native tile coordinates and hole geometry are exact at '+z+'/'+x+'/'+y);
 assert(Object.keys(bounded.tileIndex.tiles).length<=5,'Generated ancestor tiles do not accumulate');assert(bounded._atlasHistoricalTileBudget().points<=10000);
}
const instances={},worker={workerSources:{},_getWorkerSource(map,type,name){return instances[name]??={_createGeoJSONIndex:(data,params)=>new GeoJSONVT(data,params.geojsonVtOptions)};}};
installHistoricalTileIndexBudget(worker);const guarded=worker._getWorkerSource('test','geojson','united-kingdom-history-faces')._createGeoJSONIndex(shapes,{geojsonVtOptions:options});assert(guarded._atlasHistoricalTileBudget);const other=worker._getWorkerSource('test','geojson','ordinary-modern')._createGeoJSONIndex(shapes,{geojsonVtOptions:options});assert(!other._atlasHistoricalTileBudget,'Modern indexes retain their existing policy');
console.log('Actual geojson-vt: 180 varied/repeated tile requests preserve native geometry exactly, including holes/wrapping, while bounding the internal tile cache.');

const windows=[[0,0,3,3],[2,0,4,3]],rects=disjointScopes(windows),area=box=>(box[2]-box[0])*(box[3]-box[1]);
assert.equal(rects.reduce((n,b)=>n+area(b),0),12,'Overlapping scopes cover their union exactly once');
assert.deepEqual(decodeGeo(packed,{scope:[[.5,.5,1.5,1.5],[50,50,51,51]]}).regions.features,[near,far],'Only features in either retained window are expanded');
const {loadAtlasData}=await import('../dist/atlas-data.mjs');
const polygon=feature('land',[[0,0],[4,0],[4,3],[0,3],[0,0]]);polygon.geometry.coordinates.push([[1,1],[1,2],[2,2],[2,1],[1,1]]);
const unionBlob=URL.createObjectURL(new Blob([encodeGeo({faces:{type:'FeatureCollection',features:[polygon]}})]));
try{
 const params=new URLSearchParams({url:unionBlob,member:'faces',transform:'parts'});for(const window of windows)params.append('scope',window.join(','));
 const union=await loadAtlasData('atlas-data://union?'+params);
 const ringArea=ring=>Math.abs(ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2);
 assert.equal(union.features.reduce((sum,f)=>sum+ringArea(f.geometry.coordinates[0])-f.geometry.coordinates.slice(1).reduce((n,r)=>n+ringArea(r),0),0),11,'Shared-window clipping preserves holes without overlapping selection pixels');
}finally{URL.revokeObjectURL(unionBlob);}
console.log('Two-window overview: exact union, early decoding, holes and single-coverage fills passed.');

const reusable=createGeoDecoder(packed),initial=reusable().value;initial.regions.features[0].properties.id='changed';initial.regions.features[0].geometry.coordinates[0][0][0]=100;
assert.deepEqual(reusable().value,input,'Reused packed data is isolated from decoded property and geometry edits');
assert.deepEqual(reusable({scope:[50,50,51,51]}).value.regions.features,[far],'A reused reader does not retain the last viewport');
const cachedBlob=URL.createObjectURL(new Blob([encodeGeo({faces:{type:'FeatureCollection',features:[near,far]}})]));
try{
 const request='atlas-data://united-kingdom-history?'+new URLSearchParams({url:cachedBlob,member:'faces',transform:'parts',scope:'0,0,3,3'});
 const first=await loadAtlasData(request);first.features[0].properties.id='edited';
 assert.equal((await loadAtlasData(request)).features[0].properties.id,'visible','Worker snapshot reuse keeps feature properties independent');
 const controller=new AbortController();controller.abort();await assert.rejects(loadAtlasData(request,controller.signal),{name:'AbortError'});
}finally{URL.revokeObjectURL(cachedBlob);}
console.log('Reusable packed snapshots: exact paths, independent geometry/properties, fresh viewport selection and cancellation passed.');

const shallow=boundHistoricalTileIndex(new GeoJSONVT(shapes,{...options,indexMaxZoom:3}),{maxTiles:4,maxPoints:10000});
assert(shallow._atlasHistoricalTileBudget().baseTiles>1,'The fixture exercises a pre-split native root');
for(let repeat=0;repeat<3;repeat++)for(const z of [4,8,12,6,3,9])for(const [lng,lat]of [[-73,42],[-74,41],[178,0],[-179,0]]){
 const n=2**z,x=Math.floor((lng+180)/360*n),y=Math.floor((1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2*n);
 assert.deepEqual(shallow.getTile(z,x,y)?.features,normal.getTile(z,x,y)?.features,'Shallow native indexing retains exact coordinates at '+z+'/'+x+'/'+y);
 const budget=shallow._atlasHistoricalTileBudget();assert(budget.baseTiles<=85);assert(Object.keys(shallow.tileIndex.tiles).length<=budget.baseTiles+4);assert(budget.points<=10000);
}
console.log('Pre-split native indexes: exact repeated tiles, bounded deep cache and preserved fast native leaves passed.');

const preservedTile={tileID:{canonical:{z:4,x:4,y:4}}},removedTile={tileID:{canonical:{z:4,x:9,y:4}}};
const tileCache={tiles:[preservedTile,removedTile],setMaxSize(){},reset(){this.tiles=[];},filter(test){this.tiles=this.tiles.filter(test);}};
const gpuManager={_maxTileCacheSize:48,_outOfViewCache:tileCache,_dataHandler(event){if(event.sourceDataType==='content')this.reload();},reload(){this._outOfViewCache.reset();},updateCacheSize(){}};
const gpuHandler=gpuManager._dataHandler,gpuMap={_camera:{transform:{}},style:{tileManagers:{'uk-history-faces':gpuManager}},on(){},off(){}};
const gpuBudget=createHistoricalTileBudget(gpuMap,'uk-history');gpuBudget.start();gpuBudget.preserve([[-100,0,-50,80]],[[-100,0,-50,80],[0,0,50,80]]);gpuManager._dataHandler({sourceDataType:'metadata'});gpuManager._dataHandler({sourceDataType:'content'});
assert.deepEqual(tileCache.tiles,[preservedTile],'Buffered tiles outside added or removed coverage survive an overview extension');
gpuBudget.preserve([[-100,0,-50,80]],[[-100,0,-50,80],[0,0,50,80]]);gpuManager.reload();assert.deepEqual(tileCache.tiles,[],'Style reloads retain native cache invalidation');gpuBudget.stop();assert.equal(gpuManager._dataHandler,gpuHandler,'The native content handler is restored on exit');
console.log('Rendered overview reuse: unchanged buffered tiles survive, changed tiles expire, styles invalidate and exit restores native behavior.');


assert.equal(changedScopes([[0,0,3,3]],[[0,0,3,3],[2,0,4,3]]).reduce((n,b)=>n+area(b),0),3,'Only newly covered geographic pixels invalidate rendered tiles');
assert.deepEqual(changedScopes([[179,0,181,2]],[[-181,0,-179,2]]),[],'Equivalent wrapped coverage does not invalidate tiles');
assert.deepEqual(changedScopes(windows,windows),[],'Unchanged coverage preserves its rendered tiles');
