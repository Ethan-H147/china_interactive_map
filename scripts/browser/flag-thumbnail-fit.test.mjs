
import assert from'node:assert/strict';
export default [{name:'Vatican square thumbnail frame fits its artwork',options:{width:1280,height:820},async run(page,base){
 await page.open(base,'#vatican-city');
 const size=await page.evaluate('(()=>{const i=document.querySelector(".division-flags img[src=\\\"vendor/flag-va.svg\\\"]"),b=i.getBoundingClientRect(),s=getComputedStyle(i);return {width:b.width,height:b.height,ratio:i.naturalWidth/i.naturalHeight,radius:s.borderRadius,shadow:s.boxShadow}})()');
 assert.equal(size.width,size.height,'The square flag has a square frame');assert.equal(size.ratio,1);assert(size.width>0&&size.width<=40&&size.height<=30);assert.notEqual(size.radius,'0px');assert.notEqual(size.shadow,'none');
 await page.screenshot('vatican-fitted-flag');
 await page.tap('.division-flags img[src="vendor/flag-va.svg"]');
 await page.waitFor('document.getElementById("flag-viewer").open');
 assert.equal(await page.evaluate('(()=>{const b=document.getElementById("flag-viewer-image").getBoundingClientRect();return b.width/b.height})()'),1);
}}];
