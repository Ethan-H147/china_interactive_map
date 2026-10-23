import assert from 'node:assert/strict';
import {load} from '../geo-index.mjs';
import {searchAndSelect} from './countries.test.mjs';
const cases=[['austria','at','Carinthia','Kärnten','Innsbruck','Statutory city'],['hungary','hu','Zala','Zala','Hévíz','Municipality'],['slovenia','si','Upper Carniola','Gorenjska','Bled','Municipality']];
export default [
 ...cases.flatMap(([country,prefix,first,local,place,kind])=>[1280,390].map(width=>({name:country+' hierarchy, dated statistics, local names, originals, saved links and quiz '+width,options:{width,height:900,mobile:width===390},async run(p,base){
  const cat=load('dist/data/europe/'+country+'/catalogue.bin'),top=cat.records.find(r=>r.level===1&&r.en===first),target=cat.records.find(r=>r.en===place&&r.kind===kind);assert(top&&target);
  await p.open(base,'#'+country);assert.equal(await p.evaluate('AtlasEntry.current'),country);
  assert(await p.evaluate('map.queryRenderedFeatures({layers:["'+country+'-first-fill"]}).length>0'));
  assert(!await p.evaluate('!!map.getSource("'+country+'-third")'),'Local geometry loads on demand');
  await searchAndSelect(p,first,first,top.kind);assert.equal(await p.evaluate('currentAtlas().getSelection()'),top.id);
  const text=await p.evaluate('document.getElementById("'+prefix+'-statistics").parentElement.textContent');assert(text.includes('GDP'));assert(text.includes('Population'));assert(text.includes('2026')||text.includes('2024'));
  await searchAndSelect(p,place,place,kind);assert.equal(await p.evaluate('currentAtlas().getSelection()'),target.id);
  const level=['first','second','third'][target.level-1];assert(await p.evaluate('map.queryRenderedFeatures({layers:["'+country+'-'+level+'-selected"]}).length>0'));
  const hash=await p.evaluate('AtlasView.hashFor(captureView())');await p.open(base,hash);assert.equal(await p.evaluate('currentAtlas().getSelection()'),target.id);
  const flag='#'+country+'-sidebar .division-flags img[src="vendor/flag-'+prefix+'.svg"]';await p.tap(flag);await p.waitFor('document.getElementById("flag-viewer").open');assert.equal(await p.evaluate('document.getElementById("flag-viewer-image").getAttribute("src")'),'vendor/flag-'+prefix+'.svg');await p.key('Escape');
  if(country==='slovenia'){const settlement=cat.records.find(r=>r.parent===target.id&&r.kind==='Settlement');assert(settlement);await p.evaluate('currentAtlas().restore('+JSON.stringify(settlement.id)+')');await p.settle();assert(await p.evaluate('map.queryRenderedFeatures({layers:["slovenia-third-selected"]}).length>0'));}
  if(country==='austria'){const borough=load('dist/data/europe/austria/city-boroughs/catalogue.bin').records.find(r=>r.id==='AT-V-90101');await searchAndSelect(p,borough.en,borough.en,borough.kind);assert.equal(await p.evaluate('currentAtlas().getScope()'),'city-boroughs');await p.waitFor('document.querySelector("#austria-sidebar .archipelago-population:not([hidden]) .population-total")');assert(await p.evaluate('map.queryRenderedFeatures({layers:["austria-city-boroughs-selected"]}).length>0'));}
  assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));assert(await p.evaluate('mapScene.assertOrder()'));await p.screenshot('central-europe-'+country+'-'+width);
  await p.evaluate('currentAtlas().home()');await p.settle();await p.tap('#'+prefix+'-tab-quiz');await p.tap('#'+prefix+'-quiz-panel [data-q=start]');await p.settle();assert(await p.evaluate('currentAtlas().quiz.active'));
  const question=await p.evaluate('document.querySelector("#'+prefix+'-quiz-panel [data-q=question]").textContent'),answer=cat.records.find(r=>r.level===1&&r.en===question);assert(answer);
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(answer.center)+',zoom:8})');await p.settle();await p.tap(await p.evaluate('(()=>{const p=map.project('+JSON.stringify(answer.center)+'),r=map.getCanvas().getBoundingClientRect();return[r.x+p.x,r.y+p.y]})()'));await p.waitFor('document.querySelector("#'+prefix+'-quiz-panel [data-q=feedback]").textContent==="Correct"');await p.tap('#'+prefix+'-quiz-panel [data-q=end]');
 }}))),
 {name:'central-europe shared borders draw once in a third country and while either side is selected',options:{width:1280,height:900},async run(p,base){
  const data=load('scripts/boundary-sources/central-europe/resolved.bin');
  for(const pair of ['AUT-DEU','AUT-CZE','AUT-HUN','AUT-SVN','ITA-SVN','HUN-SVK']){
   const f=data.features.find(f=>f.properties.pair===pair),path=f.geometry.coordinates,point=path[Math.floor(path.length*.45)];
   for(const country of ['finland',...(pair==='AUT-HUN'?['austria','hungary']:pair==='AUT-SVN'?['austria','slovenia']:[])]){
    await p.open(base,'#'+country);await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:9})');await p.settle();
    assert.equal(await p.evaluate('AtlasGlobeOverviewController.snapshot().borders.coarse'),false,'The frame gate draws detailed borders at zoom 9');
    // The root tile stays queryable while the renderer suppresses its draw pass.
    const sources=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+');return [...new Set(map.queryRenderedFeatures([[q.x-2,q.y-2],[q.x+2,q.y+2]]).filter(f=>f.layer.metadata?.atlasInternationalBorder&&!f.layer.metadata?.atlas?.overview).map(f=>f.source))]})()');
    assert.equal(sources.length,1,pair+' one international stroke while '+country+' is open: '+sources);await p.screenshot('central-border-'+pair+'-'+country);
   }
  }
 }}
];
