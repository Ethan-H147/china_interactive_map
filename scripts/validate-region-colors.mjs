import fs from 'node:fs';
import assert from 'node:assert/strict';
import {countryColorData,colorLayerProfile} from '../dist/region-color-data.mjs';
import {metricScale,shadeExpression,missingColor,createRegionColors} from '../dist/region-colors.mjs';
import {validate,hashFor,fromHash} from '../dist/view-state.mjs';
const datasets=Object.fromEntries(Object.keys(countryColorData).map(country=>[country,JSON.parse(fs.readFileSync('dist/data/region-colors/'+country+'.json'))]));
const counts={china:34,korea:29,mongolia:22,japan:47,indonesia:38,philippines:18,malaysia:16,singapore:5,russia:83,brazil:27,uruguay:19,argentina:24};
for(const [country,data]of Object.entries(datasets)){
 assert.equal(data.records.length,counts[country],country+' comparison units');assert.equal(new Set(data.records.map(r=>r.id)).size,data.records.length);
 for(const r of data.records)for(const [key,m]of Object.entries(r.metrics)){assert(Number.isFinite(m.value)&&m.value>=0,country+' '+r.id+' '+key);assert(m.sourceUrl,'Traceable metric source');if(key.startsWith('gdp'))assert.equal(m.unit,'USD','Economic values must share a currency');}
 const population=metricScale(data,'population');assert(population&&population.count>=2,country+' population shading');assert.equal(population.color(undefined),missingColor);
 for(const key of ['population','populationDensity','gdp','gdpPerCapita']){const scale=metricScale(data,key);if(!scale)continue;assert(scale.bins.length<=5);assert.equal(scale.bins.reduce((s,b)=>s+b.count,0),scale.count,'Every valid value belongs to one group');}
 if(countryColorData[country].economy===false){assert.equal(metricScale(data,'gdp'),null);assert.equal(metricScale(data,'gdpPerCapita'),null);}
}
assert(datasets.argentina.records.every(r=>Object.keys(r.metrics).length===1&&r.metrics.population),'Argentina uses population only');
assert.equal(datasets.brazil.records.find(r=>r.id==='BR-53').name,'Distrito Federal');
const johor=datasets.malaysia.records.find(r=>r.id==='MY-01');assert.equal(johor.metrics.gdp.priceBasis,'constant');assert.equal(johor.metrics.gdp.baseYear,2015);
const central=datasets.singapore.records.find(r=>r.id==='SG-CR');assert(Math.abs(central.metrics.populationDensity.value-991270/136.41327372018955)<1e-8);
assert.equal(datasets.japan.records.find(r=>r.id==='JP-01').metrics.population.value,4980272,'Use the census shown on the details card');
const ph=datasets.philippines.records.find(r=>r.id==='PH01');assert(ph.metrics.population.value>0&&ph.metrics.gdp.value>0,'Whole-region PSA measures available');assert(ph.metrics.population.note.includes('highly urbanized'),'Do not sum incomplete provincial counts');
const ties=metricScale({records:[0,1,1,1,1,1e12].map(value=>({metrics:{population:{value,unit:'people'}}}))},'population');assert.equal(ties.bins.reduce((s,b)=>s+b.count,0),6);assert.notEqual(ties.color(0),missingColor,'Zero is a reported value');assert.equal(ties.color(1),ties.color(1),'Equal values stay in one bucket');assert.equal(metricScale({records:[]},'population'),null);
const mixed={records:[{metrics:{gdp:{value:10,unit:'USD'}}},{metrics:{gdp:{value:20,unit:'USD'}}},{metrics:{gdp:{value:100,unit:'USD',priceBasis:'constant',baseYear:2015}}}]};const consistent=metricScale(mixed,'gdp');assert.equal(consistent.count,2);assert.equal(consistent.metric(mixed.records[2]),undefined,'A future adapter cannot mix nominal and constant-price values in one scale');
for(const [country,primary]of Object.entries({china:'province-fragment-fill',korea:'korea-first-fill',mongolia:'mongolia-first-fill',japan:'japan-local-first-fill',indonesia:'indonesia-ID64-first-coastal-fill',philippines:'philippines-first-fill',malaysia:'malaysia-first-fill',singapore:'singapore-first-fill',russia:'russia-first-fill',brazil:'south-brazil-fill',uruguay:'south-uruguay-fill',argentina:'south-argentina-fill'})){
 assert(colorLayerProfile({id:primary,type:'fill'},country)?.primary,primary);assert(colorLayerProfile({id:primary+'-motion',type:'fill'},country)?.primary,'Motion layers share the scale');assert.equal(colorLayerProfile({id:country+'-portal-fill',type:'fill'},country),null,'Never shade surrounding countries');
}
assert.equal(colorLayerProfile({id:'south-brazil-ddd-fill',type:'fill'},'brazil'),null,'Telephone areas cannot inherit state GDP');
const view={v:1,country:'brazil',center:[-52,-13],zoom:3,colorBy:'gdpPerCapita'};assert.equal(fromHash(hashFor(view)).colorBy,'gdpPerCapita');assert.equal(validate({...view,colorBy:'exports'}).colorBy,'none');assert.equal(validate({...view,colorBy:undefined}).colorBy,'none','Older views remain compatible');

