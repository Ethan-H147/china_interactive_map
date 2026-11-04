// Checks the built election results against the national tallies in the same articles.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {electionYears} from './fetch-us-elections.mjs';

const data=JSON.parse(gunzipSync(readFileSync(new URL('../dist/data/europe/united-states/elections/presidential.bin',import.meta.url))));
assert.deepEqual(data.elections.map(e=>e.year),electionYears,'Every presidential election is present in order');
let states=0;
for(const e of data.elections){
 const names=new Set(e.candidates.map(c=>c.name)),electoral={};
 assert(e.candidates.length&&e.electors&&e.needed&&e.source,e.year+': national summary is complete');
 for(const [id,s] of Object.entries(e.states)){
  states++;
  assert.match(id,/^US-[A-Z]{2}$/,e.year+': state id '+id);
  assert(names.has(s.winner),e.year+' '+id+': winner is a listed candidate');
  assert(!e.notVoting.includes(id),e.year+' '+id+': a voting state is not also listed as not voting');
  if(s.total)assert(Number.isFinite(s.margin)&&s.margin>=0&&s.margin<=100,e.year+' '+id+': margin is a percentage');
  for(const [name,count] of Object.entries(s.electors)){assert(names.has(name),e.year+' '+id+': elector recipient '+name);electoral[name]=(electoral[name]||0)+count;}
 }
 // Uncounted 1864 and 1872 votes and Greeley's three Georgia votes are the documented exceptions.
 for(const c of e.candidates){
  const expected=e.year===1872&&c.name==='Horace Greeley'?3:c.electoral;
  assert.equal(electoral[c.name]||0,expected,e.year+' '+c.name+': state electoral votes match the national tally');
 }
}
const at=(year,id)=>data.elections.find(e=>e.year===year).states[id];
assert.equal(at(2024,'US-PA').winner,'Donald Trump');assert.equal(at(2020,'US-GA').winner,'Joe Biden');
assert.equal(at(1912,'US-CA').winner,'Theodore Roosevelt');assert.equal(at(1968,'US-AL').winner,'George Wallace');
assert.deepEqual(at(2024,'US-NE').electors,{'Donald Trump':4,'Kamala Harris':1},'Nebraska districts split its electors');
assert(data.elections.find(e=>e.year===1864).notVoting.includes('US-VA'),'Confederate states did not vote in 1864');
console.log('US elections: '+data.elections.length+' elections and '+states+' state results reconcile with national electoral tallies.');
