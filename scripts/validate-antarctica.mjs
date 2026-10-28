import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import '../dist/countries.js';
import {load,polygons} from './geo-index.mjs';
import {validate as validateView} from '../dist/view-state.mjs';
const registry=globalThis.AtlasCountries,definition=registry.countries.antarctica;
assert(definition.polar);assert.equal(definition.quiz,undefined,'A continent has no invented subdivision quiz');
const facilities=load('dist/data/antarctica/facilities.json');assert.equal(facilities.edition,'November 2024');assert.equal(facilities.records.length,112);
assert.equal(new Set(facilities.records.map(r=>r.id)).size,facilities.records.length);
for(const r of facilities.records){assert(r.en&&r.kind&&r.operators.length);assert(r.center.every(Number.isFinite));assert(r.center[0]>=-180&&r.center[0]<=180&&r.center[1]>=-90&&r.center[1]<=-60);assert(['Year-Round','Seasonal'].includes(r.season));assert(['Open','Temporarily Closed'].includes(r.status));assert(!r.en.includes('\ufffd')&&!r.local.includes('\ufffd'),'Names decoded using the source encoding');}
for(const name of ['McMurdo','Amundsen','Vostok','Concordia','Zhongshan','Kunlun','QinLing','Rothera'])assert(facilities.records.some(r=>r.en.includes(name)),name+' is searchable');
const source=load('scripts/boundary-sources/antarctica/manifest.json'),bytes=gunzipSync(fs.readFileSync('scripts/boundary-sources/antarctica/facilities-nov2024.csv.gz'));
assert.equal(createHash('sha256').update(bytes).digest('hex'),source.files['facilities-nov2024.csv'].sha256);
const south=part=>part.flat(Infinity).every((v,i)=>i%2===0||v<=-60);
const world=load('dist/data/world-land.bin');let polarParts=0;
for(const f of world.features)for(const p of polygons(f.geometry))if(south(p)){polarParts++;assert.equal(f.properties.country,'antarctica','Shared land routes every Antarctic sector to the continent');}
assert(polarParts>0);
const overview=load('dist/data/globe-overview-land.bin');let claims=0;
for(const f of overview.features)for(const p of polygons(f.geometry))if(south(p)&&f.properties.country!=='antarctica'){assert.equal(f.properties.claimants,f.properties.country,'Claim wedges are gated by their country in the globe');claims++;}
assert(claims>=4);
for(const country of ['norway','australia','new-zealand']){
 const context=load('dist/data/europe/'+country+'/context.bin');
 for(const f of context.features)if(polygons(f.geometry).some(south))assert.equal(f.properties.claimants,country,'Inactive claimant portals cannot intercept an Antarctica click');
}
assert(validateView({v:1,country:'antarctica',center:[0,-85],zoom:-1.5}),'A saved Antarctic view supports the polar overview scale');
assert.equal(validateView({v:1,country:'australia',center:[0,-85],zoom:-1.5}),null,'Other maps retain their normal view bounds');
console.log('Antarctica: 112 sourced facilities, major stations, source encoding/hash, coordinates, claimant-only contexts, unified continent routing and saved polar views passed.');


assert(definition.freeGlobePan&&!definition.localMap,'Antarctica stays on the shared geographic globe');
assert(validateView({v:1,country:'antarctica',center:[0,-85],zoom:-1,scope:'antarctic-globe-v2'}),'Geographic globe views retain their frame');
console.log('Geographic globe, free drag and framed saved views passed.');

assert.equal(validateView({v:1,country:'antarctica',center:[0,-85],zoom:-1,scope:'antarctic-globe-v2',bearing:35}).bearing,35,'Saved globe views retain free-drag orientation');

