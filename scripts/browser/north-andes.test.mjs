import assert from 'node:assert/strict';
import {load} from '../geo-index.mjs';
import {searchAndSelect} from './countries.test.mjs';
const cases=[['ecuador','ec','Pichincha','Cuenca',3],['venezuela','ve','Miranda','Antimano',3],['colombia','co','Antioquia','Medellín',2]];
export default [
 ...cases.flatMap(([country,prefix,region,place,level])=>[1280,390].map(width=>({name:country+' hierarchy, statistics, original flag, saved selection and quiz '+width,options:{width,height:900,mobile:width===390},async run(p,base){
  const cat=load('dist/data/europe/'+country+'/catalogue.bin'),top=cat.records.find(r=>r.level===1&&r.en===region),target=cat.records.find(r=>r.level===level&&r.en===place);assert(top&&target);
  await p.open(base,'#'+country);assert.equal(await p.evaluate('AtlasEntry.current'),country);assert(await p.evaluate('map.queryRenderedFeatures({layers:["'+country+'-first-fill"]}).length>0'));
  await searchAndSelect(p,region,region,top.kind);assert.equal(await p.evaluate('currentAtlas().getSelection()'),top.id);const text=await p.evaluate('document.getElementById("'+prefix+'-statistics").parentElement.textContent');assert(text.includes('Population'));assert(text.includes(country==='ecuador'?'2022':country==='venezuela'?'2011':'2025'));if(country==='colombia')assert(text.includes('GDP'));
  await searchAndSelect(p,place,place,target.kind);assert.equal(await p.evaluate('currentAtlas().getSelection()'),target.id);assert(await p.evaluate('map.queryRenderedFeatures({layers:["'+country+'-'+['first','second','third'][level-1]+'-selected"]}).length>0'));
  const hash=await p.evaluate('AtlasView.hashFor(captureView())');await p.open(base,hash);assert.equal(await p.evaluate('currentAtlas().getSelection()'),target.id);
  await p.tap('#'+country+'-sidebar .division-flags img[src="vendor/flag-'+prefix+'.svg"]');await p.waitFor('document.getElementById("flag-viewer").open');assert.equal(await p.evaluate('document.getElementById("flag-viewer-image").getAttribute("src")'),'vendor/flag-'+prefix+'.svg');await p.key('Escape');
  assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));assert(await p.evaluate('mapScene.assertOrder()'));await p.screenshot('north-andes-'+country+'-'+width);
  await p.evaluate('currentAtlas().home()');await p.settle();await p.tap('#'+prefix+'-tab-quiz');await p.tap('#'+prefix+'-quiz-panel [data-q=start]');await p.settle();assert(await p.evaluate('currentAtlas().quiz.active'));
 }}))),
 {name:'north-andes shared borders remain single strokes at detailed zoom',options:{width:1280,height:900},async run(p,base){
  const canonical=load('scripts/boundary-sources/north-andes/resolved.bin');
  for(const pair of ['COL-ECU','COL-VEN','ECU-PER','BRA-COL','BRA-VEN'])for(const country of ['finland',...(pair==='COL-ECU'?['ecuador','colombia']:pair==='COL-VEN'?['colombia','venezuela']:[])]){await p.open(base,'#'+country);const path=canonical.features.find(f=>f.properties.pair===pair).geometry.coordinates,point=path[Math.floor(path.length*.55)];await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:9})');await p.settle();const sources=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+');return [...new Set(map.queryRenderedFeatures([[q.x-2,q.y-2],[q.x+2,q.y+2]]).filter(f=>f.layer.metadata?.atlasInternationalBorder&&!f.layer.metadata?.atlas?.overview).map(f=>f.source))]})()');assert.equal(sources.length,1,pair+' one detailed international source while '+country+' is open: '+sources);await p.screenshot('north-andes-border-'+pair+'-'+country);}
 }}
];
