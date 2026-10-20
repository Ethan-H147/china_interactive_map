import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {buildRegionalDataset,command,fc} from './build-regional-dataset.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {stitchSovietDateLine} from './soviet-date-line.mjs';

const country='soviet-union-1988',retrieved='2026-10-19',root='scripts/boundary-sources/soviet-union',out='dist/data/europe/'+country;
const read=file=>JSON.parse(fs.readFileSync(file)),write=(file,data)=>{fs.mkdirSync(file.slice(0,file.lastIndexOf('/')),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');};
const hash=b=>createHash('sha256').update(b).digest('hex');
const reference=read(root+'/republics.json'),require=createRequire(import.meta.url),mapshaper=require('mapshaper'),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate');
const archive=fs.readFileSync(root+'/USSR_1989_1.zip'),files=unzipSync(archive);
const input=Object.fromEntries(Object.entries(files).filter(([p])=>/\.(shp|shx|dbf|prj|cpg)$/i.test(p)).map(([p,b])=>[p,Buffer.from(b)]));
const converted=await mapshaper.applyCommands('-i USSR_1989_1.shp encoding=utf8 -proj wgs84 -o out.json format=geojson precision=.000001',input);
const source=JSON.parse(converted['out.json']);assert.equal(source.features.length,155);
const definitions=new Map(reference.records.map(r=>[r.ssr,r])),areas=new Map();
const unwrap=value=>{if(typeof value[0]==='number'){if(value[0]<0)value[0]+=360;return;}value.forEach(unwrap);};
for(const f of source.features){const p=f.properties;if(!p.SSR){assert.equal(p.ID,999,'Only unassigned source feature is Snake Island');p.SSR='УССР';}const r=definitions.get(p.SSR);assert(r,'Known republic '+p.SSR);areas.set(r.id,(areas.get(r.id)||0)+p.Square);f.properties={id:r.id};unwrap(f.geometry.coordinates);}
// Dissolve the common source topology together; republic borders retain shared arcs.
const dissolved=await command(source,'-dissolve id -clean gap-fill-area=0');
const regions=await command(stitchSovietDateLine(dissolved),'-dissolve id -clean gap-fill-area=0');assert.equal(regions.features.length,15);
const censusTitle='1989 All-Union census · republic population (Demoscope table reproduction)';
const msu='https://www.hist.msu.ru/departments/8616/projects/maps/eng/';
const credit='Valetov, T. Ya. "Digital Atlas of the Administrative Division of Russia / the USSR in the 20th Century". In: Digital Humanities Projects Parade, ed. A. Yu. Volodin. Siberian Federal University Press, 2025.';
const status={
 'SU-RU':'Russian Soviet Federative Socialist Republic. Crimea and Sevastopol belonged to the Ukrainian SSR in this snapshot.',
 'SU-UA':'Includes the Crimean oblast and the city of Sevastopol, within the Ukrainian SSR in 1988. This historical view does not depict present-day control.',
 'SU-GE':'Includes the Abkhaz ASSR and South Ossetian Autonomous Oblast within the Georgian SSR in this period.',
 'SU-AZ':'Includes the Nakhichevan ASSR and Nagorno-Karabakh Autonomous Oblast within the Azerbaijan SSR in this period.',
 'SU-KZ':'Baikonur lies inside the Kazakh SSR; the post-Soviet Russian lease arrangement is not a separate Soviet union republic.',
 'SU-LT':'The 1953–1988 Soviet republic flag is shown for 1 January 1988, before the Lithuanian tricolor was restored in November 1988. Soviet incorporation of the Baltic states was not recognized by many countries.',
 'SU-LV':'Shown as a Soviet union republic in the historical administrative system. Soviet incorporation of the Baltic states was not recognized by many countries.',
 'SU-EE':'Shown as a Soviet union republic in the historical administrative system. Soviet incorporation of the Baltic states was not recognized by many countries.'
};
const units=new Map(reference.records.map(r=>[r.id,{id:r.id,code:r.id,sourceCode:r.ssr,level:1,parent:null,en:r.en,local:r.ru,localLang:'ru',names:{ru:r.ru},kind:r.id==='SU-RU'?'Union republic · SFSR':'Union republic · SSR',kindLocal:'Союзная республика',aliases:[...r.aliases,r.capital,r.capitalRu],capital:r.capital,reportedArea:Math.round(areas.get(r.id)*1000),areaYear:1989,population:{value:r.population,year:1989,date:'1989-01-12',method:'census',periodLabel:'12 January 1989 census',source:'census1989',note:'All-Union census. Urban: '+r.urban.toLocaleString('en-US')+' ('+(100*r.urban/r.population).toFixed(1)+'%); rural: '+r.rural.toLocaleString('en-US')+'.'},note:'Historical republic area reported with the GIS (rounded); includes inland water. Density uses this total area, not modern land area.',...(status[r.id]?{statusNote:status[r.id],statusSource:r.id==='SU-LT'?'https://www.lrs.lt/sip/portal.show?p_r=38110&p_k=2':msu,statusSourceLabel:' Historical reference'}:{})}]));
assert.equal(reference.records.reduce((s,r)=>s+r.population,0),reference.totalPopulation);for(const r of reference.records)assert.equal(r.urban+r.rural,r.population);
const sources={boundaries:{title:'MSU Digital Atlas · USSR administrative divisions, 1 January 1989',url:'https://www.hist.msu.ru/departments/8616/projects/maps/files/USSR_1989_1.zip',page:msu,credit,license:'Free to use for research and other non-commercial purposes; attribution requested. Not CC0.',licenseUrl:msu,sha256:hash(archive),retained:root+'/USSR_1989_1.zip'},census:{title:censusTitle,urls:reference.censusSources,retained:root+'/republics.json',date:reference.censusDate},capitals:{title:'Library of Congress Russia Country Study · Table 4, former Soviet republics',url:reference.capitalSource,note:'Used for capital names, not the inconsistent population column.'}};
await buildRegionalDataset({country,units,byLevel:{1:regions},sources,year:1989,retrieved,levels:['Union republics'],areaLabel:'Historical total area',coverage:'15 union republics. Flag/reference date: 1 January 1988. Historical GIS: 1 January 1989, dissolved from 155 regional source features; Snake Island assigned to the Ukrainian SSR. Republic census population: 12 January 1989. Boundaries are a historical administrative reference, not current sovereignty or control. The Baltic incorporation was not internationally universally recognized.',statisticsSources:{boundaryArea:{title:'Historical republic total area, MSU GIS attributes (thousand km², rounded)',url:msu},census1989:{title:censusTitle,url:reference.censusSources[0]},census1989Russia:{title:censusTitle,url:reference.censusSources[1]}}});
const stats=read(out+'/statistics.json');stats.regions[country+':SU-RU'].population.source='census1989Russia';write(out+'/statistics.json',stats);
fs.writeFileSync(out+'/international.bin',gzipSync(JSON.stringify(lineData(await command(regions,'-dissolve -lines'))),{level:9}));
write(out+'/capitals.json',{version:1,retrieved,referenceDate:reference.referenceDate,sources:[sources.capitals],records:reference.records.map(r=>({id:r.id+'-CAPITAL',parent:r.id,en:r.capital,local:r.capitalRu,names:{ru:r.capitalRu},center:r.center,role:'Republic capital',aliases:r.aliases,source:reference.capitalSource}))});

const api=JSON.parse(gunzipSync(fs.readFileSync(root+'/flags-api.json.gz'))),pages=Object.values(api.query.pages),flags={},national=read('dist/data/europe/flag-sources.json');
const downloads=[{id:country,en:'Soviet Union',flagMatch:'the Soviet Union',file:'vendor/flag-su.svg'},...reference.records.map(r=>({...r,file:'vendor/soviet-flags/'+r.id+'.svg'}))];
for(const r of downloads){const p=pages.find(p=>p.title.startsWith('File:Flag of the '+r.flagMatch+' ' )||r.id===country&&p.title==='File:Flag of the Soviet Union.svg');assert(p?.imageinfo?.[0],r.id+' original flag');const image=p.imageinfo[0],meta=image.extmetadata;assert.equal(meta.LicenseShortName.value,'Public domain');const target='dist/'+r.file;fs.mkdirSync(target.slice(0,target.lastIndexOf('/')),{recursive:true});if(!fs.existsSync(target)){await new Promise(resolve=>setTimeout(resolve,2000));let response;for(let attempt=0;attempt<5;attempt++){response=await fetch(image.url);if(response.status!==429)break;await new Promise(resolve=>setTimeout(resolve,Math.min(20000,4000*(attempt+1))));}assert(response.ok,'Flag download '+r.id+' '+response.status);const b=Buffer.from(await response.arrayBuffer());assert(b.toString().includes('<svg'),'SVG flag '+r.id);fs.writeFileSync(target,b);}const bytes=fs.readFileSync(target);const flag={name:r.en,file:r.file,full:r.file,original:image.url,page:image.descriptionurl,credit:'Wikimedia Commons · official historical flag artwork',license:'Public domain',width:image.width,height:image.height,sha256:hash(bytes),scope:r.id===country?'National flag':'Union-republic flag',status:'Official flag',year:'1 January 1988'};if(r.id===country)national.flags[country]=flag;else flags[r.id]=flag;}
write('dist/data/europe/flag-sources.json',national);write('dist/data/soviet-flag-sources.json',{version:1,retrieved,referenceDate:reference.referenceDate,flags});
fs.writeFileSync('dist/soviet-flags.mjs','// Official SSR flags used on 1 January 1988; originals and licensing are retained.\nexport const sovietFlags='+JSON.stringify({[country]:{firstFlags:flags,detailFlags:{}}})+';\n');
write(root+'/manifest.json',{retrieved,referenceDate:reference.referenceDate,boundaryDate:reference.boundaryDate,censusDate:reference.censusDate,sources,processing:'UTF-8 shapefile projected from Web Mercator to WGS84; negative longitudes unwrapped east of 180 degrees; paired source cuts on Chukotka and Wrangel Island aligned at 180 degrees and dissolved; shared source topology dissolved into 15 republics. No modern-country boundary substitution. Regional GIS population aggregates are not used for republic totals.',files:Object.fromEntries(['USSR_1989_1.zip','flags-api.json.gz','republics.json'].map(f=>[f,{sha256:hash(fs.readFileSync(root+'/'+f)),bytes:fs.statSync(root+'/'+f).size}]))});
console.log('Soviet snapshot: 15 SSRs, 15 capitals, 16 official flags; 1989 census total',reference.totalPopulation);
