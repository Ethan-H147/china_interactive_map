import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {addHanja} from './korea-hanja.mjs';
const source=new URL('./korea-sources/',import.meta.url),out=new URL('../dist/data/',import.meta.url);
const read=async n=>JSON.parse(await fs.readFile(new URL(n,source),'utf8'));
const fc=features=>({type:'FeatureCollection',features});
const process=async(command,files)=>JSON.parse((await mapshaper.applyCommands(command+' -o out.json format=geojson geojson-type=FeatureCollection',files))['out.json']);
const south=await read('south.geojson'),north=await read('north-detailed.geojson');
const oldNames=new Map((await read('south-names.geojson')).features.map(f=>[f.properties.name,f.properties.name_eng]));
const additionalNames={'제물포구':'Jemulpo-gu','영종구':'Yeongjong-gu','미추홀구':'Michuhol-gu','서해구':'Seohae-gu','검단구':'Geomdan-gu','수원시':'Suwon-si','성남시':'Seongnam-si','안양시':'Anyang-si','안산시':'Ansan-si','고양시':'Goyang-si','용인시':'Yongin-si','청주시':'Cheongju-si','천안시':'Cheonan-si','포항시':'Pohang-si','창원시':'Changwon-si','부천시':'Bucheon-si','전주시':'Jeonju-si'};
for(const [ko,en] of Object.entries(additionalNames))oldNames.set(ko,en);
const provinceNames={'11':'Seoul','26':'Busan','27':'Daegu','28':'Incheon','12':'Jeonnam–Gwangju','30':'Daejeon','31':'Ulsan','36':'Sejong','41':'Gyeonggi','51':'Gangwon','43':'North Chungcheong','44':'South Chungcheong','47':'North Gyeongsang','48':'South Gyeongsang','50':'Jeju','52':'Jeonbuk'};
const types=n=>n.endsWith('군')?'County':n.endsWith('구')||n.endsWith('구역')?'District':'City';
const primaryType=n=>n.includes('통합특별시')?'Integrated Special City':n.includes('특별자치시')?'Special Self-governing City':n.includes('특별자치도')?'Special Self-governing Province':n.includes('광역시')?'Metropolitan City':n.includes('특별시')?'Special City':n.endsWith('도')?'Province':'Special City';
const first=[],second=[];
for(const f of south.features){
 const p=f.properties;const city=p.sggnm.match(/^(.+?시).+구$/)?.[1];
 // Ordinary city districts sit below the city: dissolve them into their city.
 f.properties={id:'KR-'+(city?p.sgg.slice(0,4)+'0':p.sgg),parent:'KR-'+p.sido,country:'KR',ko:city||p.sggnm,provinceKo:p.sidonm};
}
const sk2=await process('-i south.json -dissolve id copy-fields=parent,country,ko,provinceKo',{'south.json':south});
for(const f of sk2.features){const p=f.properties;p.level=2;p.type=types(p.ko);p.en=oldNames.get(p.ko);if(!p.en){const base=(await read('south-names.geojson')).features.find(f=>f.properties.name.startsWith(p.ko+' '));p.en=base?.properties.name_eng.split(' ')[0];}if(!p.en)p.en={'군위군':'Gunwi-gun','세종특별자치시':'Sejong','여주시':'Yeoju-si'}[p.ko];assert(p.en,'Missing English name: '+p.ko);if(p.parent!=='KR-36')second.push(f);}
const sk1=await process('-i south.json -dissolve parent copy-fields=country,provinceKo',{'south.json':sk2});
for(const f of sk1.features){const p=f.properties;f.properties={id:p.parent,level:1,country:'KR',ko:p.provinceKo,en:provinceNames[p.parent.slice(3)],type:primaryType(p.provinceKo)};first.push(f);}
let nk=north;
const land=await read('north-land.geojson');
nk=await process('-i north.json -clip land.json',{'north.json':north,'land.json':land});
for(const f of nk.features){const p=f.properties,isFirst=!p.parent;
 f.properties={id:'KP-'+p.id.split('/')[1],parent:p.parent?'KP-'+p.parent:undefined,country:'KP',level:isFirst?1:2,ko:p['name:ko']||p.name,en:p['name:en']||'Kaesong urban area',type:isFirst?primaryType(p.name):types(p.name),sourceRelation:p.id,sourceVersion:p.version};
 if(p.id==='relation/356443')f.properties.en='Pyongyang';
 if(p.parent&&!p.admin_level)f.properties.type='Directly administered urban area';
 (isFirst?first:second).push(f);
}
// Derive visible province outlines from the same polygons as the subdivisions.
// Retain only genuinely uncovered pieces from the mapped first-level geometry.
for(let i=0;i<first.length;i++)if(first[i].properties.country==='KP'){
 const f=first[i],children=second.filter(c=>c.properties.parent===f.properties.id);
 const uncovered=await process('-i parent.json -erase children.json',{'parent.json':fc([f]),'children.json':fc(children)});
 const merged=await process('-i regions.json -dissolve',{'regions.json':fc([...children,...uncovered.features])});
 assert.equal(merged.features.length,1);first[i]={...f,geometry:merged.features[0].geometry};
}
const countries=await process('-i first.json -dissolve country',{'first.json':fc(first)});
const all=fc([...first,...second]);
// Interior label points stay on land even in coastal and island divisions.
const points=await process('-i all.json -points inner',{'all.json':all});
for(let i=0;i<all.features.length;i++)all.features[i].properties.center=points.features[i].geometry.coordinates;
for(const f of all.features){const b=[Infinity,Infinity,-Infinity,-Infinity];function walk(c){if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);}walk(f.geometry.coordinates);f.properties.bounds=[[b[0],b[1]],[b[2],b[3]]];}
const top=topology({first:fc(first),second:fc(second),countries});
const boundaries={first:mesh(top,top.objects.first),second:mesh(top,top.objects.second,(a,b)=>a!==b&&a.properties.parent===b.properties.parent),countries:mesh(top,top.objects.countries)};
const data={first:fc(first),second:fc(second),countries,boundaries};
const hanja=await addHanja(data);
await fs.writeFile(new URL('korea-hanja.json',out),JSON.stringify(hanja,null,2)+'\n');
await fs.writeFile(new URL('korea-boundaries.bin',out),gzipSync(JSON.stringify(data)));
await fs.writeFile(new URL('korea-outline.bin',out),gzipSync(JSON.stringify(countries)));
const sources={retrieved:new Date().toISOString(),south:{url:'https://github.com/vuski/admdongkor/tree/master/ver20260701',date:'2026-07-01',license:'CC BY 4.0; upstream SGIS KOGL Type 1',attribution:'This data is derived from administrative-dong boundaries released by Statistics Korea SGIS (https://sgis.kostat.go.kr) under KOGL Type 1, modified by vuski/admdongkor (https://github.com/vuski/admdongkor), distributed under CC BY 4.0.',processing:'Dissolved administrative-dong geometry into first- and second-level areas without simplification. Ordinary city districts are merged into their parent city; Sejong has no second-level area.',names:'https://github.com/southkorea/southkorea-maps'},north:{url:'https://www.openstreetmap.org/relation/192734',license:'ODbL 1.0',attribution:'© OpenStreetMap contributors',processing:'Administrative relations clipped to detailed OpenStreetMap coastline. First-level outlines derived from their subdivisions; uncovered portions retain the source first-level geometry.'},counts:{first:first.length,second:second.length,northFirst:first.filter(f=>f.properties.country==='KP').length,southFirst:first.filter(f=>f.properties.country==='KR').length,northSecond:second.filter(f=>f.properties.country==='KP').length,southSecond:second.filter(f=>f.properties.country==='KR').length},sha256:{}};
for(const file of ['south.geojson','north-detailed.geojson','north-coast.json'])sources.sha256[file]=createHash('sha256').update(await fs.readFile(new URL(file,source))).digest('hex');
sources.hanja={manifest:'korea-hanja.json',retrieved:hanja.retrieved,count:Object.keys(hanja.names).length,method:hanja.method};
await fs.writeFile(new URL('korea-sources.json',out),JSON.stringify(sources,null,2));
console.log(sources.counts);
