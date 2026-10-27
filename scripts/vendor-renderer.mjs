import fs from 'node:fs';
import assert from 'node:assert/strict';
const library=new URL('../node_modules/maplibre-gl/',import.meta.url);
const output=new URL('../dist/vendor/',import.meta.url);
assert.equal(JSON.parse(fs.readFileSync(new URL('package.json',library),'utf8')).version,'6.11.2','Review renderer patches before upgrading MapLibre');
for(const name of ['maplibre-gl.mjs','maplibre-gl-shared.mjs','maplibre-gl-worker.mjs','maplibre-gl.css']){
  fs.copyFileSync(new URL('dist/'+name,library),new URL(name,output));
}
fs.copyFileSync(new URL('LICENSE.txt',library),new URL('maplibre-LICENSE.txt',output));
// A GeoJSON source loaded from a URL normally copies its parsed data back to the
// page so GeoJSONSource.getData() can return it. The atlas never reads source
// data back, and that copy of China's full geometry blocked the main thread.
const worker=new URL('maplibre-gl-worker.mjs',output),code=fs.readFileSync(worker,'utf8'),returnData='e.request&&(n.data=e.data),';
assert.equal(code.split(returnData).length,2,'MapLibre worker changed; review the GeoJSON data-return patch');
fs.writeFileSync(worker,code.replace(returnData,''));

// Keep source coverage reuse scoped to a single native source-update pass. The
// original covering algorithm remains the fallback and all tile lifecycles run.
const renderer=new URL('maplibre-gl.mjs',output);
let main=fs.readFileSync(renderer,'utf8');
const coverage='n=Fo(e,{tileSize:this.usedForTerrain?this.tileSize:this._source.tileSize';
const update='_updateSources(e){for(let t in this.tileManagers)this.tileManagers[t].update(e,this.map.terrain)}';
for(const needle of [coverage,update])assert.equal(main.split(needle).length,2,'MapLibre changed; review source coverage reuse');
main=main.replace(coverage,'n=atlasCoveringTiles(Fo,e,{tileSize:this.usedForTerrain?this.tileSize:this._source.tileSize');
main=main.replace(update,'_updateSources(e){return atlasRunSourceUpdate(e,()=>{for(let t in this.tileManagers)this.tileManagers[t].update(e,this.map.terrain)})}');

// Native symbol ordering includes extra fading tiles and a bearing-dependent sort.
// Sources without visible symbols and sources unused by every layer need no list.
const tileDraws='a={},o={},s={};for(let e in i){let t=i[e];t.used&&t.prepare(this.context),a[e]=t.getVisibleCoordinates(!1),o[e]=a[e].slice().reverse(),s[e]=t.getVisibleCoordinates(!0).reverse()}';
assert.equal(main.split(tileDraws).length,2,'MapLibre changed; review tile draw-list pruning');
main=main.replace(tileDraws,'a={},o={},s={};const atlasTileDraws=atlasPrepareTileDraws(this);for(let e in i){let t=i[e];t.used&&t.prepare(this.context),a[e]=atlasVisibleCoordinates(t,!1,atlasTileDraws,e),o[e]=a[e].slice().reverse(),s[e]=atlasVisibleCoordinates(t,!0,atlasTileDraws,e).reverse()}');

const shared=new URL('maplibre-gl-shared.mjs',output),sharedCode=fs.readFileSync(shared,'utf8');
const statePaint='s.expression=r.paint.get(n).value,s.updatePaintArray';
assert.equal(sharedCode.split(statePaint).length,2,'MapLibre changed; review pending feature-state paint updates');
fs.writeFileSync(shared,"import {statePaintExpression as atlasStatePaintExpression} from '../globe-renderer.mjs';\n"+sharedCode.replace(statePaint,'s.expression=atlasStatePaintExpression(r.paint.get(n).value),s.updatePaintArray'));

const globePan='handleMapControlsPan(e,t,n){e.panDelta&&el(t,n,t.isPointOnMapSurface(e.around)?e.around:t.centerPoint,e.panDelta)}';
assert.equal(main.split(globePan).length,2,'MapLibre changed; review free Antarctic globe dragging');
main=main.replace(globePan,globePan.replace('e.panDelta)}','e.panDelta,!globalThis.AtlasCountries?.countries[globalThis.AtlasEntry?.current]?.freeGlobePan)}'));

// The orientation may cross a pole. Use a bounded zoom scale there instead of
// the Mercator singularity, including symbol sizing and zoom compensation.
const polarScales=[
 // Trackpad scroll uses panBy rather than the pointer handlers. Apply the same
 // free rotation and present the new pose on the next frame, preserving grouping.
 ['panBy(e,t,n){return e=N.convert(e).mult(-1),this.panTo(this.transform.center,R({offset:e},t),n)}',
  'panBy(e,t,n){if(atlasFreeGlobePan()&&this.cameraHelper.useGlobeControls){let r=this.transform.clone(),i=N.convert(e).mult(-1);el(r,r.center,r.centerPoint.add(i),i,!1);return this.easeTo(R({},t,{center:r.center,zoom:r.zoom,bearing:r.bearing,easing:()=>1}),n)}return e=N.convert(e).mult(-1),this.panTo(this.transform.center,R({offset:e},t),n)}'],
 ['function qc(e,t){return e/(2*Math.PI)/Math.cos(t*Math.PI/180)}','function qc(e,t){return e/(2*Math.PI)/atlasLatitudeScale(t)}'],
 ['function il(e){return Math.cos(e*Math.PI/180)}','function il(e){return atlasLatitudeScale(e)}'],
 ['getPixelScale(){return 1/Math.cos(this._helper._center.lat*Math.PI/180)}','getPixelScale(){return 1/atlasLatitudeScale(this._helper._center.lat)}'],
 ['getCircleRadiusCorrection(){return Math.cos(this._helper._center.lat*Math.PI/180)}','getCircleRadiusCorrection(){return atlasLatitudeScale(this._helper._center.lat)}'],
 // Native inertia eases longitude/latitude with a fixed bearing and clamps at
 // 85°, undoing a free pole crossing on release. End these drags where released.
 ['let e=this._inertia._onMoveEnd(this._map.dragPan._inertiaOptions),t=e=>e!==0&&-this._bearingSnap<e&&e<this._bearingSnap;',
  'let e=atlasFreeGlobePan()?(this._inertia.clear(),void 0):this._inertia._onMoveEnd(this._map.dragPan._inertiaOptions),t=e=>!atlasFreeGlobePan()&&e!==0&&-this._bearingSnap<e&&e<this._bearingSnap;']
];
for(const [before,after]of polarScales){assert.equal(main.split(before).length,2,'MapLibre changed; review polar camera scale and release behavior');main=main.replace(before,after);}

fs.writeFileSync(renderer,"import {latitudeScale as atlasLatitudeScale,freeGlobePan as atlasFreeGlobePan} from '../globe-navigation.mjs';\nimport {coveringTiles as atlasCoveringTiles,runSourceUpdate as atlasRunSourceUpdate,prepareTileDraws as atlasPrepareTileDraws,visibleCoordinates as atlasVisibleCoordinates} from '../globe-renderer.mjs';\n"+main);
