import fs from 'node:fs';import assert from 'node:assert/strict';import {gzipSync,gunzipSync} from 'node:zlib';
const root='scripts/boundary-sources/norway-places/';fs.mkdirSync(root,{recursive:true});
const catalogue=JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/norway/catalogue.bin'))),types=['by','tettsted','tettbebyggelse','grend','bygdelagBygd'],typeNames=['By','Tettsted','Tettbebyggelse','Grend','Bygdelag (bygd)'],places=new Map(),requests=[];
async function group(key,code,subset=types){
 const file=root+'complete-'+key+'-'+code+'-'+subset.join('_')+'.json.gz',params=new URLSearchParams({[key]:code,treffPerSide:500,utkoordsys:4326});for(const type of subset)params.append('navneobjekttype',type);
 const url='https://ws.geonorge.no/stedsnavn/v1/sted?'+params;let data;
 if(fs.existsSync(file))data=JSON.parse(gunzipSync(fs.readFileSync(file)));else{for(let attempt=0;attempt<3;attempt++){const response=await fetch(url);if(response.ok){data=await response.json();break;}assert(attempt<2,url+' '+response.status);}fs.writeFileSync(file,gzipSync(JSON.stringify(data)));}
 const total=data.metadata.totaltAntallTreff;requests.push({url,total,returned:data.navn.length,file:file.split('/').at(-1)});
 // Partition instead of paging: broad queries can return inconsistent estimated totals.
 if(total>500){if(key==='fnr'){const municipalities=catalogue.records.filter(r=>r.level===2&&r.parent==='NO-'+code);assert(municipalities.length);for(const r of municipalities)await group('knr',r.code);}else{assert(subset.length>1);for(const type of subset)await group(key,code,[type]);}return;}
 assert.equal(data.navn.length,total,'Complete partition '+url);for(const p of data.navn){assert(typeNames.includes(p.navneobjekttype));places.set(String(p.stedsnummer),{...p,type:types[typeNames.indexOf(p.navneobjekttype)]});}console.log(key,code,total);
}
const counties=[...catalogue.records.filter(r=>r.level===1&&/^NO-\d+$/.test(r.id)).map(r=>r.code),'21','22'];let cursor=0;
await Promise.all(Array.from({length:3},async()=>{while(cursor<counties.length)await group('fnr',counties[cursor++]);}));
const counts={};for(const p of places.values())counts[p.type]=(counts[p.type]||0)+1;
fs.writeFileSync(root+'places.json.gz',gzipSync(JSON.stringify({places:[...places.values()]}),{level:9}));fs.writeFileSync(root+'manifest.json',JSON.stringify({retrieved:new Date().toISOString(),source:'https://ws.geonorge.no/stedsnavn/v1/',product:'https://www.kartverket.no/api-og-data/stedsnavndata',license:'CC BY 4.0',credit:'Kartverket · Sentralt stedsnavnregister',types,counts,total:places.size,requests},null,2));console.log('Complete settlement register',places.size,counts);
