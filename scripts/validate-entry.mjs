import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('dist/atlas-entry.js','utf8');
function boot(hash='',saved,{blocked=false,developer=false}={}){
 const stored=new Map(saved?[['boundary-atlas-country-v1',saved]]:[]);
 const elements=new Map(['atlas-title-english','atlas-title-local','atlas-title-malay','atlas-title-tamil','loading-label','startup-name','home'].map(id=>[id,{}]));
 const symbols=[{}],location={hash,pathname:'/',search:''};
 const listeners={};
 const context={window:{AtlasDev:{enabled:developer,allows(){return true;}},addEventListener:(event,fn)=>listeners[event]=fn},document:{documentElement:{dataset:{}},body:{dataset:{}},getElementById:id=>elements.get(id),querySelectorAll:selector=>selector==='[data-country-symbol]'?symbols:[]},location,
  history:{replaceState(a,b,url){location.hash=new URL(url,'https://example.test').hash;}},
  localStorage:{getItem(key){if(blocked)throw Error('Storage blocked');return stored.get(key);},setItem(key,value){if(blocked)throw Error('Storage blocked');stored.set(key,value);}},AtlasSymbols:{markup:country=>'<svg>'+country+'</svg>'}};
 vm.runInNewContext(source,context);const entry=context.window.AtlasEntry;entry.mount();return{entry,context,stored,elements,symbols,location,listeners};
}
for(const country of ['china','korea','mongolia','japan','philippines','indonesia','malaysia','singapore','brazil','uruguay','argentina','russia']){
 const developer=false;
 const explicit=boot('#'+country,'mongolia',{developer});
 assert.equal(explicit.entry.initial,country,'Explicit links override the previous visit');
 assert.equal(explicit.context.document.documentElement.dataset.atlas,country);
 assert.equal(explicit.context.document.body.dataset.atlas,country);
 assert.equal(explicit.location.hash,'#'+country);
 assert.equal(explicit.symbols[0].innerHTML,'<svg>'+country+'</svg>');
 const restored=boot('',country,{developer});assert.equal(restored.location.hash,'#'+country);assert.equal(restored.entry.initial,country,'Remember the country after closing/reopening');
 restored.entry.ready();assert(!restored.context.document.documentElement.dataset.starting);
}
const fresh=boot();assert.equal(fresh.entry.initial,'china');assert.equal(fresh.location.hash,'#china');assert.equal(fresh.context.document.documentElement.dataset.atlas,'china');
const argentinaLink='#argentina/view='+encodeURIComponent(JSON.stringify({country:'argentina',selection:'AR-CITY-21'}));
assert.equal(boot(argentinaLink,'japan').location.hash,argentinaLink,'Shared Argentine views open publicly without losing their selection');
for(const [country,selection] of [['malaysia','MY-01'],['singapore','SG-PN']]){const hash='#'+country+'/view='+encodeURIComponent(JSON.stringify({country,selection}));assert.equal(boot(hash,'china').location.hash,hash,'Shared public views preserve their country and selection');}
assert.equal(fresh.elements.get('atlas-title-english').textContent,'China','First visits open directly into the map');
fresh.location.hash='#korea';fresh.listeners.hashchange();assert.equal(fresh.entry.current,'korea','A country can be chosen while map imports are still loading');
fresh.entry.ready();
fresh.context.window.AtlasDev.enabled=true;
for(const country of ['korea','china','mongolia','japan','philippines','indonesia','malaysia','singapore','brazil','uruguay','argentina','russia']){fresh.entry.remember(country);assert.equal(fresh.location.hash,'#'+country);assert.equal(fresh.stored.get('boundary-atlas-country-v1'),country);assert.equal(fresh.elements.get('home').textContent,'All '+fresh.entry.countries[country].en);}
for(const hash of ['#place=220000','#china/place=220000']){const linked=boot(hash,'korea');assert.equal(linked.entry.initial,'china');assert.equal(linked.location.hash,'#china/place=220000','Retain and normalize old shared links');linked.entry.remember('korea');assert.equal(linked.location.hash,'#korea');}
const unavailable=boot('#mongolia',undefined,{blocked:true});unavailable.entry.remember('china');assert.equal(unavailable.location.hash,'#china','URL navigation works when browser storage is blocked');
for(const country of ['brazil','uruguay']){
 const normal=boot('#'+country,country);assert.equal(normal.entry.initial,country);assert.equal(normal.location.hash,'#'+country,'Brazil and Uruguay open publicly');
 const remembered=boot('',country);assert.equal(remembered.entry.initial,country,'Public countries reopen without developer mode');
 normal.entry.remember(country);assert.equal(normal.entry.current,country);
}
const html=fs.readFileSync('dist/index.html','utf8');assert(html.indexOf('src="atlas-entry.js"')<html.indexOf('rel="stylesheet"'),'Select the theme before the first styled paint');assert(!html.includes('moving-dot'));assert(!html.includes('country-nav'));assert(!html.includes('country-welcome'));assert(!html.includes('country-open'));assert(!html.includes('country-menu'));
assert(!fs.readFileSync('dist/south-america.mjs','utf8').includes('continent-flight'),'No continent flight buttons are created');
const symbolContext={window:{}};vm.runInNewContext(fs.readFileSync('dist/country-symbols.js','utf8'),symbolContext);
const symbols=symbolContext.window.AtlasSymbols;
const a=symbols.markup('mongolia'),b=symbols.markup('mongolia');assert.notEqual(a.match(/id="([^"]+)/)[1],b.match(/id="([^"]+)/)[1],'Repeated Soyombos use separate masks');
assert.equal((a.match(/class="symbol-rotor"/g)||[]).length,1,'Only the inner symbol rotates');
assert(fs.readFileSync('dist/country-symbols.css','utf8').includes('prefers-reduced-motion:reduce'));
console.log('Country entry: equal routes, explicit-link priority, remembered visits, direct map first visit, legacy place links, unavailable storage, early themes and isolated symbol animations passed.');

assert(symbols.markup('japan').includes('japan-chrysanthemum.png'));
const sun=symbols.markup('philippines');assert.equal((sun.match(/data-sun-ray=/g)||[]).length,8,'Philippine sun has eight ray groups');assert.equal((sun.match(/class="symbol-rotor"/g)||[]).length,1);assert(sun.includes('#fcd116'));assert(!sun.includes('M50 10V90'));
const referenceFlag=fs.readFileSync('scripts/symbol-sources/philippine-flag.svg','utf8');
const referenceRay=referenceFlag.match(/<path id="a" d="([^"]+)"/)[1];
for(const path of sun.matchAll(/data-sun-ray="\d" d="([^"]+)"/g))assert.equal(path[1],referenceRay,'Use the actual flag ray geometry without redrawing');
assert(sun.includes('<circle r="9"/>'),'Preserve the flag disk-to-ray proportions');assert(sun.includes('viewBox="-20 -20 40 40"'));
assert.equal(fs.readFileSync('dist/vendor/flag-ph.svg','utf8').replace(/\r/g,''),referenceFlag.replace(/\r/g,''),'Displayed flag and loading sun share the same reference artwork');
const wheel=symbols.markup('indonesia');assert(wheel.includes('symbol-rotor'));assert(wheel.includes('M50 10V90'),'Keep the carriage wheel available');
