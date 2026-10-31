import fs from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {load} from './geo-index.mjs';
import {regionalFlags} from '../dist/regional-flags.mjs';
const reviewed=load('scripts/boundary-sources/regional-flags/reviewed.json'),manifest=load('dist/data/regional-flag-sources.json'),images=load('dist/data/flag-images.json');
assert.equal(Object.keys(manifest.flags).length,reviewed.length);
for(const r of reviewed){const f=manifest.flags[r.id],unit=load('dist/data/europe/'+r.country+'/catalogue.bin').records.find(u=>u.id===r.id);assert.equal(unit.en,r.name);assert.equal(unit.level,r.level);assert.equal(f.evidence,r.evidence);assert(f.adoption&&f.license&&f.credit);assert(!/unofficial|proposal|unverified/i.test(f.adoption));assert.equal(regionalFlags[r.country][r.level===1?'firstFlags':'detailFlags'][r.id].file,f.file);assert.equal(images[f.file].full,f.full);for(const [file,sha]of [[f.full,f.sha256],[f.file,f.thumbnailSha256]])assert.equal(createHash('sha256').update(fs.readFileSync('dist/'+file)).digest('hex'),sha);const thumb=await sharp('dist/'+f.file).metadata();assert.equal(thumb.height,180);assert(Math.abs(thumb.width/thumb.height-f.width/f.height)<.012,'Unchanged flag proportions: '+r.id);}
for(const [country,count]of Object.entries({palau:16,micronesia:4,'papua-new-guinea':22,'solomon-islands':10}))assert.equal(Object.keys(regionalFlags[country].firstFlags).length,count);
assert(!regionalFlags.romania.firstFlags.RO223,'Constanța city flag is not a county flag');assert(!regionalFlags.romania.firstFlags.RO125,'Mureș must not inherit Maramureș');assert(!regionalFlags.bulgaria.firstFlags.BG412,'Sofia city flag is not Sofia Province');assert.equal(Object.keys(regionalFlags.bulgaria.firstFlags).join(','),'BG411');
console.log(reviewed.length+' flag identities, adoption evidence, retained originals, credits, thumbnail ratios and viewer links passed.');
