import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {load} from './geo-index.mjs';
import {command,fc,sharedBorders,geographicBounds,buildContext} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {completeLithuanianCities,lithuanianCityAreas} from './lithuania-city-coverage.mjs';
import {balticLakeMask} from './baltic-water.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {geometryBoxes} from './build-context-coverage.mjs';
import {coverage as contextCoverage} from '../dist/context-coverage.mjs';

const dir='dist/data/europe/lithuania/',backup='artifacts/lithuania-city-coverage/before/';
function preserve(file){const target=backup+file;if(fs.existsSync(file)&&!fs.existsSync(target)){fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);}}
function save(file,value){preserve(file);fs.writeFileSync(file,file.endsWith('.bin')?gzipSync(JSON.stringify(value),{level:9}):JSON.stringify(value,null,2)+'\n');}
const cat=load(dir+'catalogue.bin'),units=new Map(cat.records.map(r=>[r.id,{...r}]));
const additions=await completeLithuanianCities(fc([]),units);
const cities=await command({'cities.json':additions,'water.json':balticLakeMask()},'-erase water.json -clean gap-fill-area=0');
const first=load(dir+'first.bin'),stats=load(dir+'statistics.json'),all=load(dir+'all.bin');
const countyAdditions=[];
for(const city of lithuanianCityAreas){
 const id='LT-CITY-'+city.code,parent='LT-M-'+city.code,p=units.get(parent),county=p.parent;
 const feature=cities.features.find(f=>f.properties.id===id);
 const thirdFile=dir+cat.chunks[parent].file,third=load(thirdFile);
 const regions=await command(fc([...third.regions.features.filter(f=>f.properties.id!==id),feature]),'-dissolve id -clean gap-fill-area=0');
 third.regions=regions;third.boundaries=sharedBorders(regions);save(thirdFile,third);
 const chunk=cat.chunks[parent];Object.assign(chunk,{count:regions.features.length,bytes:fs.statSync(thirdFile).size,decodedBytes:Buffer.byteLength(JSON.stringify(third))});
 const secondFile=dir+cat.chunks[county].file,second=load(secondFile);
 second.regions=await command(fc([...second.regions.features,{...feature,properties:{id:parent}}]),'-dissolve id -clean gap-fill-area=0');
 second.boundaries=sharedBorders(second.regions);save(secondFile,second);
 Object.assign(cat.chunks[county],{bytes:fs.statSync(secondFile).size,decodedBytes:Buffer.byteLength(JSON.stringify(second))});
 const full=second.regions.features.find(f=>f.properties.id===parent);
 const r=units.get(id),point=(await command(fc([feature]),'-points inner')).features[0].geometry.coordinates;
 Object.assign(r,{center:point,bounds:geographicBounds(feature.geometry),areaKm2:geographicAreaKm2(feature.geometry)});
 Object.assign(p,{center:(await command(fc([full]),'-points inner')).features[0].geometry.coordinates,bounds:geographicBounds(full.geometry)});
 stats.regions['lithuania:'+id]={name:r.en,level:3,parent,area:{value:r.areaKm2,unit:'km²',year:2026,source:'boundaryArea',method:'mapped',label:'Mapped city area'},...(r.population?{population:r.population}:{})};
 all.levels[1].regions.features=all.levels[1].regions.features.filter(f=>f.properties.id!==parent).concat(full);
 countyAdditions.push({...feature,properties:{id:county}});
}
first.regions=await command(fc([...first.regions.features,...countyAdditions]),'-dissolve id -clean gap-fill-area=0');
// Interior city gaps do not alter the existing country or county border mesh.
save(dir+'first.bin',first);all.levels[0]= {level:1,...first};all.levels[1].boundaries=sharedBorders(all.levels[1].regions);save(dir+'all.bin',all);
for(const county of new Set(countyAdditions.map(f=>f.properties.id))){const f=first.regions.features.find(f=>f.properties.id===county);Object.assign(units.get(county),{center:(await command(fc([f]),'-points inner')).features[0].geometry.coordinates,bounds:geographicBounds(f.geometry)});}
cat.records=[...units.values()].map(({population,...r})=>r);cat.counts[3]=cat.records.filter(r=>r.level===3).length;cat.levels[2]='Elderships & cities';save(dir+'catalogue.bin',cat);save(dir+'statistics.json',stats);
const context=await buildContext('lithuania',{1:first.regions},cat.records);save(dir+'context.bin',context);
for(const file of ['world-land.bin','globe-overview-land.bin']){
 const data=load('dist/data/'+file);
 const shape=file.startsWith('globe')?await command(context,'-simplify dp interval=.006 planar keep-shapes'):context;
 for(const f of data.features)if(f.properties.country==='lithuania')f.geometry=shape.features[0].geometry;
 save('dist/data/'+file,data);
}
const overview=load('dist/data/globe-overview.json');overview.landBytes=fs.statSync('dist/data/globe-overview-land.bin').size;save('dist/data/globe-overview.json',overview);
const worldMeta=load('dist/data/world-land-sources.json');worldMeta.bytes=fs.statSync('dist/data/world-land.bin').size;save('dist/data/world-land-sources.json',worldMeta);
const coverage='533 official elderships plus four cities administered outside elderships and the remaining Šiauliai city area. These five mapped areas belong to their existing municipalities; no new municipality or eldership is invented. City geometry is the official municipal polygon minus its official elderships. Existing lakes, international frontiers and official municipal population/area totals are retained.';
const sources=load(dir+'sources.json');sources.counts=cat.counts;sources.cityCoverage={coverage,areas:lithuanianCityAreas};save(dir+'sources.json',sources);
for(const file of ['europe/lithuania/context.bin','world-land.bin']){const text=JSON.stringify(load('dist/data/'+file)),target='dist/data/compact/'+file;preserve(target);fs.writeFileSync(target,gzipSync(encodeGeo(JSON.parse(text),{source:createHash('sha256').update(text).digest('hex')}),{level:9}));}
for(const file of ['europe/lithuania/context.bin','world-land.bin'])contextCoverage[file]={sha256:createHash('sha256').update(fs.readFileSync('dist/data/'+file)).digest('hex'),boxes:geometryBoxes(load('dist/data/'+file))};
preserve('dist/context-coverage.mjs');fs.writeFileSync('dist/context-coverage.mjs','// Generated by scripts/build-context-coverage.mjs from displayed context geometry.\nexport const coverage='+JSON.stringify(contextCoverage)+';\n');
console.log(coverage);console.log('Lithuania counts',cat.counts);

await (await import('./repair-lithuania-topology.mjs')).repairLithuanianTopology();
