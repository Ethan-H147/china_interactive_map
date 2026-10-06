import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createComparison,chinaComparisonProfile,japanComparisonProfile,koreaComparisonProfile,matchesComparisonLevel} from '../dist/compare.mjs';
import {japanPopulation,japanLocalStatistics} from '../dist/japan-local-facts.mjs';
const read=name=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/'+name+'.bin')));
const facts=read('japan-local-facts'),catalogue=read('japan-local/catalogue').records;
const prefectures=read('japan-boundaries').first.features.map(f=>({...f.properties,kind:f.properties.type})),all=[...prefectures,...catalogue];
assert.equal(Object.keys(facts.records).length,1965);
assert.equal(Object.values(facts.records).filter(r=>r.population!=null).length,1959);
assert.equal(facts.source.date,'2025-10-01');assert.equal(facts.source.released,'2026-09-29');
assert.equal(facts.records['JP-13104'].population,361357);
assert.equal(facts.records['JP-01100'].population,1961996);
for(const p of prefectures)assert.equal(catalogue.filter(c=>c.level===2&&c.parent===p.id&&!c.disputed).reduce((s,c)=>s+facts.records[c.id].population,0),facts.records[p.id].population);
for(const p of catalogue.filter(c=>c.kind==='Designated city'))assert.equal(catalogue.filter(c=>c.parent===p.id).reduce((s,c)=>s+facts.records[c.id].population,0),facts.records[p.id].population);
for(const p of catalogue.filter(c=>c.disputed))assert.equal(japanPopulation(facts,p.id,p.kind),null,'Uncovered population is not zero');
const flags=JSON.parse(fs.readFileSync('dist/data/japan-local-flags.json'));
assert(Object.keys(flags.flags).length>=1741);
assert(catalogue.filter(p=>p.level===2&&!p.disputed).every(p=>flags.flags[p.id]),'Every ordinary municipality has a verified flag record');
for(const [id,r]of Object.entries(flags.flags)){assert(catalogue.some(p=>p.id===id));assert(r.page.startsWith('https://commons.wikimedia.org/'));assert(r.license);assert(r.bytes<=1024*1024);if(!r.file.startsWith('https://')){const file=fs.readFileSync('dist/'+r.file);assert.equal(file.length,r.bytes);if(r.file.endsWith('.svg'))assert(!/<script|<foreignObject|\son\w+\s*=|javascript:|(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i.test(file.toString()));}else assert.equal(new URL(r.file).hostname,'upload.wikimedia.org');assert.equal(facts.records[id].flag.file,r.file);}
assert(fs.statSync('dist/data/japan-local-facts.bin').size<250000,'Country-only metadata stays small');
assert.equal(japanLocalStatistics(facts,'JP-13104').regions['japan:JP-13104'].area.value,18.22);

class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this._value='';this.open=false;this.textContent='';}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[];this._value='';this.append(...nodes);}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,fn){(this.events??={})[k]=fn;}
 get options(){return this.children.filter(n=>n.tag==='option');}
 get value(){return this.tag==='select'?(this.options.some(o=>o.value===this._value)?this._value:this.options[0]?.value||''):this._value;}
 set value(v){this._value=String(v);}
 showModal(){this.open=true;}close(){this.open=false;this.events?.close?.();}
}
const body=new Element('body');globalThis.document={body,createElement:tag=>new Element(tag)};
const flatten=n=>[n,...n.children.flatMap(flatten)],text=n=>[n.textContent,...n.children.map(text)].join(' ');
let requests=0,release;globalThis.fetch=async()=>{requests++;await new Promise(resolve=>release=resolve);return new Response(fs.readFileSync('dist/data/region-statistics.json'));};
const comparison=createComparison();assert.equal(requests,0,'Creating comparison downloads no statistics or geometry');assert.equal(comparison.open(undefined,'japan'),false,'Unloaded countries are not implicitly fetched');
comparison.register('japan',japanComparisonProfile(all,facts));
const korea=read('korea-boundaries');comparison.register('korea',koreaComparisonProfile([...korea.first.features,...korea.second.features].map(f=>f.properties)));
comparison.register('china',chinaComparisonProfile({regions:[{feature:{properties:{adcode:310000,level:'province',name:'上海'}}},{feature:{properties:{adcode:330000,level:'province',name:'浙江'}}},{feature:{properties:{adcode:330100,level:'city',name:'杭州'}}}],name:p=>({310000:'Shanghai',330000:'Zhejiang',330100:'Hangzhou'}[p.adcode]),kind:()=> 'Region',provincePopulation:{china:{310000:{total:24870895,date:'2020'},330000:{total:64567588,date:'2020'}}},regionPopulation:{regions:{330100:{total:11936010,date:'2020'}},source:{revisionUrl:'https://example.com/census'}}}));
assert(matchesComparisonLevel({level:'province',adcode:310000},'province'));assert(matchesComparisonLevel({level:'province',adcode:310000},'prefecture'));assert(!matchesComparisonLevel({level:'province',adcode:330000},'prefecture'));
comparison.open('JP-13104','japan');const dialog=body.children[0],nodes=()=>flatten(dialog),selects=()=>nodes().filter(n=>n.tag==='select'),output=nodes().find(n=>n.className==='comparison-output');assert.equal(selects()[0].value,'2');assert.equal(selects()[1].value,'JP-13104');assert(!selects()[2].options.some(n=>n.value==='JP-13104'));
// A country change while statistics are loading must render the newer profile.
comparison.open('KR-11','korea');release();await new Promise(setImmediate);assert(text(output).includes('Seoul'));assert(!text(output).includes('Shinjuku'));assert(text(output).includes('KRW'));assert(text(output).includes('USD'));assert(text(output).includes('Not available'));
comparison.open('JP-13104','japan');await new Promise(setImmediate);assert(text(output).includes('361,357'));assert(text(output).includes('18.22 km²'));assert(text(output).includes('Final census'));assert(!text(output).includes('JPY'),'Municipal GDP is never copied from its prefecture');
comparison.open('JP-14104','japan');await new Promise(setImmediate);assert.equal(selects()[0].value,'3');assert(text(output).includes('Yokohama'));assert(selects()[1].options.length<=171);
comparison.open('JP-13','japan');await new Promise(setImmediate);assert.equal(selects()[0].value,'1');assert(text(output).includes('JPY'));assert(text(output).includes('USD'));
const searchFirst=nodes().find(n=>n.tag==='input');searchFirst.value='Tokyo';searchFirst.oninput();await new Promise(setImmediate);assert.equal(selects()[1].value,'JP-13','Search accepts English without macrons');
comparison.open(310000,'china');await new Promise(setImmediate);selects()[0].value='prefecture';selects()[0].onchange();await new Promise(setImmediate);assert.equal(selects()[1].value,'310000');assert(selects()[2].options.some(n=>n.value==='330100'));assert(!selects()[2].options.some(n=>n.value==='330000'));assert.equal(body.children.length,1,'One shared dialog after country switches');
dialog.close();assert.equal(dialog.open,false);
const japanSource=fs.readFileSync('dist/japan.mjs','utf8');assert(japanSource.indexOf('id="j-flag-source"')<japanSource.indexOf('id="j-local-flag-source"'));assert(japanSource.includes("if(p.level>1&&localFlag)"));
console.log('Final census coverage/totals, safe licensed local flags, metadata budgets, country comparisons, missing figures, ward hierarchy, stale-load cancellation and China municipality eligibility passed.');
