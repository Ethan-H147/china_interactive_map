import fs from 'node:fs';import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{decodeData}from'../dist/geo-pack.mjs';
const read=async f=>decodeData(fs.readFileSync(f)),a=await read('dist/data/europe/united-states/history/alaska.bin'),m=await read('dist/data/europe/united-states/first.bin'),h=await read('dist/data/europe/united-states/history/borders.bin');
assert.deepEqual(a.land.features[0].geometry,m.regions.features.find(f=>f.properties.id==='US-AK').geometry,'Historical Alaska uses the exact current land geometry, including holes and Aleutian islands');
for(const [file,sha]of Object.entries(a.inputs))assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),sha,'Retained source unchanged '+file);
for(const c of h.configs)for(const f of a.affected.faces)assert.equal(c.face[f],c.face[a.face],'Every replaced face retains its dated owner');
for(const [year,name]of [[1866,'Russian America'],[1867,'Alaska Department'],[1900,'Alaska District'],[1959,'Alaska']]){const c=h.configs[h.years[year].config];assert.equal(c.units[c.face[a.face]].name,name);}
console.log('Alaska: exact modern land, Aleutians and holes; national history unchanged; all dated owners verified.');
