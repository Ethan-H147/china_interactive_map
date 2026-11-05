import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {load,polygons,landIndex,linesOf,lineIndex,metres} from './geo-index.mjs';
const base='dist/data/europe/united-states/',cat=load(base+'catalogue.bin'),water=load('dist/data/us-canada-border-lakes.bin'),inside=landIndex(water.features.flatMap(f=>polygons(f.geometry).flat()));
const sites=[[-94.92,49.06],[-92.94,48.43]];for(const p of sites)assert(inside(p),'Retained lake probe '+p);
for(const file of ['first.bin','second/US-MN.bin',cat.thirdChunks['US-MN'].file,'context.bin']){const data=load(base+file),land=landIndex((data.regions||data).features.flatMap(f=>polygons(f.geometry).flat()));for(const p of sites)assert(!land(p),file+' excludes lake water');}
const us=load(base+'context.bin'),ca=load('dist/data/europe/canada/context.bin'),usNear=lineIndex(us.features.flatMap(f=>polygons(f.geometry).flat())),caNear=lineIndex(ca.features.flatMap(f=>polygons(f.geometry).flat())),land=[us,ca].map(data=>({inside:landIndex(data.features.flatMap(f=>polygons(f.geometry).flat())),near:lineIndex(data.features.flatMap(f=>polygons(f.geometry).flat()))}));
const lines=load(base+'international.bin');assert(lines.features.some(f=>f.properties.resolvedFrontier==='USA-CAN-ALASKA'));assert(lines.features.some(f=>f.properties.pair==='MEX-USA'));assert(!lines.features.some(f=>f.properties.resolvedFrontier==='USA-CAN-DETAILED'),'Old fragment stitching removed');
let segments=0;for(const f of lines.features.filter(f=>f.properties.resolvedFrontier?.startsWith('USA-CAN-SHARED-')))for(const path of linesOf({features:[f]}))for(let i=1;i<path.length;i++){
 const a=path[i-1],b=path[i];segments++;
 for(const t of [.1,.25,.5,.75,.9]){const p=a.map((v,j)=>v+(b[j]-v)*t);if(f.properties.resolvedFrontier.endsWith('-LAND'))assert(usNear(p)<.3,'No chord or triangle off the actual US exterior: '+p);for(const [j,c]of land.entries())assert(!c.inside(p)||c.near(p)<.3,'Border cuts through '+['US','Canada'][j]+' land: '+JSON.stringify({p,d:c.near(p)}));}
}
const strokeNear=lineIndex(linesOf(lines));for(const arc of load('scripts/boundary-sources/us-canada/land-arcs.json'))for(const p of arc.path){if(Math.min(metres(p,arc.path[0]),metres(p,arc.path.at(-1)))<500)continue;assert(strokeNear(p)<3,'Shared land arc has a visible border stroke');assert(usNear(p)<3&&caNear(p)<3,'Both countries share '+arc.name+' land arc: '+JSON.stringify({p,us:usNear(p),ca:caNear(p)}));}
for(const base of ['dist/data/europe/united-states/','dist/data/europe/canada/']){const cat=load(base+'catalogue.bin');for(const c of [...Object.values(cat.chunks),...Object.values(cat.thirdChunks||{})]){assert.equal(fs.statSync(base+c.file).size,c.bytes,base+c.file+' size');assert.equal(gunzipSync(fs.readFileSync(base+c.file)).length,c.decodedBytes,base+c.file+' decoded size');}}
console.log(segments,'border segments verified: no chords off the displayed outline, no US/Canadian land crossings; both land edges, lake cutouts and hierarchy payloads agree.');

import {createHash} from 'node:crypto';
const ibcRoot='scripts/boundary-sources/us-canada/',pin=load(ibcRoot+'ibc-source.json');
assert.equal(createHash('sha256').update(fs.readFileSync(ibcRoot+'ibc-v1.3.zip')).digest('hex'),pin.sha256,'Original IBC download pin');
assert.equal(createHash('sha256').update(fs.readFileSync(ibcRoot+'ibc-v1.3.geojson.gz')).digest('hex'),pin.geometrySha256,'Retained survey geometry pin');
const ibc=load(ibcRoot+'ibc-v1.3.geojson.gz'),surveyNear=lineIndex(linesOf(ibc)),west=lines.features.filter(f=>f.properties.resolvedFrontier==='USA-CAN-SURVEYED'),westNear=lineIndex(linesOf({features:west}));assert(west.length>0);
let surveySamples=0;
for(const path of linesOf({features:west}))for(let i=1;i<path.length;i++)for(const t of [.1,.5,.9]){const p=path[i-1].map((v,j)=>v+(path[i][j]-v)*t);assert(surveyNear(p)<.3,'Western line follows the independent IBC survey');for(const c of land)assert(!c.inside(p)||c.near(p)<.3,'Surveyed western line never crosses displayed land');surveySamples++;}
for(const f of ibc.features.filter(f=>f.properties.SectionNum>=19&&f.properties.SectionNum<=26))for(const p of linesOf({features:[f]}).flat())if(p[0]<=-95.2909317)assert(westNear(p)<.3,'Every western survey vertex is displayed');
assert(westNear([-122.756948,49.002086])<.3,'Blaine / Peace Arch physical crossing anchor');
assert(westNear([-122.9,48.992515])>900,'Displaced Natural Earth line through the bay is absent');
for(const file of ['first.bin','second/US-WA.bin','municipalities/US-WA.bin']){const d=load(base+file),inside=landIndex(d.regions.features.flatMap(f=>polygons(f.geometry).flat()));assert(inside([-122.756948,49.0018]),file+' keeps the US customs side in the US');assert(!inside([-122.756948,49.00235]),file+' excludes the Canadian side');}
const caInside=landIndex(ca.features.flatMap(f=>polygons(f.geometry).flat()));assert(caInside([-122.756948,49.00235]));assert(!caInside([-122.756948,49.0018]));
console.log(surveySamples,'independent survey samples and both sides of the Peace Arch customs crossing verified.');
assert(westNear([-122.7305,49.002094])<.3,'Pacific Highway crossing in the supplied close-up follows the IBC monument');
for(const file of ['first.bin','second/US-WA.bin','municipalities/US-WA.bin']){const d=load(base+file),inside=landIndex(d.regions.features.flatMap(f=>polygons(f.geometry).flat()));assert(inside([-122.7305,49.0018]),file+' keeps the Pacific Highway US customs side in Washington');assert(!inside([-122.7305,49.00235]),file+' keeps the northern customs side in Canada');}
assert(caInside([-122.7305,49.00235]));assert(!caInside([-122.7305,49.0018]));
console.log('Pacific Highway customs crossing in the supplied close-up independently verified.');
