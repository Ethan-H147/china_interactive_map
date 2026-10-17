import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('dist/atlas-entry.js','utf8'),registrySource=fs.readFileSync('dist/countries.js','utf8');
// The registry runs first in the page; each sandbox gets its own copy.
const withRegistry=context=>{vm.createContext(context);vm.runInContext(registrySource,context);context.window.AtlasCountries=context.AtlasCountries;return context;};
function boot(hash='',saved,{blocked=false,developer=false,unreleased=[]}={}){
 const stored=new Map(saved?[['boundary-atlas-country-v1',saved]]:[]);
 const elements=new Map(['atlas-title-english','atlas-title-local','atlas-title-malay','atlas-title-tamil','loading-label','home'].map(id=>[id,{}]));
 const symbols=[{}],location={hash,pathname:'/',search:''};
 const listeners={},fetched=[];
 const context={fetch:url=>{fetched.push(url);return Promise.resolve({ok:true});},window:{AtlasDev:{enabled:developer,allows:country=>!unreleased.includes(country)||developer},addEventListener:(event,fn)=>listeners[event]=fn},document:{documentElement:{dataset:{}},body:{dataset:{}},getElementById:id=>elements.get(id),querySelectorAll:selector=>selector==='[data-country-symbol]'?symbols:[]},location,
  history:{replaceState(a,b,url){location.hash=new URL(url,'https://example.test').hash;}},
  localStorage:{getItem(key){if(blocked)throw Error('Storage blocked');return stored.get(key);},setItem(key,value){if(blocked)throw Error('Storage blocked');stored.set(key,value);}},AtlasSymbols:{markup:country=>'<svg>'+country+'</svg>'}};
 vm.runInContext(source,withRegistry(context));const entry=context.window.AtlasEntry;entry.mount();return{entry,context,stored,elements,symbols,location,listeners,fetched};
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
for(const country of ['south-africa','botswana','namibia','eswatini','lesotho'])assert.equal(boot('#'+country,'china').entry.initial,country,'Released southern African countries open publicly');
// Countries withheld from release open only in developer mode.
for(const country of ['united-kingdom','spain','france','italy']){const unreleased=['united-kingdom','spain','france','italy'];assert.equal(boot('#'+country,country,{unreleased}).entry.initial,'china','Development routes cannot open publicly');const dev=boot('#'+country,'china',{developer:true,unreleased});assert.equal(dev.entry.initial,country);assert.equal(dev.entry.fromHash('#'+country),country);assert.equal(dev.elements.get('home').textContent,'All '+dev.entry.countries[country].en);}
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
const html=fs.readFileSync('dist/index.html','utf8');assert(html.indexOf('src="atlas-entry.js"')<html.indexOf('rel="stylesheet"'),'Select the theme before the first styled paint');assert(!html.includes('moving-dot'));assert(!html.includes('country-nav'));assert(!html.includes('country-welcome'));assert(!html.includes('country-open'));// The country name opens the country menu (country-menu.js), a button inside the heading.
assert(/<h1><button id="country-switch"[^>]*aria-haspopup="menu"[^>]*aria-controls="country-menu"/.test(html),'The country name is the country menu button');assert(html.includes('<div id="country-menu" class="country-menu" role="menu"'));
assert(!fs.readFileSync('dist/south-america.mjs','utf8').includes('continent-flight'),'No continent flight buttons are created');
const symbolContext=withRegistry({window:{}});vm.runInContext(fs.readFileSync('dist/country-symbols.js','utf8'),symbolContext);
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
{
 // Startup preloads must name real files that the page actually requests; a stale
 // entry would download a file twice or not at all.
 const page=fs.readFileSync('dist/index.html','utf8'),code=fs.readdirSync('dist').filter(f=>/\.(m?js)$/.test(f)).map(f=>fs.readFileSync('dist/'+f,'utf8')).join('\n');
 // The page preloads China's first-view files; app.js preloads every other country's outline after that view.
 const first=[...page.matchAll(/<link rel="preload" as="fetch" crossorigin href="data\/([^"]+)">/g)].map(m=>m[1]);
 const later=JSON.parse(page.match(/<script type="application\/json" id="later-preloads">([^<]+)<\/script>/)[1]).map(u=>u.replace(/^data\//,''));
 assert(first.includes('atlas-frontiers.bin')&&first.includes('china-context.bin')&&first.length<=8,'Only first-view files are preloaded by the page');
 assert(later.length>=15&&!later.some(f=>first.includes(f)),'Other countries\' outlines are preloaded later, once each');
 assert(code.includes("$('later-preloads')"),'app.js requests the later preloads');
 const preloads=[...first,...later];
 for(const file of preloads){
  assert(fs.existsSync('dist/data/'+file),'Preloaded file exists: '+file);
  // Paths may be assembled at runtime, e.g. 'data/archipelago/'+country+'-context.bin'.
  const name=file.split('/').pop(),stem=name.slice(name.indexOf('-')+1),dir=file.split('/')[0];
  assert(code.includes(file)||(code.includes(name)||code.includes(stem))&&(!file.includes('/')||code.includes(dir+'/')),'Preloaded file is requested by the page: '+file);
 }
 const entry=fs.readFileSync('dist/atlas-entry.js','utf8'),app=fs.readFileSync('dist/app.js','utf8');
 assert.deepEqual(boot('#china').fetched,['data/china-boundaries.pack.bin','data/china-regions.json'],'China visits start the packed boundaries immediately');
 assert.deepEqual(boot('#japan').fetched,[],'Other countries do not download China');
 const early=boot('#china').entry;assert(early.takeEarly('chinaPack'));assert.equal(early.takeEarly('chinaPack'),undefined,'An early response is handed over once');
 for(const key of ['chinaPack','chinaRegions'])assert(entry.includes(`['${key}',`)&&app.includes(`takeEarly('${key}')`),'Early China response is consumed: '+key);
 console.log(`Startup preloads: ${first.length} first-view and ${later.length} later files exist and are requested; early China downloads are consumed.`);
}
