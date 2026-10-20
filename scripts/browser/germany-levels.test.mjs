import assert from 'node:assert/strict';
import {load} from '../geo-index.mjs';
const catalogue=load('dist/data/europe/germany/catalogue.bin');
const district=catalogue.records.find(r=>r.id==='DEF0B'),other=catalogue.records.find(r=>r.id==='DEF0C');
const municipality=catalogue.records.find(r=>r.parent===district.id&&r.level===3);
const shown=p=>p.evaluate("[...document.querySelectorAll('.map-mode>button:not(#mode-lock)')].filter(b=>b.getClientRects().length).map(b=>b.textContent.trim())");
const thirdVisible=p=>p.evaluate("!!map.getLayer('germany-third-fill')&&map.getLayoutProperty('germany-third-fill','visibility')!=='none'");
async function clickPlace(p,record){
 await p.evaluate('window.AtlasSheet?.collapse();map.jumpTo({center:'+JSON.stringify(record.center)+',zoom:8});true');await p.settle();
 const point=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(record.center)+'),r=map.getCanvas().getBoundingClientRect();return [r.left+q.x,r.top+q.y]})()');await p.tap(point);await p.settle();
}
export default [1280,390].map(width=>({
 name:'Germany two-level toggle and locked district municipality drill-down '+width,
 options:{width,height:900,mobile:width===390},
 async run(p,base){
  await p.open(base,'#germany');assert.deepEqual(await shown(p),['States','Districts & cities']);assert.equal(await thirdVisible(p),false);
  await p.tap('#mode-prefecture');await p.settle();assert.equal(await p.evaluate('currentAtlas().getMode()'),2);assert.equal(await thirdVisible(p),false,'No national municipal layer');
  await p.tap('#mode-lock');await clickPlace(p,district);assert.equal(await p.evaluate('currentAtlas().getSelection()'),district.id);assert.equal(await p.evaluate('currentAtlas().getMode()'),2);assert.equal(await thirdVisible(p),false,'Locked district click does not show municipalities');assert.equal(await p.evaluate("!!map.getSource('germany-third')"),false,'Locked district does not load municipal geometry');
  await p.tap('#mode-lock');await clickPlace(p,district);assert.equal(await p.evaluate('currentAtlas().getMode()'),3);assert.equal(await thirdVisible(p),true,'Unlocked district click reveals municipal boundaries');assert.deepEqual(await shown(p),['States','Districts & cities']);assert.equal(await p.evaluate("document.getElementById('mode-prefecture').getAttribute('aria-pressed')"),'true');
  const saved=await p.evaluate('AtlasView.hashFor(captureView())');await clickPlace(p,municipality);assert.equal(await p.evaluate('currentAtlas().getSelection()'),municipality.id,'Municipalities remain selectable inside the district');
  await p.screenshot('germany-two-level-unlocked-'+width);
  await p.tap('#mode-lock');await p.settle();assert.equal(await p.evaluate('currentAtlas().getMode()'),2);assert.equal(await thirdVisible(p),false,'Locking the district toggle hides the open municipal layer');await clickPlace(p,other);assert.equal(await p.evaluate('currentAtlas().getSelection()'),other.id);assert.equal(await thirdVisible(p),false);
  await p.screenshot('germany-two-level-locked-'+width);
  await p.open(base,saved);await p.settle();assert.equal(await p.evaluate('currentAtlas().getMode()'),3);assert.equal(await thirdVisible(p),true,'Saved unlocked district detail restores');assert.deepEqual(await shown(p),['States','Districts & cities']);
  await p.tap('#mode-prefecture');await p.settle();assert.equal(await thirdVisible(p),false,'District toggle returns from municipal detail');
  assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 }
}));
