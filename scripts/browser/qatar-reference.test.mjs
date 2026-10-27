import assert from 'node:assert/strict';
import {fixtureImagery} from './atlas-audit-helpers.mjs';
import {searchAndSelect} from './countries.test.mjs';
export default [1280,390].map(width=>({name:'Qatar corrected zones, district outlines, satellite mode and excluded placeholder '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await fixtureImagery(p);await p.open(base,'#qatar');await searchAndSelect(p,'Zone 61','Zone 61','Zone');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'QAT006061');await p.evaluate('void map.jumpTo({center:[51.5365,25.3192],zoom:16})');await p.settle();assert(await p.evaluate('map.queryRenderedFeatures({layers:["qatar-second-selected"]}).length>0'));
 await p.evaluate('document.getElementById("qa-tab-layers").click()');await p.tap('#satellite-layer');await p.waitFor('satelliteDisplay.state.hasTile');await p.settle();assert(await p.evaluate('mapScene.assertOrder()'));assert(await p.evaluate('map.queryRenderedFeatures({layers:["qatar-second-selected"]}).length>0'));await p.screenshot('qatar-corrected-satellite-mode-'+width);await p.tap('#satellite-layer');await p.settle();
 await searchAndSelect(p,'Al Egla','Al Egla','District');assert.equal(await p.evaluate('currentAtlas().getMode()'),3);assert(await p.evaluate('map.queryRenderedFeatures({layers:["qatar-third-selected"]}).length>0'));await p.screenshot('qatar-corrected-district-'+width);
 const saved=await p.evaluate('AtlasView.hashFor(captureView())'),selected=await p.evaluate('currentAtlas().getSelection()');await p.open(base,saved);assert.equal(await p.evaluate('currentAtlas().getSelection()'),selected);
 await p.evaluate('currentAtlas().home()');await p.settle();await p.tap('#qa-search');await p.type('Zone 99');await p.waitFor('document.getElementById("qa-search-results").textContent.includes("No match")||document.querySelectorAll("#qa-search-results button").length>0');assert(!await p.evaluate('[...document.querySelectorAll("#qa-search-results button")].some(b=>/\\bZone 99\\b/.test(b.textContent))'));
 assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
}}));
