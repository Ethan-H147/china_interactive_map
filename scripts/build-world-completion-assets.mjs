// Integrate the thirteen remaining countries and their shared frontiers.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import '../dist/countries.js';
import {definitions} from './world-completion-definitions.mjs';
import {load,polygons,landIndex,linesOf,lineIndex} from './geo-index.mjs';
import {fc,command,geographicBounds} from './build-regional-dataset.mjs';
import {compactSources} from './build-compact.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {countryContext} from './country-context.mjs';
import {prepareRegionColors} from './prepare-region-colors.mjs';
import {build as buildCoverage} from './build-context-coverage.mjs';

(await import('./preserve-existing-world-frontiers.mjs')).applyPreservedExistingFrontiers();
const root='dist/data/',names=new Set(definitions.map(d=>d.country)),codes=new Set(definitions.map(d=>d.iso==='SSD'?'SDS':d.iso==='PSE'?'PSX':d.iso));
assert.equal(names.size,13);
assert.equal(codes.size,13);
for(const country of names)assert(globalThis.AtlasCountries.ids.includes(country),'Register '+country+' before integrating derived assets');
const world=load(root+'world-land.bin'),meta=load(root+'world-land-sources.json');
const hash=data=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
const write=(file,data)=>fs.writeFileSync(root+file,gzipSync(JSON.stringify(data),{level:9}));
const canonical=load('scripts/boundary-sources/world-completion/frontiers.bin'),mapping=load('scripts/boundary-sources/world-completion/frontier-mapping.json');
const adjustedNeighbors=new Set(canonical.features.flatMap(f=>f.properties.pair.split('-').map(code=>mapping[code])).filter(c=>!names.has(c)));
const originalNeighborHashes=meta.worldCompletion?.originalNeighborHashes||Object.fromEntries([...adjustedNeighbors].map(c=>[c,hash(world.features.filter(f=>f.properties.country===c))]));
const neighborAdminHashes=Object.fromEntries([...adjustedNeighbors].map(c=>[c,createHash('sha256').update(fs.readFileSync(root+'europe/'+c+'/first.bin')).digest('hex')]));
const preserved=Object.fromEntries([...new Set(world.features.map(f=>f.properties.country).filter(c=>c&&!names.has(c)&&!adjustedNeighbors.has(c)))].map(c=>[c,hash(world.features.filter(f=>f.properties.country===c))]));
// Contexts reuse the exact first-level partition, including inland openings.
const contextCountries=[...new Set([...names,...adjustedNeighbors])];
for(const country of contextCountries){const file='europe/'+country+'/context.bin',regions=load(root+'europe/'+country+'/first.bin').regions,cat=load(root+'europe/'+country+'/catalogue.bin'),units=new Map(cat.records.filter(r=>r.level===1).map(r=>[r.id,r]));write(file,await countryContext(country,regions,units,command));}
const contexts=definitions.flatMap(d=>{const data=load(root+'europe/'+d.country+'/context.bin');assert(data.features.length&&data.features.every(f=>polygons(f.geometry).length));return data.features.map(f=>({...f,properties:{...f.properties,country:d.country}}));});
const neighborContexts=[...adjustedNeighbors].flatMap(country=>load(root+'europe/'+country+'/context.bin').features.map(f=>({...f,properties:{...f.properties,country}})));
const guides=load('scripts/boundary-sources/nordics/ne-borders.json.gz');
function stripOld(data,arcs,protect=()=>false){
 const pairs=new Set(arcs.map(f=>f.properties.pair)),source=guides.features.filter(f=>pairs.has([f.properties.ADM0_A3_L,f.properties.ADM0_A3_R].sort().join('-'))),near=lineIndex([...linesOf(fc(arcs)),...linesOf(fc(source))]);
 return {...data,features:data.features.flatMap(f=>{if(protect(f))return[f];const tag=f.properties.pair||f.properties.resolvedFrontier,normalized=tag&&tag.split('-').map(c=>c==='SDS'?'SSD':c==='PSX'?'PSE':c).sort().join('-');if(normalized&&pairs.has(normalized))return[];if(normalized)return[f];return linesOf(fc([f])).flatMap(path=>{const parts=[];let run;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];if([0,.25,.5,.75,1].every(t=>near(a.map((v,j)=>v+(b[j]-v)*t))<10000)){run=null;continue;}if(!run)parts.push(run=[a]);run.push(b);}return parts.map(coordinates=>({...f,geometry:{type:'LineString',coordinates}}));});})};
}
for(const country of adjustedNeighbors){const arcs=canonical.features.filter(f=>f.properties.owner===country);if(!arcs.length)continue;const file='europe/'+country+'/international.bin',old=load(root+file),clean=stripOld(old,arcs);write(file,lineData(fc([...clean.features,...arcs])));}
// All new borders have dedicated country owners; remove former global fallback copies.
const oldAtlas=load(root+'atlas-frontiers.bin');write('atlas-frontiers.bin',lineData(stripOld(oldAtlas,canonical.features)));

