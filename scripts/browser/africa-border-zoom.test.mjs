import assert from 'node:assert/strict';

export default [1280,390].map(width=>({name:'Africa zoom reversals retain border tiles without preparing duplicate country sources '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#finland');await p.waitFor('AtlasGlobeOverviewController.snapshot().ready');
 await p.evaluate('void map.jumpTo({center:[20,0],zoom:3.65})');await p.settle();
 await p.evaluate(`window.borderZoomAudit={loads:{},frames:[]};
 for(const [id,manager]of Object.entries(map.style.tileManagers)){
  if(!map.style._order.some(key=>{const l=map.getLayer(key);return l.source===id&&l.metadata?.atlasInternationalBorder&&!l.metadata?.atlas?.overview;}))continue;
  const source=manager.getSource(),load=source.loadTile.bind(source);
  source.loadTile=(...args)=>{borderZoomAudit.loads[id]=(borderZoomAudit.loads[id]||0)+1;return load(...args);};
 }
 window.sampleBorderZoom=()=>{const state=AtlasGlobeOverviewController.snapshot();borderZoomAudit.frames.push({zoom:map.getZoom(),prepare:state.borderZoom.prepare,coarse:state.borders.coarse});};
 map.on('render',sampleBorderZoom);void 0`);
 for(const z of [3.4,3.65,3.4,3.65,3.4,3.8,4.15,3.95,4.1,3.95,4.1]){
  await p.evaluate(`new Promise(resolve=>{map.once('moveend',()=>resolve(true));map.easeTo({zoom:${z},duration:180});})`);await p.settle();
  const state=await p.evaluate(`(()=>{const owners=new Set(map.getLayer('country-border-previews').metadata.atlas.borderPreviewOwners);return {overview:AtlasGlobeOverviewController.snapshot(),copies:map.style._order.filter(id=>owners.has(id)).map(id=>({id,visible:map.getLayoutProperty(id,'visibility')!=='none',used:map.style.tileManagers[map.getLayer(id).source].used}))};})()`);
  assert(state.overview.borderZoom.prepare,'Near-threshold reversals keep detail prepared');
  assert(state.copies.every(l=>!l.visible&&!l.used),'Owned adapter copies stay out of native tile preparation: '+JSON.stringify(state.copies.filter(l=>l.visible||l.used)));
  if(z>=4.15||z===3.95||z===4.1)assert(!state.overview.borders.coarse,'Committed detail stays visible across zoom 4');
 }
 const report=await p.evaluate(`({loads:borderZoomAudit.loads,frames:borderZoomAudit.frames,owners:map.getLayer('country-border-previews').metadata.atlas.borderPreviewOwners})`);
 assert(report.frames.length>10);
 assert(report.frames.every(f=>f.prepare),'No detail preparation toggles during small zoom reversals');
 assert(report.owners.every(id=>!report.loads[id]),'Already-covered country sources never reload during the gesture sequence');
 assert(Object.values(report.loads).reduce((a,b)=>a+b,0)<80,'Repeated near-threshold zooms reuse a bounded set of native border tiles: '+JSON.stringify(report.loads));
 await p.evaluate('map.off("render",sampleBorderZoom);void map.jumpTo({center:[20,0],zoom:2.8})');await p.settle();
 assert.equal(await p.evaluate('AtlasGlobeOverviewController.snapshot().borderZoom.prepare'),false,'Distant views stop fine tile preparation');
 assert.equal(await p.evaluate('AtlasGlobeOverviewController.snapshot().borders.coarse'),true,'The resident overview retains world borders');
 // A close unopened African frontier must remain precise and queryable after releasing detail.
 await p.evaluate('void map.jumpTo({center:[22,15],zoom:8})');await p.settle();
 const detail=await p.evaluate(`new Promise(resolve=>{map.once('render',()=>{const canvas=map.getCanvas();resolve({state:AtlasGlobeOverviewController.snapshot(),hits:map.queryRenderedFeatures([[0,0],[canvas.clientWidth,canvas.clientHeight]],{layers:['country-border-previews','atlas-frontiers']}).length});});map.triggerRepaint();})`);
 assert(!detail.state.borders.coarse);assert(detail.hits>0,'Unopened African borders return without selecting a country');
 for(const projection of ['mercator','globe']){
  await p.evaluate(`map.setProjection({type:${JSON.stringify(projection)}});void map.jumpTo({zoom:4.1})`);await p.settle();
  await p.evaluate('void map.jumpTo({zoom:3.95})');await p.settle();
  assert.equal(await p.evaluate('AtlasGlobeOverviewController.snapshot().borders.coarse'),false,'Detailed borders survive a zoom reversal in '+projection);
  assert.equal(await p.evaluate(`map.style._order.filter(id=>map.getLayer('country-border-previews').metadata.atlas.borderPreviewOwners.includes(id)).filter(id=>map.style.tileManagers[map.getLayer(id).source].used).length`),0,'Projection changes keep covered adapter sources unused');
 }
 assert(await p.evaluate('mapScene.assertOrder()'));
 await p.screenshot('africa-border-retention-'+width);
}}));
