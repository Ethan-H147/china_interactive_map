import assert from 'node:assert/strict';
export default [1280,390].map(width=>({name:'DC displays one full map label '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#united-states');
 await p.waitFor('currentAtlas()?.ready');
 await p.evaluate('void map.jumpTo({center:[-77.0369,38.9072],zoom:10})');await p.settle();
 await p.evaluate('currentAtlas().updateLabels()');
 await p.waitFor('document.querySelector(\'[data-atlas-place="US-DC"]\')?.textContent==="District of Columbia"');
 assert.equal(await p.evaluate('document.querySelectorAll(\'[data-atlas-place="US-DC"]\').length'),1);
 assert.equal(await p.evaluate('document.querySelector(\'[data-atlas-place="US-DC"] small\')'),null);
 await p.screenshot('dc-single-label-'+width);
}}));
