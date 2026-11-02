import assert from 'node:assert/strict';
import {load} from './us-geography.mjs';
import {metricScale,shadeExpression,missingColor,expandMetricTexts} from '../dist/region-colors.mjs';
import {colorLayerProfile} from '../dist/region-color-data.mjs';
const raw=load('dist/data/region-colors/united-states.json');assert(raw.metricTexts?.length>0);assert(raw.records.some(r=>Object.values(r.metrics).some(m=>Number.isInteger(m.sourceUrl))),'Metadata is interned in transport');
const data=expandMetricTexts(raw),stats=load('dist/data/europe/united-states/statistics.json');
for(const r of data.records){const pop=r.metrics.population;if(pop){const s=stats.regions['united-states:'+r.id];assert.equal(pop.value,s.population.value);assert.equal(pop.year,s.population.year);assert.equal(pop.unit,'people');assert.equal(pop.sourceUrl,s.population.sourceUrl||stats.sources[s.population.source].url,'Lossless source expansion '+r.id);}}
assert.equal(expandMetricTexts(data),data,'Metadata expands once');
const evaluate=(e,p)=>{if(!Array.isArray(e))return e;const [op,...args]=e;if(op==='get')return p[args[0]];if(op==='to-string')return String(evaluate(args[0],p));if(op==='coalesce')return args.map(a=>evaluate(a,p)).find(v=>v!==undefined&&v!==null);if(op==='match'){const value=evaluate(args[0],p);for(let i=1;i<args.length-1;i+=2)if(args[i]===value)return evaluate(args[i+1],p);return evaluate(args.at(-1),p);}throw Error(op);};
for(const scope of ['US-CA','US-IL','US-VA'])for(const [key,level]of [['population',3],['populationDensity',3],['gdp',2],['population',1]]){
 const scale=metricScale(data,key,level),profile={id:'id',parent:'parent',level:key==='gdp'?2:3,scope},expression=shadeExpression(data,scale,profile);
 assert(JSON.stringify(expression).length<200000,'State-scoped lookup stays bounded '+scope+' '+key);
 const candidates=data.records.filter(r=>r.level===profile.level&&r.parent===scope),probes=[...candidates.slice(0,10),...candidates.slice(-10)];
 for(const r of probes){const unit=scale.resolve(r.id),value=unit&&scale.metric(unit)?.value;assert.equal(evaluate(expression,{id:r.id,parent:r.parent}),scale.color(value),'Same nationwide scale for loaded state '+r.id+' '+key);}
 assert.equal(evaluate(expression,{id:'missing-new-place',parent:scope}),level===1?scale.color(scale.metric(scale.resolve(scope))?.value):missingColor,'Unknown units retain correct parent fallback');
}
const profile=colorLayerProfile({id:'united-states-third-fill',type:'fill',metadata:{atlas:{statisticsParent:'US-IL'}}},'united-states');assert.equal(profile.scope,'US-IL');
console.log('US colors: lossless source dictionary, bounded state lookups, nationwide quantiles, parent fallbacks, missing geography and source scope passed.');
