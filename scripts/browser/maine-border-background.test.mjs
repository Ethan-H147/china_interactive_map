import assert from 'node:assert/strict';
import fs from 'node:fs';import{createRequire}from'node:module';
import{fc,command}from'../build-regional-dataset.mjs';
import{policy,read}from'../maine-border-fill.mjs';
const sharp=createRequire(import.meta.url)('sharp'),pinned=await policy(),points={};
for(const country of ['united-states','canada'])points[country]=(await command(pinned.countries[country],'-points inner',{precision:.0000001})).features[0].geometry.coordinates;
async function colors(p,locations){const samples=await p.evaluate('('+(()=>{const r=map.getCanvas().getBoundingClientRect();return LOCATIONS.map(point=>{const q=map.project(point);return{x:Math.floor(q.x+r.x),y:Math.floor(q.y+r.y),name:currentAtlas().hoverAt(q)?.en??null};});}).toString().replace('LOCATIONS',JSON.stringify(locations))+')()');const file=await p.screenshot('maine-filled-'+Date.now());for(const s of samples)s.rgb=[...await sharp(file).extract({left:s.x-1,top:s.y-1,width:3,height:3}).removeAlpha().raw().toBuffer()];return samples;}
async function sameFill(p,a,b,label){const s=await colors(p,[a,b]);let error=Infinity;for(let i=0;i<s[0].rgb.length;i+=3)for(let j=0;j<s[1].rgb.length;j+=3)error=Math.min(error,Math.max(...[0,1,2].map(k=>Math.abs(s[0].rgb[i+k]-s[1].rgb[j+k]))));assert(error<5,label+' has matching land color '+JSON.stringify(s));return s;}
const cases=[{country:'united-states',id:'US-ME',name:'Maine',shore:[-68,45.6]},{country:'canada',id:'CA-NB',name:'New Brunswick',shore:[-67.15,45.85]}];
export default [{name:'Maine border fill follows selected country colors and selection in every projection and appearance',options:{width:1400,height:1100},async run(p,base){
 for(const c of cases){await p.open(base,'#'+c.country);await p.waitFor('AtlasEntry.current==='+JSON.stringify(c.country)+'&&currentAtlas().ready');await p.settle();await p.evaluate('AtlasSettings.setSettings({motion:"reduce"});currentAtlas().setMode(1)');
 for(const appearance of ['light','dark'])for(const projection of ['mercator','globe']){
  await p.evaluate('AtlasComfort.set({appearance:'+JSON.stringify(appearance)+'});void map.setProjection({type:'+JSON.stringify(projection)+'});void map.jumpTo({center:[-67.6,45.65],zoom:8.7})');await p.settle();
  const s=await sameFill(p,points[c.country],c.shore,c.country+' '+appearance+' '+projection);assert.equal(s[0].name,c.name,'The lake fill picks the actual state/province');assert(await p.evaluate('mapScene.assertOrder()'));
 }
 await p.evaluate('AtlasComfort.set({appearance:"light"});void map.setProjection({type:"mercator"});void currentAtlas().restore('+JSON.stringify(c.id)+')');await p.settle();await p.evaluate('currentAtlas().setMode(1);void map.jumpTo({center:[-67.6,45.65],zoom:8.7})');await p.settle();await sameFill(p,points[c.country],c.shore,c.country+' selected highlight');
 }
}}, {name:'Solid Maine lake geometry follows Canadian US and British historical ownership',options:{width:1400,height:1100},async run(p,base){
 for(const country of ['canada','united-states','united-kingdom']){
  await p.open(base,'#'+country);await p.waitFor('AtlasEntry.current==='+JSON.stringify(country)+'&&currentAtlas().ready');await p.settle();await p.evaluate('AtlasComfort.set({appearance:"light"});AtlasSettings.setSettings({motion:"reduce"});void map.setProjection({type:"mercator"})');
  await p.settle();if(!await p.evaluate('currentAtlas().historicalActive'))await p.evaluate('void document.getElementById("historical-snapshot").click()');
  await p.waitFor('!!map.getLayer('+JSON.stringify(country+'-history-fill')+')',{timeout:60000});
  await p.evaluate('void map.jumpTo({center:[-67.6,45.65],zoom:8.7})');await p.settle();
  const sampleCountry=country==='united-states'?'united-states':'canada',shore=sampleCountry==='canada'?[-67.15,45.85]:[-68,45.6];
  await sameFill(p,points[sampleCountry],shore,country+' historical fill');
  assert(await p.evaluate('mapScene.assertOrder()'));
 }
}}];
