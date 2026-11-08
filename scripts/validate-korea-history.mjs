import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {geographicAreaKm2 as area} from './geographic-area.mjs';
import {readMosaic} from './historic-mosaic.mjs';
const sources='scripts/boundary-sources/korea-history/',manifest=JSON.parse(fs.readFileSync(sources+'manifest.json','utf8'));
assert.equal(createHash('sha256').update(fs.readFileSync(sources+manifest.samhan.file)).digest('hex'),manifest.samhan.retainedSha256,'Retained Cliopatria polities');
const {history,config,unit,faceArea,linesSeparate}=await readMosaic('dist/data/korea/history/borders.bin');
const modern=JSON.parse(gunzipSync(fs.readFileSync('dist/data/korea-boundaries.bin'))).first;
assert.deepEqual(Object.keys(history.years),['100','1890']);

// Both snapshots split present-day land, and only Ulleung has no recorded polity in 100 CE.
const land=modern.features.reduce((a,f)=>a+area(f.geometry),0);
assert(Math.abs(faceArea.reduce((a,b)=>a+b,0)-land)<.5,'Faces cover present-day land');
assert.deepEqual(config(100).units.map(u=>u.key).sort(),['byeonhan','dongye','goguryeo','jinhan','juho','lelang','mahan','okjeo']);
assert.deepEqual(config(1890).units.map(u=>u.key).sort(),['chungcheong','gangwon','gyeonggi','gyeongsang','hamgyeong','hwanghae','jeolla','pyeongan']);
assert(config(1890).face.every(i=>i>=0),'Every face has a Joseon province');
const unassigned=config(100).face.flatMap((i,face)=>i<0?[faceArea[face]]:[]);
assert(unassigned.length===1&&unassigned[0]>60&&unassigned[0]<80,'Only Ulleung (about 73 km²) is unassigned in 100 CE');
for(const year of [100,1890]){
 assert(config(year).units.every(u=>u.name&&u.ko&&u.hanja&&u.type&&u.label&&u.bounds),year+' unit cards');
 assert(linesSeparate(year),year+' lines separate different units');
}

for(const [name,p,samhan,joseon] of [
 ['Seoul',[126.98,37.57],'mahan','gyeonggi'],['Pyongyang',[125.75,39.03],'lelang','pyeongan'],['Kaesong',[126.55,37.97],null,'gyeonggi'],
 ['Wonsan',[127.44,39.15],null,'hamgyeong'],['Hamhung',[127.53,39.92],'okjeo','hamgyeong'],['Gangneung',[128.88,37.75],'dongye','gangwon'],
 ['Gyeongju',[129.21,35.84],'jinhan','gyeongsang'],['Gimhae',[128.88,35.23],'byeonhan','gyeongsang'],['Jeonju',[127.15,35.82],'mahan','jeolla'],
 ['Jeju',[126.53,33.5],'juho','jeolla'],['Manpo',[126.29,41.15],'goguryeo','pyeongan'],['Uljin',[129.4,36.99],null,'gangwon'],
 ['Geumsan',[127.49,36.1],null,'jeolla'],['Baengnyeong',[124.68,37.96],'lelang','hwanghae'],['Deokjeok',[126.13,37.23],null,'gyeonggi'],
 ['Hyesan',[128.18,41.4],null,'hamgyeong'],['Chunghwa',[125.86,38.86],null,'pyeongan']
]){
 if(samhan)assert.equal(unit(100,p),samhan,name+' in 100 CE');
 assert.equal(unit(1890,p),joseon,name+' in 1890');
}
assert.equal(config(1890).units[config(1890).partOf['KR-11']].key,'gyeonggi','Seoul selected without a click shows Gyeonggi');
console.log('Korea history: 2 snapshots, '+history.faces.features.length+' faces; spot checks passed.');
