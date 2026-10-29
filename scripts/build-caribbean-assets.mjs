// Add the five Caribbean contexts without rebuilding unrelated atlas geography.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import '../dist/countries.js';
import {definitions} from './caribbean-definitions.mjs';
import {load,polygons,landIndex,linesOf} from './geo-index.mjs';
import {fc,command,geographicBounds} from './build-regional-dataset.mjs';
import {compactSources} from './build-compact.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {prepareRegionColors} from './prepare-region-colors.mjs';
import {build as buildCoverage} from './build-context-coverage.mjs';

const root='dist/data/',names=new Set(definitions.map(d=>d.country)),codes=new Set(definitions.map(d=>d.iso));
assert.deepEqual([...names].sort(),['bahamas','cuba','dominican-republic','haiti','jamaica']);
assert.deepEqual([...codes].sort(),['BHS','CUB','DOM','HTI','JAM']);
for(const country of names)assert(globalThis.AtlasCountries.ids.includes(country),'Register '+country+' before integrating derived assets');
const world=load(root+'world-land.bin'),meta=load(root+'world-land-sources.json');
const hash=data=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
const write=(file,data)=>fs.writeFileSync(root+file,gzipSync(JSON.stringify(data),{level:9}));
const preserved=Object.fromEntries([...new Set(world.features.map(f=>f.properties.country).filter(c=>c&&!names.has(c)))].map(c=>[c,hash(world.features.filter(f=>f.properties.country===c))]));
const frontierBytes=fs.readFileSync(root+'atlas-frontiers.bin');
const contexts=definitions.flatMap(d=>{
 const data=load(root+'europe/'+d.country+'/context.bin');
 assert(data.features.length&&data.features.every(f=>polygons(f.geometry).length),'Nonempty land context '+d.country);
 return data.features.map(f=>({...f,properties:{...f.properties,country:d.country}}));
});
// Haiti owns the only new shared land frontier. The other files must stay empty;
// this prevents coastlines, maritime boundaries and a second Hispaniola stroke.
for(const country of names){
 const borders=load(root+'europe/'+country+'/international.bin');
 if(country==='haiti'){
  assert(borders.features.length&&linesOf(borders).length,'Haiti owns the Hispaniola frontier');
  assert(borders.features.every(f=>f.properties.pair==='HTI-DOM'||f.properties.pair==='DOM-HTI'),'Only the shared Haiti–Dominican Republic land frontier is drawn');
 }else assert.equal(borders.features.length,0,country+' has no separately owned international strokes');
}

// Match the former anonymous background silhouettes using the retained source,
// rather than a broad rectangle that could also catch nearby island territories.
const ne=load('scripts/boundary-sources/nordics/ne-countries.json.gz');
const references=definitions.map(d=>{
 const source=ne.features.filter(f=>f.properties.ADM0_A3===d.iso);
 assert(source.length,'Retained background reference '+d.iso);
 return {d,inside:landIndex(source.flatMap(f=>polygons(f.geometry).flat()))};
});
const foreign=world.features.filter(f=>!f.properties.country);
const points=foreign.length?(await command(fc(foreign),'-points inner')).features:[];
assert.equal(points.length,foreign.length,'One representative point per background silhouette');
const removed=new Map(definitions.map(d=>[d.country,0]));
const kept=foreign.filter((f,i)=>{
 const point=points[i]?.geometry?.coordinates,match=references.find(r=>point&&r.inside(point));
 if(!match)return true;
 removed.set(match.d.country,removed.get(match.d.country)+1);return false;
});
for(const [country,count]of removed)assert(count||world.features.some(f=>f.properties.country===country),'Replace the previous silhouette '+country);
// Clip only nearby background features. Existing interactive contexts, including
// overseas islands and every local coastline repair, never enter this overlay.
const boxes=contexts.map(f=>geographicBounds(f.geometry));
const candidates=kept.filter(f=>{
 const b=geographicBounds(f.geometry);
 return boxes.some(a=>b[0][0]<a[1][0]&&b[1][0]>a[0][0]&&b[0][1]<a[1][1]&&b[1][1]>a[0][1]);
});
let clippedForeign=kept;
if(candidates.length){
 const clipped=await command({'foreign.json':fc(candidates),'new.json':fc(contexts)},'-erase new.json -clean gap-fill-area=0',{precision:null});
 const selected=new Set(candidates);clippedForeign=[...kept.filter(f=>!selected.has(f)),...clipped.features];
}
const final=fc([...clippedForeign,...world.features.filter(f=>f.properties.country&&!names.has(f.properties.country)),...contexts]);
for(const [country,expected]of Object.entries(preserved))assert.equal(hash(final.features.filter(f=>f.properties.country===country)),expected,'Preserve existing '+country);

