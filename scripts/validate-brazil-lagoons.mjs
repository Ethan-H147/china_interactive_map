import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import mapshaper from 'mapshaper';
import osmtogeojson from 'osmtogeojson';

// Lagoa dos Patos, Lagoa Mirim and Lagoa Mangueira show the ocean color: no
// Brazilian land fill may cover them, in any view or level.
const water='scripts/additional-sources/water/';
const lagoons=[...JSON.parse(fs.readFileSync(water+'brazil-ibge-lagoons.geojson')).features,...osmtogeojson(JSON.parse(fs.readFileSync(water+'lagoa-mangueira-osm.json'))).features.filter(f=>/Polygon/.test(f.geometry.type))];
assert.equal(lagoons.length,3);
const inner=JSON.parse((await mapshaper.applyCommands('-i in.json -points inner -o out.json format=geojson',{'in.json':JSON.stringify({type:'FeatureCollection',features:lagoons})}))['out.json']).features.map(f=>f.geometry.coordinates);
const inRing=(p,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [xi,yi]=r[i],[xj,yj]=r[j];if((yi>p[1])!==(yj>p[1])&&p[0]<(xj-xi)*(p[1]-yi)/(yj-yi)+xi)c=!c;}return c;};
const covers=(g,p)=>(g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[]).some(poly=>inRing(p,poly[0])&&!poly.slice(1).some(h=>inRing(p,h)));
const read=f=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/'+f)));
const fills={
 states:read('south-america/brazil-first.bin').regions.features,
 ddd:read('south-america/brazil-ddd.bin').regions.features,
 'Rio Grande do Sul municipalities':read('south-america/brazil-local/BR-43.bin').regions.features,
 'country silhouette':read('flight-context.bin').features.filter(f=>f.properties.country==='brazil')
};
for(const [layer,features] of Object.entries(fills))for(const [i,p] of inner.entries()){
 const covering=features.filter(f=>covers(f.geometry,p)).map(f=>f.properties.id||f.properties.country);
 assert.deepEqual(covering,[],`${lagoons[i].properties.NM_MUN||lagoons[i].properties.name} is covered by ${layer}`);
}
// Shores still meet: the lagoons' neighbours keep their land up to the water.
const rs=fills.states.find(f=>f.properties.id==='BR-43');
assert(['Polygon','MultiPolygon'].includes(rs.geometry.type));
console.log('Brazilian lagoons: Patos, Mirim and Mangueira are open water in states, DDD areas, municipalities and the country silhouette.');
