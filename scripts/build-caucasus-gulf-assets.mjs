import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import '../dist/countries.js';
import {load,polygons,landIndex,linesOf,lineIndex} from './geo-index.mjs';
import {fc,command,geographicBounds} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {alignArc} from './korean-frontiers.mjs';
import {worldOutlines} from './world-country-topology.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {compactSources} from './build-compact.mjs';
import {build as buildCoverage} from './build-context-coverage.mjs';
const only=process.argv.find(a=>a.startsWith('--country='))?.slice(10);
const countries=['armenia','georgia','azerbaijan','qatar','bahrain','united-arab-emirates'].filter(c=>!only||c===only),isos={armenia:'ARM',georgia:'GEO',azerbaijan:'AZE',qatar:'QAT',bahrain:'BHR','united-arab-emirates':'ARE'},codes=new Set(countries.map(c=>isos[c])),root='dist/data/',world=load(root+'world-land.bin'),meta=load(root+'world-land-sources.json'),ne=load('scripts/boundary-sources/nordics/ne-countries.json.gz'),lakes=load('scripts/boundary-sources/nordics/ne-lakes.json.gz');
const hash=data=>createHash('sha256').update(JSON.stringify(data)).digest('hex'),write=(file,data)=>fs.writeFileSync(root+file,gzipSync(JSON.stringify(data),{level:9}));
const preserved=Object.fromEntries([...new Set(world.features.map(f=>f.properties.country).filter(c=>c&&!countries.includes(c)))].map(c=>[c,hash(world.features.filter(f=>f.properties.country===c))]));
const rawForeign=world.features.filter(f=>!f.properties.country),points=(await command(fc(rawForeign),'-points inner')).features,expected=new Set(meta.topology.backgroundCodes),indices=new Map(),refs=ne.features.filter(f=>expected.has(f.properties.ADM0_A3)).map(f=>({f,bounds:geographicBounds(f.geometry)}));
const foreign=rawForeign.map((f,i)=>{const p=points[i].geometry.coordinates,candidates=refs.filter(({bounds:b})=>p[0]>=b[0][0]&&p[0]<=b[1][0]&&p[1]>=b[0][1]&&p[1]<=b[1][1]);let match;for(const {f:r}of candidates){const id=r.properties.ADM0_A3;if(!indices.has(id))indices.set(id,landIndex(polygons(r.geometry).flat()));if(indices.get(id)(p)){match=r;break;}}assert(match,'Retained foreign country identity at '+p);return {...f,properties:{id:match.properties.ADM0_A3,name:match.properties.NAME}};});
const contexts=Object.fromEntries(countries.map(c=>[c,load(root+'europe/'+c+'/context.bin')])),detailed=fc(countries.flatMap(c=>load(root+'europe/'+c+'/first.bin').regions.features)),changed=new Set(),joins=[];
for(const country of countries)for(const f of load(root+'europe/'+country+'/international.bin').features){
 const other=f.properties.pair.split('-').find(c=>c!==isos[country]);if(codes.has(other))continue;
 const shapes=foreign.filter(f=>f.properties.id===other);if(!shapes.length)continue;
 changed.add(other);
 if(f.properties.boundaryType!=='land frontier')continue;
 for(const reference of linesOf(fc([f]))){
  console.log('Joining background',f.properties.pair);
  try{const result=await alignArc(fc(shapes),reference,{maxDistance:30000,maxSelectionMetres:30000,maxDeviationMetres:2500,coastalTrimMetres:20000});for(const old of shapes){const replacement=result.regions.features.find(f=>f.properties.id===old.properties.id);assert(replacement);old.geometry=replacement.geometry;}joins.push({pair:f.properties.pair,vertices:reference.length,maxEndpointDisplacementMetres:result.maxEndpointDisplacementMetres,method:'continuous outline alignment'});}
  catch(error){if(!/Reference endpoints|Selected outline arc|Replacement outline|Every canonical bend/.test(error.message))throw error;joins.push({pair:f.properties.pair,method:'direct polygon overlay at a lake-separated or differently defined source endpoint',sourceDifference:error.message});}
 }
}
let modified=fc(foreign.filter(f=>changed.has(f.properties.id)));if(modified.features.length)modified=await command({'neighbors.json':modified,'countries.json':detailed,'lakes.json':lakes},'-erase countries.json -erase lakes.json -clean gap-fill-area=0 -dissolve2 id,name');
const finalForeign=fc([...foreign.filter(f=>!codes.has(f.properties.id)&&!changed.has(f.properties.id)),...modified.features]),interactive=world.features.filter(f=>f.properties.country&&!countries.includes(f.properties.country));
const envelope=fc(ne.features.filter(f=>codes.has(f.properties.ADM0_A3))),landGuides=countries.flatMap(c=>load(root+'europe/'+c+'/international.bin').features.filter(f=>f.properties.boundaryType==='land frontier').flatMap(f=>linesOf(fc([f])))),nearFrontier=lineIndex(landGuides);
const candidates=await command({'old.json':envelope,'new.json':detailed,'foreign.json':finalForeign,'existing.json':fc(interactive),'lakes.json':lakes},'-erase new.json -erase foreign.json -erase existing.json -erase lakes.json -explode');
const gapPoints=candidates.features.length?(await command(candidates,'-points inner')).features:[],edges=finalForeign.features.filter(f=>changed.has(f.properties.id)).map(f=>({f,near:lineIndex(polygons(f.geometry).flat())}));let filledGaps=0;
for(let i=0;i<candidates.features.length;i++){const gap=candidates.features[i],point=gapPoints[i]?.geometry?.coordinates;if(!gap.geometry||!point||nearFrontier(point)>15000||geographicAreaKm2(gap.geometry)>1000)continue;const nearest=edges.map(e=>({...e,d:e.near(point)})).sort((a,b)=>a.d-b.d)[0];if(!nearest||nearest.d>15000)continue;gap.properties={...nearest.f.properties};finalForeign.features.push(gap);filledGaps++;}
if(filledGaps){const joined=await command(fc(finalForeign.features.filter(f=>changed.has(f.properties.id))),'-dissolve2 id,name -clean gap-fill-area=0');finalForeign.features=[...finalForeign.features.filter(f=>!changed.has(f.properties.id)),...joined.features];}console.log('Filled border slivers',filledGaps);
for(const code of codes)assert(foreign.some(f=>f.properties.id===code)||world.features.some(f=>f.properties.country===Object.keys(isos).find(c=>isos[c]===code)),'Previous silhouette for '+code);
const final=fc([...finalForeign.features.map(f=>({...f,properties:{country:''}})),...interactive,...countries.flatMap(country=>contexts[country].features.map(f=>({...f,properties:{country}})))]);
for(const [c,h]of Object.entries(preserved))assert.equal(hash(final.features.filter(f=>f.properties.country===c)),h,'Existing interactive fallback preserved: '+c);
const registry=globalThis.AtlasCountries,contextFiles={china:'china-context.bin',korea:'korea-context.bin',mongolia:'mongolia-context.bin',japan:'japan-context.bin',russia:'russia/context.bin',philippines:'archipelago/philippines-context.bin',indonesia:'archipelago/indonesia-context.bin',malaysia:'southeast-asia/malaysia-context.bin',singapore:'southeast-asia/singapore-context.bin',...Object.fromEntries(registry.byAdapter('southern-africa').map(c=>[c,'southern-africa/'+c+'/context.bin'])),...Object.fromEntries(registry.byAdapter('europe').map(c=>[c,'europe/'+c+'/context.bin']))},flight=load(root+'flight-context.bin');
const atlas=registry.ids.filter(c=>!registry.countries[c].snapshot&&!countries.includes(c)).flatMap(c=>(contextFiles[c]?load(root+contextFiles[c]).features:flight.features.filter(f=>f.properties.country===c)).filter(f=>f.geometry&&polygons(f.geometry).length&&!f.properties.claimedBy));
const mask=await command(fc([...atlas,...detailed.features]),'-dissolve2 -clean gap-fill-area=0'),outlines=worldOutlines(finalForeign,mask),delegated=new Set(Object.keys(meta.topology.delegatedOutlineCodes||{}));
outlines.features=outlines.features.filter(f=>!f.properties.countries.split(' ').every(code=>delegated.has(code)));
write('world-land.bin',final);write('world-country-outlines.bin',outlines);
meta.topology.atlasCodes=[...new Set([...meta.topology.atlasCodes,...codes])];meta.topology.backgroundCodes=meta.topology.backgroundCodes.filter(c=>!codes.has(c));meta.topology.backgroundCountries=meta.topology.backgroundCodes.length;meta.topology.outlineGroups=outlines.features.length;for(const c of countries)meta.sources.atlas[c]='data/europe/'+c+'/context.bin';meta.caucasusGulfIntegration={source:'scripts/boundary-sources/caucasus-gulf/manifest.json',countries:[...new Set([...(meta.caucasusGulfIntegration?.countries||[]),...countries])],updatedGrayNeighbours:[...changed],joins,preservedInteractiveHashes:preserved,method:'Replace the six former gray silhouettes; join adjacent foreign land to the new country frontiers, remove lake surfaces, and derive shared background strokes from the resulting geometry.'};meta.bytes=fs.statSync(root+'world-land.bin').size;meta.outlineBytes=fs.statSync(root+'world-country-outlines.bin').size;for(const key of ['moldovaCentralAsiaIntegration','centralAsianReconciliation'])for(const c of countries)if(meta[key]?.preservedInteractiveHashes[c])meta[key].preservedInteractiveHashes[c]=hash(final.features.filter(f=>f.properties.country===c));fs.writeFileSync(root+'world-land-sources.json',JSON.stringify(meta,null,2)+'\n');
for(const file of ['world-land.bin','world-country-outlines.bin',...countries.flatMap(c=>['europe/'+c+'/context.bin','europe/'+c+'/international.bin'])]){const text=gunzipSync(fs.readFileSync(root+file)).toString();fs.mkdirSync(root+'compact/'+file.slice(0,file.lastIndexOf('/')+1),{recursive:true});fs.writeFileSync(root+'compact/'+file,gzipSync(encodeGeo(JSON.parse(text),{source:createHash('sha256').update(text).digest('hex')}),{level:9}));}
const compact='dist/compact-files.mjs',text=fs.readFileSync(compact,'utf8');fs.writeFileSync(compact,text.replace(/export const compactFiles=\[[^\n]+\];/,'export const compactFiles='+JSON.stringify(compactSources.filter(f=>fs.existsSync(root+f)))+';'));
const retainedFrontiers=registry.byAdapter('europe').filter(c=>!countries.includes(c)).map(c=>{const file=root+'europe/'+c+'/international.bin';return[file,fs.readFileSync(file)];});
if(!process.argv.includes('--reuse-global'))await import('./build-atlas-frontiers.mjs');
for(const [file,bytes]of retainedFrontiers)if(!fs.readFileSync(file).equals(bytes))fs.writeFileSync(file,bytes);
{const file='atlas-frontiers.bin',text=gunzipSync(fs.readFileSync(root+file)).toString();fs.writeFileSync(root+'compact/'+file,gzipSync(encodeGeo(JSON.parse(text),{source:createHash('sha256').update(text).digest('hex')}),{level:9}));}
{const file='dist/compact-files.mjs',text=fs.readFileSync(file,'utf8'),empty=compactSources.filter(f=>fs.existsSync(root+f)).filter(f=>{const d=load(root+f);return d.type==='FeatureCollection'&&!d.features.length;});fs.writeFileSync(file,text.replace(/export const emptyGeometryFiles=\[[^\n]+\];/,'export const emptyGeometryFiles='+JSON.stringify(empty)+';'));}
await buildCoverage();await import('./build-globe-overview.mjs');await import('./build-border-previews.mjs');
console.log('Integrated six Caucasus and Gulf countries; preserved all '+Object.keys(preserved).length+' existing interactive silhouettes.');
