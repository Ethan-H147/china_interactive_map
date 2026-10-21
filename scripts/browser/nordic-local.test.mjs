import assert from 'node:assert/strict';
import {load} from '../geo-index.mjs';
import {searchAndSelect} from './countries.test.mjs';
const fixtures=[
 {country:'norway',parent:'NO-M-0301',child:'NO-D-03012300',parentName:'Oslo'},
 {country:'sweden',parent:'SE-M-0180',child:'SE-R-0180R093',parentName:'Stockholm'},
 {country:'finland',parent:'FI-M-091',child:'FI-HKI-02',parentName:'Helsinki'},
 {country:'denmark',parent:'DK_101',child:'DK-S-7003',parentName:'Copenhagen'},
 {country:'iceland',parent:'IS-M-0000',child:'IS-RV-1',parentName:'Reykjavík'}
].map(f=>({...f,record:load('dist/data/europe/'+f.country+'/catalogue.bin').records.find(r=>r.id===f.child)}));
const toggles=p=>p.evaluate("[...document.querySelectorAll('.map-mode>button:not(#mode-lock)')].filter(b=>b.getClientRects().length).map(b=>b.id)");
async function lock(p,value){const locked=await p.evaluate("document.getElementById('mode-lock').getAttribute('aria-pressed')")==='true';if(locked!==value)await p.tap('#mode-lock');}
export default fixtures.flatMap(f=>[1280,1024].map(width=>({
 name:f.country+' two toggles, locked municipality, local search and saved detail '+width,
 options:{width,height:909,mobile:width===1024},
 async run(p,base){
  assert(f.record,'Fixture local area '+f.child);
  await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"window.localAreaRequests=[];const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{postMessage(data,...args){for(const url of data?.urls||[data?.url])if(typeof url==='string'&&url.includes('/third/'))localAreaRequests.push(url);return super.postMessage(data,...args);}};"});
  await p.open(base,'#'+f.country);
  assert.deepEqual(await toggles(p),['mode-province','mode-prefecture']);
  assert(await p.evaluate('localAreaRequests.length===0'),'No local geometry at country entry');
  await p.tap('#mode-prefecture');await lock(p,true);
  await searchAndSelect(p,f.parentName,f.parentName,'Municipality');
  assert.equal(await p.evaluate('currentAtlas().getSelection()'),f.parent);
  assert.equal(await p.evaluate('currentAtlas().getMode()'),2);
  assert(await p.evaluate('localAreaRequests.length===0'),'Locked municipalities do not download local areas');
  await lock(p,false);await searchAndSelect(p,f.parentName,f.parentName,'Municipality');
  assert.equal(await p.evaluate('currentAtlas().getMode()'),3);
  await p.waitFor("!!map.getLayer('"+f.country+"-third-fill')&&map.isSourceLoaded('"+f.country+"-third')",{label:'local area tiles'});
  assert.equal(await p.evaluate("map.getLayoutProperty('"+f.country+"-third-fill','visibility')"),'visible');
  assert.deepEqual(await toggles(p),['mode-province','mode-prefecture']);
  assert.equal(await p.evaluate("document.getElementById('mode-prefecture').getAttribute('aria-pressed')"),'true');
  assert.equal(await p.evaluate('new Set(localAreaRequests).size'),1,'Only the chosen municipality detail is downloaded');
  await searchAndSelect(p,f.record.en,f.record.en,f.record.kind);
  assert.equal(await p.evaluate('currentAtlas().getSelection()'),f.child);
  assert(await p.evaluate("map.queryRenderedFeatures({layers:['"+f.country+"-third-selected']}).length>0"),'Local selection is rendered');
  const hash=await p.evaluate('AtlasView.hashFor(captureView())');
  await p.screenshot('nordic-local-'+f.country+'-'+width);
  await p.tap('#mode-lock');await p.settle();
  assert.equal(await p.evaluate('currentAtlas().getMode()'),2);
  assert(!await p.evaluate("!!map.getLayer('"+f.country+"-third-fill')"),'Locking closes local geometry');
  await p.open(base,hash);assert.equal(await p.evaluate('currentAtlas().getSelection()'),f.child);assert.equal(await p.evaluate('currentAtlas().getMode()'),3);
  assert.deepEqual(await toggles(p),['mode-province','mode-prefecture']);
  await p.tap('#mode-prefecture');await p.settle();assert.equal(await p.evaluate('currentAtlas().getMode()'),2);assert(!await p.evaluate("!!map.getLayer('"+f.country+"-third-fill')"));
  assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 }
})));
