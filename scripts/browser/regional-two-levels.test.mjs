import assert from 'node:assert/strict';
import {load} from '../geo-index.mjs';
const cases=[['france','FR-D-01'],['poland','PL-P-0415'],['belgium','BE21'],['italy','IT-P-201'],['spain','ES-P-03'],['greece','GR-RU-01']];
const shown=p=>p.evaluate("[...document.querySelectorAll('.map-mode>button:not(#mode-lock)')].filter(b=>b.getClientRects().length).map(b=>b.textContent.trim())");
function thirdExpression(country){return "!!map.getLayer('"+country+"-third-fill')&&map.getLayoutProperty('"+country+"-third-fill','visibility')!=='none'";}
async function clickPlace(p,record){
 await p.evaluate('window.AtlasSheet?.collapse();map.jumpTo({center:'+JSON.stringify(record.center)+',zoom:8});true');await p.settle();
 const point=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(record.center)+'),r=map.getCanvas().getBoundingClientRect();return [r.left+q.x,r.top+q.y]})()');await p.tap(point);await p.settle();
}
export default cases.flatMap(([country,id])=>{
 const catalogue=load('dist/data/europe/'+country+'/catalogue.bin'),district=catalogue.records.find(r=>r.id===id),municipality=catalogue.records.find(r=>r.level===3&&r.parent===id),other=catalogue.records.find(r=>r.level===2&&r.parent===district.parent&&r.id!==id&&catalogue.chunks[r.id]);
 assert(district&&municipality&&other,'Real subdivision fixtures for '+country);
 return [1280,390].map(width=>({name:country+' two visible levels and locked municipal drill-down '+width,options:{width,height:900,mobile:width===390},async run(p,base){
  await p.open(base,'#'+country);const labels=await p.evaluate('(()=>{const c=AtlasCountries.countries['+JSON.stringify(country)+'].map;return [c.firstLabel,c.secondLabel]})()');assert.deepEqual(await shown(p),labels);assert.equal(await p.evaluate(thirdExpression(country)),false);
  await p.tap('#mode-prefecture');await p.settle();assert.equal(await p.evaluate('currentAtlas().getMode()'),2);assert.equal(await p.evaluate(thirdExpression(country)),false,'No national lowest-tier layer');
  await p.tap('#mode-lock');await clickPlace(p,district);assert.equal(await p.evaluate('currentAtlas().getSelection()'),id);assert.equal(await p.evaluate('currentAtlas().getMode()'),2);assert.equal(await p.evaluate(thirdExpression(country)),false,'Locked second-level selection keeps the lowest tier hidden');assert.equal(await p.evaluate('!!map.getSource('+JSON.stringify(country+'-third')+')'),false,'Locked selection does not download lowest-tier geometry');
  await p.tap('#mode-lock');await clickPlace(p,district);await p.waitFor(thirdExpression(country));assert.equal(await p.evaluate('currentAtlas().getMode()'),3);assert.deepEqual(await shown(p),labels);assert.equal(await p.evaluate('document.getElementById("mode-prefecture").getAttribute("aria-pressed")'),'true');
  const saved=await p.evaluate('AtlasView.hashFor(captureView())');await clickPlace(p,municipality);assert.equal(await p.evaluate('currentAtlas().getSelection()'),municipality.id,'Lowest-tier places remain selectable');await p.screenshot(country+'-two-level-unlocked-'+width);
  await p.tap('#mode-lock');await p.settle();assert.equal(await p.evaluate('currentAtlas().getMode()'),2);assert.equal(await p.evaluate(thirdExpression(country)),false,'Locking hides the open lowest-tier layer');await clickPlace(p,other);assert.equal(await p.evaluate('currentAtlas().getSelection()'),other.id);assert.equal(await p.evaluate(thirdExpression(country)),false);
  await p.open(base,saved);await p.waitFor(thirdExpression(country));assert.equal(await p.evaluate('currentAtlas().getMode()'),3);assert.deepEqual(await shown(p),labels);await p.tap('#mode-prefecture');await p.settle();assert.equal(await p.evaluate(thirdExpression(country)),false,'Second-level toggle leaves municipal detail');assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 }}));
});
