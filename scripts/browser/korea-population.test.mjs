import assert from 'node:assert/strict';
export default [false,true].map(mobile=>({name:'Korea shared population cards '+(mobile?'phone':'desktop'),options:mobile?{width:390,height:844,mobile:true}:{},async run(p,base){
 await p.open(base,'#korea');await p.waitFor('currentAtlas()?.ready&&!countrySwitching&&!cameraBusy');
 const select=async id=>{await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');await p.settle();await p.waitFor("document.querySelector('#korea-sidebar .archipelago-population .population-total')?.textContent");};
 await select('KR-11');assert(await p.evaluate("document.querySelector('#korea-sidebar .archipelago-population').innerText.includes('9,279,861')"));assert(await p.evaluate("!document.querySelector('#korea-sidebar .archipelago-population').innerText.includes('excludes foreign')"));
 await p.tap('#korea-sidebar .population-info summary');assert(await p.evaluate("document.querySelector('#korea-sidebar .archipelago-population').innerText.includes('excludes foreign')"));await p.key('Escape');assert(await p.evaluate("!document.querySelector('#korea-sidebar .population-info').open"));
 await select('KP-356443');assert(await p.evaluate("document.querySelector('#korea-sidebar .archipelago-population').innerText.includes('3,255,288')"));assert(await p.evaluate("document.querySelector('#korea-sidebar .archipelago-population').innerText.includes('historical')"));
 assert(await p.evaluate("!document.querySelector('#korea-sidebar .archipelago-population').innerText.includes('not a current estimate')"));
 await p.tap('#korea-sidebar .population-info summary');
 assert(await p.evaluate("document.querySelector('#korea-sidebar .population-info-body').innerText.includes('not a current estimate')&&document.querySelector('#korea-sidebar .population-info-body').innerText.includes('private households and institutional living quarters')"));
 await p.screenshot('korea-population-info-north-'+(mobile?'phone':'desktop'));
 await p.key('Escape');assert(await p.evaluate("!document.querySelector('#korea-sidebar .population-info').open"));
 await select('KP-8319793');assert(await p.evaluate("document.querySelector('#korea-sidebar .archipelago-population').innerText.includes('122,934')"));
 await p.evaluate("currentAtlas().restore('KR-11110')");await p.settle();assert(await p.evaluate("document.querySelector('#korea-sidebar .archipelago-population .population-total').textContent==='135,842'"));assert(await p.evaluate("document.querySelector('#korea-sidebar .region-statistics').innerText.includes('23.9')"),'Keep district area');
 await select('KR-11');assert.equal(await p.evaluate("document.querySelectorAll('#korea-sidebar .archipelago-population').length"),1);
 await p.screenshot('korea-population-'+(mobile?'phone':'desktop'));
}}));
