import assert from 'node:assert/strict';
import {mexicoStateFlags} from '../../dist/mexico-state-flags.mjs';
import {searchAndSelect} from './countries.test.mjs';
export default [false,true].map(mobile=>({
 name:'Mexican state flags, inherited city flag and full-size viewer '+(mobile?'phone':'desktop'),
 options:{width:mobile?390:1280,height:mobile?844:900,mobile},
 async run(page,base){
  await page.open(base,'#mexico');
  for(const[id,f]of Object.entries(mexicoStateFlags.mexico.firstFlags)){
   await page.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');
   await page.waitFor('(()=>{const e=document.getElementById("mx-flag");return !e.closest("a").hidden&&e.getAttribute("src")==='+JSON.stringify(f.file)+'&&e.complete&&e.naturalWidth>0})()');
   assert.equal(await page.evaluate('document.getElementById("mx-flag-caption").textContent.includes('+JSON.stringify(f.status)+')'),true);
   assert.equal(await page.evaluate('!!document.querySelector("#mx-flag-caption a")'),id!=='MX-OAX');
  }
  const yuc=mexicoStateFlags.mexico.firstFlags['MX-YUC'];
  await page.tap('#mx-flag-source');await page.waitFor('document.getElementById("flag-viewer").open&&document.getElementById("flag-viewer-image").naturalWidth>0');
  assert.equal(await page.evaluate('document.getElementById("flag-viewer-image").getAttribute("src")'),yuc.full);
  await page.screenshot('mexico-yucatan-flag-'+(mobile?'phone':'desktop'));await page.key('Escape');
  await searchAndSelect(page,'Cancun','Cancún');
  assert.equal(await page.evaluate('document.getElementById("mx-flag").getAttribute("src")'),mexicoStateFlags.mexico.firstFlags['MX-ROO'].file);
  assert.equal(await page.evaluate('document.getElementById("mx-detail-flag-source").hidden'),true);
  await page.evaluate('currentAtlas().restore("MX-CHH")');
  assert.equal(await page.evaluate('document.getElementById("mx-flag-source").hidden'),true);
  assert.equal(await page.evaluate('document.getElementById("mx-flag-caption").hidden'),true);
  await page.evaluate('currentAtlas().restore("MX-TAM")');await page.screenshot('mexico-tamaulipas-flag-'+(mobile?'phone':'desktop'));
 }
}));
