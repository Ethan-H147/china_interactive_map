import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import sharp from 'sharp';
const root=path.dirname(fileURLToPath(import.meta.url)),read=file=>fs.readFileSync(path.join(root,file));
const data=JSON.parse(read('clubs.json')),manifest=JSON.parse(read('manifest.json'));
assert.equal(data.clubs.length,82);
assert.equal(new Set(data.clubs.map(c=>c.id)).size,82);
assert.deepEqual([1,2,3].map(t=>data.clubs.filter(c=>c.tier<=t).length),[20,42,82]);
assert.deepEqual([1,2].map(g=>data.clubs.filter(c=>c.tier===3&&c.group===g).length),[20,20]);
for(const [file,source]of Object.entries(manifest.files)){
 let bytes=read(file);if(source.encoding==='gzip')bytes=gunzipSync(bytes);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256,file);
 assert.equal(bytes.length,source.bytes,file);
}
for(const club of data.clubs){
 assert(club.coordinateSource&&/^https:\/\//.test(club.coordinateSource),'Coordinate source '+club.en);
 assert(club.crestSource&&club.rosterSource&&club.stadium&&club.city,'Source and ground fields '+club.en);
 assert(club.center.length===2&&club.center.every(Number.isFinite),'Actual ground coordinate '+club.en);
 const meta=await sharp(path.join(root,'crests',club.crest)).metadata();
 assert(meta.width>0&&meta.height>0&&meta.width<=256&&meta.height<=256,'Valid crest '+club.en);
}
const shared=data.clubs.filter(c=>c.sharedGround==='balaidos');assert.equal(shared.length,2);assert.deepEqual(shared[0].center,shared[1].center);
console.log('Spain: 82 sourced clubs, cumulative20/42/82, both third-tier groups, all coordinate sources, crest images, source hashes and shared Balaídos verified.');
