import fs from 'node:fs';
import assert from 'node:assert/strict';
import {countryColorData,colorLayerProfile} from '../dist/region-color-data.mjs';
import {comparisonRecords,metricScale,shadeExpression,shadePalette,missingColor,createRegionColors} from '../dist/region-colors.mjs';
import {validate,hashFor,fromHash} from '../dist/view-state.mjs';
const datasets=Object.fromEntries(Object.keys(countryColorData).map(country=>[country,JSON.parse(fs.readFileSync('dist/data/region-colors/'+country+'.json'))]));
const counts={'south-africa':9,eswatini:4,lesotho:10,china:34,korea:29,mongolia:22,japan:47,indonesia:38,philippines:18,malaysia:16,singapore:5,russia:83,brazil:27,uruguay:19,argentina:24};
for(const [country,data]of Object.entries(datasets)){
 assert.equal(comparisonRecords(data,1).length,counts[country],country+' first-level comparison units');assert.equal(new Set(data.records.map(r=>r.id)).size,data.records.length);
 for(const r of data.records)for(const [key,m]of Object.entries(r.metrics)){assert(Number.isFinite(m.value)&&m.value>=0,country+' '+r.id+' '+key);assert(m.sourceUrl,'Traceable metric source');if(key.startsWith('gdp'))assert.equal(m.unit,'USD','Economic values must share a currency');}
 const population=metricScale(data,'population');assert(population&&population.count>=2,country+' population shading');assert.equal(population.color(undefined),missingColor);
 for(const key of ['population','populationDensity','gdp','gdpPerCapita']){const scale=metricScale(data,key);if(!scale)continue;assert(scale.bins.length<=7);assert.equal(scale.bins.reduce((s,b)=>s+b.count,0),scale.count,'Every valid value belongs to one group');}
 if(countryColorData[country].economy===false){assert.equal(metricScale(data,'gdp'),null);assert.equal(metricScale(data,'gdpPerCapita'),null);}
}
assert.equal(shadePalette.length,7);assert.equal(new Set(shadePalette).size,7,'Seven distinct shades');
assert(datasets.argentina.records.every(r=>Object.keys(r.metrics).length===2&&r.metrics.population&&r.metrics.populationDensity),'All Argentine provinces and the autonomous city offer population and density');
const argentinaSource=JSON.parse(fs.readFileSync('dist/data/south-america/argentina-statistics.json'));
for(const r of datasets.argentina.records){const source=argentinaSource.regions['argentina:'+r.id];assert.equal(r.metrics.populationDensity.value,source.population.value/source.area.value,'Density uses the reported population and area');assert(r.metrics.populationDensity.areaSourceUrl,'Density retains its area source');}
assert.equal(metricScale(datasets.argentina,'populationDensity').bins.length,7);assert.equal(metricScale(datasets.brazil,'gdpPerCapita').bins.length,7,'Seven groups are used when the data supports them');
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
const frames=[];let levelChanged;globalThis.MutationObserver=class{constructor(callback){levelChanged=callback;}observe(){}};
globalThis.location={href:'http://localhost/'};globalThis.requestAnimationFrame=callback=>frames.push(callback);
const layers=new Map(),events=new Map(),paints=[];
const fakeMap={getStyle:()=>({layers:[...layers.values()]}),getLayer:id=>layers.get(id),getPaintProperty:(id,p)=>layers.get(id).paint[p],setPaintProperty(id,p,v){layers.get(id).paint[p]=v;paints.push([id,p]);},on:(e,f)=>events.set(e,f),getCanvas:()=>({addEventListener(){}}),isMoving:()=>false};
const add=(id,color='#fff',opacity=1)=>layers.set(id,{id,type:'fill',paint:{'fill-color':color,'fill-opacity':opacity}});
const pending=new Map();globalThis.fetch=url=>new Promise(resolve=>pending.set(url.split('/').at(-1).replace('.json',''),data=>resolve({ok:true,json:async()=>data})));
let level=1;const colors=createRegionColors(fakeMap,{getLevel:()=>level});
assert.doesNotThrow(()=>listeners.get('change')({target:document}),'Page-level view-change events are safe');
assert.doesNotThrow(()=>listeners.get('change')({target:null}),'Non-element change targets are safe');
add('south-brazil-fill');add('russia-portal-fill');const start=colors.setCountry('brazil');pending.get('brazil')(datasets.brazil);await start;colors.setMetric('gdp');const expression=layers.get('south-brazil-fill').paint['fill-color'];assert(Array.isArray(expression));assert.equal(layers.get('russia-portal-fill').paint['fill-color'],'#fff');
const before=paints.length;colors.sync();assert.equal(paints.length,before,'Style-data feedback settles without repaint loops');
fakeMap.setPaintProperty('south-brazil-fill','fill-opacity',.25);colors.sync();assert.equal(layers.get('south-brazil-fill').paint['fill-opacity'],.25,'Satellite opacity is preserved');
colors.setMetric('none');assert.equal(layers.get('south-brazil-fill').paint['fill-color'],'#fff');assert.equal(layers.get('south-brazil-fill').paint['fill-opacity'],.25);
colors.setMetric('population');colors.suspend(true);assert.equal(layers.get('south-brazil-fill').paint['fill-color'],'#fff','Quiz restores normal fills');colors.suspend(false);assert(Array.isArray(layers.get('south-brazil-fill').paint['fill-color']));
const stale=colors.setCountry('russia'),latest=colors.setCountry('argentina');pending.get('argentina')(datasets.argentina);await latest;pending.get('russia')(datasets.russia);await stale;colors.setMetric('gdp');assert.equal(colors.getMetric(),'population','Unsupported economic measures fall back to population');
add('south-argentina-fill');colors.sync();assert(Array.isArray(layers.get('south-argentina-fill').paint['fill-color']),'Dynamically installed country geometry picks up the scale');assert.equal(layers.get('south-brazil-fill').paint['fill-color'],'#fff','Previous country colors are restored');
layers.delete('south-argentina-fill');colors.sync();add('south-argentina-fill','#abcdab');colors.sync();colors.setMetric('none');assert.equal(layers.get('south-argentina-fill').paint['fill-color'],'#abcdab','Replacement layers keep their own original color');
// Finer levels compare their own figures, including terminal metros beside local municipalities.
assert.equal(metricScale(datasets.china,'population',2).count,312);
assert.equal(metricScale(datasets.china,'gdp',2).count,335);
const hefei=datasets.china.records.find(r=>r.id==='340100');assert.equal(hefei.metrics.gdp.year,2024);assert(hefei.metrics.gdp.value<3e11,'Reject the infobox’s erroneous 1,421-trillion figure and retain the consistent annual table value');
assert.equal(metricScale(datasets['south-africa'],'population',2).count,52);
const municipal=metricScale(datasets['south-africa'],'population',3);assert.equal(municipal.count,213);assert.equal(municipal.total,213);
assert(municipal.records.some(r=>r.id==='ZA-D-city-of-cape-town'),'Metros remain visible in the municipal comparison');
assert(!municipal.records.some(r=>r.id==='ZA-D-zululand'),'Never count a district again beside its municipalities');
assert.equal(metricScale(datasets.japan,'population',2).count,1741);
assert.equal(metricScale(datasets.singapore,'population',2).count,55);
assert.equal(metricScale(datasets.philippines,'gdp',2).count,82);
assert.equal(metricScale(datasets.russia,'population',2),null,'City-proper populations must not color the wider urban okrug as though they were its total');
const chinese=metricScale(datasets.china,'population',2),city=chinese.resolve('130100');assert.equal(city.metrics.population.value,11235086);assert.notEqual(city.id,'130000');
assert.equal(chinese.resolve('110101').id,'110101');assert.equal(chinese.metric(chinese.resolve('110101')),undefined,'Districts missing population cannot inherit Beijing’s total');
assert.equal(chinese.resolve('130000'),undefined,'Broader units cannot appear in the finer comparison');
assert.equal(metricScale(datasets['south-africa'],'gdp',2),null,'Do not fabricate municipal GDP from a provincial total');
assert.equal(colorLayerProfile({id:'south-africa-city-fill',type:'fill'},'south-africa'),null,'Selected settlement outlines do not become admin-level statistics');
assert.equal(colorLayerProfile({id:'japan-local-wards-fill',type:'fill'},'japan').level,3);
assert.equal(colorLayerProfile({id:'city-district-fill',type:'fill'},'china').parent,'parentCity');

