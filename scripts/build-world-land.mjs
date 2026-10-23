// One background topology for noninteractive countries; atlas countries keep their own maps.
import {repairPolandSliver} from './baltic-water.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import '../dist/countries.js';
import {load,polygons,lineIndex} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {worldOutlines} from './world-country-topology.mjs';
const exact=(data,cmd)=>command(data,cmd,{precision:null});
const root='scripts/boundary-sources/nordics/',manifest=load(root+'manifest.json'),input=fs.readFileSync(root+'ne-countries.json.gz');
const world=load(root+'ne-countries.json.gz'),{countries}=globalThis.AtlasCountries,ids=globalThis.AtlasCountries.ids.filter(id=>!countries[id].snapshot);
const {gunzipSync}=await import('node:zlib');assert.equal(createHash('sha256').update(gunzipSync(input)).digest('hex'),manifest.files['ne-countries.json'].sha256);
const sourceMetadata=name=>{const bytes=gunzipSync(fs.readFileSync(root+name+'.gz')),known=manifest.files[name];if(known)assert.equal(createHash('sha256').update(bytes).digest('hex'),known.sha256);return known||{url:'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_lakes.geojson',credit:'Natural Earth v5.1.2',license:'Public domain',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};};
const isoToCountry=Object.fromEntries(ids.flatMap(id=>[countries[id].naturalEarth||[]].flat().map(iso=>[iso,id])));
Object.assign(isoToCountry,{CHN:'china',TWN:'china',HKG:'china',MAC:'china',KOR:'korea',PRK:'korea',MNG:'mongolia',JPN:'japan',PHL:'philippines',IDN:'indonesia',RUS:'russia',MYS:'malaysia',SGP:'singapore',BRA:'brazil',ARG:'argentina',URY:'uruguay',FLK:'argentina',ZAF:'south-africa',BWA:'botswana',NAM:'namibia',SWZ:'eswatini',LSO:'lesotho',MCO:'monaco',SMR:'san-marino',VAT:'vatican-city',TLS:'timor-leste',BRN:'brunei',KAB:'kazakhstan',BRI:'brazil',SPI:'chile'});
// Overseas and associated territories already mapped inside these country pages use those same silhouettes.
for(const f of world.features){const country={France:'france','United Kingdom':'united-kingdom','New Zealand':'new-zealand'}[f.properties.SOVEREIGNT];if(country)isoToCountry[f.properties.ADM0_A3]=country;}
const contextFiles={china:'data/china-context.bin',korea:'data/korea-context.bin',mongolia:'data/mongolia-context.bin',japan:'data/japan-context.bin',philippines:'data/archipelago/philippines-context.bin',indonesia:'data/archipelago/indonesia-context.bin',malaysia:'data/southeast-asia/malaysia-context.bin',singapore:'data/southeast-asia/singapore-context.bin',russia:'data/russia/context.bin',...Object.fromEntries(['south-africa','botswana','namibia','eswatini','lesotho'].map(c=>[c,'data/southern-africa/'+c+'/context.bin'])),...Object.fromEntries(globalThis.AtlasCountries.byAdapter('europe').map(c=>[c,'data/europe/'+c+'/context.bin']))};
const atlas=[],fallback=[],flight=load('dist/data/flight-context.bin');
for(const country of ids){const file=contextFiles[country];const d=file?load('dist/'+file):fc(flight.features.filter(f=>f.properties.country===country));const features=d.features.filter(f=>f.geometry&&polygons(f.geometry).length&&!f.properties.claimedBy);assert(features.length,country+' outline');atlas.push(...features.map(f=>({...f,properties:{id:country}})));
 // Keep fallback land until the corresponding portal is ready, using that same portal geometry.
 if(countries[country].naturalEarth&&!['russia'].includes(country))fallback.push({type:'Feature',properties:{country},geometry:{type:'MultiPolygon',coordinates:features.flatMap(f=>polygons(f.geometry))}});
}
console.log('World topology: preparing atlas reference',atlas.length,'parts');
const mask=await exact(fc(atlas),'-dissolve2 -clean gap-fill-area=0');
const rawForeign=fc(world.features.filter(f=>!isoToCountry[f.properties.ADM0_A3]).map(f=>({...f,properties:{id:f.properties.ADM0_A3,name:f.properties.ADMIN}})));
// Shared arcs are simplified together before overlays; tiny countries and islands survive.
const foreign=await exact(rawForeign,'-simplify dp interval=100 keep-shapes');
let clipped=await exact({'world.json':foreign,'atlas.json':mask},'-erase atlas.json -clean gap-fill-area=0');
console.log('World topology: foreign land clipped to existing atlas',clipped.features.length);
// Reconcile source slivers along land frontiers only. Coast differences and lake water are excluded.
const borders=load(root+'ne-borders.json.gz'),relevant=fc(borders.features.filter(f=>{const p=f.properties;return !!isoToCountry[p.ADM0_A3_L]!==!!isoToCountry[p.ADM0_A3_R];}));
const corridor=await exact(relevant,'-buffer 8km -dissolve2');
const oldAtlas=fc(world.features.filter(f=>isoToCountry[f.properties.ADM0_A3]).map(f=>({...f,properties:{}})));
const candidates=await exact({'old.json':oldAtlas,'corridor.json':corridor,'atlas.json':mask,'foreign.json':clipped},'-clip corridor.json -erase atlas.json -erase foreign.json -explode');
const lakes=load(root+'ne-lakes.json.gz');
const gaps=await exact({'gaps.json':candidates,'lakes.json':lakes},'-erase lakes.json -explode');console.log('World topology: reconciling',gaps.features.length,'land slivers');
const edges=clipped.features.map(f=>({feature:f,distance:lineIndex(polygons(f.geometry).flat())}));
let gapArea=0;for(const gap of gaps.features){const point=(await exact(fc([gap]),'-points inner')).features[0]?.geometry.coordinates;if(!point)continue;let nearest,metres=Infinity;for(const edge of edges){const d=edge.distance(point);if(d<metres){metres=d;nearest=edge.feature;}}if(!nearest||metres>8000)continue;gap.properties={...nearest.properties};gapArea+=geographicAreaKm2(gap.geometry);clipped.features.push(gap);}
clipped=await exact(clipped,'-dissolve2 id,name -clean gap-fill-area=0');
fs.mkdirSync('artifacts/world-outline',{recursive:true});for(const [key,data]of Object.entries({foreign:clipped,mask,fallback:fc(fallback)}))fs.writeFileSync('artifacts/world-outline/'+key+'.json',JSON.stringify(data));
const outlines=worldOutlines(clipped,mask);
const write=(file,data)=>{const b=gzipSync(JSON.stringify(data),{level:9});fs.writeFileSync('dist/data/'+file,b);return b.length;};
write('world-country-outlines.bin',outlines);
// Simplified previews can bulge over a reconciled foreign edge. Exclude foreign land
// before later water overlays clean their shared topology, preserving that land's ownership.
const simplifiedPreview=await exact(fc(fallback),'-simplify dp interval=.018 planar keep-shapes');
const fallbackPreview=await exact({'preview.json':simplifiedPreview,'foreign.json':clipped},'-erase foreign.json -clean gap-fill-area=0');
write('world-land.bin',fc([...clipped.features.map(f=>({...f,properties:{country:'',id:f.properties.id,name:f.properties.name}})),...fallbackPreview.features]));
const meta={source:manifest.files['ne-countries.json'].url,description:'Natural Earth 1:10m world background and country outlines. Shared polygon arcs are stored once, including microstates and dependencies. Countries without an atlas page remain light gray and noninteractive. Atlas maps and their established frontier layers retain priority.',license:'Natural Earth public domain; atlas reference geometry retains its per-country source licenses.',retrieved:'2026-10-19',sources:{countries:sourceMetadata('ne-countries.json'),frontiers:sourceMetadata('ne-borders.json'),lakes:sourceMetadata('ne-lakes.json'),atlas:contextFiles},topology:{referenceCountries:world.features.length,backgroundCountries:clipped.features.length,atlasCodes:world.features.map(f=>f.properties.ADM0_A3).filter(iso=>isoToCountry[iso]),backgroundCodes:clipped.features.map(f=>f.properties.id),outlineGroups:outlines.features.length,simplificationMetres:100,frontierCorridorMetres:8000,reconciledSliverKm2:gapArea,policy:'Atlas display outlines are fixed references; foreign survey overlaps are clipped, and uncovered old-reference land within an 8 km land-frontier corridor is assigned to the nearest foreign edge. Source lake polygons are excluded. This reconciles display geometry and does not redefine sovereignty or claims.'},bytes:fs.statSync('dist/data/world-land.bin').size,fallbackSimplificationDegrees:.018,outlineBytes:fs.statSync('dist/data/world-country-outlines.bin').size};meta.topology.delegatedOutlineCodes={KAS:"Existing India/Pakistan/China atlas outlines cover this inland disputed source entity; its residual background fill is retained without false coastline strokes."};meta.topology.delegatedAreas={"KAB":"The Baykonur Cosmodrome source area is already inside the Kazakhstan atlas silhouette.","BRI":"The Brazilian Island source area is already covered by the Brazil/Uruguay display and its existing claim handling.","SPI":"The Southern Patagonian Ice Field source area is already covered by Chile/Argentina and their existing claim handling."};fs.writeFileSync('dist/data/world-land-sources.json',JSON.stringify(meta,null,2)+'\n');
// Existing local water and territory corrections remain part of every rebuild.
await (await import('./titicaca-water.mjs')).writeTiticacaWater();await (await import('./mask-titicaca.mjs')).maskTiticacaWorld();await (await import('./pakistan-water.mjs')).maskPakistanWorld();await (await import('./kyrgyzstan-water.mjs')).maskKyrgyzstanWorld();await (await import('./myanmar-laos-water.mjs')).maskMyanmarLaosWorld();await (await import('./nordic-world.mjs')).reconcileNordicWorld();await (await import('./himalaya-world.mjs')).reconcileHimalayaWorld();
await (await import('./baltic-water.mjs')).maskBalticWorld();
await (await import('./khanka-water.mjs')).maskKhankaWorld();
await (await import('./reconcile-poland.mjs')).maskPolandWorld();
await (await import('./poland-marine-water.mjs')).maskPolandMarineWorld();
// Vietnam's detailed portal supersedes the old geoBoundaries neighbour-band islands.
const band='dist/data/china-neighbours.bin',neighbours=load(band);write('china-neighbours.bin',fc(neighbours.features.filter(f=>f.properties.country!=='vietnam')));
// Water and regional reconciliation can trim foreign land after the first topology pass.
// Derive the final strokes from that finished land so a reservoir has no stale land outline.
// Carry foreign identities through the same water/territory overlays as their fills.
// Re-clipping the original countries can leave obsolete edges inside expanded land.
const finalLand=load('dist/data/world-land.bin');
const finalForeign=fc(finalLand.features.filter(f=>!f.properties.country).map(f=>({...f,properties:{id:f.properties.id,name:f.properties.name}})));
assert(finalForeign.features.every(f=>f.properties.id),'Foreign identities survive world overlays');
const finalOutlines=worldOutlines(repairPolandSliver(finalForeign),mask);write('world-country-outlines.bin',finalOutlines);
write('world-land.bin',fc(finalLand.features.map(f=>({...f,properties:{country:f.properties.country}}))));
const finalMetadata=load('dist/data/world-land-sources.json');if(isoToCountry.AUT&&isoToCountry.CHE)finalMetadata.topology.delegatedOutlineCodes.LIE='Landlocked Liechtenstein is fully surrounded by the Austrian and Swiss atlas frontiers. Its gray land remains; those shared atlas edges supply the complete outline.';finalMetadata.bytes=fs.statSync('dist/data/world-land.bin').size;finalMetadata.outlineBytes=fs.statSync('dist/data/world-country-outlines.bin').size;finalMetadata.topology.outlineGroups=finalOutlines.features.length;finalMetadata.topology.finalWaterAlignment=true;finalMetadata.license="Natural Earth: public domain. Atlas-aligned derivatives retain the licenses listed in sources.atlas, including OpenStreetMap ODbL 1.0 and national open-data terms.";fs.writeFileSync('dist/data/world-land-sources.json',JSON.stringify(finalMetadata,null,2)+'\n');
console.log('World outline topology built:',meta.topology.referenceCountries,'source countries/dependencies;',meta.topology.backgroundCountries,'background countries;',meta.topology.outlineGroups,'outline parts;',fs.statSync('dist/data/world-land.bin').size,'land bytes;',meta.outlineBytes,'outline bytes');
