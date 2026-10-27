import assert from 'node:assert/strict';
import {attachGlobeRenderer,coveringTiles,runSourceUpdate,setSourceCoverageEnabled,sourceCoverageSnapshot} from '../dist/globe-renderer.mjs';
function fixture(){
 const painter={currentStencilSource:undefined,_tileClippingMaskIDs:{},style:{projection:{useSubdivision:true},_order:['fill'],_layers:{fill:{type:'fill'}}},renderContext:{isRenderingToTexture:false},draws:0,clearStencil(){this.currentStencilSource=undefined;this._tileClippingMaskIDs={};},renderTileClippingMasks(layer,tiles){if(this.currentStencilSource===layer.source||!layer.isTileClipped()||!tiles?.length)return;this.draws+=tiles.length*2;this.currentStencilSource=layer.source;this._tileClippingMaskIDs=Object.fromEntries(tiles.map((t,i)=>[t.key,i+1]));}};
 const handlers=new Map(),map={painter,on(name,handler){handlers.set(name,handler);},off(name){handlers.delete(name);},fire(name){handlers.get(name)?.();},triggerRepaint(){}},control=attachGlobeRenderer(map,{version:'6.11.2'});painter.clearStencil();return {map,painter,control};
}
const layer=(source,clipped=true)=>({source,isTileClipped:()=>clipped}),tiles=(...keys)=>keys.map(key=>({key}));
{
 const {painter:p,control}=fixture();p.renderTileClippingMasks(layer('a'),tiles('0','1'));const ref=p._tileClippingMaskIDs;p.renderTileClippingMasks(layer('b'),tiles('0','1'));assert.equal(p.draws,4);assert.equal(p.currentStencilSource,'b');assert.equal(p._tileClippingMaskIDs,ref);assert.equal(control.snapshot().reusedBatches,1);p.renderTileClippingMasks(layer('c'),tiles('1','0'));assert.equal(p.draws,8,'Tile ordering affects overlap precedence');p.renderTileClippingMasks(layer('d'),tiles('0','1'));assert.equal(p.draws,12,'Only consecutive identical coverage can be reused');
 p.clearStencil();p.renderTileClippingMasks(layer('a'),tiles('0','1'));assert.equal(p.draws,16,'A new frame rebuilds masks');p.currentStencilSource=undefined;p.renderTileClippingMasks(layer('b'),tiles('0','1'));assert.equal(p.draws,20,'Native invalidation rebuilds masks');p._tileClippingMaskIDs={};p.renderTileClippingMasks(layer('c'),tiles('0','1'));assert.equal(p.draws,24,'A changed ref table rebuilds masks');control.setEnabled(false);p.renderTileClippingMasks(layer('d'),tiles('0','1'));assert.equal(p.draws,28);control.destroy();
}
{
 const {map,painter:old,control}=fixture(),fresh=fixture();fresh.control.destroy();map.painter=fresh.painter;
 map.fire('webglcontextlost');map.fire('webglcontextrestored');map.painter.clearStencil();map.painter.renderTileClippingMasks(layer('new-a'),tiles('0'));map.painter.renderTileClippingMasks(layer('new-b'),tiles('0'));assert.equal(map.painter.draws,2,'Restored WebGL painter is optimized');
 old.clearStencil();old.renderTileClippingMasks(layer('old-a'),tiles('0'));old.renderTileClippingMasks(layer('old-b'),tiles('0'));assert.equal(old.draws,4,'Replaced painter no longer retains hooks');control.destroy();
}
for(const name of ['terrain','offscreen','custom','flat','rtt']){
 const {map,painter:p}=fixture();if(name==='terrain')map.terrain={};if(name==='offscreen')p.renderContext.isRenderingToTexture=true;if(name==='custom')p.style._layers.fill.type='custom';if(name==='flat')p.style.projection.useSubdivision=false;if(name==='rtt')p.renderToTexture={};p.clearStencil();p.renderTileClippingMasks(layer('a'),tiles('0','1'));p.renderTileClippingMasks(layer('b'),tiles('0','1'));assert.equal(p.draws,8,name+' retains native rendering');
}
assert.equal(attachGlobeRenderer({on(){},off(){}},{version:'new'}).snapshot().supported,false,'Unknown renderer version falls back');
console.log('Globe mask reuse: ordered consecutive tiles, native invalidation, reference tables, per-frame clears, terrain/raster/custom/flat fallbacks and version guard passed.');