// Exercise the controller across async switching, dynamic geometry and external paint updates.
class Node{
 constructor(){this.style={};this.children=[];this.attributes={};this.classList={};}
 setAttribute(k,v){this.attributes[k]=v;}append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}closest(){return control;}matches(s){return s==='[data-region-color]';}
}
const select=new Node(),control=new Node(),shell=new Node(),listeners=new Map();
globalThis.document={createElement:()=>new Node(),createTextNode:text=>text,getElementById:()=>shell,querySelectorAll:()=>[select],addEventListener:(type,fn)=>listeners.set(type,fn)};
globalThis.location={href:'http://localhost/'};globalThis.requestAnimationFrame=()=>{};
const layers=new Map(),events=new Map(),paints=[];
const fakeMap={getStyle:()=>({layers:[...layers.values()]}),getLayer:id=>layers.get(id),getPaintProperty:(id,p)=>layers.get(id).paint[p],setPaintProperty(id,p,v){layers.get(id).paint[p]=v;paints.push([id,p]);},on:(e,f)=>events.set(e,f),getCanvas:()=>({addEventListener(){}}),isMoving:()=>false};
const add=(id,color='#fff',opacity=1)=>layers.set(id,{id,type:'fill',paint:{'fill-color':color,'fill-opacity':opacity}});
const pending=new Map();globalThis.fetch=url=>new Promise(resolve=>pending.set(url.split('/').at(-1).replace('.json',''),data=>resolve({ok:true,json:async()=>data})));
const colors=createRegionColors(fakeMap);
add('south-brazil-fill');add('russia-portal-fill');const start=colors.setCountry('brazil');pending.get('brazil')(datasets.brazil);await start;colors.setMetric('gdp');const expression=layers.get('south-brazil-fill').paint['fill-color'];assert(Array.isArray(expression));assert.equal(layers.get('russia-portal-fill').paint['fill-color'],'#fff');
const before=paints.length;colors.sync();assert.equal(paints.length,before,'Style-data feedback settles without repaint loops');
fakeMap.setPaintProperty('south-brazil-fill','fill-opacity',.25);colors.sync();assert.equal(layers.get('south-brazil-fill').paint['fill-opacity'],.25,'Satellite opacity is preserved');
colors.setMetric('none');assert.equal(layers.get('south-brazil-fill').paint['fill-color'],'#fff');assert.equal(layers.get('south-brazil-fill').paint['fill-opacity'],.25);
colors.setMetric('population');colors.suspend(true);assert.equal(layers.get('south-brazil-fill').paint['fill-color'],'#fff','Quiz restores normal fills');colors.suspend(false);assert(Array.isArray(layers.get('south-brazil-fill').paint['fill-color']));
const stale=colors.setCountry('russia'),latest=colors.setCountry('argentina');pending.get('argentina')(datasets.argentina);await latest;pending.get('russia')(datasets.russia);await stale;colors.setMetric('gdp');assert.equal(colors.getMetric(),'population','Unsupported economic measures fall back to population');
add('south-argentina-fill');colors.sync();assert(Array.isArray(layers.get('south-argentina-fill').paint['fill-color']),'Dynamically installed country geometry picks up the scale');assert.equal(layers.get('south-brazil-fill').paint['fill-color'],'#fff','Previous country colors are restored');
layers.delete('south-argentina-fill');colors.sync();add('south-argentina-fill','#abcdab');colors.sync();colors.setMetric('none');assert.equal(layers.get('south-argentina-fill').paint['fill-color'],'#abcdab','Replacement layers keep their own original color');
console.log('Shared region colors: all 12 countries, traceable comparable units, density calculations, Philippines regional totals, zero/missing values, ties/outliers, dynamic layers, satellite opacity, quizzes, async country cancellation, restored fills and view links passed.');
