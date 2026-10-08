import fs from 'node:fs/promises';
const url='https://en.wikipedia.org/w/api.php?'+new URLSearchParams({action:'parse',format:'json',page:'Planning areas of Singapore',prop:'text'});
const response=await fetch(url,{signal:AbortSignal.timeout(60000),headers:{'User-Agent':'BoundaryAtlas/1.0 educational geographic names'}});
if(!response.ok)throw Error('Names source '+response.status);
const data=await response.json(),html=data.parse.text['*'];
const text=s=>s.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/g,'').replace(/<[^>]*>/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const names={};
for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)){
 const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m=>text(m[1]));
 if(cells.length<7||!/[\u4e00-\u9fff]/.test(cells[1])||!/[\u0b80-\u0bff]/.test(cells[2]))continue;
 const [en,ms]=cells[0].split(' • ').map(s=>s.trim());names[en.toUpperCase()]={en,ms:ms||en,zh:cells[1],ta:cells[2]};
}
if(Object.keys(names).length!==55)throw Error('Expected 55 multilingual planning-area names, found '+Object.keys(names).length);
await fs.writeFile('scripts/additional-sources/singapore/names.json',JSON.stringify({source:'https://en.wikipedia.org/wiki/Planning_areas_of_Singapore',revision:data.parse.revid,retrieved:'2026-10-08',license:'CC BY-SA 4.0',names},null,2));
console.log('Recorded all 55 planning-area names in four languages.');
