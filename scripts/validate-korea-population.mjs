import assert from 'node:assert/strict';
import {load} from './geo-index.mjs';
import {applyKoreaPopulation} from './korea-population.mjs';
const data=load('dist/data/region-statistics.json'),before=JSON.stringify(data);applyKoreaPopulation(data);assert.equal(JSON.stringify(data),before,'Population build is reproducible');
const kr=Object.entries(data.regions).filter(([k,r])=>k.startsWith('korea:')&&r.country==='KR'&&r.population);
assert.equal(kr.length,245);assert.equal(kr.filter(([,r])=>r.level===1).reduce((s,[,r])=>s+r.population.value,0),51082431);
 const meta=load('dist/data/scoped/korea/metadata.bin');
 for(const f of meta.first.features.filter(f=>f.properties.country==='KR')){
  const p=f.properties,children=meta.second.features.filter(f=>f.properties.parent===p.id);
  if(children.length)assert.equal(children.reduce((sum,f)=>sum+data.regions['korea:'+f.properties.id].population.value,0),data.regions['korea:'+p.id].population.value,p.en+' county/district total');
 }
 const source=load('scripts/statistics-sources/korea-population-districts.json');
 const {gunzipSync}=await import('node:zlib'),{createHash}=await import('node:crypto'),fs=await import('node:fs');
 assert.equal(createHash('sha256').update(gunzipSync(fs.readFileSync('scripts/statistics-sources/'+source.source.rawFile))).digest('hex'),source.source.sha256);
assert.equal(data.regions['korea:KR-11'].population.value,9279861);
for(const [key,r]of Object.entries(data.regions).filter(([k])=>k.startsWith('korea:'))){if(r.population){assert(r.population.value>0);assert(data.sources[r.population.source].url);if(r.country==='KP'){assert.equal(r.population.year,2008);assert(r.population.infoNotes,'North Korean census notes use the info popup');assert.match(r.population.coverageNote,/boundaries/);assert(!r.gdp);}}}
assert.equal(data.regions['korea:KR-11110'].population.value,135842,'Jongno has its own total');assert(data.regions['korea:KR-11110'].population.infoNotes);
console.log('Korea population:',JSON.stringify({KR:data.coverage.korea.population.KR,KP:data.coverage.korea.population.KP,missing:data.coverage.korea.population.missing.length}));
