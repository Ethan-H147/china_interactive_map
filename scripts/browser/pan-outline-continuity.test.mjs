import assert from 'node:assert/strict';
import {fixtureImagery} from './atlas-audit-helpers.mjs';
export default [1280,390].map(width=>({name:'Existing outlines draw throughout panning '+width,options:{width,height:960,mobile:width===390},async run(p,base){
 await fixtureImagery(p);await p.open(base,'#japan');
 await p.waitFor('AtlasRenderPipeline.snapshot().phase==="ready"');
 await p.evaluate('(()=>{window.outlineMotion={active:false,draws:{}};let layer;const painter=map.painter,render=painter.renderLayer;painter.renderLayer=function(...args){const previous=layer;layer=args[2];try{return render.apply(this,args);}finally{layer=previous;}};const gl=painter.context.gl;for(const method of ["drawElements","drawArrays","drawElementsInstanced","drawArraysInstanced"]){if(!gl[method])continue;const original=gl[method].bind(gl);gl[method]=(...args)=>{if(outlineMotion.active&&map.isMoving()&&layer?.type==="line")outlineMotion.draws[layer.id]=(outlineMotion.draws[layer.id]||0)+1;return original(...args);};}})()');
 for(const [country,outline] of [['japan','japan-first-lines'],['brazil','brazil-first-lines'],['argentina','argentina-first-lines'],['canada','canada-first-lines']]){
  if(country!=='japan'){assert(await p.evaluate('changeAtlas('+JSON.stringify(country)+',true)'));await p.settle();}
  await p.waitFor('AtlasRenderPipeline.snapshot().phase==="ready"');
  assert.equal(await p.evaluate('map.getLayoutProperty('+JSON.stringify(outline)+',"visibility")'),'visible',country+' outline enabled');
  const result=await p.evaluate('(async()=>{outlineMotion.active=true;outlineMotion.draws={};const center=map.getCenter(),done=new Promise(resolve=>map.once("moveend",resolve));map.easeTo({center:[center.lng+.8,center.lat+.2],duration:500});const during=AtlasRenderPipeline.snapshot();await done;outlineMotion.active=false;return {during,draws:outlineMotion.draws}})()');
  assert.equal(result.during.detail.active,false,country+' ordinary pan never gates outlines');
  assert(result.draws[outline]>0,country+' existing outline submits actual GL draws during movement '+JSON.stringify(result.draws));
  await p.settle();await p.waitFor('AtlasRenderPipeline.snapshot().phase==="ready"');assert(mapSceneSafe(await p.evaluate('mapScene.assertOrder()')));
 }
 await p.screenshot('pan-outlines-preserved-'+width);
}}));
function mapSceneSafe(value){return value===true;}
