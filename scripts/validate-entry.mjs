import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('dist/atlas-entry.js','utf8');
function boot(hash='',saved,{blocked=false}={}){
 const stored=new Map(saved?[['boundary-atlas-country-v1',saved]]:[]);
 const elements=new Map(['atlas-title-english','atlas-title-local','loading-label','startup-name','home'].map(id=>[id,{}]));
 const symbols=[{}],location={hash,pathname:'/',search:''};
 const listeners={};
 const context={window:{addEventListener:(event,fn)=>listeners[event]=fn},document:{documentElement:{dataset:{}},body:{dataset:{}},getElementById:id=>elements.get(id),querySelectorAll:selector=>selector==='[data-country-symbol]'?symbols:[]},location,
  history:{replaceState(a,b,url){location.hash=new URL(url,'https://example.test').hash;}},
  localStorage:{getItem(key){if(blocked)throw Error('Storage blocked');return stored.get(key);},setItem(key,value){if(blocked)throw Error('Storage blocked');stored.set(key,value);}},AtlasSymbols:{markup:country=>'<svg>'+country+'</svg>'}};
 vm.runInNewContext(source,context);const entry=context.window.AtlasEntry;entry.mount();return{entry,context,stored,elements,symbols,location,listeners};
}
for(const country of ['china','korea','mongolia']){
 const explicit=boot('#'+country,'mongolia');
 assert.equal(explicit.entry.initial,country,'Explicit links override the previous visit');
 assert.equal(explicit.context.document.documentElement.dataset.atlas,country);
 assert.equal(explicit.context.document.body.dataset.atlas,country);
 assert.equal(explicit.location.hash,'#'+country);
 assert.equal(explicit.symbols[0].innerHTML,'<svg>'+country+'</svg>');
 const restored=boot('',country);assert.equal(restored.location.hash,'#'+country);assert.equal(restored.entry.initial,country,'Remember the country after closing/reopening');
 restored.entry.ready();assert(!restored.context.document.documentElement.dataset.starting);
}
const fresh=boot();assert.equal(fresh.entry.initial,'china');assert.equal(fresh.location.hash,'#china');assert.equal(fresh.context.document.documentElement.dataset.atlas,'china');
assert.equal(fresh.elements.get('atlas-title-english').textContent,'China','First visits open directly into the map');
fresh.location.hash='#korea';fresh.listeners.hashchange();assert.equal(fresh.entry.current,'korea','A country can be chosen while map imports are still loading');
fresh.entry.ready();
for(const country of ['korea','china','mongolia']){fresh.entry.remember(country);assert.equal(fresh.location.hash,'#'+country);assert.equal(fresh.stored.get('boundary-atlas-country-v1'),country);assert.equal(fresh.elements.get('home').textContent,'All '+fresh.entry.countries[country].en);}
for(const hash of ['#place=220000','#china/place=220000']){const linked=boot(hash,'korea');assert.equal(linked.entry.initial,'china');assert.equal(linked.location.hash,'#china/place=220000','Retain and normalize old shared links');linked.entry.remember('korea');assert.equal(linked.location.hash,'#korea');}
const unavailable=boot('#mongolia',undefined,{blocked:true});unavailable.entry.remember('china');assert.equal(unavailable.location.hash,'#china','URL navigation works when browser storage is blocked');
const html=fs.readFileSync('dist/index.html','utf8');assert(html.indexOf('src="atlas-entry.js"')<html.indexOf('rel="stylesheet"'),'Select the theme before the first styled paint');assert(!html.includes('moving-dot'));assert(!html.includes('country-nav'));assert(!html.includes('country-welcome'));
const symbolContext={window:{}};vm.runInNewContext(fs.readFileSync('dist/country-symbols.js','utf8'),symbolContext);
const symbols=symbolContext.window.AtlasSymbols;
const a=symbols.markup('mongolia'),b=symbols.markup('mongolia');assert.notEqual(a.match(/id="([^"]+)/)[1],b.match(/id="([^"]+)/)[1],'Repeated Soyombos use separate masks');
assert.equal((a.match(/class="symbol-rotor"/g)||[]).length,1,'Only the inner symbol rotates');
assert(fs.readFileSync('dist/country-symbols.css','utf8').includes('prefers-reduced-motion:reduce'));
console.log('Country entry: equal routes, explicit-link priority, remembered visits, direct map first visit, legacy place links, unavailable storage, early themes and isolated symbol animations passed.');
