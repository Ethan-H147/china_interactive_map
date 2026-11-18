import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const source=JSON.parse(gunzipSync(fs.readFileSync('scripts/boundary-sources/nz-localities/communities.geojson.gz')));
const dir='dist/data/europe/new-zealand/';
const catalogue=JSON.parse(gunzipSync(fs.readFileSync(dir+'catalogue.bin')));
const statistics=JSON.parse(fs.readFileSync(dir+'statistics.json')).regions;
const local=new Map(catalogue.records.filter(r=>r.level===3).map(r=>[r.id,r]));
assert.equal(local.size,source.features.length);
for(const {properties:p} of source.features){
 const r=local.get('NZ-LINZ-'+p.id);
 assert.equal(r.en,p.name);assert.equal(r.kind,p.type);
 assert.equal(statistics['new-zealand:'+r.id].population?.value??null,p.population_estimate);
}
