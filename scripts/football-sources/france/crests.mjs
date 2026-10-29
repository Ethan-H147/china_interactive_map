import fs from 'node:fs';import {retain,root} from './fetch.mjs';
const rows=JSON.parse(fs.readFileSync(root+'preliminary.json'));const jobs=rows.filter(r=>r.en!=='Annecy');
await Promise.all(Array.from({length:3},async()=>{while(jobs.length){const r=jobs.shift();await retain('crests/'+r.id+'.png',r.crestUrl,{binary:true,credit:'Club emblem via Wikipedia',rights:'Club trademark; retain for identification, no free-license claim'});}}));
console.log('Downloaded or verified French club emblems.');