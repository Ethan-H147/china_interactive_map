import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {readDataText} from './read-data.mjs';
import {encodePack,decodePack} from '../dist/china-pack.mjs';
import {describeChina} from '../dist/china-sources.mjs';

// The gzip JSON files remain the build inputs. Visitors download this packed copy,
// which shares each coordinate between provinces, subdivisions, lines and districts.
const texts={
 display:readDataText('display-boundaries.json'),
 districts:gunzipSync(fs.readFileSync('dist/data/city-districts.bin')).toString('utf8'),
 fragments:gunzipSync(fs.readFileSync('dist/data/fill-fragments.bin')).toString('utf8')
};
const sha=text=>createHash('sha256').update(text).digest('hex');
const sources=Object.fromEntries(Object.entries(texts).map(([key,text])=>[key,sha(text)]));
const packed=gzipSync(encodePack({...Object.fromEntries(Object.entries(texts).map(([key,text])=>[key,JSON.parse(text)])),sources}),{level:9});
const decoded=decodePack(gunzipSync(packed));
for(const key of Object.keys(texts))assert.equal(JSON.stringify(decoded[key]),texts[key],`Packed ${key} must decode to identical JSON`);
fs.writeFileSync('dist/data/china-boundaries.pack.bin',packed);
// Names, bounds and part counts let the page work without the geometry.
fs.writeFileSync('dist/data/china-regions.json',JSON.stringify(describeChina(decoded)));
const before=JSON.parse(fs.readFileSync('dist/data/display-boundaries.parts.json')).compressedBytes+fs.statSync('dist/data/city-districts.bin').size+fs.statSync('dist/data/fill-fragments.bin').size;
console.log(`Region index: ${(fs.statSync('dist/data/china-regions.json').size/1024).toFixed(0)} KB. Packed China boundaries: ${(packed.length/1048576).toFixed(2)} MB (from ${(before/1048576).toFixed(2)} MB), identical after decoding.`);
