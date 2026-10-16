// English names and Wikipedia links for developer mode's county-level divisions
// (china-counties.bin), from Wikidata's administrative division codes (P442), retained in
// scripts/additional-sources/china-counties/wikidata-names.json. A code's current entity (no end
// date) whose Chinese label is the division's name wins. The five refined cities keep their
// verified names (city-district-names.json). Pass --refresh to query Wikidata again.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';

const file='scripts/additional-sources/china-counties/wikidata-names.json';
if(process.argv.includes('--refresh')){
 const query='SELECT ?item ?code ?en ?zh ?enwiki ?zhwiki ?end WHERE { ?item p:P442 ?st . ?st ps:P442 ?code . FILTER(REGEX(?code,"^[0-9][0-9] [0-9][0-9] [0-9][0-9]$") && !STRENDS(?code," 00")) OPTIONAL{?st pq:P582 ?end} OPTIONAL{?item rdfs:label ?en FILTER(LANG(?en)="en")} OPTIONAL{?item rdfs:label ?zh FILTER(LANG(?zh)="zh-hans")} OPTIONAL{?enwiki schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>} OPTIONAL{?zhwiki schema:about ?item; schema:isPartOf <https://zh.wikipedia.org/>} }';
 const response=await fetch('https://query.wikidata.org/sparql',{method:'POST',body:new URLSearchParams({query}),headers:{Accept:'application/sparql-results+json','User-Agent':'boundary-atlas/1.0 (github.com/Ethan-H147/china_interactive_map)'}});
 assert(response.ok,'Wikidata '+response.status);fs.writeFileSync(file,await response.text());
}
// Da Qaidam's administrative committee has no code on Wikidata.
const manual={632825:{qid:'Q1156418',en:'Da Qaidam',zh:'大柴旦行政委员会'}};
const byCode=new Map();
for(const b of JSON.parse(fs.readFileSync(file)).results.bindings){
 const code=b.code.value.replaceAll(' ','');if(!byCode.has(code))byCode.set(code,[]);
 byCode.get(code).push({qid:b.item.value.split('/').at(-1),en:b.en?.value,zh:b.zh?.value,ended:!!b.end,enwiki:b.enwiki?.value,zhwiki:b.zhwiki?.value});
}
const counties=JSON.parse(gunzipSync(fs.readFileSync('dist/data/china-counties.bin'))).regions.features.map(f=>f.properties);
const verified=JSON.parse(fs.readFileSync('dist/data/city-district-names.json')).regions,publicArticles=JSON.parse(fs.readFileSync('dist/data/region-articles.json')).regions;
const regions={},articles={};
for(const p of counties){
 if(verified[p.adcode]){regions[p.adcode]=verified[p.adcode];continue;}
 const all=byCode.get(String(p.adcode))||[],current=all.filter(x=>!x.ended);
 const match=manual[p.adcode]||current.find(x=>x.zh===p.name)||(current.length===1?current[0]:null)||all.find(x=>x.zh===p.name);
 assert(match?.en,'English name for '+p.adcode+' '+p.name);
 regions[p.adcode]={en:match.en,zh:p.name,regional:[],source:'https://www.wikidata.org/wiki/'+match.qid};
 if(!publicArticles[p.adcode]){const record={wikidata:match.qid};for(const [lang,url] of [['en',match.enwiki],['zh',match.zhwiki]])if(url)record[lang]={title:decodeURIComponent(url.split('/wiki/')[1]).replaceAll('_',' '),url};if(record.en||record.zh)articles[p.adcode]=record;}
}
fs.writeFileSync('dist/data/china-county-names.json',JSON.stringify({regions,articles}));
console.log('County names:',Object.keys(regions).length,'; Wikipedia links:',Object.keys(articles).length);
