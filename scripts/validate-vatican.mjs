
import fs from'node:fs';import assert from'node:assert/strict';import{gunzipSync}from'node:zlib';import'../dist/countries.js';
const read=f=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/'+f)));
const r=globalThis.AtlasCountries.countries['vatican-city'];assert.equal(r.parent,'italy');assert(!r.release);
const ctx=read('vatican-city/context.bin'),first=read('vatican-city/first.bin'),cat=read('vatican-city/catalogue.bin');
assert.equal(cat.records.length,1);assert.equal(cat.records[0].kind,'Sovereign city-state');assert.deepEqual(ctx.features[0].geometry,first.regions.features[0].geometry);
const ring=ctx.features[0].geometry.coordinates[0],sorted=r=>JSON.stringify([...r.slice(0,-1)].sort((a,b)=>a[0]-b[0]||a[1]-b[1]));
const canonical=sorted(ring);assert(ring.length>200);assert(ring.every(([x,y])=>x>12.44&&x<12.47&&y>41.89&&y<41.92),'No extraterritorial properties');
let matches=0;const visit=v=>{for(const c of Object.values(v||{})){if(Array.isArray(c)&&c.length>3&&c.every(p=>Array.isArray(p)&&p.length===2&&p[0]>12.44&&p[0]<12.47&&p[1]>41.89&&p[1]<41.92)){assert.equal(sorted(c),canonical,'Italy and Vatican share exactly the same border');matches++;}else if(c&&typeof c==='object')visit(c);}};
for(const file of ['all.bin','context.bin','first.bin','international.bin','second/IT-R-12.bin','third/IT-P-258.bin'])visit(read('italy/'+file));
assert.equal(matches,7);assert.equal(read('vatican-city/international.bin').features.length,0,'Shared international edge has one owner');
const stats=JSON.parse(fs.readFileSync('dist/data/europe/vatican-city/statistics.json'));assert.equal(stats.regions['vatican-city:VA'].area.value,.44);assert(!stats.regions['vatican-city:VA'].population&&!stats.regions['vatican-city:VA'].gdp);
const history=JSON.parse(fs.readFileSync('dist/data/country-history.json')).entries.filter(e=>e.country==='vatican-city');assert.equal(history.length,1);assert.equal(history[0].parent,'italy');assert.equal(history[0].addedOn,'2026-10-17');
const national=JSON.parse(fs.readFileSync('dist/data/europe/flag-sources.json')).flags['vatican-city'];assert.equal(national.width,national.height);assert.match(national.page,/2023/);
console.log('Vatican: sovereign Italy subpage, dated log, current square flag, seven identical Italian enclave paths, single frontier ownership and sourced area passed.');
