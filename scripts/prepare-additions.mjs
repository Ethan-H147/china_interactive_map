import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {gzipSync} from 'node:zlib';
const sourceDir=new URL('additional-sources/',import.meta.url);
const dataDir=new URL('../dist/data/',import.meta.url);
const allRecords=new URL('ok_geo.csv',sourceDir);
const raw=fs.readFileSync(fs.existsSync(allRecords)?allRecords:new URL('xinjiang-selected-records.csv',sourceDir),'utf8');
const lines=raw.split(/\r?\n/).filter(l=>/^(659011|659012),/.test(l));
assert.equal(lines.length,2);
const xinjiang={type:'FeatureCollection',features:lines.map(line=>{
  const cols=[...line.matchAll(/"([^"]*)"|([^,]+)/g)].map(m=>m[1]??m[2]);
  const [code,,,name,,center,polygon]=cols;
  assert(polygon&&polygon!=='EMPTY');
  const coordinates=polygon.split(';').map(part=>part.split('~').map(ring=>{
    const points=ring.split(',').map(p=>p.trim().split(/\s+/).map(Number));
    if(JSON.stringify(points[0])!==JSON.stringify(points.at(-1)))points.push([...points[0]]);
    return points;
  }));
  return {type:'Feature',properties:{adcode:Number(code),name,level:'city',provinceCode:650000,center:center.split(' ').map(Number),geometrySource:'AreaCity 2025.251231.260403'},geometry:{type:'MultiPolygon',coordinates}};
})};
const shapefile=await mapshaper.applyCommands('-i scripts/additional-sources/taiwan-counties/COUNTY_MOI_1090820.shp -proj wgs84 -o output.json format=geojson');
const tw=JSON.parse(shapefile['output.json']);
assert.equal(tw.features.length,22);
const labelled=await mapshaper.applyCommands('-i input.json -points inner -o output.json format=geojson',{'input.json':tw});
const centers=new Map(JSON.parse(labelled['output.json']).features.map(f=>[f.properties.COUNTYCODE,f.geometry.coordinates]));
const taiwan={type:'FeatureCollection',features:tw.features.map(f=>{
  const p=f.properties,officialCode=p.COUNTYCODE;
  return {...f,properties:{adcode:'TW-'+officialCode,officialCode,name:p.COUNTYNAME,englishName:p.COUNTYENG,level:'taiwan-region',provinceCode:710000,adminType:officialCode.endsWith('000')?'Special Municipality':p.COUNTYNAME.endsWith('縣')?'County':'City',center:centers.get(officialCode),geometrySource:'NLSC county and city boundaries'}};
})};
fs.writeFileSync(new URL('xinjiang-additions.json',dataDir),JSON.stringify(xinjiang));
fs.writeFileSync(new URL('taiwan-regions.json.gz',dataDir),gzipSync(JSON.stringify(taiwan),{level:9}));
fs.writeFileSync(new URL('xinjiang-selected-records.csv',sourceDir),raw.split(/\r?\n/)[0]+'\n'+lines.join('\n')+'\n');
fs.copyFileSync(new URL('areacity-LICENSE.txt',sourceDir),new URL('../dist/vendor/areacity-LICENSE.txt',import.meta.url));
const previous=JSON.parse(fs.readFileSync(new URL('additional-sources.json',dataDir)));
const hash=file=>fs.existsSync(new URL(file,sourceDir))?createHash('sha256').update(fs.readFileSync(new URL(file,sourceDir))).digest('hex'):previous.sources.find(s=>s.provider==='AreaCity / Amap').archiveSHA256;
const additions={retrieved:'2026-10-02',sources:[
  {provider:'AreaCity / Amap',url:'https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov/releases/tag/2025.251231.260403',version:'2025.251231.260403',released:'2026-04-03',coordinateSystem:'GCJ-02',license:'MIT',archiveSHA256:hash('ok_geo.csv.7z'),features:2,codes:[659011,659012]},
  {provider:'National Land Surveying and Mapping Center (NLSC), Ministry of the Interior',url:'https://data.gov.tw/dataset/7442',download:'https://maps.nlsc.gov.tw/download/縣市界線(TWD97經緯度).zip',sourceFile:'COUNTY_MOI_1090820.shp',coordinateSystem:'TWD97 geographic, converted to WGS84',license:'Taiwan Open Government Data License 1.0',licenseURL:'https://data.gov.tw/license',archiveSHA256:hash('taiwan-counties.zip'),features:22}
],missing:[{adcode:659013,name:'草湖市',english:'Caohu',reason:'Established after AreaCity release; no reusable polygon boundary found in checked sources.'}]};
fs.writeFileSync(new URL('additional-sources.json',dataDir),JSON.stringify(additions,null,2));
console.log(JSON.stringify({xinjiang:xinjiang.features.map(f=>({name:f.properties.name,parts:f.geometry.coordinates.length,vertices:f.geometry.coordinates.flat(2).length})),taiwan:taiwan.features.map(f=>({name:f.properties.name,type:f.properties.adminType,center:f.properties.center}))}));