// Validate the actual spherical triangles south of the Mercator tile limit (85.051129°S).
const cap=load('dist/data/antarctica/pole-mesh.bin');
assert.equal(cap.southOf,-84);assert(fs.statSync('dist/data/antarctica/pole-mesh.bin').size<200_000);
assert.deepEqual(cap.claims.map(c=>c.country).sort(),['australia','new-zealand','norway']);
for(const mesh of [cap.neutral,...cap.claims]){
 assert(mesh.positions.length>0&&mesh.positions.length%9===0);
 for(let i=0;i<mesh.positions.length;i+=3){const v=mesh.positions.slice(i,i+3);assert(Math.abs(Math.hypot(...v)-1)<2e-9,'All mesh vertices lie on the geographic sphere');assert(v[1]<=Math.sin(-84*Math.PI/180)+1e-8);}
}
const vector=([lng,lat])=>{const a=lng*Math.PI/180,b=lat*Math.PI/180;return [Math.sin(a)*Math.cos(b),Math.sin(b),Math.cos(a)*Math.cos(b)];};
const side=(a,b,p)=>(a[1]*b[2]-a[2]*b[1])*p[0]+(a[2]*b[0]-a[0]*b[2])*p[1]+(a[0]*b[1]-a[1]*b[0])*p[2];
function covers(mesh,point){const p=vector(point),v=mesh.positions;for(let i=0;i<v.length;i+=9){const a=v.slice(i,i+3),b=v.slice(i+3,i+6),c=v.slice(i+6,i+9),s=[side(a,b,p),side(b,c,p),side(c,a,p)];if(s.every(n=>n>=-1e-12)||s.every(n=>n<=1e-12))return true;}return false;}
for(let lng=-180;lng<180;lng+=5)for(const lat of [-86,-87,-88,-89,-89.9])assert(covers(cap.neutral,[lng,lat]),'Continuous land across every polar longitude: '+lng+','+lat);
assert(covers(cap.neutral,[-160,-85]),'The Ross Ice Shelf belongs to the continent, as the ADD coastline and satellite imagery show it');
for(const [country,lng]of [['australia',80],['new-zealand',170],['norway',14]])assert(covers(cap.claims.find(c=>c.country===country),[lng,-88]),'The selected claimant keeps its polar sector');
console.log('Spherical cap: bounded size, true unit-sphere coordinates, complete polar coverage, the Ross Ice Shelf and claimant sectors passed.');

// SCAR ADD coastline (CC BY 4.0): ice shelves included; stations sit on it as on satellite imagery.
const coastManifest=load('scripts/boundary-sources/antarctica/coast-manifest.json');
assert.equal(coastManifest.version,'7.7');assert(coastManifest.license.startsWith('CC BY 4.0'));assert(fs.existsSync('scripts/boundary-sources/antarctica/'+coastManifest.retained.file));
assert(load('dist/data/antarctica/sources.json').coast.license.startsWith('CC BY 4.0'));
const outline=load('dist/data/antarctica/context.bin'),detail=load('dist/data/antarctica/coast.bin');
const vertices=data=>data.features.reduce((n,f)=>n+polygons(f.geometry).flat().reduce((m,r)=>m+r.length,0),0);
assert(vertices(outline)<24000,'The shared startup outline stays smaller than Natural Earth 1:10m');assert(vertices(detail)>vertices(outline)*4);
const onLand=(point,data)=>data.features.some(f=>polygons(f.geometry).some(poly=>poly.filter(ring=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>point[1])!==(yj>point[1])&&point[0]<(xj-xi)*(point[1]-yi)/(yj-yi)+xi)c=!c;}return c;}).length%2===1));
const offshore=facilities.records.filter(r=>!onLand(r.center,detail));
assert(offshore.length<=8,'Stations off the detailed coast: '+offshore.map(r=>r.en).join(', '));
for(const name of ['Davis','Law','Zhongshan','Progress','Mawson','Bharati','Casey','Neumayer III','Halley VI','Syowa','McMurdo'])assert(onLand(facilities.records.find(r=>r.en===name||r.en.startsWith(name+' ')).center,detail),name+' stands on the detailed coast');
for(const [country,region,lng]of [['australia','AU-AAT',100],['new-zealand','NZ-ROS',175],['norway','NO-QM',10]]){
 const sector=load('dist/data/europe/'+country+'/context.bin').features.find(f=>f.properties.region===region);
 assert(onLand([lng,-80],{features:[sector]})&&onLand([lng,-80],outline),region+' follows the shared coast');
 const own=load('dist/data/europe/'+country+'/first.bin'),unit=own.regions.features.find(f=>f.properties.id===region),line=own.selectionOutlineOverrides?.features.find(f=>f.properties.id===region);
 assert(onLand([lng,-80],{features:[unit]})&&onLand([lng+.1,-66.9],{features:[unit]})===onLand([lng+.1,-66.9],outline),region+' uses the shared coast in its own map');
 assert(line&&line.geometry.coordinates.every(l=>l.slice(1).every((p,i)=>!(p[1]<=-84.9999&&l[i][1]<=-84.9999))),region+' selected outline omits the 85°S map limit');
}
console.log('Coast: ADD 7.7 source, ice shelves, '+vertices(outline)+'-vertex shared outline, '+vertices(detail)+'-vertex detail, '+(facilities.records.length-offshore.length)+'/'+facilities.records.length+' stations on land and re-cut claim sectors passed.');

