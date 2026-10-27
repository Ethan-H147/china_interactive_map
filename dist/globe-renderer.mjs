// Covering tiles depend on camera geometry and source tiling options. Reuse the
// traversal only inside one synchronous source update, with independent tile IDs
// for each source. Loading, retention, fading and source events still run normally.
const sourceUpdates=new WeakMap(),coverageControls=new WeakMap();
const coverageControl=transform=>{let value=coverageControls.get(transform);if(!value){value={enabled:true,updates:0,calculatedCoverages:0,reusedCoverages:0};coverageControls.set(transform,value);}return value;};
export function runSourceUpdate(transform,update){
 const control=coverageControl(transform);control.updates++;
 if(!control.enabled)return update();
 const previous=sourceUpdates.get(transform);sourceUpdates.set(transform,{entries:[]});
 try{return update();}finally{if(previous)sourceUpdates.set(transform,previous);else sourceUpdates.delete(transform);}
}
export function coveringTiles(native,transform,options){
 // One prepared world tile has no distinct globe copies. Keep its identity
 // stable even at exactly +/-180 degrees or after multiple full rotations.
 if(options.maxzoom===0&&options.reparseOverscaled===false&&transform.getClippingPlane())return native(transform,options).map(tile=>tile.wrapped());
 const batch=sourceUpdates.get(transform);
 if(!batch||options.terrain||options.calculateTileZoom)return native(transform,options);
 const plane=transform.getClippingPlane();
 if(!plane)return native(transform,options);
 // The globe replaces its frustum and clipping plane whenever the camera or
 // viewport changes. This also catches camera changes from a source event.
 const signature=[native,transform.getCameraFrustum(),plane,transform.getCoveringTilesDetailsProvider(),transform.maxZoom,transform.renderWorldCopies,transform.tileSize,
  options.tileSize,options.minzoom,options.maxzoom,options.roundZoom,options.reparseOverscaled,options.maxContentElevation];
 const entry=batch.entries.find(entry=>entry.signature.every((value,index)=>value===signature[index]));
 const control=coverageControl(transform);
 if(entry){control.reusedCoverages++;return entry.tiles.map(tile=>tile.clone());}
 const tiles=native(transform,options);control.calculatedCoverages++;
 if(tiles.every(tile=>typeof tile.clone==='function'))batch.entries.push({signature,tiles:tiles.map(tile=>tile.clone())});
 return tiles;
}
export const sourceCoverageSnapshot=transform=>transform?{...coverageControl(transform)}:null;
export function setSourceCoverageEnabled(transform,value){if(transform)coverageControl(transform).enabled=!!value;}

// Consecutive sources often cover the same tiles. MapLibre 6.11.2 rebuilds the
// same globe stencil for each source; the stencil geometry depends on tile IDs
// and the current frame, not on source contents.
const transformOf=map=>map._camera?.transform||map.transform||map.painter?.transform;
export function attachGlobeRenderer(map,{version=globalThis.maplibregl?.getVersion?.(),enabled=true}={}){
 const required=['renderTileClippingMasks','clearStencil'];
 let active=!!enabled,painter,supported=false,unhook=()=>{},cached=null,custom=true;
 const totals={reusedBatches:0,generatedBatches:0,tileMasksAvoided:0,clears:0};
 const snapshot=()=>({supported,enabled:active&&supported,version,...totals,sourceCoverage:sourceCoverageSnapshot(transformOf(map))});
 const invalidate=()=>{cached=null;};
 const sameTiles=ids=>cached?.keys.length===ids.length&&cached.keys.every((key,i)=>key===ids[i].key);
 function install(){
  unhook();invalidate();custom=true;painter=map.painter;
  supported=version==='6.11.2'&&required.every(name=>typeof painter?.[name]==='function');
  setSourceCoverageEnabled(transformOf(map),active&&supported);
  if(!supported){unhook=()=>{};return;}
  const original=painter.renderTileClippingMasks,clear=painter.clearStencil;
  const eligible=()=>active&&painter.style?.projection?.useSubdivision&&!map.terrain&&!painter.renderToTexture&&!painter.renderContext?.isRenderingToTexture&&!custom;
  painter.clearStencil=function(...args){invalidate();const style=this.style;custom=!style||style._order.some(id=>style._layers[id]?.type==='custom');totals.clears++;return clear.apply(this,args);};
  painter.renderTileClippingMasks=function(layer,ids){
   if(!eligible()){invalidate();return original.call(this,layer,ids);}
   if(!layer.isTileClipped()||!ids?.length)return original.call(this,layer,ids);
   // Native invalidations (3D, raster overlap, frame/FBO clears) clear the source
   // marker or replace the ref table. Never reuse a nonconsecutive coverage set.
   if(this.currentStencilSource!==undefined&&cached?.refs===this._tileClippingMaskIDs&&sameTiles(ids)){
    if(this.currentStencilSource!==layer.source){totals.reusedBatches++;totals.tileMasksAvoided+=ids.length*2;}
    this.currentStencilSource=layer.source;return;
   }
   const previous=this._tileClippingMaskIDs,result=original.call(this,layer,ids);
   if(previous!==this._tileClippingMaskIDs){
    totals.generatedBatches++;
    cached=this.currentStencilSource===undefined?null:{refs:this._tileClippingMaskIDs,keys:ids.map(id=>id.key)};
   }else if(this.currentStencilSource===undefined)invalidate();
   return result;
  };
  const attached=painter;
  unhook=()=>{attached.renderTileClippingMasks=original;attached.clearStencil=clear;};
 }
 install();
 const restore=()=>install();
 map.on('webglcontextlost',invalidate);map.on('webglcontextrestored',restore);
 return{snapshot,setEnabled(value){active=!!value;setSourceCoverageEnabled(transformOf(map),active&&supported);invalidate();map.triggerRepaint();},destroy(){invalidate();unhook();setSourceCoverageEnabled(transformOf(map),false);map.off('webglcontextlost',invalidate);map.off('webglcontextrestored',restore);}};
}

// A source without visible symbol layers has no symbol draw pass. Avoid its
// separate bearing sort and matrix-cache population; leave native tile loading alone.
let tileDrawReuse=true;
export const setTileDrawReuse=value=>{tileDrawReuse=!!value;};
export function prepareTileDraws(painter){
 const style=painter.style;if(!painter.transform)return null;const control=coverageControl(painter.transform);
 if(!tileDrawReuse||!control.enabled||!style?.projection?.useSubdivision||style.map?.terrain||painter.renderToTexture)return null;
 const symbols=new Set();
 for(const id of style._order){const layer=style._layers[id];if(layer.type==='custom')return null;if(layer.type==='symbol'&&!layer.isHidden(painter.transform.zoom))symbols.add(layer.source);}
 return{symbols,control};
}
export function visibleCoordinates(manager,symbol,batch,id){
 if(batch){
  if(manager.used===false&&!manager.usedForTerrain){batch.control.unusedCoordinateListsSkipped=(batch.control.unusedCoordinateListsSkipped||0)+1;return[];}
  if(symbol&&!batch.symbols.has(id)){batch.control.symbolCoordinateListsSkipped=(batch.control.symbolCoordinateListsSkipped||0)+1;return[];}
 }
 return manager.getVisibleCoordinates(symbol);
}

// A pending feature-state update can reach an old tile after a source paint
// expression becomes constant. Keep its attribute evaluator valid until reload.
export function statePaintExpression(value){
 return value.kind==='constant'?{kind:'source',isStateDependent:true,evaluate:()=>value.value}:value;
}
