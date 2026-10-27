import fs from 'node:fs';
import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const enclaves=JSON.parse(fs.readFileSync('scripts/boundary-sources/central-asian-frontiers/enclave-samples.json'));
export default [1280,390].map(width=>({name:'Shared Central Asian borders and every Uzbek and Tajik enclave '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 for(const[c,count]of [['kazakhstan',21],['kyrgyzstan',9],['turkmenistan',7]]){await p.open(base,'#'+c);assert((await p.evaluate('map.queryRenderedFeatures({layers:['+JSON.stringify(c+'-first-fill')+']}).length'))>0);assert.equal(await p.evaluate('currentAtlas().getMode()'),1);await p.screenshot('central-asia-'+c+'-'+width);}
 for(const[e,i]of enclaves.map((e,i)=>[e,i])){
  await p.open(base,'#'+e.country);await p.evaluate('currentAtlas().home()');await p.settle();await p.evaluate('void map.fitBounds('+JSON.stringify(e.bounds)+',{padding:80,maxZoom:14,duration:0})');await p.settle();
  assert(await p.evaluate('(()=>{const q=map.project('+JSON.stringify(e.center)+');return map.queryRenderedFeatures(q,{layers:['+JSON.stringify(e.country+'-first-fill')+']}).length>0})()'),'Enclave fill '+i);
  const border=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(e.border)+');return map.queryRenderedFeatures([[q.x-4,q.y-4],[q.x+4,q.y+4]]).filter(f=>f.layer.type==="line"&&f.properties.pair==='+JSON.stringify(e.pair)+').length})()');assert(border>0,'Border on enclave fill edge '+i);
  await p.screenshot('central-asia-enclave-'+i+'-'+width);assert(await p.evaluate('mapScene.assertOrder()'));
 }
 for(const c of ['uzbekistan','kyrgyzstan','tajikistan']){await p.open(base,'#'+c);await p.evaluate('void map.jumpTo({center:[71,40.25],zoom:8.4})');await p.settle();await p.screenshot('fergana-'+c+'-'+width);}
 await p.open(base,'#uzbekistan');await searchAndSelect(p,'Shirin','Shirin','City');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'UZ24410');assert(await p.evaluate('map.queryRenderedFeatures({layers:["uzbekistan-settlements"]}).length>0'));assert(!await p.evaluate('document.getElementById("uz-statistics").textContent.includes("km")'));await p.screenshot('shirin-point-'+width);
 const saved=await p.evaluate('AtlasView.hashFor(captureView())');await p.open(base,saved);assert.equal(await p.evaluate('currentAtlas().getSelection()'),'UZ24410');assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
}}));
