import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {mexicoStateFlags} from '../dist/mexico-state-flags.mjs';
const ids=['BCS','COA','COL','DUR','GUA','GRO','JAL','OAX','QUE','ROO','TAB','TAM','TLA','YUC'].map(s=>'MX-'+s);
const manifest=JSON.parse(fs.readFileSync('dist/data/mexico-state-flag-sources.json')),catalogue=JSON.parse(fs.readFileSync('dist/data/flag-images.json'));
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.deepEqual(Object.keys(manifest.flags).sort(),ids.sort());
assert.deepEqual(Object.keys(mexicoStateFlags.mexico.firstFlags).sort(),ids);
for(const[id,f]of Object.entries(manifest.flags)){
 const bytes=fs.readFileSync('dist/'+f.full);assert.equal(hash(bytes),f.sha256,id+' original');
 assert.equal(catalogue[f.file].full,f.full,id+' viewer original');assert.equal(catalogue[f.file].source,f.page);
 const thumb=await sharp('dist/'+f.file).metadata();assert.equal(thumb.height,180);assert(Math.abs(thumb.width/thumb.height-f.width/f.height)<.01);
 assert(f.legalSource.url.startsWith('https:'));assert.equal(f.legalSource.verified,id!=='MX-OAX');
 assert(!/unofficial|unverified|rendition/i.test(f.status),id+' visible without optional toggle');
 assert.equal(mexicoStateFlags.mexico.firstFlags[id].file,f.file);
}
const tam=manifest.flags['MX-TAM'];assert(tam.armsSource,'current arms sourced directly from law');assert.equal(hash(fs.readFileSync(tam.armsSource.file)),tam.armsSource.sha256);assert.equal(hash(fs.readFileSync(tam.armsSource.pdf)),tam.armsSource.pdfSha256);
const yuc=fs.readFileSync('dist/'+manifest.flags['MX-YUC'].full,'utf8');assert(yuc.includes('#006847')&&yuc.includes('#ce1126'));
assert.equal(manifest.flags['MX-YUC'].width/manifest.flags['MX-YUC'].height,2);
assert.equal(manifest.flags['MX-OAX'].status,'Coat-of-arms flag');assert(manifest.flags['MX-OAX'].legalSource.note.includes('could not be independently confirmed'));
console.log('14 Mexican flags: original bytes, legal-source qualification, thumbnails, viewer catalogue and current Tamaulipas arms verified.');
