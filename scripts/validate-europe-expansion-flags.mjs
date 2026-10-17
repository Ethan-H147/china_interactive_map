
import fs from'node:fs';import assert from'node:assert/strict';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';import sharp from'sharp';
import{europeExpansionFlags as flags}from'../dist/europe-expansion-flags.mjs';
const manifest=JSON.parse(fs.readFileSync('dist/data/europe-expansion-flag-sources.json')),reviewed=JSON.parse(fs.readFileSync('scripts/europe-expansion-flag-files.json')).flags,viewer=JSON.parse(fs.readFileSync('dist/data/flag-images.json'));
const catalogues=new Map();const read=c=>{if(!catalogues.has(c))catalogues.set(c,JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/'+c+'/catalogue.bin'))).records);return catalogues.get(c);};
assert.equal(Object.keys(manifest.flags).length,382);assert.deepEqual(Object.keys(manifest.flags).sort(),Object.keys(reviewed).sort());
for(const [id,f]of Object.entries(manifest.flags)){
 assert.equal(f.commonsFile,reviewed[id].file,id+' reviewed source');
 assert.equal(createHash('sha256').update(fs.readFileSync('dist/'+f.full)).digest('hex'),f.sha256,id+' original checksum');
 const thumb=await sharp('dist/'+f.file).metadata();assert.equal(thumb.height,180);assert(thumb.width>0);
 assert(f.width>0&&f.height>0&&f.credit&&f.license&&f.page);assert.equal(viewer[f.file].full,f.full);
 const r=read(f.country).find(r=>r.id===id);assert(r);assert.equal((r.level===1?flags[f.country].firstFlags:flags[f.country].detailFlags)[id].file,f.file);
}
assert.equal(Object.keys(flags.germany.firstFlags).length,16);
for(const r of read('germany').filter(r=>r.kind==='Independent city'))assert(flags.germany.detailFlags[r.id],r.id+' city flag');
for(const r of read('germany').filter(r=>r.level===3))if(flags.germany.detailFlags[r.parent])assert.equal(flags.germany.detailFlags[r.id].file,flags.germany.detailFlags[r.parent].file,r.id+' same city at municipality level');
assert.equal(Object.keys(flags.netherlands.firstFlags).length,12);assert.equal(Object.keys(flags.belgium.firstFlags).length,3);
for(const id of ['BE32','BE33'])assert.equal(flags.belgium.detailFlags[id].status,'Unofficial provincial banner','Traditional provincial banners retain their status');
assert.notEqual(flags.belgium.firstFlags.BE1.file,flags.belgium.detailFlags.BE_21004.file,'Brussels region differs from city');
assert.match(manifest.flags.NL42.commonsFile,/Netherlands/);assert.match(manifest.flags.BE22.commonsFile,/Belgium/);
const audit=JSON.parse(fs.readFileSync('scripts/europe-city-flag-audit.json'));assert.equal(audit.cities.length,325);for(const r of audit.cities){assert(flags[r.country].detailFlags[r.id],r.name+' audited municipality has its own flag');assert(r.reference,r.name+' traceable source');const displayed=flags[r.country].detailFlags[r.id];assert.equal(r.source,Object.values(manifest.flags).find(f=>f.file===displayed.file)?.commonsFile,r.name+' audit matches displayed artwork');}for(const c of ['germany','netherlands','belgium']){const stats=JSON.parse(fs.readFileSync('dist/data/europe/'+c+'/statistics.json'));for(const r of read(c).filter(r=>r.level===(c==='netherlands'?2:3)&&stats.regions[c+':'+r.id]?.population?.value>=50000))assert(audit.cities.some(city=>city.id===r.id),r.en+' cannot silently disappear from coverage');}assert.equal(flags.netherlands.detailFlags.NL_GM0363.full,'vendor/europe-expansion-flags/NL_GM0363.svg');assert.notEqual(flags.belgium.firstFlags.BE1.file,flags.belgium.detailFlags.BE_21004.file);console.log('382 pinned flags; all 325 audited municipalities, exact IDs, originals, thumbnails, captioned unofficial banners, regional distinctions and viewer catalogue passed.');
