// Checks the built Korean election data: province counts add up to the NEC national totals, and
// every present-day first-level unit of the Korea map has a result, with Gwangju on its own.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {decodeData} from '../dist/geo-pack.mjs';

const root=new URL('../',import.meta.url),load=file=>JSON.parse(gunzipSync(readFileSync(new URL('dist/data/korea/elections/'+file,root))));
const south=load('south.bin'),north=load('north.bin'),nec=JSON.parse(readFileSync(new URL('scripts/boundary-sources/korea/elections/nec-presidential.json',root),'utf8'));
const units=(await decodeData(readFileSync(new URL('dist/data/scoped/korea/metadata.bin',root)))).first.features.map(f=>f.properties);
const ids=country=>units.filter(u=>u.country===country).map(u=>u.id).sort();

assert.deepEqual(south.elections.map(e=>e.year),[1987,1992,1997,2002,2007,2012,2017,2022,2025],'Every direct presidential election since 1987');
let counted=0;
for(const e of south.elections){
 const names=new Set(e.candidates.map(c=>c.name)),national=nec.elections[Object.keys(nec.elections).find(k=>+k.slice(0,4)===e.year)].rows[0];
 assert.deepEqual(Object.keys(e.states).sort(),[...ids('KR'),'KR-29'].sort(),e.year+': every South Korean unit, and Gwangju, has a result');
 assert.equal(e.states['KR-29'].within,'KR-12',e.year+': Gwangju is shown within Jeonnam–Gwangju');
 const votes={};let registered=0,ballots=0,total=0;
 for(const [id,s] of Object.entries(e.states)){
  assert(names.has(s.winner),e.year+' '+id+': winner is a listed candidate');
  assert(s.margin>=0&&s.margin<=100,e.year+' '+id+': margin is a percentage');
  assert.equal(Object.values(s.votes).reduce((a,b)=>a+b,0),s.total,e.year+' '+id+': candidate votes add up to valid votes');
  if(s.partOf)continue;counted++;
  registered+=s.registered;ballots+=s.ballots;total+=s.total;for(const [n,v] of Object.entries(s.votes))votes[n]=(votes[n]||0)+v;
 }
 assert.deepEqual([registered,ballots],national.slice(1,3),e.year+': registered voters and ballots match the national total');
 assert.equal(total,national.at(-3),e.year+': valid votes match the national total');
 for(const c of e.candidates)assert.equal(votes[c.name],c.popular,e.year+' '+c.name+': province votes match the national total');
}
const at=(year,id)=>south.elections.find(e=>e.year===year).states[id];
assert.equal(at(2025,'KR-11').winner,'Lee Jae-myung');assert.equal(at(2022,'KR-11').winner,'Yoon Suk Yeol');assert.equal(at(1987,'KR-44').winner,'Kim Jong-pil');
assert.equal(at(1987,'KR-29').winner,'Kim Dae-jung');
const outline=south.units.features.find(f=>f.properties.outline).geometry.coordinates;
assert(outline.length===1&&String(outline[0][0])===String(outline[0].at(-1)),'Gwangju has one closed outline');
assert.equal(at(1987,'KR-30').partOf,'KR-44','Daejeon votes within South Chungcheong in 1987');assert(!at(2012,'KR-36').partOf,'Sejong votes on its own from 2012');

assert.deepEqual(north.elections.map(e=>e.year),[2009,2014,2019,2023]);
for(const e of north.elections){
 assert.deepEqual(Object.keys(e.states).sort(),ids('KP'),e.year+': every North Korean unit has the national figure');
 assert(e.uniform&&e.turnout>99&&e.source,e.year+': official national figures with a source');
}
console.log('Korea elections: '+counted+' South Korean province results reconcile with NEC national totals; '+north.elections.length+' North Korean elections cover all '+ids('KP').length+' units.');