// Match the former anonymous background silhouettes using the retained source,
// rather than a broad rectangle that could also catch nearby island territories.
const ne=load('scripts/boundary-sources/nordics/ne-countries.json.gz');
const references=definitions.map(d=>{
 const code=d.iso==='SSD'?'SDS':d.iso==='PSE'?'PSX':d.iso;const source=ne.features.filter(f=>f.properties.ADM0_A3===code);
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
const final={...world,features:[...clippedForeign,...world.features.filter(f=>f.properties.country&&!names.has(f.properties.country)&&!adjustedNeighbors.has(f.properties.country)),...neighborContexts,...contexts]};
for(const [country,expected]of Object.entries(preserved))assert.equal(hash(final.features.filter(f=>f.properties.country===country)),expected,'Preserve existing '+country);

const outlines=load(root+'world-country-outlines.bin');
const unrelatedOutlines=outlines.features.filter(f=>!String(f.properties.countries).split(' ').some(c=>codes.has(c)));
const removedOutlines=outlines.features.length-unrelatedOutlines.length;
outlines.features=unrelatedOutlines;
write('world-land.bin',final);write('world-country-outlines.bin',outlines);

meta.topology.atlasCodes=[...new Set([...meta.topology.atlasCodes,...codes])];
meta.topology.backgroundCodes=meta.topology.backgroundCodes.filter(c=>!codes.has(c));
meta.topology.backgroundCountries=meta.topology.backgroundCodes.length;
meta.topology.outlineGroups=outlines.features.length;
for(const d of definitions)meta.sources.atlas[d.country]='data/europe/'+d.country+'/context.bin';
meta.worldCompletion={
 source:'scripts/boundary-sources/world-completion/manifest.json',countries:[...names],
 removedGrayFeatures:Object.fromEntries(removed),removedBackgroundOutlineGroups:removedOutlines,
 clippedNearbyBackgroundFeatures:candidates.length,preservedInteractiveHashes:preserved,originalNeighborHashes,neighborAdministrativeHashes:neighborAdminHashes,adjustedNeighborContexts:[...adjustedNeighbors],
 sharedFrontiers:canonical.features.map(f=>({pair:f.properties.pair,owner:f.properties.owner})),
 method:'Replace the fifteen former background silhouettes and remove their obsolete outline groups. New country fills follow one canonical border per pair, with existing neighbors retaining their administrative land. Each frontier is drawn by exactly one owner. Background context maps for Mexico, Costa Rica, Venezuela and France use their unchanged detailed administrative polygons, retaining country and overseas routing properties. Their administrative polygons and all unrelated country contexts, including the Canadian lake masks, remain unchanged.'
};
for(const key of ['americasCompletion','caribbeanIntegration'])if(meta[key]?.preservedInteractiveHashes)for(const country of adjustedNeighbors)if(meta[key].preservedInteractiveHashes[country])meta[key].preservedInteractiveHashes[country]=hash(final.features.filter(f=>f.properties.country===country));
meta.worldCompletion.method='Replace thirteen background country silhouettes with sourced administrative maps. Shared arcs have one owner. Neighbor contexts use unchanged detailed administrative polygons; all unrelated contexts and all existing administrative files stay unchanged.';
meta.bytes=fs.statSync(root+'world-land.bin').size;meta.outlineBytes=fs.statSync(root+'world-country-outlines.bin').size;
fs.writeFileSync(root+'world-land-sources.json',JSON.stringify(meta,null,2)+'\n');

const files=[...new Set(['world-land.bin','world-country-outlines.bin','atlas-frontiers.bin',...[...adjustedNeighbors].flatMap(c=>['context','international'].map(n=>'europe/'+c+'/'+n+'.bin')),...definitions.flatMap(d=>['context','international','neighbours'].map(n=>'europe/'+d.country+'/'+n+'.bin'))])].filter(f=>fs.existsSync(root+f));
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
const finalWorld=load(root+'world-land.bin');
for(const [country,expected]of Object.entries(preserved))assert.equal(hash(finalWorld.features.filter(f=>f.properties.country===country)),expected,'Final existing silhouette '+country);

console.log('Integrated world additions:',Object.fromEntries(removed),'obsolete outline groups removed:',removedOutlines,'existing country silhouettes preserved:',Object.keys(preserved).length);
