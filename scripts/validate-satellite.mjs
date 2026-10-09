import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSatelliteDisplay,satelliteVisible,imageryOpacity,provinceOpacity,blendColor,satelliteSource,sourceId} from '../dist/satellite.mjs';

assert.equal(satelliteVisible({enabled:true,mode:'china',quiz:false}),true);
for(const state of [{enabled:false,mode:'china',quiz:false},{enabled:true,mode:'china',quiz:true}])assert.equal(satelliteVisible(state),false);
assert.equal(imageryOpacity(150),1);assert.equal(imageryOpacity(-1),0);assert.equal(imageryOpacity('bad'),1);assert.equal(imageryOpacity(35),.35);
assert.equal(provinceOpacity(true).at(-1),0);assert.equal(provinceOpacity(false).at(-1),1);
assert.equal(provinceOpacity(true,0).at(-1),1);assert.equal(provinceOpacity(true,.4).at(-1),.6);
assert.equal(blendColor('#987343','#fff0bb',0),'#987343');assert.equal(blendColor('#987343','#fff0bb',1),'#fff0bb');
assert.deepEqual(provinceOpacity(true).slice(1,5),[['boolean',['feature-state','inactive'],false],0,['boolean',['feature-state','quizActive'],false],1]);
assert.equal(satelliteSource.maxzoom,19);assert.equal(satelliteSource.tileSize,256);
assert.equal(new URL(satelliteSource.tiles[0]).hostname,'ibasemaps-api.arcgis.com');
assert.match(satelliteSource.attribution,/Esri/);

function element(value){return {value,hidden:true,checked:false,textContent:'',handlers:{},addEventListener(type,handler){this.handlers[type]=handler;},fire(type){this.handlers[type]();}};}
const ui={input:element(),options:element(),opacity:element('100'),output:element(),status:element()};
const contextIds=['china-context','korea-portal-fill','mongolia-portal-fill','japan-portal-fill','russia-portal-fill'];
const layers=new Map([['province-fill',{}],...contextIds.map(id=>[id,{type:'fill',paint:{'fill-opacity':1}}])]),sources=new Map(),events={},insertions=[],appearances=[];
let mode='china',quiz=false,timeout,cancelled=0;
const map={getLayer:id=>layers.get(id),getSource:id=>sources.get(id),
  getLayersOrder:()=>[...layers.keys()],getPaintProperty:(id,key)=>layers.get(id).paint?.[key],
  addSource(id,source){sources.set(id,source);},addLayer(layer,before){layers.set(layer.id,layer);insertions.push(before);},
  removeLayer:id=>layers.delete(id),removeSource:id=>sources.delete(id),
  setLayoutProperty(id,key,value){layers.get(id).layout[key]=value;},setPaintProperty(id,key,value){layers.get(id).paint[key]=value;},
  on(type,handler){events[type]=handler;}};
