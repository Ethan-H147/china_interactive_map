import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {decodePack,encodePack} from '../dist/china-pack.mjs';
import {decodeGeo,encodeGeo} from '../dist/geo-pack.mjs';
import {chinaSourceBuilders,describeRegion} from '../dist/china-sources.mjs';
import {repairBinzhouCountyOutlines,binzhouCountyFragments} from './binzhou-county-geometry.mjs';

// Only repackage the existing county container and the two affected Binzhou
// shards. No source fetching, simplification, nationwide mesh or China rebuild.
const root='dist/data/',backup='artifacts/binzhou-county-repair/before/';
fs.mkdirSync(backup,{recursive:true});
const save=(name,bytes)=>{const original=backup+name.replaceAll('/','_');if(!fs.existsSync(original))fs.copyFileSync(root+name,original);fs.writeFileSync(root+name,bytes);};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const counties=JSON.parse(gunzipSync(fs.readFileSync(root+'china-counties.bin')));
const original=structuredClone(counties),changed=repairBinzhouCountyOutlines(counties.regions.features);
for(let i=0;i<counties.regions.features.length;i++)if(counties.regions.features[i].properties.adcode!==371603)assert.deepEqual(counties.regions.features[i],original.regions.features[i],'All other county boundaries stay identical');
const fragments=binzhouCountyFragments(counties.regions.features),text=JSON.stringify(counties);
save('china-counties.bin',gzipSync(text,{level:9}));
const packed=decodePack(gunzipSync(fs.readFileSync(root+'china-counties.pack.bin')));
packed.districts=counties;packed.fragments={...packed.fragments,...fragments};packed.sources.districts=sha(text);
const bytes=gzipSync(encodePack(packed),{level:9});save('china-counties.pack.bin',bytes);
const index=JSON.parse(fs.readFileSync(root+'china-counties-regions.json'));
index.districts=index.districts.map(f=>f.properties.adcode===371603?describeRegion(counties.regions.features.find(f=>f.properties.adcode===371603)):f);
save('china-counties-regions.json',JSON.stringify(index));
const manifest=JSON.parse(fs.readFileSync(root+'china-mobile/manifest.json')),builders=chinaSourceBuilders(packed);
for(const id of ['city-districts','city-districts-selection-edges']){
 const data={type:'FeatureCollection',features:builders[id]().features.filter(f=>f.properties.parentCity===371600)};
 const name='counties/371600/'+id+'.bin',bytes=gzipSync(encodeGeo(data),{level:9});
 // The original fill shard was retained during the initial visual experiment.
 if(id==='city-districts'&&fs.existsSync(backup+'city-districts.bin')&&!fs.existsSync(backup+('china-mobile/'+name).replaceAll('/','_')))fs.copyFileSync(backup+'city-districts.bin',backup+('china-mobile/'+name).replaceAll('/','_'));
 save('china-mobile/'+name,bytes);
 manifest.counties[371600][id]={file:name,bytes:bytes.length,features:data.features.length};
 assert.deepEqual(decodeGeo(gunzipSync(bytes)),data,'Shard encodes the intended county sources');
}
manifest.inputs['china-counties.pack.bin']=sha(bytes);
save('china-mobile/manifest.json',JSON.stringify(manifest));
assert.deepEqual(counties.boundaries,original.boundaries,'Existing shared county lines are untouched');
assert.deepEqual(counties.regions.features.find(f=>f.properties.adcode===371623),original.regions.features.find(f=>f.properties.adcode===371623),'Wudi retains all its original boundary coordinates and holes');
console.log('Binzhou only: Zhanhua spur '+(changed?'removed':'already absent')+'; Wudi rendered with '+fragments[371623].coordinates.length+' exact fill triangles. All other county geometries and shared lines unchanged.');
