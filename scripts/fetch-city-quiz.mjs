// City quiz candidates from Wikidata: every item in the country whose English label or alias is a
// quiz city's name (or "<name> City"/"<name> District"), with its coordinate, population, types
// and local-language labels. build-city-quiz.mjs picks one per city inside its region.
// Usage: node scripts/fetch-city-quiz.mjs <country> (china, russia, spain, germany, united-kingdom, france, italy)
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {chinaCities,russiaCities,europeCities,searchNames} from './city-quiz-definitions.mjs';
const country=process.argv[2],countries={china:['Q148','Q865'],russia:['Q159'],spain:['Q29'],germany:['Q183'],'united-kingdom':['Q145'],france:['Q142'],italy:['Q38'],brazil:['Q155'],canada:['Q16'],argentina:['Q414']}[country];if(!countries)throw Error('Usage: fetch-city-quiz.mjs <country>');
const names=country==='china'?Object.values(chinaCities).flatMap(list=>list.split(',').map(e=>e.trim().replace(/ \w$/,''))):Object.values(country==='russia'?russiaCities:europeCities[country]).flatMap(list=>list.split(',').map(e=>e.trim()));
const variants=[...new Set(names.flatMap(n=>[...(searchNames[n]?[searchNames[n]]:[]),n,n+' City',n+' District',n.normalize('NFD').replace(/[̀-ͯ]/g,'')]))];
const languages={china:['zh-hans','zh-hant','zh'],russia:['ru'],spain:['es','ca','eu','gl'],germany:['de'],'united-kingdom':['cy','ga'],france:['fr'],italy:['it'],brazil:['pt'],canada:['fr'],argentina:['es']}[country];
async function sparql(query){
 for(let attempt=0;;attempt++){
  const response=await fetch('https://query.wikidata.org/sparql',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/sparql-results+json','User-Agent':'BoundaryAtlas/1.0 (+https://github.com/Ethan-H147/china_interactive_map)'},body:'query='+encodeURIComponent(query)});
  if(response.ok)return (await response.json()).results.bindings;
  if(attempt>=4)throw Error('Wikidata '+response.status);await new Promise(r=>setTimeout(r,15000*(attempt+1)));
 }
}
const items=new Map();
for(let i=0;i<variants.length;i+=60){
 const batch=variants.slice(i,i+60);
 const rows=await sparql(`SELECT ?item ?name ?label ?defaultLabel ?coord ?population ?typeLabel ${languages.map(l=>'?l_'+l.replace('-','_')).join(' ')} WHERE {
  VALUES ?name {${batch.flatMap(n=>[JSON.stringify(n)+'@en',JSON.stringify(n)+'@mul']).join(' ')}}
  {?item rdfs:label ?name} UNION {?item skos:altLabel ?name}
  VALUES ?country {${countries.map(c=>'wd:'+c).join(' ')}} ?item wdt:P17 ?country; wdt:P625 ?coord.
  OPTIONAL{?item rdfs:label ?label FILTER(lang(?label)="en")} OPTIONAL{?item rdfs:label ?defaultLabel FILTER(lang(?defaultLabel)="mul")} OPTIONAL{?item wdt:P1082 ?population} OPTIONAL{?item wdt:P31 ?type. ?type rdfs:label ?typeLabel FILTER(lang(?typeLabel)="en")}
  ${languages.map(l=>`OPTIONAL{?item rdfs:label ?l_${l.replace('-','_')} FILTER(lang(?l_${l.replace('-','_')})="${l}")}`).join(' ')}
 }`);
 for(const b of rows){
  // Coordinates on another globe (a Moon or Mars feature named after a city) carry a prefix.
  if(!b.coord.value.startsWith('Point('))continue;
  const id=b.item.value.split('/').pop(),[lon,lat]=b.coord.value.match(/Point\(([^)]+)\)/)[1].split(' ').map(Number);
  const item=items.get(id)||{id,label:b.label?.value||b.defaultLabel?.value||'',names:[],lon,lat,population:0,types:[],labels:{}};items.set(id,item);
  if(!item.names.includes(b.name.value))item.names.push(b.name.value);item.population=Math.max(item.population,Number(b.population?.value)||0);
  if(b.typeLabel&&!item.types.includes(b.typeLabel.value))item.types.push(b.typeLabel.value);
  for(const l of languages){const v=b['l_'+l.replace('-','_')]?.value;if(v)item.labels[l]=v;}
 }
 console.log(country,Math.min(i+60,variants.length),'/',variants.length,'names,',items.size,'items');
}
const out='scripts/boundary-sources/city-quiz/'+country+'-wikidata.json.gz';fs.mkdirSync('scripts/boundary-sources/city-quiz',{recursive:true});
fs.writeFileSync(out,gzipSync(JSON.stringify({retrieved:new Date().toISOString().slice(0,10),provider:'Wikidata: items in '+countries.join(', ')+' whose English or multilingual label or alias names a quiz city; coordinate (P625), population (P1082), type (P31)',license:'CC0 1.0',licenseURL:'https://creativecommons.org/publicdomain/zero/1.0/',items:[...items.values()]}),{level:9}));
console.log('Retained',items.size,'Wikidata candidates for',names.length,'cities in',out);
