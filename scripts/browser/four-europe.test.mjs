import assert from 'node:assert/strict';
import {load} from '../geo-index.mjs';
import {additions} from '../four-europe-config.mjs';
export default Object.entries(additions).flatMap(([country,c])=>[1280,390].map(width=>({name:country+' local hierarchy, statistics, flags and saved selection '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 const cat=load('dist/data/europe/'+country+'/catalogue.bin'),top=cat.records.find(r=>r.level===1&&cat.chunks[r.id]),child=cat.records.find(r=>r.parent===top.id),leaf=cat.records.find(r=>r.parent===child.id)||child;
 await p.open(base,'#'+country);assert.equal(await p.evaluate('AtlasEntry.current'),country);assert(await p.evaluate('map.queryRenderedFeatures({layers:["'+country+'-first-fill"]}).length>0'));
 await p.evaluate('currentAtlas().restore('+JSON.stringify(top.id)+').then(()=>true)');await p.settle();let card=await p.evaluate('document.getElementById("'+c.prefix+'-statistics").parentElement.textContent');assert(card.includes('Area'));if(c.economy){assert(card.includes('Population'));assert(card.includes('GDP per capita'));}
 await p.evaluate('currentAtlas().restore('+JSON.stringify(leaf.id)+').then(()=>true)');await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),leaf.id);assert(await p.evaluate('map.queryRenderedFeatures({layers:["'+country+'-'+['first','second','third'][leaf.level-1]+'-selected"]}).length>0'));
 const hash=await p.evaluate('AtlasView.hashFor(captureView())');await p.open(base,hash);assert.equal(await p.evaluate('currentAtlas().getSelection()'),leaf.id);
 await p.tap('#'+country+'-sidebar .division-flags img[src="vendor/flag-'+c.prefix+'.svg"]');await p.waitFor('document.getElementById("flag-viewer").open');assert.equal(await p.evaluate('document.getElementById("flag-viewer-image").getAttribute("src")'),'vendor/flag-'+c.prefix+'.svg');await p.key('Escape');
 assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));assert(await p.evaluate('mapScene.assertOrder()'));await p.screenshot('four-europe-'+country+'-'+width);
 await p.evaluate('currentAtlas().home().then(()=>true)');await p.settle();await p.tap('#'+c.prefix+'-tab-quiz');await p.tap('#'+c.prefix+'-quiz-panel [data-q=start]');await p.settle();assert(await p.evaluate('currentAtlas().quiz.active'));
}}))).concat([{name:'shared borders draw once from a third-country view',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#korea');
 for(const f of load('scripts/boundary-sources/four-europe/resolved.bin').features){const path=f.geometry.coordinates,point=path[Math.floor(path.length*.55)];await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:11})');await p.settle();const sources=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+');return [...new Set(map.queryRenderedFeatures([[q.x-1,q.y-1],[q.x+1,q.y+1]]).filter(f=>f.layer.metadata?.atlasInternationalBorder&&!f.layer.metadata?.atlas?.overview).map(f=>f.source))]})()');assert.equal(sources.length,1,f.properties.pair+' has exactly one detailed border source: '+sources);}
}}]);