const navigation=await import('../dist/globe-navigation.mjs');
for(const lat of [-90,-89.9,-85.051129,0,85.051129,89.9,90]){
 assert.equal(navigation.latitudeScale(lat,false),Math.cos(lat*Math.PI/180),'Other country maps retain their native scale');
 assert(Number.isFinite(navigation.latitudeScale(lat,true))&&navigation.latitudeScale(lat,true)>.08,'Polar zoom scale remains finite');
}
assert.equal(navigation.constrainCamera({lng:0,lat:-89.4},2,{free:true}).center.lat,-89.4,'A globe camera can enter the polar cap');
assert.equal(navigation.constrainCamera({lng:0,lat:-89.4},2).center.lat,-85.051129,'Normal maps retain their latitude limit');
for(const lat of [-89.999999,-89.4,89.4,89.999999])assert(validateView({v:1,country:'antarctica',center:[0,lat],zoom:2,bearing:89}),'Saved views keep pole-crossing orientations');
assert.equal(validateView({v:1,country:'bahrain',center:[0,-89.4],zoom:2}),null);
console.log('Polar navigation: unrestricted orientation, bounded zoom scale, ordinary-map limits and saved pole-crossing views passed.');

const polarFloor=navigation.constrainCamera({lng:0,lat:-89.9},-20,{free:true}).zoom;
assert(validateView({v:1,country:'antarctica',center:[0,-89.9],zoom:+polarFloor.toFixed(4)}),'The fully zoomed-out polar camera remains shareable after rounding');

const flagData=load('dist/data/antarctica/flags.json'),flagSources=load('dist/data/antarctica/flag-sources.json'),flagImages=load('dist/data/flag-images.json');
const operators=new Set(facilities.records.flatMap(r=>r.operators));assert.equal(operators.size,31);
for(const r of facilities.records){assert.equal(new Set(r.operators).size,r.operators.length,'Duplicate country operators are collapsed');for(const operator of r.operators){const flag=flagData.national[operator];assert(flag?.name&&fs.existsSync('dist/'+flag.file),'A national flag exists for '+r.en+' / '+operator);assert(flagImages[flag.file],'National flag has enlargement metadata');}}
assert.equal(Object.keys(flagData.stations).length,5);
for(const [id,flag]of Object.entries(flagData.stations)){assert(facilities.records.some(r=>r.id===id));const source=flagSources.flags[id];assert.equal(createHash('sha256').update(fs.readFileSync('dist/'+flag.full)).digest('hex'),source.sha256);assert(fs.existsSync('dist/'+flag.file));assert(source.license&&source.credit&&source.evidence.length);assert.equal(flagImages[flag.file].full,flag.full,'The flag viewer uses a retained original');}
assert(flagSources.flags['AQ-COMNAP-1'].commonsFile.includes('Light blue'),'McMurdo uses the reviewed light-blue USAP flag');
assert.equal(flagData.stations['AQ-COMNAP-93'],undefined,'Do not mistake the historical Artigas flag for a station flag');
assert(flagSources.flags['AQ-COMNAP-82'].height>flagSources.flags['AQ-COMNAP-82'].width,'Preserve the sourced vertical Gabriel de Castilla flag');
console.log('Antarctic flags: all 112 facilities and 31 operators, joint-country coverage, five station flags, artwork hashes, local originals and attribution passed.');
