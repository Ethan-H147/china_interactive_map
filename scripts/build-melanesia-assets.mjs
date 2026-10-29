import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import '../dist/countries.js';
import {definitions} from './melanesia-definitions.mjs';
import {load,polygons,landIndex,linesOf} from './geo-index.mjs';
import {fc,command} from './build-regional-dataset.mjs';
import {compactSources} from './build-compact.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {prepareRegionColors} from './prepare-region-colors.mjs';
import {build as buildCoverage} from './build-context-coverage.mjs';
const root='dist/data/',names=new Set(definitions.map(d=>d.country)),codes=new Set(definitions.map(d=>d.iso)),world=load(root+'world-land.bin'),meta=load(root+'world-land-sources.json');
const hash=data=>createHash('sha256').update(JSON.stringify(data)).digest('hex'),write=(file,data)=>fs.writeFileSync(root+file,gzipSync(JSON.stringify(data),{level:9}));
const preserved=Object.fromEntries([...new Set(world.features.map(f=>f.properties.country).filter(c=>c&&!names.has(c)))].map(c=>[c,hash(world.features.filter(f=>f.properties.country===c))]));
const ne=load('scripts/boundary-sources/nordics/ne-countries.json.gz'),references=definitions.map(d=>({d,inside:landIndex(ne.features.filter(f=>f.properties.ADM0_A3===d.iso).flatMap(f=>polygons(f.geometry).flat()))}));
const foreign=world.features.filter(f=>!f.properties.country),points=(await command(fc(foreign),'-points inner')).features;
const removed=new Map(definitions.map(d=>[d.country,0]));
const kept=foreign.filter((f,i)=>{const p=points[i]?.geometry?.coordinates,match=references.find(r=>p&&r.inside(p));if(match){removed.set(match.d.country,removed.get(match.d.country)+1);return false;}return true;});
for(const [country,count]of removed)assert(count||world.features.some(f=>f.properties.country===country),'Replace the previous silhouette '+country);
const contexts=definitions.flatMap(d=>load(root+'europe/'+d.country+'/context.bin').features.map(f=>({...f,properties:{...f.properties,country:d.country}})));
const final=fc([...kept,...world.features.filter(f=>f.properties.country&&!names.has(f.properties.country)),...contexts]);
for(const [c,h]of Object.entries(preserved))assert.equal(hash(final.features.filter(f=>f.properties.country===c)),h,'Preserve existing '+c);
write('world-land.bin',final);
const outlines=load(root+'world-country-outlines.bin');outlines.features=outlines.features.filter(f=>!String(f.properties.countries).split(' ').some(c=>codes.has(c)));write('world-country-outlines.bin',outlines);
// Papua New Guinea owns this complete shared land edge. Remove only the old
// Indonesia-owned New Guinea fragments; retain all other existing frontier bytes.
const frontierFile='atlas-frontiers.bin',frontiers=load(root+frontierFile),replaced=[];
frontiers.features=frontiers.features.flatMap(f=>{
 if(!String(f.properties.countries).split(' ').includes('indonesia'))return[f];
 const paths=linesOf(fc([f])),keep=paths.filter(p=>{const border=p.every(q=>q[0]>140.5&&q[0]<141.5&&q[1]>-10&&q[1]<0);if(border)replaced.push(p.length);return !border;});
 return keep.length===paths.length?[f]:keep.map(p=>({...f,geometry:{type:'LineString',coordinates:p}}));
});write(frontierFile,frontiers);
meta.topology.atlasCodes=[...new Set([...meta.topology.atlasCodes,...codes])];meta.topology.backgroundCodes=meta.topology.backgroundCodes.filter(c=>!codes.has(c));meta.topology.backgroundCountries=meta.topology.backgroundCodes.length;meta.topology.outlineGroups=outlines.features.length;
for(const d of definitions)meta.sources.atlas[d.country]='data/europe/'+d.country+'/context.bin';
meta.melanesiaIntegration={source:'scripts/boundary-sources/melanesia/manifest.json',countries:[...names],removedGrayFeatures:Object.fromEntries(removed),replacedIndonesianFrontierFragments:replaced,preservedInteractiveHashes:preserved,method:'Replace only the three former background silhouettes. PNG owns the land-only New Guinea frontier once; no coast or maritime strokes. Existing country geometries, including local coast repairs, are preserved.'};meta.bytes=fs.statSync(root+'world-land.bin').size;meta.outlineBytes=fs.statSync(root+'world-country-outlines.bin').size;fs.writeFileSync(root+'world-land-sources.json',JSON.stringify(meta,null,2)+'\n');
const files=['world-land.bin','world-country-outlines.bin','atlas-frontiers.bin',...definitions.flatMap(d=>['context','international'].map(n=>'europe/'+d.country+'/'+n+'.bin'))];
for(const file of files){const text=gunzipSync(fs.readFileSync(root+file)).toString(),target=root+'compact/'+file;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,gzipSync(encodeGeo(JSON.parse(text),{source:createHash('sha256').update(text).digest('hex')}),{level:9}));}
const present=compactSources.filter(f=>fs.existsSync(root+f)),empty=present.filter(f=>{const data=load(root+f);return data.type==='FeatureCollection'&&!data.features.length;});fs.writeFileSync('dist/compact-files.mjs','// Generated compact sources and verified empty geometry.\nexport const compactFiles='+JSON.stringify(present)+';\nexport const emptyGeometryFiles='+JSON.stringify(empty)+';\n');
prepareRegionColors([...names]);await buildCoverage();await import('./build-globe-overview.mjs');await import('./build-border-previews.mjs');
console.log('Integrated Melanesia:',Object.fromEntries(removed),'existing country silhouettes preserved:',Object.keys(preserved).length);
