import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='scripts/additional-sources/singapore';
await fs.mkdir(dir,{recursive:true});
const files=[];
async function save(name,url){
 const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error(name+': '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(dir+'/'+name,bytes);
 files.push({name,url,sha256:createHash('sha256').update(bytes).digest('hex')});return bytes;
}
for(const [name,id] of [['planning-areas-2025.geojson','d_2cc750190544007400b2cfd5d7f53209']]){
 const response=await fetch('https://api-open.data.gov.sg/v1/public/api/datasets/'+id+'/poll-download',{signal:AbortSignal.timeout(60000)});const result=await response.json();
 if(result.code!==0||!result.data?.url)throw Error(name+' download not ready');
 const bytes=await save(name,result.data.url);files.at(-1).url='https://data.gov.sg/datasets/'+id+'/view';
 console.log(name,JSON.parse(bytes).features.length,'planning areas');
}
await save('population-tables-2026.zip','https://www.singstat.gov.sg/files/1f0956c0-7c89-4684-bde3-b45b792636af.zip');
await save('population-regions-2026.json','https://tablebuilder.singstat.gov.sg/api/table/tabledata/M810771');
await fs.writeFile(dir+'/sources.json',JSON.stringify({retrieved:'2026-10-08',files},null,2));
const r=await fetch('https://storage.dosm.gov.my/population/population_state.csv',{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('DOSM population '+r.status);
const text=await r.text(),lines=text.trim().split(/\r?\n/),keys=lines.shift().split(',');
const selected=lines.filter(line=>{const row=Object.fromEntries(line.split(',').map((v,i)=>[keys[i],v]));return row.date==='2025-01-01'&&row.sex==='both'&&row.age==='overall'&&row.ethnicity==='overall';});
await fs.writeFile('scripts/statistics-sources/malaysia/population-state-2025.csv',keys.join(',')+'\n'+selected.join('\n')+'\n');console.log('DOSM 2025 state totals',selected.length);
