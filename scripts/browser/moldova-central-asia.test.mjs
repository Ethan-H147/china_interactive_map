import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const cases=[{country:'moldova',prefix:'md',count:37,query:'Chisinau',name:'Chișinău',kind:'Municipality',pop:'720,128'}, {country:'uzbekistan',prefix:'uz',count:14,query:'Karakalpakstan',name:'Karakalpakstan',kind:'Autonomous republic',pop:'2,040,700',child:['Termez','Termez','District']}, {country:'tajikistan',prefix:'tj',count:5,query:'Gorno-Badakhshan',name:'Gorno-Badakhshan',kind:'Autonomous region',pop:'236,800'}, {country:'turkmenistan',prefix:'tm',count:7,query:'Dashoguz',name:'Daşoguz',kind:'Province',pop:'1,550,354',child:['Gorjaw','Gorjaw','District']}];
export default [1280,390].map(width=>({name:'Moldova and Central Asia maps, native search, statistics, local boundaries and flags '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 for(const d of cases){
  await p.open(base,'#'+d.country);assert.equal(await p.evaluate('document.querySelectorAll("#'+d.prefix+'-province option").length-1'),d.count);assert.equal(await p.evaluate('document.getElementById("'+d.prefix+'-tab-country")'),null);assert.equal(await p.evaluate('document.getElementById("'+d.prefix+'-layers-panel").hidden'),false);
  await searchAndSelect(p,d.query,d.name,d.kind);await p.waitFor('document.querySelector("#'+d.prefix+'-explore-panel .population-total")?.textContent.includes('+JSON.stringify(d.pop)+')');
  assert.equal(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true);
  if(d.child){await searchAndSelect(p,...d.child);assert.equal(await p.evaluate('currentAtlas().getMode()'),2);await p.waitFor('map.queryRenderedFeatures({layers:["'+d.country+'-second-selected"]}).length>0');}
  await p.screenshot(d.country+'-new-map-'+width);
  const saved=await p.evaluate('AtlasView.hashFor(captureView())'),id=await p.evaluate('currentAtlas().getSelection()');await p.open(base,saved);assert.equal(await p.evaluate('currentAtlas().getSelection()'),id);
  await p.tap('#'+d.country+'-sidebar .division-flags img[src="vendor/flag-'+d.prefix+'.svg"]');await p.waitFor('document.getElementById("flag-viewer").open');await p.key('Escape');
  await p.evaluate('currentAtlas().home()');await p.settle();await p.tap('#'+d.prefix+'-tab-quiz');assert((await p.evaluate('document.querySelector("#'+d.prefix+'-quiz-panel [data-q=count]").textContent')).startsWith(d.count+' '));
 }
 await p.open(base,'#turkmenistan');await searchAndSelect(p,'Arkadag','Arkadag','City');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'TM-ARK');await p.waitFor('map.queryRenderedFeatures({layers:["turkmenistan-first-selected"]}).length>0');assert(!await p.evaluate('!!document.querySelector("#tm-explore-panel .population-total")'));await p.screenshot('arkadag-'+width);
 assert.equal(await p.evaluate('mapScene.assertOrder()'),true);
}}));