const opening=colors.setCountry('south-africa','population');assert.equal(colors.getMetric(),'population','Loading must preserve the requested measure');pending.get('south-africa')(datasets['south-africa']);await opening;
add('south-africa-first-fill');add('south-africa-second-fill');add('south-africa-third-fill');
const evaluate=(expression,p)=>{if(!Array.isArray(expression))return expression;const [op,...args]=expression;if(op==='get')return p[args[0]];if(op==='to-string')return String(evaluate(args[0],p));if(op==='coalesce')return args.map(x=>evaluate(x,p)).find(x=>x!==undefined&&x!==null);if(op==='match'){const value=evaluate(args[0],p);for(let i=1;i<args.length-1;i+=2)if(args[i]===value)return evaluate(args[i+1],p);return evaluate(args.at(-1),p);}if(op==='case')return evaluate(args.at(-1),p);throw Error(op);};
while(frames.length)frames.shift()();level=2;levelChanged();assert(frames.length,'ARIA level changes schedule a refresh without a map-style event');while(frames.length)frames.shift()();const districtExpression=layers.get('south-africa-second-fill').paint['fill-color'];const districts=metricScale(datasets['south-africa'],'population',2);
for(const r of districts.records)assert.equal(evaluate(districtExpression,{id:r.id,parent:r.parent}),districts.color(r.metrics.population.value),'District paint uses its own metric and scale');
assert.equal(layers.get('south-africa-second-fill').paint['fill-opacity'],1,'Finer colors are visible, not 1% overlays');
level=3;colors.sync();for(const r of municipal.records){const layer=r.level===3?'south-africa-third-fill':'south-africa-second-fill';assert.equal(evaluate(layers.get(layer).paint['fill-color'],{id:r.id,parent:r.parent}),municipal.color(r.metrics.population.value));}
colors.setMetric('gdp');assert.equal(colors.getMetric(),'gdp','Retain the requested metric when only a broader level supports it');assert(Array.isArray(layers.get('south-africa-third-fill').paint['fill-opacity']),'Unsupported detail does not conceal provincial GDP');
colors.setMetric('none');assert.equal(layers.get('south-africa-second-fill').paint['fill-opacity'],1);
level=1;const chinaLoad=colors.setCountry('china','population');pending.get('china')(datasets.china);await chinaLoad;add('province-fill','#eeeeee',1);add('prefecture-fill','#dddddd',.025);add('other-fill','#aaaaaa',.1);level=2;colors.sync();assert.equal(layers.get('prefecture-fill').paint['fill-opacity'],1,'China’s thin interactive fill inherits the base land opacity for coloring');fakeMap.setPaintProperty('province-fill','fill-opacity',.2);colors.sync();assert.equal(layers.get('prefecture-fill').paint['fill-opacity'],.2,'China’s detail shading respects satellite blending');
const missingExpression=layers.get('other-fill').paint['fill-color'];assert.equal(evaluate(missingExpression,{adcode:110101,provinceCode:110000}),missingColor,'A missing own value stays gray');colors.setMetric('none');assert.equal(layers.get('prefecture-fill').paint['fill-opacity'],.025,'Normal detail opacity is restored');
const singaporeLoad=colors.setCountry('singapore','population');pending.get('singapore')(datasets.singapore);await singaporeLoad;add('singapore-first-fill');level=2;colors.sync();const region=datasets.singapore.records.find(r=>r.id==='SG-CR');assert.equal(evaluate(layers.get('singapore-first-fill').paint['fill-color'],{id:region.id}),metricScale(datasets.singapore,'population',1).color(region.metrics.population.value),'Keep the broader colors while detailed boundaries are not installed');
add('singapore-second-fill');colors.sync();const planning=metricScale(datasets.singapore,'population',2);for(const r of planning.records)assert.equal(evaluate(layers.get('singapore-second-fill').paint['fill-color'],{id:r.id,parent:r.parent}),planning.color(r.metrics.population.value),'A lazily installed subdivision gets its own scale');
console.log('Shared region colors: all countries, independent subdivision scales, own population/GDP, missing values, terminal metros, dynamic geometry, loading preferences, satellite opacity, quizzes, async switching and restored fills passed.');
