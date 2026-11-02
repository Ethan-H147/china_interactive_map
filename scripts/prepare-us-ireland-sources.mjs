import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import pc from 'polygon-clipping';
import {load,csv} from './us-geography.mjs';
import {readUSSource} from './fetch-us-details.mjs';
import {readSource as atlanticSource} from './atlantic-sources.mjs';
import {command,fc,geographicBounds} from './build-regional-dataset.mjs';
import {polygons} from './geo-index.mjs';

const root='scripts/statistics-sources/us-ireland/',retrieved='2026-11-02',sha=b=>createHash('sha256').update(b).digest('hex');
fs.mkdirSync(root,{recursive:true});
const manifest=fs.existsSync(root+'manifest.json')?load(root+'manifest.json'):{retrieved,sources:{}};
async function retain(name,url,{cache,bytes,provider,license='Public domain',...metadata}={}){
 const file=root+name+'.gz',pin=manifest.sources[name];
 let data=fs.existsSync(file)?gunzipSync(fs.readFileSync(file)):bytes||cache&&fs.existsSync(cache)&&fs.readFileSync(cache);
 if(!data){const r=await fetch(url,{signal:AbortSignal.timeout(180000)});assert(r.ok,'Download '+name+' '+r.status);data=Buffer.from(await r.arrayBuffer());}
 assert(!pin||pin.sha256===sha(data),'Source changed '+name);
 fs.writeFileSync(file,gzipSync(data,{level:9}));manifest.sources[name]={url,provider,license,retrieved,sha256:sha(data),bytes:data.length,retained:file,...metadata};
 fs.writeFileSync(root+'manifest.json',JSON.stringify(manifest,null,2)+'\n');return data;
}
const beaBytes=await retain('bea-county-gdp-2024.zip','https://apps.bea.gov/regional/zip/CAGDP1.zip',{cache:'artifacts/us-ie/bea.zip',provider:'US Bureau of Economic Analysis · CAGDP1, current-dollar county GDP, February 2026 release'});
const csoUrl='https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/FY108/JSON-stat/2.0/en';
const cso=JSON.parse(await retain('ireland-fy108.json',csoUrl,{cache:'artifacts/us-ie/cso.json',provider:'Central Statistics Office · Census 2022, population of statutory 2019 local electoral areas',license:'CC BY 4.0'}));
const leaDimension=cso.dimension.C03877V04628,geoUrl=leaDimension.link.enclosure[0].href;
const leaGeometry=JSON.parse(await retain('ireland-statutory-lea.geojson',geoUrl,{cache:'artifacts/us-ie/cso-lea.geojson',provider:'CSO · statutory 2019 LEA geometries linked by FY108',license:'CC BY 4.0'}));
const tigerBase='https://tigerweb.geo.census.gov/arcgis/rest/services/Census2020/tigerWMS_Census2020/MapServer';
const census=[];
for(const layer of [20,26,28]){
 const query=new URLSearchParams({f:'json',where:'1=1',outFields:'GEOID,NAME,POP100,AREALAND',returnGeometry:'false',orderByFields:'OBJECTID',resultRecordCount:'100000'}),url=tigerBase+'/'+layer+'/query?'+query;
 const data=JSON.parse(await retain('us-census2020-'+layer+'.json',url,{cache:'artifacts/us-ie/tiger-pop-'+layer+'.json',provider:'US Census Bureau · Census 2020 TIGERweb, POP100 whole-area census population',layer}));
 assert(!data.error&&!data.exceededTransferLimit&&data.features?.length>10000,'Complete Census 2020 layer '+layer);
 for(const f of data.features){const a=f.attributes;if(a.POP100===null)continue;assert(Number.isSafeInteger(a.POP100)&&a.POP100>=0,'Census population '+a.GEOID);census.push({id:(layer===20?'US-MCD-':'US-PLACE-')+a.GEOID,value:a.POP100,name:a.NAME,landArea:a.AREALAND/1e6,layer});}
}
const annualPin=load('scripts/us-municipal-fact-sources.json').population,annualBytes=gunzipSync(fs.readFileSync(annualPin.retained));assert.equal(sha(annualBytes),annualPin.sha256);
manifest.sources['us-municipal-population-2025']={...annualPin,provider:annualPin.provider,license:'Public domain'};
const countyPin=load('scripts/us-detail-sources.json').files['population.csv'];
const countyBytes=await retain('us-county-population.csv',countyPin.url,{bytes:readUSSource('population.csv'),provider:countyPin.provider});assert.equal(sha(countyBytes),countyPin.sha256);
const us=load('dist/data/europe/united-states/catalogue.bin'),usIndex=new Map(us.records.map(r=>[r.id,r])),population={},populationMatches=[];
for(const row of csv(annualBytes.toString('utf8'))){
 const id={'162':'US-PLACE-'+row.STATE+row.PLACE,'061':'US-MCD-'+row.STATE+row.COUNTY+row.COUSUB,'170':'US-CONCITY-'+row.STATE+row.CONCIT}[row.SUMLEV],r=usIndex.get(id);if(!r||r.level!==3)continue;
 assert(!population[id],'Unique whole-area estimate '+id);const value=Number(row.POPESTIMATE2025);assert(Number.isSafeInteger(value)&&value>=0);
 population[id]={value,year:2025};populationMatches.push({id,mapName:r.en,sourceName:row.NAME,summaryLevel:row.SUMLEV,year:2025,value});
}
for(const row of census){const r=usIndex.get(row.id);if(!r||r.level!==3||population[r.id])continue;population[r.id]={value:row.value,year:2020};populationMatches.push({id:r.id,mapName:r.en,sourceName:row.name,layer:row.layer,year:2020,value:row.value});}
const require=createRequire(import.meta.url),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate'),archive=unzipSync(beaBytes),member=Object.keys(archive).find(n=>/ALL_AREAS.*\.csv$/i.test(n));assert(member);
const beaRows=csv(Buffer.from(archive[member]).toString('utf8')).filter(r=>r.LineCode==='3'),countyPop=new Map(csv(countyBytes.toString('utf8')).filter(r=>r.SUMLEV==='050').map(r=>[r.STATE+r.COUNTY,r])),gdp={},combined=[];
for(const row of beaRows){const code=row.GeoFIPS.trim(),r=usIndex.get('US-COUNTY-'+code);assert.equal(row.Unit,'Thousands of dollars');if(!r){if(row.GeoName.includes('+'))combined.push({code,name:row.GeoName,value:Number(row['2024'])*1000,year:2024});continue;}
 const value=Number(row['2024'])*1000;assert(Number.isSafeInteger(value)&&value>0,'Current-dollar county GDP '+code);const pop=Number(countyPop.get(code)?.POPESTIMATE2024);assert(Number.isSafeInteger(pop)&&pop>0,'Matching-year county population '+code);
 gdp[r.id]={value,population:pop,year:2024,sourceName:row.GeoName};
}
assert.equal(combined.length,24);assert.equal(Object.keys(gdp).length,3091);
// Match full statutory electoral areas to the mapped municipal districts. No
// population is apportioned by land area. A small coastline mismatch is allowed;
// material overlap with a second municipal district rejects the join.
const ie=load('dist/data/europe/ireland/catalogue.bin'),ieIndex=new Map(ie.records.map(r=>[r.id,r])),raw=atlanticSource('ie-municipal-districts-2026');
const mds=await command(fc(raw.features.map(f=>({...f,properties:{id:'IE-MD-'+f.properties.BDY_ID}}))),'-dissolve2 id -simplify dp interval=.00005 planar keep-shapes');
const lattice=v=>typeof v==='number'?Math.round(v*1e6):v.map(lattice),area=parts=>{let sum=0;for(const p of parts)for(let j=0;j<p.length;j++){const ring=p[j],o=ring[0];let a=0;for(let i=1;i<ring.length;i++)a+=(ring[i-1][0]-o[0])*(ring[i][1]-o[1])-(ring[i][0]-o[0])*(ring[i-1][1]-o[1]);sum+=(j?-1:1)*Math.abs(a)/2;}return sum;};
const overlaps=(a,b)=>a[0][0]<=b[1][0]&&a[1][0]>=b[0][0]&&a[0][1]<=b[1][1]&&a[1][1]>=b[0][1];
const candidates=mds.features.map(f=>({id:f.properties.id,geometry:lattice(polygons(f.geometry)),bounds:geographicBounds(f.geometry)}));
const leaCodes=Array.isArray(leaDimension.category.index)?leaDimension.category.index:Object.keys(leaDimension.category.index).sort((a,b)=>leaDimension.category.index[a]-leaDimension.category.index[b]);
assert.deepEqual(cso.size,[1,1,166]);assert.equal(leaGeometry.features.length,166);
const reviewedJoins={
 'Athenry-Oranmore, Galway County':{id:'IE-MD-5015001',source:'ie-galway-md-order.html',url:'https://www.irishstatutebook.ie/eli/2018/si/618/made/en/print'},
 'Drogheda Urban, Louth':{id:'IE-MD-5815001',source:'ie-louth-md-order.html',url:'https://www.irishstatutebook.ie/eli/2018/si/626/made/en/print'},
 'Mullingar, Westmeath':{id:'IE-MD-6815002',source:'ie-westmeath-md-order.html',url:'https://www.irishstatutebook.ie/eli/2018/si/636/made/en/print'}
};
for(const review of Object.values(reviewedJoins))await retain(review.source,review.url,{provider:'Irish Statute Book · official municipal-district membership of electoral areas',license:'Irish public-sector information reuse'});
const boundaryDifferences=new Set();
const iePopulation={},ieCrosswalk=[],skipped=[];
for(const f of leaGeometry.features){const code=f.properties.code,index=leaCodes.indexOf(code);assert(index>=0,'Exact CSO geography code');const value=cso.value[index],name=leaDimension.category.label[code];assert(Number.isSafeInteger(value)&&value>=0);
 const shape=lattice(polygons(f.geometry)),bounds=geographicBounds(f.geometry),size=area(shape),ranked=candidates.filter(c=>overlaps(bounds,c.bounds)).map(c=>({id:c.id,share:area(pc.intersection(shape,c.geometry))/size})).filter(c=>c.share>0).sort((a,b)=>b.share-a.share),winner=ranked[0];
 if(!winner||winner.share<.98){skipped.push({code,name,value,reason:'Local authority without municipal districts',overlap:winner?.share||0});continue;}
 if(ranked[1]?.share>=.005){const review=reviewedJoins[name];assert(review&&review.id===winner.id&&ranked[1].share<.01,'Unreviewed LEA boundary difference '+name);boundaryDifferences.add(winner.id);boundaryDifferences.add(ranked[1].id);}
 const record=ieIndex.get(winner.id);assert(record?.level===3);const item=iePopulation[record.id]??={value:0,parent:record.parent,name:record.en,leaCodes:[]};item.value+=value;item.leaCodes.push(code);
 ieCrosswalk.push({code,name,value,id:record.id,municipalDistrict:record.en,parent:record.parent,share:winner.share,otherShare:ranked[1]?.share||0,...(reviewedJoins[name]?{membershipSource:reviewedJoins[name].url}:{})});
}
for(const id of boundaryDifferences)iePopulation[id].boundaryNote='The retained map outline differs slightly from the statutory census-area boundaries near an electoral-area edge. Population follows the whole statutory district; density is not calculated.';
const ieStats=load('dist/data/europe/ireland/statistics.json');
for(const r of ie.records.filter(r=>r.level===3))assert(iePopulation[r.id],'Every mapped municipal district '+r.id);
for(const r of ie.records.filter(r=>r.level===2)){const children=ie.records.filter(c=>c.parent===r.id);if(!children.length)continue;assert.equal(children.reduce((s,c)=>s+iePopulation[c.id].value,0),ieStats.regions['ireland:'+r.id].population.value,'Districts reconcile to county census total '+r.en);}
const districtParents=new Set(ie.records.filter(r=>r.level===3).map(r=>r.parent)),normalize=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const terminalCouncils=ie.records.filter(r=>r.level===2&&!districtParents.has(r.id));assert.equal(terminalCouncils.length,6);
for(const parent of terminalCouncils){const rows=skipped.filter(r=>normalize(r.name.slice(r.name.lastIndexOf(',')+1))===normalize(parent.en));assert.equal(rows.reduce((s,r)=>s+r.value,0),ieStats.regions['ireland:'+parent.id].population.value,'Excluded LEAs reconcile to their terminal council '+parent.en);}
assert(skipped.every(r=>terminalCouncils.some(parent=>normalize(r.name.slice(r.name.lastIndexOf(',')+1))===normalize(parent.en))),'Only the six terminal councils are excluded');
assert.equal(ieCrosswalk.length,127);assert.equal(skipped.length,39);assert.equal(cso.value.reduce((a,b)=>a+b,0),5149139);
const snapshot={version:1,retrieved,us:{population,gdp,combined,missingLocal:us.records.filter(r=>r.level===3&&!population[r.id]).map(r=>({id:r.id,name:r.en,kind:r.kind})),missingCountyGDP:us.records.filter(r=>r.level===2&&!gdp[r.id]).map(r=>({id:r.id,name:r.en,parent:r.parent})),counts:{annual:populationMatches.filter(r=>r.year===2025).length,census:populationMatches.filter(r=>r.year===2020).length}},ireland:{population:iePopulation,crosswalk:ieCrosswalk,excludedElectoralAreas:skipped}};
const normalized=Buffer.from(JSON.stringify(snapshot));fs.writeFileSync(root+'normalized.json.gz',gzipSync(normalized,{level:9}));fs.writeFileSync(root+'us-population-crosswalk.json.gz',gzipSync(JSON.stringify(populationMatches),{level:9}));
manifest.normalized={file:root+'normalized.json.gz',sha256:sha(normalized),bytes:normalized.length};fs.writeFileSync(root+'manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('US',snapshot.us.counts,'county GDP',Object.keys(gdp).length,'Irish municipal districts',Object.keys(iePopulation).length,'from',ieCrosswalk.length,'whole statutory LEAs.');
