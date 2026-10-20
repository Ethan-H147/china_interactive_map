import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {decodeGeoStructure,compactUrl} from '../dist/geo-pack.mjs';
import {compactFiles,emptyGeometryFiles} from '../dist/compact-files.mjs';
import {compactSources} from './build-compact.mjs';
import {assertNearGeo} from './geo-compare.mjs';

// Every listed source that exists has a current compact copy, and nothing else is published there.
const present=compactSources.filter(f=>fs.existsSync('dist/data/'+f));
assert.deepEqual(compactFiles,present,'dist/compact-files.mjs is stale; run npm run build:compact');
const published=[];const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else published.push(path.relative('dist/data/compact',p).replaceAll('\\','/'));}};
walk('dist/data/compact');
assert.deepEqual(published.sort(),[...present].sort(),'Only listed files have compact copies');
let worst=0,before=0,after=0;const empty=[];
for(const file of present){
 const source=fs.readFileSync('dist/data/'+file),text=gunzipSync(source).toString('utf8'),copy=fs.readFileSync('dist/data/compact/'+file);
 const data=JSON.parse(text);if(data.type==='FeatureCollection'&&!data.features.length)empty.push(file);
 const structure=decodeGeoStructure(gunzipSync(copy));
 assert.equal(structure.meta.source,createHash('sha256').update(text).digest('hex'),`Compact copy of ${file} is stale; run npm run build:compact`);
 worst=Math.max(worst,assertNearGeo(structure.value,JSON.parse(text),file));
 before+=source.length;after+=copy.length;
}
assert.deepEqual(emptyGeometryFiles,empty,'Only verified empty geometry may skip source creation');
// Requests for listed files go to the copy; everything else is untouched.
assert.equal(compactUrl('data/china-context.bin'),'data/compact/china-context.bin');
assert.equal(compactUrl('data/southern-africa/botswana/context.bin'),'data/compact/southern-africa/botswana/context.bin');
assert.equal(String(compactUrl(new URL('https://example.test/site/data/korea-context.bin'))),'https://example.test/site/data/compact/korea-context.bin');
for(const other of ['data/korea-boundaries.bin','data/china-boundaries.pack.bin','data/europe/iceland/sources.json','vendor/metadata/china-context.bin'])assert.equal(compactUrl(other),other);
// Preloads name the file the page actually requests, so nothing downloads twice.
const page=fs.readFileSync('dist/index.html','utf8');
const preloads=[...page.matchAll(/<link rel="preload" as="fetch" crossorigin href="(data\/[^"]+)">/g)].map(m=>m[1]),later=JSON.parse(page.match(/<script type="application\/json" id="later-preloads">([^<]+)<\/script>/)[1]);
for(const href of [...preloads,...later]){assert.equal(compactUrl(href),href,'Preload the compact copy, not its source: '+href);assert(fs.existsSync('dist/'+href),'Preloaded file exists: '+href);}
console.log(`Compact copies: ${present.length} files, ${(before/1048576).toFixed(2)} MB -> ${(after/1048576).toFixed(2)} MB, current with their sources, every coordinate within ${(worst*111320*1000).toFixed(1)} mm; preloads request the copies.`);
