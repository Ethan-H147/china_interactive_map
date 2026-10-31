import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import '../dist/countries.js';
import {liberiaFlags} from '../dist/liberia-flags.mjs';
import {load} from './geo-index.mjs';
const manifest=load('dist/data/liberia-flag-sources.json'),counties=load('dist/data/europe/liberia/catalogue.bin').records.filter(r=>r.level===1),images=load('dist/data/flag-images.json'),hash=(b,type='sha256')=>createHash(type).update(b).digest('hex');
assert.equal(AtlasCountries.countries.liberia.flagSet,'liberia');assert.equal(counties.length,15);assert.deepEqual(Object.keys(manifest.flags).sort(),counties.map(r=>r.id).sort());const {gunzipSync}=await import('node:zlib');assert.equal(hash(gunzipSync(fs.readFileSync(manifest.metadata.file))),manifest.metadata.sha256);
for(const r of counties){const f=manifest.flags[r.id],original=fs.readFileSync('dist/'+f.full),thumbBytes=fs.readFileSync('dist/'+f.file),thumb=await sharp(thumbBytes).metadata();assert.equal(f.name,r.en);assert.equal(f.commonsFile,'Flag of '+r.en+' County.svg');assert.equal(hash(original),f.sha256);assert.equal(hash(original,'sha1'),f.commonsSha1);assert.equal(hash(thumbBytes),f.thumbnailSha256);assert.equal(thumb.height,180);assert(Math.abs(thumb.width-180*f.width/f.height)<=1);assert(f.credit&&f.license&&f.page&&f.source);assert.equal(liberiaFlags.liberia.firstFlags[r.id].file,f.file);assert.equal(images[f.file].full,f.full);assert.equal(images[f.file].credit,f.credit);assert.equal(images[f.file].license,f.license);}
assert.equal(Object.keys(liberiaFlags.liberia.detailFlags).length,0);console.log('All 15 county identities, original artwork checksums, credits, lossless thumbnails and viewer links passed.');