// A source must retain its own tile identifiers, even when traversal is shared.
class TileID{constructor(value){this.value=value;}clone(){return new TileID(this.value);}}
function coverageFixture(){
 let plane={},frustum={};const details={},transform={maxZoom:22,renderWorldCopies:true,tileSize:512,getClippingPlane:()=>plane,getCameraFrustum:()=>frustum,getCoveringTilesDetailsProvider:()=>details};
 const options={tileSize:512,minzoom:0,maxzoom:14,roundZoom:false,reparseOverscaled:true,maxContentElevation:0};let calls=0;
 const native=()=>{calls++;return [new TileID(1),new TileID(2)];};
 return{transform,options,native,get calls(){return calls;},camera(){plane={};frustum={};},flat(){plane=null;}};
}
{
 const f=coverageFixture(),get=()=>coveringTiles(f.native,f.transform,f.options);
 runSourceUpdate(f.transform,()=>{const first=get();first[0].value=99;first.reverse();const next=get();assert.deepEqual(next.map(x=>x.value),[1,2]);assert.notEqual(first[0],next[1]);next.pop();assert.equal(get().length,2);assert.equal(f.calls,1);});
 assert.equal(sourceCoverageSnapshot(f.transform).reusedCoverages,2);get();assert.equal(f.calls,2,'Outside the native update pass there is no cache');runSourceUpdate(f.transform,get);assert.equal(f.calls,3,'Each update recalculates its first coverage');
 runSourceUpdate(f.transform,()=>{get();f.camera();get();});assert.equal(f.calls,5,'Camera changes from synchronous source events invalidate coverage');
 assert.throws(()=>runSourceUpdate(f.transform,()=>{get();throw Error('interrupted');}),/interrupted/);get();assert.equal(f.calls,7,'Thrown updates leave no active cache');
 runSourceUpdate(f.transform,()=>{get();runSourceUpdate(f.transform,()=>{get();get();});get();});assert.equal(f.calls,9,'Nested updates restore the outer scope');
 setSourceCoverageEnabled(f.transform,false);runSourceUpdate(f.transform,()=>{get();get();});assert.equal(f.calls,11,'Disabled traversal runs the native algorithm');
}
for(const name of ['tileSize','minzoom','maxzoom','roundZoom','reparseOverscaled','maxContentElevation']){
 const f=coverageFixture();runSourceUpdate(f.transform,()=>{coveringTiles(f.native,f.transform,f.options);coveringTiles(f.native,f.transform,{...f.options,[name]:!f.options[name]});});assert.equal(f.calls,2,name+' remains source-specific');
}
for(const name of ['terrain','callback','flat']){
 const f=coverageFixture();if(name==='terrain')f.options.terrain={};if(name==='callback')f.options.calculateTileZoom=()=>2;if(name==='flat')f.flat();
 runSourceUpdate(f.transform,()=>{coveringTiles(f.native,f.transform,f.options);coveringTiles(f.native,f.transform,f.options);});assert.equal(f.calls,2,name+' keeps native source coverage');
}
console.log('Source coverage reuse: independent mutable tile IDs, option keys, camera changes, scope cleanup, reentrancy, disabled and native fallbacks passed.');

{
 const f=coverageFixture(),root={key:'world',wrapped(){return this;}},native=()=>[{wrapped:()=>root}];
 assert.deepEqual(coveringTiles(native,f.transform,{maxzoom:0,reparseOverscaled:false}),[root],'Resident globe root keeps one identity across world copies');
 f.flat();assert.notEqual(coveringTiles(native,f.transform,{maxzoom:0,reparseOverscaled:false})[0],root,'Flat maps retain native world copies');
}

// Symbol tiles have different fading and bearing order. Only skip their list
// when no visible symbol layer uses that source; do not substitute fill order.
{
 const {prepareTileDraws,visibleCoordinates,setTileDrawReuse}=await import('../dist/globe-renderer.mjs');
 const transform={zoom:3},layers={fill:{type:'fill',source:'land',isHidden:()=>false},symbols:{type:'symbol',source:'labels',isHidden:()=>false},hidden:{type:'symbol',source:'hidden-labels',isHidden:()=>true}};
 const painter={transform,style:{projection:{useSubdivision:true},map:{},_order:Object.keys(layers),_layers:layers}};
 let calls=[];const manager={used:true,getVisibleCoordinates(symbol){calls.push(symbol);return[{key:symbol?'symbol-fade-tile':'fill-tile'}];}};
 let batch=prepareTileDraws(painter);assert.deepEqual(visibleCoordinates(manager,true,batch,'labels'),[{key:'symbol-fade-tile'}]);assert.deepEqual(visibleCoordinates(manager,false,batch,'land'),[{key:'fill-tile'}]);assert.deepEqual(visibleCoordinates(manager,true,batch,'land'),[]);assert.deepEqual(visibleCoordinates(manager,true,batch,'hidden-labels'),[]);assert.deepEqual(calls,[true,false]);
 manager.used=false;assert.deepEqual(visibleCoordinates(manager,false,batch,'land'),[]);manager.usedForTerrain=true;assert.equal(visibleCoordinates(manager,false,batch,'land')[0].key,'fill-tile','Terrain tiles retain native coordinates');
 for(const mode of ['terrain','custom','flat','offscreen','disabled']){
  const test={...painter,style:{...painter.style,map:{},_layers:{...layers}}};
  if(mode==='terrain')test.style.map.terrain={};if(mode==='custom')test.style._layers.fill={...layers.fill,type:'custom'};if(mode==='flat')test.style.projection={useSubdivision:false};if(mode==='offscreen')test.renderToTexture={};if(mode==='disabled')setSourceCoverageEnabled(transform,false);
  assert.equal(prepareTileDraws(test),null,mode+' preserves native tile traversal');setSourceCoverageEnabled(transform,true);
 }
 setTileDrawReuse(false);assert.equal(prepareTileDraws(painter),null);setTileDrawReuse(true);
 assert.equal(visibleCoordinates(manager,true,null,'anything')[0].key,'symbol-fade-tile');
}
console.log('Tile draw lists: visible symbols, hidden symbols, unused and terrain sources, native fallbacks and diagnostic toggle passed.');

{
 const {statePaintExpression}=await import('../dist/globe-renderer.mjs');
 for(const value of [0,.45,{r:1,g:.5,b:0,a:1}]){const expression=statePaintExpression({kind:'constant',value});assert.equal(expression.evaluate({}, {}, {selected:true}),value);assert(expression.isStateDependent,'All pending changed features retain the constant evaluator until tile replacement');}
 const native={kind:'source',isStateDependent:true,evaluate:()=>.7};assert.equal(statePaintExpression(native),native,'Source and composite expressions keep their native evaluator');
 console.log('Pending feature-state updates tolerate paint expressions becoming constant before old tiles reload.');
}
