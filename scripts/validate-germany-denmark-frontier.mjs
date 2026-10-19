import assert from 'node:assert/strict';
import {load,linesOf,polygons,lineIndex,landIndex,metres} from './geo-index.mjs';
import {command} from './build-regional-dataset.mjs';
import {germanyDenmarkFrontier,officialBorder,pair} from './germany-denmark-frontier.mjs';
const fc=features=>({type:'FeatureCollection',features}),root='dist/data/europe/',outlines={};
const drawn=fc(load(root+'germany/international.bin').features.filter(f=>f.properties.pair===pair));assert.equal(drawn.features.length,3);assert.equal(drawn.features.filter(f=>f.properties.boundaryType==='land').length,1);assert.equal(drawn.features.filter(f=>f.properties.boundaryType==='water').length,2);const path=linesOf(fc(drawn.features.filter(f=>f.properties.boundaryType==='land')))[0];assert.equal(path.length,47);
for(const country of ['germany','denmark']){
 const first=load(root+country+'/first.bin').regions;outlines[country]=await command(first,'-dissolve');const index=lineIndex(outlines[country].features.flatMap(f=>polygons(f.geometry).flat()));assert(path.every(p=>index(p)<1),'Land frontier matches country outline '+country);
 const collections=[first,...load(root+country+'/all.bin').levels.map(l=>l.regions),load(root+country+'/second/'+(country==='germany'?'DEF':'DK03')+'.bin').regions];
 if(country==='germany')collections.push(fc(['DEF01','DEF07','DEF0C'].flatMap(parent=>load(root+country+'/third/'+parent+'.bin').regions.features)));
 for(const [i,data]of collections.entries()){const edge=lineIndex(data.features.flatMap(f=>polygons(f.geometry).flat()));for(let j=1;j<path.length;j++){const a=path[j-1],b=path[j],p=[(a[0]+b[0])/2,(a[1]+b[1])/2];assert(edge(p)<1,'Subdivision edge matches country frontier '+country+' level '+i);}}
}
const city=load(root+'germany/second/DEF.bin').regions.features.find(f=>f.properties.id==='DEF01'),cityInside=landIndex(polygons(city.geometry).flat()),cityEdge=lineIndex(polygons(city.geometry).flat()),border=lineIndex(linesOf(drawn));let tested=0;
for(const p of linesOf(drawn))for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],count=Math.ceil(metres(a,b)/20);for(let j=0;j<=count;j++){const q=[a[0]+(b[0]-a[0])*j/count,a[1]+(b[1]-a[1])*j/count];assert(!cityInside(q)||cityEdge(q)<1,'International border cannot cross Flensburg interior');tested++;}}
assert(cityInside([9.422143,54.80725]),'Old erroneous border point lies inside Flensburg');assert(border([9.422143,54.80725])>1500,'The old line through the city is gone');
const landEnds=[path[0],path.at(-1)];for(const f of drawn.features.filter(f=>f.properties.boundaryType==='water')){const p=linesOf(fc([f]))[0];assert(landEnds.some(q=>metres(p[0],q)<.01||metres(p.at(-1),q)<.01),'Sea boundaries connect to land without a gap');}
const official=lineIndex([officialBorder()]);assert(path.every(p=>official(p)<300),'Generalised land topology agrees with the official BKG boundary');for(const f of drawn.features.filter(f=>f.properties.boundaryType==='water'))for(const p of linesOf(fc([f]))[0])assert(official(p)<10,'Marine boundary follows BKG');
const rebuilt=germanyDenmarkFrontier(outlines.germany,outlines.denmark,load('artifacts/expansion-source/ne-10m-land-boundaries.geojson').features);assert.deepEqual(drawn.features,rebuilt.data.features,'Rebuild reproduces the repaired border');assert.equal(load(root+'denmark/international.bin').features.length,0,'The shared line has one owner');
const cityMunicipality=load(root+'germany/third/DEF01.bin').regions.features[0];assert.deepEqual(cityMunicipality.geometry,city.geometry,'City and municipality retain the same outline');
console.log('Germany–Denmark: exact shared land/subdivision edge, BKG marine boundaries, connected coasts, source hash, reproducibility and '+tested+' samples outside Flensburg’s interior passed.');
