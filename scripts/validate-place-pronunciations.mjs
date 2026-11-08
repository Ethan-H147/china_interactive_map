import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pronunciationPlan} from './pronunciation-plan.mjs';
import {placePronunciations,pronunciationRelease} from '../dist/place-pronunciations.mjs';

const plan=await pronunciationPlan();
const counts=Object.fromEntries(Object.entries(Object.groupBy(plan,p=>p.country)).map(([country,entries])=>[country,entries.length]));
assert.deepEqual(counts,{argentina:24,austria:9,belgium:18,brazil:27,bulgaria:28,canada:26,china:34,chile:16,'costa-rica':7,czechia:14,denmark:13,finland:48,france:127,germany:16,hungary:20,iceland:13,india:132,italy:130,japan:47,korea:29,mexico:32,mongolia:22,netherlands:18,norway:25,philippines:18,poland:16,portugal:20,romania:42,russia:559,'saudi-arabia':13,slovakia:8,'south-africa':9,spain:71,sweden:26,switzerland:30,thailand:77,turkey:81,ukraine:27,'united-kingdom':445,'united-states':65,uruguay:19,vietnam:34});
assert.equal(Object.keys(placePronunciations).length,2435,'The complete requested batch is activated');
assert.equal(new Set(plan.map(p=>p.country+':'+p.id)).size,2267,'Distinct present-day map cards');
let bytes=0;const voices=new Set();
for(const p of plan){
 const entry=placePronunciations[p.key];assert(entry,'Missing '+p.key);
 assert.equal(entry.text,p.text);assert.equal(entry.language,p.language);assert.equal(entry.src,p.src);
 assert.equal(entry.locale,p.locale);assert.equal(entry.country,p.country);assert.equal(entry.id,p.id);
 assert.equal(entry.provider,'ElevenLabs');assert.equal(entry.synthetic,true);voices.add(entry.voice);
 assert.equal(entry.model,p.model||'eleven_v4');
 if(entry.language==='ga')assert.equal(entry.context,null,'Irish model omits unsupported previous_text');
 const audio=fs.readFileSync(new URL('../dist/'+entry.src,import.meta.url));
 assert.equal(audio.length,entry.bytes);assert.equal(createHash('sha256').update(audio).digest('hex'),entry.sha256);
 assert(audio.length>=1000&&audio.length<256000,'Speech file size: '+p.key);bytes+=audio.length;
}
assert.equal(voices.size,1,'One voice across all countries');
assert.equal([...voices][0],pronunciationRelease.voice);
assert(bytes<50*1024*1024,'Static recording size budget');
for(const p of plan.filter(p=>p.country==='canada'&&p.language==='en')){
 const english=placePronunciations[p.key],french=placePronunciations[p.key+':fr'];
 assert.equal(english.locale,'en-CA');assert.equal(french.locale,'fr-CA');
 assert.notEqual(english.src,french.src,'Separate Canadian language recordings');
}
assert(plan.filter(p=>p.country==='brazil').every(p=>p.locale==='pt-BR'));
assert(plan.filter(p=>p.country==='portugal').every(p=>p.locale==='pt-PT'));
assert.equal(placePronunciations['france:FR-D-49'].seed,2026110702);
assert.equal(placePronunciations['ukraine:UA-53'].seed,2026110801);
assert.equal(placePronunciations['ukraine:UA-53'].voiceSettings.speed,0.9);
assert.equal(placePronunciations['united-kingdom:GB-C-E06000038'].synthesisText,'Redding');
assert.equal(placePronunciations['united-kingdom:GB-C-E06000038'].text,'Reading');
console.log('2435 ElevenLabs recordings for 2267 map cards verified:',JSON.stringify(counts),bytes,'bytes. Pronunciation still requires listening review.');
