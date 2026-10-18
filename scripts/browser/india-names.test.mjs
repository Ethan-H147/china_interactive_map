import assert from 'node:assert/strict';
import fs from 'node:fs';
import {searchAndSelect} from './countries.test.mjs';
const data=JSON.parse(fs.readFileSync('dist/data/europe/india/regional-names.json'));
const select=async(p,id)=>{await p.evaluate(`currentAtlas().restore(${JSON.stringify(id)})`);await p.settle();};
export default [
 {name:'all 36 states and union territories show their own primary script and regional coverage',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#india');
  for(const [id,r]of Object.entries(data.records)){
   await select(p,id);
   const result=await p.evaluate(`(()=>{const e=document.getElementById('in-local'),box=document.getElementById('in-names'),details=box.querySelector('details');return {text:e.textContent,lang:e.lang,dir:e.dir,caption:document.getElementById('in-local-language').textContent,captionHidden:document.getElementById('in-local-language').hidden,localHidden:e.hidden,names:box.querySelectorAll('bdi').length,presence:box.querySelectorAll('.regional-language-coverage a').length,collapsed:details?!details.open:null};})()`);
   const names=r.names.filter(n=>n.code!=='en'&&(!n.primary||n.text===r.primary.text&&['Meghalaya','Mizoram'].includes(n.text)));
   assert.equal(result.text,r.primary.text,id);assert.equal(result.lang,r.primary.lang,id);assert.equal(result.dir,r.primary.dir,id);assert.equal(result.caption,r.primary.language,id+' identifies the main language');assert.equal(result.captionHidden,result.localHidden,id+' keeps the caption with its name');
   assert.equal(result.names,names.length,id);assert.equal(result.presence,r.otherLanguages.length,id);
   assert.equal(result.collapsed,names.length+r.otherLanguages.length>3?true:null,id+' collapses longer lists');
  }
  await select(p,'IN-JH');await p.tap('#in-names summary');
  assert(await p.evaluate(`document.querySelector('#in-names bdi[lang=sat]').textContent.includes('ᱡᱷᱟ')`));
  assert(await p.evaluate(`document.querySelector('#in-names .regional-language-coverage').textContent.includes('Ho')`));
  await p.screenshot('india-names-jharkhand-desktop');
  await select(p,'IN-JK');await p.tap('#in-names summary');assert.equal(await p.evaluate(`document.getElementById('in-local').dir`),'rtl');
  assert.equal(await p.evaluate(`document.querySelector('#in-names bdi[lang=ur]').dir`),'rtl');
  await p.screenshot('india-names-kashmir-desktop');
  await select(p,'IN-SK');assert.equal(await p.evaluate(`document.querySelector('#in-names details').open`),false,'Changing place closes the list');
  await p.tap('#in-names summary');assert.equal(await p.evaluate(`document.querySelectorAll('#in-names a[title^="Source"]').length`),5);assert(await p.evaluate(`document.getElementById('in-names').textContent.includes('romanized')`));
  await p.screenshot('india-names-sikkim-desktop');
  await select(p,'IN-PY');assert.equal(await p.evaluate(`!!document.querySelector('#in-names details')`),false,'Short lists stay visible');
 }},
 {name:'native names are searchable and the disclosure works by keyboard',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#india');await searchAndSelect(p,'தமிழ்நாடு','Tamil Nadu');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'IN-TN');
  await p.evaluate(`document.querySelector('#in-names summary').focus()`);await p.key('Enter');assert(await p.evaluate(`document.querySelector('#in-names details').open`));
  await p.key(' ');assert.equal(await p.evaluate(`document.querySelector('#in-names details').open`),false);
  // Exercise the shared renderer with literal markup and RTL in a real DOM.
  const result=await p.evaluate(`(async()=>{const {renderRegionalNames}=await import('./regional-names.mjs'),box=document.createElement('div'),record={regionalNames:[{text:'<img src=x onerror=alert(1)>',lang:'ur',dir:'rtl',language:'Urdu',source:'https://example.org/source'}]};renderRegionalNames(box,record);const safe=!box.querySelector('img')&&box.querySelector('bdi').textContent===record.regionalNames[0].text&&box.querySelector('bdi').dir==='rtl'&&box.querySelector('a').rel==='noopener';renderRegionalNames(box,{});return {safe,cleared:!box.childNodes.length};})()`);assert.deepEqual(result,{safe:true,cleared:true});
  await p.evaluate(`location.hash='#united-kingdom'`);await p.waitFor(`AtlasEntry.current==='united-kingdom'`);await p.settle();
  const id=await p.evaluate(`document.querySelector('#gb-province option:not([value=""])').value`);await select(p,id);
  assert(await p.evaluate(`document.getElementById('gb-name').textContent.length>0`),'The pre-existing country name display still works');
 }},
 {name:'long Indigenous lists fit the phone panel and preserve Tibetan detail',options:{width:390,height:844,mobile:true},async run(p,base){
  await p.open(base,'#india');await select(p,'IN-SK');
  const handle='#india-sidebar .sheet-handle';for(let i=0;i<3&&await p.evaluate(`document.documentElement.dataset.sheet!=='full'`);i++)await p.tap(handle);
  await p.waitFor(`document.documentElement.dataset.sheet==='full'`);await p.tap('#in-names summary');
  assert.equal(await p.evaluate(`document.querySelector('#in-names details').open`),true);
  assert(await p.evaluate(`(()=>{const b=document.getElementById('in-names');return b.scrollWidth<=b.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth;})()`),'No horizontal overflow');
  await p.evaluate(`document.getElementById('in-name').scrollIntoView({block:'start'})`);await p.screenshot('india-names-sikkim-phone');
  await select(p,'IN-LA');await p.waitFor(`document.fonts.check('20px "Noto Serif Tibetan"')`);assert((await p.evaluate(`getComputedStyle(document.getElementById('in-local')).fontFamily`)).includes('Noto Serif Tibetan'));
  await p.evaluate(`document.getElementById('in-name').scrollIntoView({block:'start'})`);await p.screenshot('india-names-ladakh-phone');
 }}
];
