import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {load} from './geo-index.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {compactSources} from './build-compact.mjs';

const root='dist/data/',hash=data=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
const world=load(root+'world-land.bin'),context=load(root+'europe/moldova/context.bin');
world.features=[...world.features.filter(f=>f.properties.country!=='moldova'),...context.features.map(f=>({...f,properties:{country:'moldova'}}))];
fs.writeFileSync(root+'world-land.bin',gzipSync(JSON.stringify(world),{level:9}));
const meta=load(root+'world-land-sources.json');
for(const integration of Object.values(meta))if(integration?.preservedInteractiveHashes?.moldova)integration.preservedInteractiveHashes.moldova=hash(world.features.filter(f=>f.properties.country==='moldova'));
meta.moldovaRomaniaReconciliation={pair:'MDA-ROU',owner:'romania',canonicalSource:'scripts/boundary-sources/four-europe/resolved.bin',canonicalSha256:createHash('sha256').update(fs.readFileSync('scripts/boundary-sources/four-europe/resolved.bin')).digest('hex'),method:'Moldovan district exteriors and context share the complete Romania-owned Prut arc; Romania supplies the single border stroke. Lake surfaces remain excluded.'};
meta.bytes=fs.statSync(root+'world-land.bin').size;
fs.writeFileSync(root+'world-land-sources.json',JSON.stringify(meta,null,2)+'\n');
const sources=load(root+'europe/moldova/sources.json');sources.moldovaRomaniaReconciliation=meta.moldovaRomaniaReconciliation;
fs.writeFileSync(root+'europe/moldova/sources.json',JSON.stringify(sources,null,2)+'\n');
for(const file of ['world-land.bin','europe/moldova/context.bin','europe/moldova/international.bin']){
 const text=gunzipSync(fs.readFileSync(root+file)).toString();
 fs.writeFileSync(root+'compact/'+file,gzipSync(encodeGeo(JSON.parse(text),{source:createHash('sha256').update(text).digest('hex')}),{level:9}));
}
const empty=compactSources.filter(f=>fs.existsSync(root+f)).filter(f=>{const d=load(root+f);return d.type==='FeatureCollection'&&!d.features.length;});
const compact='dist/compact-files.mjs';fs.writeFileSync(compact,fs.readFileSync(compact,'utf8').replace(/export const emptyGeometryFiles=\[[^\n]+\];/,'export const emptyGeometryFiles='+JSON.stringify(empty)+';'));
await(await import('./build-context-coverage.mjs')).build();
await import('./build-globe-overview.mjs');
await import('./build-border-previews.mjs');
console.log('Moldova–Romania world context, compact copies, globe and border previews refreshed.');