const outlines=load(root+'world-country-outlines.bin');
const unrelatedOutlines=outlines.features.filter(f=>!String(f.properties.countries).split(' ').some(c=>codes.has(c)));
const removedOutlines=outlines.features.length-unrelatedOutlines.length;
// This removes the old coast groups and the old DOM HTI and CUB USG frontier
// fragments together. The detailed Haiti file supplies Hispaniola exactly once.
// Existing atlas-frontiers and shared-context-borders have no Caribbean edges.
assert(!load(root+'atlas-frontiers.bin').features.some(f=>String(f.properties.countries).split(' ').some(c=>names.has(c)||codes.has(c))),'No older Caribbean-owned atlas frontier may duplicate the new files');
outlines.features=unrelatedOutlines;
write('world-land.bin',final);write('world-country-outlines.bin',outlines);
assert.deepEqual(fs.readFileSync(root+'atlas-frontiers.bin'),frontierBytes,'Preserve all existing atlas frontier bytes');
meta.topology.atlasCodes=[...new Set([...meta.topology.atlasCodes,...codes])];
meta.topology.backgroundCodes=meta.topology.backgroundCodes.filter(c=>!codes.has(c));
meta.topology.backgroundCountries=meta.topology.backgroundCodes.length;
meta.topology.outlineGroups=outlines.features.length;
for(const d of definitions)meta.sources.atlas[d.country]='data/europe/'+d.country+'/context.bin';
meta.caribbeanIntegration={
 source:'scripts/boundary-sources/caribbean/manifest.json',countries:[...names],
 removedGrayFeatures:Object.fromEntries(removed),removedBackgroundOutlineGroups:removedOutlines,
 clippedNearbyBackgroundFeatures:candidates.length,preservedInteractiveHashes:preserved,
 sharedFrontier:{pair:'HTI-DOM',owner:'haiti',source:'data/europe/haiti/international.bin'},
 method:'Replace only the five former background silhouettes and their obsolete coast/frontier groups. Haiti owns the single land-only Hispaniola frontier; no coast or maritime strokes are added. Existing interactive geometry and all atlas frontier bytes are preserved.'
};
meta.bytes=fs.statSync(root+'world-land.bin').size;meta.outlineBytes=fs.statSync(root+'world-country-outlines.bin').size;
fs.writeFileSync(root+'world-land-sources.json',JSON.stringify(meta,null,2)+'\n');

const files=[...new Set(['world-land.bin','world-country-outlines.bin',...definitions.flatMap(d=>['context','international','neighbours'].map(n=>'europe/'+d.country+'/'+n+'.bin'))])].filter(f=>fs.existsSync(root+f));
for(const file of files){
 const text=gunzipSync(fs.readFileSync(root+file)).toString(),target=root+'compact/'+file;
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,gzipSync(encodeGeo(JSON.parse(text),{source:createHash('sha256').update(text).digest('hex')}),{level:9}));
}
const present=compactSources.filter(f=>fs.existsSync(root+f));
const empty=present.filter(f=>{const data=load(root+f);return data.type==='FeatureCollection'&&!data.features.length;});
fs.writeFileSync('dist/compact-files.mjs','// Generated compact sources and verified empty geometry.\nexport const compactFiles='+JSON.stringify(present)+';\nexport const emptyGeometryFiles='+JSON.stringify(empty)+';\n');
prepareRegionColors([...names]);await buildCoverage();
await import('./build-globe-overview.mjs');await import('./build-border-previews.mjs');
for(const [country,expected]of Object.entries(preserved))assert.equal(hash(load(root+'world-land.bin').features.filter(f=>f.properties.country===country)),expected,'Final existing silhouette '+country);
assert.deepEqual(fs.readFileSync(root+'atlas-frontiers.bin'),frontierBytes,'Final existing frontier bytes');
console.log('Integrated Caribbean:',Object.fromEntries(removed),'obsolete outline groups removed:',removedOutlines,'existing country silhouettes preserved:',Object.keys(preserved).length);
