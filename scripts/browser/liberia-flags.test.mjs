import assert from 'node:assert/strict';
import {liberiaFlags} from '../../dist/liberia-flags.mjs';
import {load} from '../geo-index.mjs';
import {searchAndSelect} from './countries.test.mjs';
const flags=liberiaFlags.liberia.firstFlags,records=load('dist/data/europe/liberia/catalogue.bin').records;
async function shown(p,id){const f=flags[id];await p.waitFor('(()=>{const i=document.getElementById("lr-flag");return i.getAttribute("src")==='+JSON.stringify(f.file)+'&&i.complete&&i.naturalWidth>0&&!i.closest("a").hidden})()',{label:id+' county flag'});assert.equal(await p.evaluate('document.getElementById("lr-flag").alt'),'Flag of '+f.name);}
export default [
 {name:'all 15 counties show their flags, districts retain their parent flag and the viewer opens originals',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#liberia');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");await searchAndSelect(p,'Bomi','Bomi','County');
  for(const id of Object.keys(flags)){await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');await shown(p,id);}
  const district=records.find(r=>r.level===2&&r.parent==='LR01');assert(district);await p.evaluate('currentAtlas().restore('+JSON.stringify(district.id)+')');await shown(p,'LR01');assert.equal(await p.evaluate('document.getElementById("lr-detail-flag-source").hidden'),true);
  await p.evaluate('currentAtlas().home()');await p.settle();await searchAndSelect(p,'River Gee','River Gee','County');await shown(p,'LR13');await p.screenshot('liberia-river-gee-county-flag');await p.tap('#lr-flag-source');
  await p.waitFor('document.getElementById("flag-viewer").open&&document.getElementById("flag-viewer-image").getAttribute("src")==='+JSON.stringify(flags.LR13.full));assert((await p.evaluate('document.getElementById("flag-viewer-credit").textContent')).includes(flags.LR13.credit));const ratio=await p.evaluate('(()=>{const r=document.getElementById("flag-viewer-image").getBoundingClientRect();return r.width/r.height})()');assert(Math.abs(ratio-flags.LR13.width/flags.LR13.height)<.001);await p.screenshot('liberia-river-gee-original-flag');await p.key('Escape');await p.waitFor('document.activeElement===document.getElementById("lr-flag-source")');
 }},
 {name:'county flags open in the shared viewer on a phone',options:{width:390,height:844,mobile:true},async run(p,base){
  await p.open(base,'#liberia');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");await searchAndSelect(p,'Grand Cape Mount','Grand Cape Mount','County');await shown(p,'LR05');await p.tap('#lr-flag-source');await p.waitFor('document.getElementById("flag-viewer").open&&document.getElementById("flag-viewer-image").getAttribute("src")==='+JSON.stringify(flags.LR05.full));assert(await p.evaluate('(()=>{const r=document.getElementById("flag-viewer-image").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()'));await p.screenshot('liberia-county-flag-mobile');await p.tap('#flag-viewer .flag-viewer-close');assert.equal(await p.evaluate('document.getElementById("flag-viewer").open'),false);
 }}
];
