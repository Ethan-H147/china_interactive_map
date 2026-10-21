import assert from 'node:assert/strict';
import {load,polygons,lineIndex,linesOf} from '../geo-index.mjs';
import {searchAndSelect} from './countries.test.mjs';
const catalogue=load('dist/data/europe/denmark/catalogue.bin'),records=catalogue.records,municipalities=records.filter(r=>r.level===2&&/^DK_/.test(r.id));
const edge=lineIndex(linesOf(load('dist/data/europe/denmark/all.bin').levels.find(l=>l.level===2).boundaries));
const parish=load('dist/data/europe/denmark/third/DK_756.bin').regions.features.find(f=>f.properties.id==='DK-S-9212'),shared=polygons(parish.geometry).flat(2).filter(p=>edge(p)<.3),closePoint=shared[Math.floor(shared.length/2)];assert(closePoint,'Christianshede has a shared municipal edge');
async function unlock(p){if(await p.evaluate("document.getElementById('mode-lock').getAttribute('aria-pressed')==='true'"))await p.tap('#mode-lock');}
export default [
 {name:'Denmark every municipality loads contained parish borders',options:{width:1280,height:960},async run(p,base){
  await p.open(base,'#denmark');await unlock(p);
  for(const r of municipalities){
   await p.evaluate('currentAtlas().restore('+JSON.stringify(r.id)+')');
   await p.waitFor("currentAtlas().getMode()===3&&!!map.getLayer('denmark-third-lines')&&document.getElementById('denmark-sidebar').getAttribute('aria-busy')!=='true'",{label:r.en+' parish detail'});
   await p.evaluate('void map.fitBounds('+JSON.stringify(r.bounds)+',{duration:0,padding:45,maxZoom:12})');await p.settle();
   assert.equal(await p.evaluate('currentAtlas().getSelection()'),r.id);
   assert.equal(await p.evaluate("map.getLayoutProperty('denmark-third-lines','visibility')"),'visible');
   assert(await p.evaluate("document.getElementById('dk-error').hidden"),r.en+' detail has no error');
   const visible=await p.evaluate("map.queryRenderedFeatures({layers:['denmark-third-lines']}).map(f=>f.properties.upperLevel)");
   if(load('dist/data/europe/denmark/'+catalogue.chunks[r.id].file).boundaries.features.some(f=>f.properties.upperLevel===3))assert(visible.length,r.en+' parish borders are visible');assert(visible.every(n=>n===3),r.en+' no duplicate municipal/region strokes');
   await p.screenshot('denmark-audit-'+r.id);
  }
 }},
 ...[1280,1024].map(width=>({name:'Christianshede aligned outline, detailed borders and independent toggles '+width,options:{width,height:960,mobile:width===1024},async run(p,base){
  await p.open(base,'#denmark');await unlock(p);await searchAndSelect(p,'Christianshede','Christianshede','Parish');
  assert.equal(await p.evaluate('currentAtlas().getSelection()'),'DK-S-9212');
  assert.deepEqual(await p.evaluate("[...document.querySelectorAll('.map-mode>button:not(#mode-lock)')].filter(b=>b.getClientRects().length).map(b=>b.id)"),['mode-province','mode-prefecture']);
  await p.screenshot('denmark-christianshede-fixed-'+width);
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(closePoint)+',zoom:15})');await p.settle();assert(await p.evaluate("(()=>{const p=map.project("+JSON.stringify(closePoint)+");return ['denmark-third-selected','denmark-second-lines'].every(id=>map.queryRenderedFeatures([[p.x-3,p.y-3],[p.x+3,p.y+3]],{layers:[id]}).length>0);})()"),'Selected parish and ordinary municipal stroke meet at close zoom');await p.screenshot('denmark-christianshede-detail-fixed-'+width);
  const filters=await p.evaluate("['denmark-second-lines','denmark-third-lines'].map(id=>map.getFilter(id))");assert.deepEqual(filters[0],['!', ['in',['get','upperLevel'],['literal',[1]]]]);assert.deepEqual(filters[1],['!', ['in',['get','upperLevel'],['literal',[1,2]]]]);
  await p.tap('#dk-tab-layers');await p.tap('#dk-province-layer');await p.tap('#dk-second-layer');await p.settle();assert.deepEqual(await p.evaluate("map.getFilter('denmark-third-lines')"),['!', ['in',['get','upperLevel'],['literal',[]]]]);
  await p.tap('#dk-province-layer');await p.tap('#dk-second-layer');await p.settle();
  await searchAndSelect(p,'Blovstrød','Blovstrød','Parish');assert(await p.evaluate("map.queryRenderedFeatures({layers:['denmark-third-selected']}).length>0"));await p.screenshot('denmark-cross-municipal-parish-'+width);
 }}))
];