const display=createSatelliteDisplay(map,{mode:()=>mode,quiz:()=>quiz,onVisible:value=>appearances.push(value),schedule:fn=>{timeout=fn;return 1;},cancel:()=>{cancelled++;timeout=null;}},ui);
display.sync();assert.equal(sources.size,0,'No tile requests before opt-in');
ui.input.checked=true;ui.input.fire('change');
assert.equal(sources.size,1);assert.equal(insertions[0],'china-context','Imagery covers both context countries');
assert.equal(layers.get(sourceId).layout.visibility,'visible');assert.equal(appearances.length,0,'Keep atlas fill while first tiles load');
events.error({sourceId});assert.equal(ui.input.checked,true,'One tile error must not disable the entire layer');
events.sourcedata({sourceId,sourceDataType:'metadata'});assert.equal(appearances.length,0);
events.sourcedata({sourceId,sourceDataType:'content'});assert.equal(appearances.length,0,'Source metadata is not loaded imagery');
events.sourcedata({sourceId,tile:{state:'errored'}});assert.equal(appearances.length,0);
events.sourcedata({sourceId,tile:{state:'loaded'}});assert.deepEqual(appearances,[true]);assert.ok(cancelled);
for(const id of contextIds)assert.equal(layers.get(id).paint['fill-opacity'],0,'No gray country patch over imagery');
layers.set('future-portal-fill',{type:'fill',paint:{'fill-opacity':1}});display.sync();assert.equal(layers.get('future-portal-fill').paint['fill-opacity'],0,'New context countries reveal already-loaded imagery without a separate country list');contextIds.push('future-portal-fill');
ui.opacity.value='40';ui.opacity.fire('input');assert.equal(layers.get(sourceId).paint['raster-opacity'],.4);assert.equal(ui.output.textContent,'40%');
for(const id of contextIds)assert.equal(layers.get(id).paint['fill-opacity'],.6,'All country context fills follow imagery opacity');
quiz=true;display.sync();assert.equal(layers.get(sourceId).layout.visibility,'none');assert.equal(appearances.at(-1),false);assert.equal(ui.input.checked,true);
for(const id of contextIds)assert.equal(layers.get(id).paint['fill-opacity'],1,'Restore context when imagery is hidden');
quiz=false;display.sync();assert.equal(appearances.at(-1),true);
mode='korea';display.sync();assert.equal(appearances.at(-1),true);assert.equal(layers.get(sourceId).layout.visibility,'visible');
mode='mongolia';display.sync();assert.equal(layers.get(sourceId).layout.visibility,'visible');
const priorAppearances=appearances.length;
layers.set('mongolia-first-fill',{});display.sync();
assert.equal(appearances.length,priorAppearances+1,'Apply satellite styling to country layers loaded after imagery');
mode='japan';display.sync();assert.equal(layers.get(sourceId).layout.visibility,'visible');
layers.set('japan-first-fill',{});display.sync();assert.equal(appearances.at(-1),true);
mode='china';display.sync();assert.equal(appearances.at(-1),true);
for(const country of ['russia','china','korea','mongolia','japan','philippines','indonesia','malaysia','singapore','brazil','uruguay','argentina']){mode=country;display.sync();assert.equal(layers.get(sourceId).layout.visibility,'visible',country+' supports imagery');assert.equal(layers.get('russia-portal-fill').paint['fill-opacity'],.6,'Russian context opacity persists across country switches');}
const departmentOpacity=['case',['boolean',['feature-state','selected'],false],.65,0];
for(const [id,type,paint] of [['south-america-fill','fill',{'fill-opacity':1}],['south-argentina-fill','fill',{}],['south-brazil-ddd-fill','fill',{}],['arg-local-AR-82-fill','fill',{'fill-opacity':departmentOpacity}],['arg-city-AR-82-selection','line',{'line-color':'#3979a3'}]])layers.set(id,{type,paint});
ui.opacity.value='100';ui.opacity.fire('input');
assert.equal(layers.get('south-america-fill').paint['fill-opacity'],0,'No gray South America patch over imagery');
for(const id of ['south-argentina-fill','south-brazil-ddd-fill','arg-local-AR-82-fill'])assert.deepEqual(layers.get(id).paint['fill-opacity'],['+',['*',id.startsWith('arg-local')?departmentOpacity:1,0],['*',1,['case',['boolean',['feature-state','selected'],false],.18,0]]],'Late-loaded South American fills reveal imagery while retaining selection');
assert.equal(layers.get('arg-city-AR-82-selection').paint['line-color'],'#fff0bb');
layers.set('south-uruguay-fill',{type:'fill',paint:{}});display.sync();assert.equal(layers.get('south-uruguay-fill').paint['fill-opacity'][1][2],0,'Apply imagery to a newly visited country');
ui.input.checked=false;ui.input.fire('change');assert.equal(ui.options.hidden,true);assert.equal(appearances.at(-1),false);
for(const id of contextIds)assert.equal(layers.get(id).paint['fill-opacity'],1,'Turning satellite off restores every country context');
assert.equal(layers.get('south-argentina-fill').paint['fill-opacity'],1);assert.deepEqual(layers.get('arg-local-AR-82-fill').paint['fill-opacity'],departmentOpacity);assert.equal(layers.get('arg-city-AR-82-selection').paint['line-color'],'#3979a3');assert.equal(layers.get('south-america-fill').paint['fill-opacity'],1);
ui.input.checked=true;ui.input.fire('change');assert.equal(insertions.length,1,'Reuse loaded raster tiles');

// A service-wide failure restores the atlas and supports a fresh attempt.
ui.input.checked=false;ui.input.fire('change');
const ui2={input:element(),options:element(),opacity:element('100'),output:element(),status:element()};
map.removeLayer(sourceId);map.removeSource(sourceId);
createSatelliteDisplay(map,{mode:()=>mode,quiz:()=>false,onVisible:value=>appearances.push(value),schedule:fn=>{timeout=fn;return 1;},cancel:()=>{timeout=null;}},ui2);
ui2.input.checked=true;ui2.input.fire('change');timeout();
assert.equal(ui2.input.checked,false);assert.equal(sources.size,0);assert.match(ui2.status.textContent,/retry/);
ui2.input.checked=true;ui2.input.fire('change');assert.equal(sources.size,1);
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8')+readFileSync(new URL('../dist/china-page.mjs',import.meta.url),'utf8');
for(const id of ['satellite-layer','satellite-options','satellite-opacity','satellite-opacity-value','satellite-status'])assert.equal(html.split(`id="${id}"`).length,2);
assert.match(html,/Esri World Imagery/);
console.log('Satellite layer: lazy loading, source order, opacity, quiz/Korea transitions, tile recovery, and attribution passed.');
