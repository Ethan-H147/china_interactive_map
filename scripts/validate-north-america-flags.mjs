import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {northAmericaFlags} from '../dist/north-america-flags.mjs';
const manifest=JSON.parse(fs.readFileSync('dist/data/north-america-flag-sources.json'));
const reviewedFiles=JSON.parse(fs.readFileSync('scripts/north-america-flag-files.json'));
assert.equal(reviewedFiles['US-GA'],'Flag of the State of Georgia.svg','Georgia must explicitly identify the US state');
const images=JSON.parse(fs.readFileSync('dist/data/flag-images.json'));
for(const [country,count] of [['united-states',56],['canada',13]]){
 const records=JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/'+country+'/catalogue.bin'))).records.filter(r=>r.level===1&&!r.populationStatus);
 const flags=northAmericaFlags[country].firstFlags;
 assert.equal(records.length,count);assert.deepEqual(Object.keys(flags).sort(),records.map(r=>r.id).sort());
 for(const r of records){
  const f=flags[r.id],source=manifest.flags[r.id],bytes=fs.readFileSync('dist/'+f.full);
  assert.equal(f.name,r.en,r.id+' matches selected boundary');
  assert.equal(source.commonsFile,reviewedFiles[r.id],r.id+' uses its reviewed subdivision artwork');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256,r.id+' unmodified original');
  assert(f.width>0&&f.height>0&&f.credit&&f.license&&f.page,r.id+' dimensions and attribution');
  assert.equal(images[f.file].full,f.full,r.id+' shared viewer opens original');
  const original=await sharp(bytes).metadata(),thumbnail=await sharp('dist/'+f.file).metadata();
  assert.equal(thumbnail.format,'webp');assert.equal(thumbnail.height,180);
  assert(Math.abs(original.width/original.height-f.width/f.height)<.01,r.id+' preserves original proportions');
 }
 console.log(country+': '+count+' boundary-matched, locally cached flags with originals and attribution.');
}

// Independent visual regression: Georgia state has a blue canton and red/white/red stripes.
// The unrelated country's white flag with red crosses must fail this check.
const georgia=await sharp('dist/'+northAmericaFlags['united-states'].firstFlags['US-GA'].file).removeAlpha().raw().toBuffer({resolveWithObject:true});
const pixel=(x,y)=>{const offset=(Math.floor(y*georgia.info.height)*georgia.info.width+Math.floor(x*georgia.info.width))*georgia.info.channels;return [...georgia.data.subarray(offset,offset+3)];};
const [r,g,b]=pixel(.06,.1);assert(b>r*1.5&&b>g&&r<120,'US Georgia thumbnail must have a blue canton');
for(const y of [.15,.85]){const [r,g,b]=pixel(.85,y);assert(r>g*1.5&&r>b,'US Georgia red stripes');}
assert(pixel(.85,.5).every(v=>v>240),'US Georgia white middle stripe');
console.log('Georgia: explicit US-state source and independently checked flag design.');
