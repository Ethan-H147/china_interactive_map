import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {load,metres} from './geo-index.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {settlementDotZooms,visibleSettlements,settlementDotVisible} from '../dist/settlement-layer.mjs';
import {placeLabels} from '../dist/labels.mjs';

const directory='dist/data/europe/united-kingdom/',inputs='scripts/boundary-sources/uk-places/';
const data=load(directory+'settlements.bin'),catalogue=load(directory+'catalogue.bin'),mapping=load(inputs+'display-mapping.json'),review=load(inputs+'reviewed-matches.json');
const points=new Map(data.records.map(p=>[p.id,p])),pages=new Map(data.statisticalAreas.map(a=>[a.id,a]));
const index=new Map([...points,...pages,...catalogue.records.map(r=>[r.id,r])]);
const resolve=id=>index.get(data.selectionAliases[id]||id),audit=new Map(mapping.audit.map(row=>[row.id,row]));
const checksum=rows=>createHash('sha256').update(JSON.stringify(rows.sort((a,b)=>a[0].localeCompare(b[0])))).digest('hex');
assert.deepEqual(data,load(directory+'settlements.json'));assert.equal(points.size,data.records.length);assert.equal(index.size,points.size+pages.size+catalogue.records.length);
assert.equal(mapping.audit.length,33590);assert.equal(audit.size,33590);
// Release fingerprint covers each original ID and display name, independently of the new build.
assert.equal(checksum(mapping.audit.map(a=>[a.id,a.name])),'d25af6c3d7838405e5038bf9fd1d815e61c5d8482b98c69be5e966f09389ec14');
for(const row of audit.values()){
 if(row.status==='excluded'){assert.equal(row.id,'GB-OSNI-80');assert(row.reason.includes('Donegal'));continue;}
 assert(row.targets.length&&row.targets.every(id=>index.has(id)),row.id+' has a valid destination');
 assert(row.targets.includes(resolve(row.id)?.id),row.id+' old link is accounted for');
}
for(const [id,target] of Object.entries(data.selectionAliases))assert(index.has(target)&&!data.selectionAliases[target]&&target!==id,'Direct saved link '+id);
const manifest=load(inputs+'manifest.json');for(const [file,m] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(fs.readFileSync(inputs+file)).digest('hex'),m.sha256,file);
const os=load(inputs+'os-places.json.gz'),osni=load(inputs+'osni-places.geojson'),gn=load(inputs+'geonames-ni.json.gz');
const sourceIds=[...os.places.map(p=>'os:'+p.id),...osni.features.map(f=>'osni:'+f.properties.OBJECTID),...gn.places.map(p=>'geonames:'+p.id)];
const lookup=new Map(mapping.mapping.map(m=>[m.sourceId,m]));assert.equal(lookup.size,sourceIds.length);assert.deepEqual([...lookup.keys()].sort(),sourceIds.sort());
for(const m of lookup.values()){
 if(m.sourceId==='osni:80'){assert.equal(m.recordId,null);continue;}
 assert(index.has(m.recordId),'Source mapping '+m.sourceId);
}
const oldCounts=[],allCodes=new Set();
for(const r of [...points.values(),...pages.values()]){
 assert(r.en.trim()&&r.kind&&r.center?.length===2&&r.center.every(Number.isFinite),r.id);
 assert(index.has(r.parentId)&&index.get(r.provinceId)?.level===1,r.id+' geographical context');
 if(!r.population||r.id==='GB-S-LONDON')continue;
 const code=r.provenance.census?.code||r.provenance.code;
 assert(code&&!allCodes.has(code),'Census observation appears once '+code);allCodes.add(code);
 assert(r.population.label&&r.population.scope&&r.population.year&&r.population.source,r.id+' labeled and sourced observation');
 if(!r.population.scope.startsWith('Locality (NRS'))oldCounts.push([code,r.population.value,r.population.year,r.population.scope,r.population.source]);
}
assert.equal(oldCounts.length,10861);
assert.equal(checksum(oldCounts),'0d0ee2674d105b189aca3cc40898d47dd2408e56250fc807541dd081443fd129','All original counts, geographic scopes, years and sources survive');
for(const area of pages.values())for(const id of area.members)assert(points.get(id)?.statisticalAreaIds.includes(area.id),'Area links back '+id);
for(const p of points.values())for(const id of p.statisticalAreaIds||[])assert(pages.get(id)?.members.includes(p.id),'Point links back '+id);
const world={getWest:()=>-180,getEast:()=>180,getSouth:()=>-90,getNorth:()=>90},zooms=settlementDotZooms(data.records);
for(const point of points.values()){
 const dotzoom=data.dotzooms[point.id],r={...point,dotzoom},f={properties:{id:r.id,dotzoom}};
 assert.equal(dotzoom,zooms.get(r.id));for(const zoom of [dotzoom-.3,dotzoom-.25,dotzoom-.125,dotzoom])assert.equal(visibleSettlements([r],zoom,world,null,true).length>0,settlementDotVisible(f,zoom),r.id+' label admission');
 if(dotzoom>21)assert(r.coincidentPlaceIds?.some(id=>points.has(id)&&metres(points.get(id).center,r.center)<=3),'Co-located places are reachable '+r.id);
 for(const id of r.coincidentPlaceIds||[])assert(points.get(id)?.coincidentPlaceIds.includes(r.id));
}
const focused=(id,x,selected)=>({id,pointLabel:true,pointX:x,pointY:128,x,y:141,w:64,h:18,selected});
const positions=placeLabels([focused('a',155,true),focused('b',197,false)],480,300);assert.deepEqual(positions.map(r=>[r.id,r.x,r.y]),[['a',155,141]],'Keep the selected label centered below its dot when two labels overlap');
const byName=name=>data.records.filter(p=>p.en===name),byKind=(name,kind)=>byName(name).filter(p=>p.kind===kind);
for(const name of ['Moy','Dromara','Doagh','Moneymore','Muckamore','Charlemont'])assert.equal(byName(name).filter(p=>p.provinceId==='GB-R-TLN').length,1,name+' has one Northern Ireland dot');
assert.equal(byName('Purton').filter(p=>p.labelContext==='Forest of Dean'||p.labelContext==='Stroud').length,2,'Separate Purtons on the Severn');
const brighton=byKind('Brighton and Hove','City');assert.equal(brighton.length,1);assert.equal(resolve('GB-S-E63006520'),brighton[0]);assert.equal(brighton[0].population.value,277105);
assert(byName('Brighton').some(r=>r.parentId===brighton[0].parentId));assert(byName('Hove').some(r=>r.parentId===brighton[0].parentId));
assert.equal(byKind('Cambridge','City').length,1);assert.equal(resolve('GB-S-E63003443').population.value,152740);assert(byKind('Cambridge','Village').length);
assert.equal(byName('Oxford')[0].kind,'City');assert.equal(byName('St Illtyd')[0].kind,'Hamlet');
assert.equal(byName('Dunmurry').length,1);assert.equal(byName('Dunmurry')[0].population,undefined);assert(pages.get('GB-S-N11000447').members.includes(byName('Dunmurry')[0].id));
for(const [n,v] of [['Glasgow',617794],['Aberdeen',192956]]){const p=byKind(n,'City')[0];assert.equal(p.population.value,v);assert.equal(p.population.scope,'Locality (NRS Census 2022)');assert(p.statisticalAreaIds?.length);}
assert.equal(pages.get('GB-S-S53000230').population.value,1023873);assert(pages.get('GB-S-S53000230').members.includes(byName('Paisley')[0].id));
for(const name of ['Armagh','Bangor','Belfast','Derry','Lisburn','Newry'])assert.equal(byKind(name,'City').filter(r=>r.provinceId==='GB-R-TLN').length,1,name);
assert.equal(byName('Derry').length,1);assert(byName('Derry')[0].aliases.includes('Londonderry'));
assert.equal(byName('Oxford')[0].provenance.gazetteer[0].type,'City');assert(byName('Cloughey')[0].aliases.includes('Cloghy'));
assert(byName('Belfast')[0].regionalNames.some(n=>n.lang==='sco-x-ulster'));assert(byKind('Newport','City')[0].aliases.includes('Casnewydd'));
assert.equal(audit.get('GB-S-E63003443').boundaryCheck?.inside,true);assert(mapping.audit.filter(a=>a.flags.includes('label-before-dot')).length===1300);
for(const test of review.areaTests){
 const checked=audit.get('GB-S-'+test.code)?.boundaryCheck,point=resolve(test.id);
 assert(checked&&checked.point===point.id&&checked.inside===test.inside,'Reviewed census footprint '+test.code);
}
for(const [id,a] of Object.entries(review.placeNodes||{})){const p=points.get(id);assert(p.provenance.coordinates===a.source&&p.en===a.name&&metres(p.center,a.center)<1);}
for(const [id,a] of Object.entries(review.namedTypes)){const p=points.get(id);assert.equal(p.kind.toLowerCase(),a.place);assert.equal(p.provenance.placeType,a.source);if(a.resolvePosition)assert(metres(p.center,a.center)<1);}
const search=createPlaceSearch([...data.records,...pages.values()]);for(const name of ['Greater Glasgow','Metropolitan Lisburn','Castle Combe','Lacock','Hawkshead','Edale','Plockton','Drumbeg','Cloughey'])assert(search(name).some(r=>r.en===name),name);
assert(byName('Castle Combe').some(r=>r.population?.value<500));
console.log('Verified '+audit.size+' original places, '+sourceIds.length+' source identities, '+oldCounts.length+' original census observations and '+points.size+' dot thresholds.');
