import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
import {northAmericaFlags} from '../../dist/north-america-flags.mjs';
export default [
 ...[['united-states','us','Georgia'],['canada','ca','Quebec']].map(([country,prefix,example])=>({
  name:country+' every subdivision shows its own flag and opens its original',
  options:{width:1280,height:820},
  async run(page,base){
   await page.open(base,'#'+country);
   await searchAndSelect(page,example,example);
   // Restoring a selection uses the same details renderer without camera motion.
   for(const [id,flag] of Object.entries(northAmericaFlags[country].firstFlags)){
    await page.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');
    await page.waitFor('(()=>{const i=document.getElementById('+JSON.stringify(prefix+'-flag')+');return i.getAttribute("src")==='+JSON.stringify(flag.file)+'&&i.complete&&i.naturalWidth>0&&!i.closest("a").hidden})()',{label:id+' flag shown'});
    assert.equal(await page.evaluate('document.getElementById('+JSON.stringify(prefix+'-flag')+').alt'),'Flag of '+flag.name);
   }
   // Open a representative flag with a pointer and verify the original, then keyboard.
   const last=Object.values(northAmericaFlags[country].firstFlags).at(-1);
   await page.tap('#'+prefix+'-flag-source');
   await page.waitFor('document.getElementById("flag-viewer").open&&document.getElementById("flag-viewer-image").getAttribute("src")==='+JSON.stringify(last.full),{label:'full original opens'});
   await page.key('Escape');
   assert.equal(await page.evaluate('document.getElementById("flag-viewer").open'),false);
   await page.waitFor('document.activeElement===document.getElementById('+JSON.stringify(prefix+'-flag-source')+')',{label:'focus restored to flag trigger'});
   await page.key('Enter');
   await page.waitFor('document.getElementById("flag-viewer").open&&document.getElementById("flag-viewer-image").getAttribute("src")==='+JSON.stringify(last.full)+'&&document.getElementById("flag-viewer-image").naturalWidth>0');
   assert.equal(await page.evaluate('document.getElementById("flag-viewer-image").getAttribute("src")'),last.full);
   await page.key('Escape');await page.screenshot('flags-'+country);
  }
 })),
 {name:'Belgium matches the French thumbnail but opens the original proportions',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#france');await searchAndSelect(page,'Paris','Paris','Commune');
  const france=await page.evaluate('(()=>{const b=document.querySelector(".division-flags img[src=\\"vendor/flag-fr.svg\\"]").getBoundingClientRect();return [b.width,b.height]})()');
  await page.open(base,'#belgium');await searchAndSelect(page,'Ixelles','Ixelles','Municipality');
  const size=await page.evaluate('(()=>{const b=document.querySelector(".division-flags img[src=\\"vendor/flag-be.svg\\"]").getBoundingClientRect();return [b.width,b.height]})()');
  assert(Math.abs(size[0]-france[0])<.1&&Math.abs(size[1]-france[1])<.1,'Belgian and French thumbnails have equal dimensions');
  await page.screenshot('belgium-thumbnail');
  await page.tap('.division-flags img[src="vendor/flag-be.svg"]');
  await page.waitFor('document.getElementById("flag-viewer").open');
  assert(Math.abs(await page.evaluate('(()=>{const i=document.getElementById("flag-viewer-image");return parseFloat(i.style.width)/parseFloat(i.style.height)})()')-900/780)<1e-6);
  assert.equal(await page.evaluate('document.getElementById("flag-viewer-image").getAttribute("src")'),'vendor/flag-be.svg');
 }},
 {name:'German flag uses the same rounded border as France',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#france');await searchAndSelect(page,'Paris','Paris','Commune');
  const reference=await page.evaluate('(()=>{const s=getComputedStyle(document.querySelector(".division-flags img[src=\\"vendor/flag-fr.svg\\"]"));return [s.borderRadius,s.boxShadow]})()');
  await page.open(base,'#germany');await searchAndSelect(page,'Berlin','Berlin','State');
  const style=await page.evaluate('(()=>{const i=document.querySelector(".division-flags img[src=\\"vendor/flag-de.svg\\"]"),s=getComputedStyle(i);return [s.borderRadius,s.boxShadow,i.naturalWidth]})()');
  assert.deepEqual(style.slice(0,2),reference);assert.notEqual(style[0],'0px');assert.notEqual(style[1],'none');assert(style[2]>0);
  await page.screenshot('germany-flag-corners');
  await page.tap('.division-flags img[src="vendor/flag-de.svg"]');
  await page.waitFor('document.getElementById("flag-viewer").open');
  assert.equal(await page.evaluate('document.getElementById("flag-viewer-image").getAttribute("src")'),'vendor/flag-de.svg');
 }}
];
