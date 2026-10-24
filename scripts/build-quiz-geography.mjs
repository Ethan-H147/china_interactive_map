import fs from 'node:fs';
import path from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import mapshaper from 'mapshaper';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import vm from 'node:vm';
import '../dist/countries.js';
const root=new URL('../dist/',import.meta.url),read=file=>JSON.parse(gunzipSync(fs.readFileSync(new URL(file,root)))),fc=features=>({type:'FeatureCollection',features});
fs.mkdirSync(new URL('data/quiz/',root),{recursive:true});const manifest=[];
for(const c of Object.values(AtlasCountries.countries).filter(c=>c.quiz?.overlay)){
 let features,records,files=[];const take=file=>{files.push(file);return read(file);},level=c.quiz.level;
 if(['korea','mongolia','japan'].includes(c.id)){const data=take('data/'+c.id+'-boundaries.bin');features=data.first.features;records=features.map(f=>({...f.properties,level:1,local:f.properties.ko||f.properties.mn||f.properties.ja||f.properties.local||'',localLang:c.lang}));}
 else if(c.adapter==='south-america'){const data=take('data/south-america/'+c.id+'-first.bin');features=data.regions.features;records=data.records;}
 else if(c.adapter==='archipelago'){const data=take('data/archipelago/'+c.id+'-overview.bin'),catalogue=take('data/archipelago/'+c.id+'-catalogue.bin');features=(level===1?data.first:data.second).features;records=catalogue.records;}
 else{const base='data/europe/'+c.id+'/',catalogue=take(base+'catalogue.bin');records=catalogue.records;
  if(['belgium','turkey'].includes(c.id))features=take(base+'all.bin').levels.find(p=>p.level===level).regions.features;
  else features=Object.values(catalogue.chunks).filter(p=>p.level===level).flatMap(p=>take(base+p.file).regions.features);
 }
 records=records.filter(r=>r.level===level&&r.bounds&&r.center&&!r.nonGeographic&&r.quizEligible!==false&&(!c.quiz.excludeSpecial||!r.special)&&!(c.quiz.exclude||[]).includes(r.id));
 const ids=new Set(records.map(r=>r.id));features=features.filter(f=>ids.has(f.properties.id)).map(f=>({...f,properties:{id:f.properties.id}}));
 const simplified=await mapshaper.applyCommands('-i input.json -dissolve id -simplify weighted 3% keep-shapes -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify(fc(features))});
 let regions=JSON.parse(simplified['output.json']);if(regions.type==='Feature')regions=fc([regions]);const actual=new Set(regions.features.map(f=>f.properties.id));for(const id of ids)if(!actual.has(id))throw Error(c.id+' lost '+id);
 const topo=topology({regions}),lines=mesh(topo,topo.objects.regions,(a,b)=>a!==b),payload={records,regions,boundaries:fc([{type:'Feature',properties:{},geometry:lines}])},json=JSON.stringify(payload),file='data/quiz/'+c.id+'.bin',bytes=gzipSync(json,{level:9});
 if(Buffer.byteLength(json)>5*1024*1024)throw Error(c.id+' exceeds the quiz geometry budget');fs.writeFileSync(new URL(file,root),bytes);manifest.push({country:c.id,level,places:records.length,file,bytes:bytes.length,decodedBytes:Buffer.byteLength(json),sources:files});console.log(c.id,records.length,'places;',bytes.length,'bytes;',Buffer.byteLength(json),'decoded');
}
fs.writeFileSync(new URL('data/quiz/manifest.json',root),JSON.stringify({simplification:'Shared topology, weighted 3%, preserving each subdivision; quiz-only rendering. Original detailed map data is retained.',countries:manifest},null,2)+'\n');
const china=JSON.parse(fs.readFileSync(new URL('data/china-regions.json',root))),english=vm.runInNewContext('('+fs.readFileSync(new URL('app.js',root),'utf8').match(/const english=(\{[^;]+\});/)[1]+')');
const prefectureScopes=china.provinces.map(f=>({id:String(f.properties.adcode),label:english[f.properties.adcode],local:f.properties.name,count:china.subdivisions.filter(r=>r.properties.provinceCode===f.properties.adcode&&(r.properties.level==='taiwan-region'||r.properties.level==='city'&&String(r.properties.adcode).slice(2,4)!=='90')).length})).filter(s=>s.count).sort((a,b)=>a.label.localeCompare(b.label));
fs.writeFileSync(new URL('data/quiz/library.json',root),JSON.stringify({prefectureScopes})+'\n');
