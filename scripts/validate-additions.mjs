import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readData,readDataText} from './read-data.mjs';
import {transformGeometry} from './coordinates.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const display=readData('display-boundaries.json');
const additions=read('dist/data/xinjiang-additions.json');
const taiwan=readData('taiwan-regions.json');
const transport=read('dist/data/display-boundaries.parts.json');
assert.equal(createHash('sha256').update(readDataText('display-boundaries.json')).digest('hex'),transport.sha256,'Lossless transport checksum');
for(const part of transport.parts)assert(fs.statSync('dist/data/'+part).size<=4*1024*1024);
const app=fs.readFileSync('dist/app.js','utf8');
const names=read('dist/data/region-names.json').regions;
const original=spawnSync('git',['-c','safe.directory='+process.cwd().replaceAll('\\','/'),'show','b2b848d0180da101e0f2567c243c94ccea51707f:dist/data/display-boundaries.json'],{maxBuffer:40e6});
assert.equal(original.status,0,original.stderr.toString());
const previous=JSON.parse(original.stdout);
const polygons=g=>g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
function edges(g){const values=[];for(const poly of polygons(g))for(const ring of poly)for(let i=1;i<ring.length;i++){const a=JSON.stringify(ring[i-1]),b=JSON.stringify(ring[i]);if(a!==b)values.push(a<b?a+'|'+b:b+'|'+a);}return createHash('sha256').update(values.sort().join('\n')).digest('hex');}
let unchanged=0;
for(const old of previous.provinces.features.filter(f=>![650000,350000,710000,440000,810000,820000,310000,320000,210000,220000].includes(f.properties.adcode))){
  const current=display.provinces.features.find(f=>f.properties.adcode===old.properties.adcode);
  assert.equal(edges(current.geometry),edges(transformGeometry(old.geometry)),'Source border altered beyond coordinate conversion: '+old.properties.name);unchanged++;
}
assert.equal(additions.features.length,2);
for(const f of additions.features){assert(f.geometry.coordinates.length>1);assert(display.subdivisions.features.some(g=>g.properties.adcode===f.properties.adcode));assert(names[f.properties.adcode]?.en);}
assert.equal(taiwan.features.length,22);
const counts={};
for(const f of taiwan.features){const p=f.properties;counts[p.adminType]=(counts[p.adminType]||0)+1;assert(p.adcode==='TW-'+p.officialCode);assert(p.center?.length===2);assert(names[p.adcode].en===p.englishName);}
assert.deepEqual(counts,{'County':13,'City':3,'Special Municipality':6});
for(const code of ['TW-09007','TW-09020'])assert(display.subdivisions.features.some(f=>f.properties.adcode===code));
const flag={};const context=vm.createContext({$:()=>flag});
vm.runInContext(app.slice(app.indexOf('function renderRegionFlag('),app.indexOf('function renderRegionNames(')),context);
for(const p of [...display.provinces.features,...display.subdivisions.features].map(f=>f.properties)){
  context.renderRegionFlag(p);
  const code=p.provinceCode||p.adcode;
  const asset=code===710000?'roc':code===810000?'hk':code===820000?'mo':'prc';
  assert.equal(flag.src,'vendor/flag-'+asset+'.svg');
  assert(fs.existsSync('dist/'+flag.src));
  if(code===810000)assert.equal(flag.alt,'Flag of Hong Kong');
  if(code===820000)assert.equal(flag.alt,'Flag of Macau');
}
const administration=read('dist/data/xinjiang-administration.json');
assert.equal(administration.missingCities.length,1);assert.equal(administration.missingCities[0].adcode,659013);
assert(!display.subdivisions.features.some(f=>f.properties.adcode===659013),'Caohu must not receive an invented polygon');
assert.match(app,/if\(shouldFit&&layer.feature.geometry\)/);
console.log(JSON.stringify({provinceBordersRetainedAfterCoordinateConversion:unchanged,taiwanDivisions:counts,newXinjiangOutlines:2,unmappedCaohu:'explicit',flagsVerified:display.provinces.features.length+display.subdivisions.features.length}));
