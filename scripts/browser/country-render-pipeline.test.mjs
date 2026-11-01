import assert from 'node:assert/strict';
import {featureFilter} from '@maplibre/maplibre-gl-style-spec';
import {fixtureImagery} from './atlas-audit-helpers.mjs';
export default [1280,390].map(width=>({name:'Fill flights, deferred borders and labels across country adapters '+width,options:{width,height:960,mobile:width===390},async run(p,base){
 await fixtureImagery(p);await p.open(base,'#japan');
 await p.evaluate('window.pipelineFlights=[];map.on("movestart",()=>pipelineFlights.push({country:atlasMode,stage:AtlasRenderPipeline.snapshot(),markers:document.querySelectorAll("[data-atlas-place]").length}));');
 for(const country of ['brazil','argentina','canada','indonesia','korea','mongolia','nicaragua','china']){
  assert(await p.evaluate('changeAtlas('+JSON.stringify(country)+',true)'),country+' switch');await p.settle();
  await p.waitFor('AtlasRenderPipeline.snapshot().phase==="ready"&&AtlasRenderPipeline.snapshot().pendingLabels===0');
  const state=await p.evaluate('({pipeline:AtlasRenderPipeline.snapshot(),order:mapScene.assertOrder(),resident:AtlasCountryMemory.snapshot(),selected:currentAtlas()?.getSelection(),layers:mapScene.layerInventory().filter(l=>l.type==="line"&&mapScene.baseVisibility(l.id)!=="none").length})');
  assert.equal(state.pipeline.detail.active,false,country+' borders fully restored');assert(state.pipeline.largestLabelBatch<=6);assert(state.order);assert.equal(state.resident.active,country);assert(state.resident.countries.length<=(width===390?1:3));assert(state.layers>0);
  const filters=await p.evaluate('mapScene.layerInventory().map(l=>({id:l.id,filter:map.getFilter(l.id)})).filter(l=>l.filter)');for(const {id,filter}of filters)assert.doesNotThrow(()=>featureFilter(filter,'layers[0].filter'),country+' valid filter '+id);
 }
 const flights=await p.evaluate('pipelineFlights');assert(flights.some(f=>f.country==="brazil"));for(const f of flights){assert.equal(f.markers,0,'Names stay out of camera movement '+f.country);if(f.country==='china')assert.equal(f.stage.detail.active,false,'China does not defer existing lines');}
 await p.evaluate('changeAtlas("argentina",false)');await p.settle();
 await p.evaluate('void map.easeTo({center:[-64,-34],zoom:6,duration:500})');await p.waitFor('map.isMoving()');await p.evaluate('map.stop();void map.panBy([40,20],{duration:80})');await p.settle();await p.waitFor('AtlasRenderPipeline.snapshot().phase==="ready"');
 await p.evaluate('window.oldSwitch=changeAtlas("brazil",true);setTimeout(()=>window.newSwitch=changeAtlas("canada",false),20)');await p.waitFor('typeof newSwitch!=="undefined"');assert(await p.evaluate('newSwitch'));await p.settle();await p.waitFor('AtlasRenderPipeline.snapshot().phase==="ready"');assert.equal(await p.evaluate('AtlasCountryMemory.snapshot().active'),'canada');assert.equal(await p.evaluate('AtlasRenderPipeline.snapshot().holding'),false);
 await p.screenshot('country-render-pipeline-'+width);
}}));
