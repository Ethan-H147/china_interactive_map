import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../dist/countries.js';
import {countryLabelCandidates} from '../dist/labels.mjs';
import {load,polygons,landIndex} from './geo-index.mjs';
const registry=globalThis.AtlasCountries,flight=load('dist/data/flight-context.bin');
for(const c of Object.values(registry.countries)){
 const candidates=[c.base&&'dist/'+c.base+'context.bin',`dist/data/${c.id}/context.bin`,`dist/data/${c.id}-context.bin`,`dist/data/${c.adapter}/${c.id}-context.bin`].filter(Boolean),file=candidates.find(f=>fs.existsSync(f));
 const data=file?load(file):{features:flight.features.filter(f=>f.properties.country===c.id)};
 assert(data.features.length,'Country mask available for '+c.id);
 const inside=landIndex(data.features.flatMap(f=>polygons(f.geometry).flat()));
 assert(c.labelPoints.length,'Every country declares a label');
 for(const p of c.labelPoints){assert(p.en&&p.id&&p.center.length===2);assert(inside(p.center),p.en+' label anchor lies on its own country land');}
}
const chile=registry.countries.chile.labelPoints[0],argentina=landIndex(flight.features.filter(f=>f.properties.country==='argentina').flatMap(f=>polygons(f.geometry).flat()));
assert(!argentina(chile.center),'Chile label is outside Argentina');
const labels=countryLabelCandidates('south-africa',id=>id!=='brunei');assert(!labels.some(l=>l.country==='south-africa'||l.country==='brunei'),'Active and withheld countries do not get background labels');
assert.equal(new Set(labels.map(l=>l.id)).size,labels.length,'One label per named country');
const wrapped=countryLabelCandidates('south-africa',()=>true,460);assert(wrapped.every(l=>Math.abs(l.center[0]-460)<=180),'Labels follow the visible world copy');
console.log('All '+registry.ids.length+' countries have land-anchored labels; Chile is outside Argentina; active/withheld countries, unique names and world copies passed.');
