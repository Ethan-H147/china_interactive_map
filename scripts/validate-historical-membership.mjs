import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureFilter} from '@maplibre/maplibre-gl-style-spec';
import {membershipFilter} from '../dist/interaction-policy.mjs';
import {decodeData} from '../dist/geo-pack.mjs';
const compile=expression=>featureFilter(expression,'layers.history.filter').filter;
for(const ids of [[],[0,1,2,2,-1],['CA','GB','CA',''],[1,'1'],[true,false,null],['constructor','__proto__','toString'],[1.5,2.5]]){
 const old=compile(['in',['get','f'],['literal',ids]]),next=compile(membershipFilter('f',ids));
 for(const value of [...ids,undefined,null,false,true,0,-1,3,'1','CA','missing'])assert.equal(next({zoom:4},{type:3,properties:value===undefined?{}:{f:value}}),old({zoom:4},{type:3,properties:value===undefined?{}:{f:value}}),'Identical membership for '+JSON.stringify({ids,value}));
}
const data=await decodeData(fs.readFileSync(new URL('../dist/data/europe/united-kingdom/history/borders.bin',import.meta.url)),{select:d=>({config:d.configs[d.years['1889'].config],ids:d.faces.features.map(f=>f.properties.f)})});
const ids=data.ids.filter(f=>data.config.face[f]>=0),old=compile(['in',['get','f'],['literal',ids]]),next=compile(membershipFilter('f',ids));
for(const f of data.ids)assert.equal(next({zoom:4},{type:3,properties:{f}}),old({zoom:4},{type:3,properties:{f}}),'1889 ownership remains identical for face '+f);
const results=[];for(const [name,filter]of [['linear',old],['lookup',next]]){let hits=0;const start=performance.now();for(let repeat=0;repeat<3;repeat++)for(const f of data.ids)hits+=filter({zoom:4},{type:3,properties:{f}});results.push({name,ms:Math.round(performance.now()-start),hits});}
assert.equal(results[0].hits,results[1].hits);assert.equal(membershipFilter('f',ids)[0],'match');console.log('Historical filter equivalence passed for every 1889 face, empty/mixed IDs, missing values and reserved strings.');console.log('Actual MapLibre filter benchmark:',JSON.stringify(results));

const {historicalOverviewScope,historicalOverviewCovered,containsScope}=await import('../dist/context-visibility.mjs');
const canada=data.config.units.find(u=>u.id==='canada'),scope=historicalOverviewScope([-120,45,-80,70],data.config.units);
assert(containsScope(scope,canada.bounds.flat()),'Overview preparation includes all of the historical Canadian territory');
assert(historicalOverviewCovered([scope],[-135,50,-90,75],[canada]),'Panning across the same territory keeps its geometry ready');
assert(historicalOverviewCovered([scope],[-160,40,-150,70],[canada]),'Unclaimed ocean and foreign land do not force historical geometry rebuilds');
assert(!historicalOverviewCovered([scope],[-59,45,-50,60],data.config.units),'A newly visible neighboring colony still gets loaded');
console.log('Country-sized historical overview: whole-territory readiness, within-country panning, ocean skips and neighboring territory coverage passed.');
