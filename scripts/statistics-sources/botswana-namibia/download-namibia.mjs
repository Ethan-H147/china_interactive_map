import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const dir=import.meta.dirname;
const regions=['erongo','hardap','karas','kavango-east','kavango-west','khomas','kunene','ohangwena','omaheke','omusati','oshana','oshikoto','otjozondjupa','zambezi'];
const output={retrieved:'2026-10-13',year:2023,regions:{}};
const number=value=>Number(String(value).replace(/[ ,\u00a0]/g,''));
for(const region of regions){
 const url=`https://census.nsa.org.na/${region==='erongo'?'erongo':region==='karas'?'kharas-reggion':region+'-region'}/`;
 const response=await fetch(url);if(!response.ok)throw Error(`${url}: ${response.status}`);
 const html=await response.text();
 const tables=[...html.matchAll(/data-chart_data='([^']+)'/g)].map(m=>JSON.parse(m[1].replaceAll('&quot;','"').replaceAll('&#039;',"'").replaceAll('&amp;','&')));
 const population=tables.find(t=>t.columns?.length===4&&t.columns[0].title==='Constituency'&&t.columns[1].title==='Population');
 if(!population)throw Error(`${region} has no constituency table`);
 const rows=population.data.map(r=>({name:r[0].trim(),population:number(r[1]),area:number(r[2])}));
 // The interactive table drops a digit in Oniipa and contains malformed Onayena area.
 // Use the final regional report, Table 2.2, rather than propagating those portal typos.
 if(region==='oshikoto'){
  rows.find(r=>r.name==='Oniipa').population=33727;
  rows.find(r=>r.name==='Onayena').area=442.34;
 }
 output.regions[region]={url,...(region==='oshikoto'?{correctionSource:'https://nsa.org.na/wp-content/uploads/2025/09/Oshikoto-2023-Census-Regional-Profile.pdf'}:{}),population:rows.reduce((n,r)=>n+r.population,0),area:rows.reduce((n,r)=>n+r.area,0),constituencies:rows};
 console.log(region,rows.length,output.regions[region].population);
}
await mkdir(dir,{recursive:true});
await writeFile(resolve(dir,'namibia-census-2023.json'),JSON.stringify(output,null,2)+'\n');
