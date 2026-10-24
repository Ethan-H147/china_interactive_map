// The country registry (dist/countries.js) is the only place countries are listed: every
// declaration resolves to real files, and no other page script names a list of countries.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import '../dist/countries.js';
const {ids,countries,fallback,route,viewRoute,byAdapter}=globalThis.AtlasCountries;
const exists=file=>fs.existsSync('dist/'+file);
const css=fs.readdirSync('dist').filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync('dist/'+f,'utf8')).join('\n');
const adapters=['china','korea','mongolia','japan','archipelago','southeast-asia','south-america','russia','southern-africa','europe'];
const symbols=['ring','matryoshka','philippine-sun','compass','taiji','taegeuk','soyombo','kazakh-sun-eagle','kyrgyz-tunduk','us-seal'];
assert(countries[fallback]&&!countries[fallback].release,'The fallback country is public');
for(const id of ids){
 const c=countries[id];
 assert.equal(c.id,id);
 if(c.parent){assert(countries[c.parent]&&!countries[c.parent].parent,id+' navigation parent exists and is top-level');assert.notEqual(c.parent,id);}
 for(const field of ['en','lang','adapter','symbol','statistics'])assert(c[field],id+' declares '+field);
 assert(typeof c.local==='string',id+' declares a local name, even if empty');
 assert.match(c.background,/^#[0-9a-f]{6}$/,id+' background');
 assert(adapters.includes(c.adapter),id+' uses a known adapter: '+c.adapter);
 assert(symbols.includes(c.symbol)||exists(c.symbol),id+' emblem: '+c.symbol);
 assert([undefined,'developer'].includes(c.release),id+' release');
 assert(exists(c.statistics),id+' statistics file: '+c.statistics);
 for(const key of ['catalogue','extraCatalogue'])if(c.colors?.[key])assert(exists(c.colors[key]),id+' '+key+': '+c.colors[key]);
 assert(c.colors?.levels,id+' names its colour level');
 if(c.levelNames)assert(c.levelNames.length>=1&&c.levelNames.length<=3,id+' level names');
 if(c.map?.flag)assert(exists('vendor/flag-'+c.map.flag+'.svg')||exists('vendor/flag-'+c.map.flag+'.webp'),id+' flag');
 if(c.adapter==='southern-africa'||c.adapter==='europe'||c.adapter==='russia')assert(exists('vendor/flag-'+c.prefix+'.svg'),id+' national flag');
 if(c.portal)assert.match(c.portal.fill,/^#[0-9a-f]{6}$/,id+' portal fill');
 assert(Array.isArray(c.hitLayers)&&Array.isArray(c.controls),id+' layer lists');
 assert(c.view.languages.includes(c.view.language),id+' default label language is offered');
 if(c.map?.labelLanguages)assert.deepEqual(c.view.languages,c.map.labelLanguages.map(([code])=>code),id+' link languages follow the label menu');
 assert.equal(c.view.maxMode,c.map?.thirdLabel?3:2,id+' link levels follow the level buttons');
 if(id!==fallback)assert(css.includes('data-atlas='+id),id+' has a colour theme');
 assert(route.test('#'+id)&&route.test('#'+id+'/view=x')&&viewRoute.test('#'+id+'/view=x'),id+' route');
}
assert(!route.test('#nowhere')&&!route.test('#china-extra'),'Routes accept only declared countries');
const regional=[...byAdapter('southern-africa'),...byAdapter('europe')];
for(const id of regional)assert(exists(countries[id].colors.catalogue),id+' regional catalogue');
assert.deepEqual(byAdapter('southern-africa'),['south-africa','botswana','namibia','eswatini','lesotho'],'Southern African layers keep their stacking order (Eswatini and Lesotho above South Africa)');
// Page scripts read the registry: no other file holds a list or pattern of three or more countries.
const names=new Set(ids),offenders=[];
for(const file of fs.readdirSync('dist').filter(f=>/\.(m?js|html)$/.test(f)&&f!=='countries.js')){
 const source=fs.readFileSync('dist/'+file,'utf8');
 for(const match of source.matchAll(/\[(?:\s*'[a-z-]+'\s*,){2,}\s*'[a-z-]+'\s*\]/g)){const items=match[0].match(/'[a-z-]+'/g).map(s=>s.slice(1,-1));if(items.filter(i=>names.has(i)).length>=3)offenders.push(file+': '+match[0].slice(0,80));}
 for(const match of source.matchAll(/\((?:[a-z-]+\|){2,}[a-z-]+\)/g)){const items=match[0].slice(1,-1).split('|');if(items.filter(i=>names.has(i)).length>=3)offenders.push(file+': '+match[0].slice(0,80));}
}
assert.deepEqual(offenders,[],'Country lists belong in countries.js');
const html=fs.readFileSync('dist/index.html','utf8');
assert(html.indexOf('src="countries.js"')>=0&&html.indexOf('src="countries.js"')<Math.min(html.indexOf('src="country-symbols.js"'),html.indexOf('src="developer-mode.js"'),html.indexOf('src="atlas-entry.js"')),'The registry loads before the scripts that read it');
console.log(`Country registry: ${ids.length} countries declared once; files, emblems, themes, routes and link options resolve, and no other script lists countries.`);

const history=JSON.parse(fs.readFileSync('dist/data/country-history.json','utf8'));
assert.equal(history.timeZone,'America/Chicago');
assert.deepEqual(history.entries.map(e=>e.country).sort(),[...ids].sort(),'Every country records its addition date exactly once');
for(const e of history.entries){assert.equal(e.name,countries[e.country].en);assert(/^\d{4}-\d{2}-\d{2}$/.test(e.addedOn)&&Number.isFinite(Date.parse(e.addedOn)),e.country+' addition date');assert(['first-tracked-implementation','local-implementation'].includes(e.basis));assert(e.basis==='first-tracked-implementation'?/^[a-f0-9]{40}$/.test(e.evidence.commit):!!e.evidence.note,e.country+' date evidence');}

for(const id of AtlasCountries.ids)assert(['Africa','Asia','Europe','North America','Oceania','South America'].includes(AtlasCountries.countries[id].continent),id+' has a menu continent');
