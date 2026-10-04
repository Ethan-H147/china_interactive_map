import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSatelliteDisplay,satelliteVisible,imageryOpacity,provinceOpacity,blendColor,satelliteSource,sourceId} from '../dist/satellite.mjs';

assert.equal(satelliteVisible({enabled:true,mode:'china',quiz:false}),true);
for(const state of [{enabled:false,mode:'china',quiz:false},{enabled:true,mode:'korea',quiz:false},{enabled:true,mode:'china',quiz:true}])assert.equal(satelliteVisible(state),false);
assert.equal(imageryOpacity(150),1);assert.equal(imageryOpacity(-1),0);assert.equal(imageryOpacity('bad'),1);assert.equal(imageryOpacity(35),.35);
assert.equal(provinceOpacity(true).at(-1),0);assert.equal(provinceOpacity(false).at(-1),1);
assert.equal(provinceOpacity(true,0).at(-1),1);assert.equal(provinceOpacity(true,.4).at(-1),.6);
assert.equal(blendColor('#987343','#fff0bb',0),'#987343');assert.equal(blendColor('#987343','#fff0bb',1),'#fff0bb');
assert.deepEqual(provinceOpacity(true).slice(1,5),[['boolean',['feature-state','inactive'],false],1,['boolean',['feature-state','quizActive'],false],1]);
assert.equal(satelliteSource.maxzoom,14);assert.equal(satelliteSource.tileSize,256);
assert.match(satelliteSource.tiles[0],/2025_3857\/default\/g\/\{z\}\/\{y\}\/\{x\}/);
assert.match(satelliteSource.attribution,/CC BY-NC-SA 4.0/);

function element(value){return {value,hidden:true,checked:false,textContent:'',handlers:{},addEventListener(type,handler){this.handlers[type]=handler;},fire(type){this.handlers[type]();}};}
const ui={input:element(),options:element(),opacity:element('100'),output:element(),status:element()};
const layers=new Map([['province-fill',{}],['korea-portal-fill',{}]]),sources=new Map(),events={},insertions=[],appearances=[];
let mode='china',quiz=false,timeout,cancelled=0;
const map={getLayer:id=>layers.get(id),getSource:id=>sources.get(id),
  addSource(id,source){sources.set(id,source);},addLayer(layer,before){layers.set(layer.id,layer);insertions.push(before);},
  removeLayer:id=>layers.delete(id),removeSource:id=>sources.delete(id),
  setLayoutProperty(id,key,value){layers.get(id).layout[key]=value;},setPaintProperty(id,key,value){layers.get(id).paint[key]=value;},
  on(type,handler){events[type]=handler;}};
const display=createSatelliteDisplay(map,{mode:()=>mode,quiz:()=>quiz,onVisible:value=>appearances.push(value),schedule:fn=>{timeout=fn;return 1;},cancel:()=>{cancelled++;timeout=null;}},ui);
display.sync();assert.equal(sources.size,0,'No tile requests before opt-in');
ui.input.checked=true;ui.input.fire('change');
assert.equal(sources.size,1);assert.equal(insertions[0],'korea-portal-fill','Inactive Korea stays above imagery');
assert.equal(layers.get(sourceId).layout.visibility,'visible');assert.equal(appearances.length,0,'Keep atlas fill while first tiles load');
events.error({sourceId});assert.equal(ui.input.checked,true,'One tile error must not disable the entire layer');
events.sourcedata({sourceId,sourceDataType:'metadata'});assert.equal(appearances.length,0);
events.sourcedata({sourceId,sourceDataType:'content'});assert.equal(appearances.length,0,'Source metadata is not loaded imagery');
events.sourcedata({sourceId,tile:{state:'errored'}});assert.equal(appearances.length,0);
events.sourcedata({sourceId,tile:{state:'loaded'}});assert.deepEqual(appearances,[true]);assert.ok(cancelled);
ui.opacity.value='40';ui.opacity.fire('input');assert.equal(layers.get(sourceId).paint['raster-opacity'],.4);assert.equal(ui.output.textContent,'40%');
quiz=true;display.sync();assert.equal(layers.get(sourceId).layout.visibility,'none');assert.equal(appearances.at(-1),false);assert.equal(ui.input.checked,true);
quiz=false;display.sync();assert.equal(appearances.at(-1),true);
mode='korea';display.sync();assert.equal(appearances.at(-1),false);assert.match(ui.status.textContent,/China mode/);
mode='china';display.sync();assert.equal(appearances.at(-1),true);
ui.input.checked=false;ui.input.fire('change');assert.equal(ui.options.hidden,true);assert.equal(appearances.at(-1),false);
ui.input.checked=true;ui.input.fire('change');assert.equal(insertions.length,1,'Reuse loaded raster tiles');

// A service-wide failure restores the atlas and supports a fresh attempt.
ui.input.checked=false;ui.input.fire('change');
const ui2={input:element(),options:element(),opacity:element('100'),output:element(),status:element()};
map.removeLayer(sourceId);map.removeSource(sourceId);
createSatelliteDisplay(map,{mode:()=>mode,quiz:()=>false,onVisible:value=>appearances.push(value),schedule:fn=>{timeout=fn;return 1;},cancel:()=>{timeout=null;}},ui2);
ui2.input.checked=true;ui2.input.fire('change');timeout();
assert.equal(ui2.input.checked,false);assert.equal(sources.size,0);assert.match(ui2.status.textContent,/retry/);
ui2.input.checked=true;ui2.input.fire('change');assert.equal(sources.size,1);
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
for(const id of ['satellite-layer','satellite-options','satellite-opacity','satellite-opacity-value','satellite-status'])assert.equal(html.split(`id="${id}"`).length,2);
assert.match(html,/10 m resolution/);
console.log('Satellite layer: lazy loading, source order, opacity, quiz/Korea transitions, tile recovery, and attribution passed.');
