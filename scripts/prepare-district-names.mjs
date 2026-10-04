import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const base='scripts/additional-sources/city-districts/';
const bindings=JSON.parse(fs.readFileSync(base+'wikidata-names.json')).results.bindings;
const candidates={};
for(const b of bindings){
 const code=b.code.value.replaceAll(' ',''),qid=b.item.value.split('/').at(-1);
 const n=(candidates[code]??={})[qid]??=((candidates[code])[qid]={});
 n[b.name['xml:lang']]=b.name.value;
}
const districts=JSON.parse(gunzipSync(fs.readFileSync('dist/data/city-districts.bin'))).regions.features;
const regions={};
for(const {properties:p} of districts){
 if(p.functionalArea){regions[p.adcode]={en:'Suzhou Industrial Park',zh:p.name,regional:[],source:'https://www.sipac.gov.cn/szgyyq/xzqh/parkProfile.shtml'};continue;}
 const choices=Object.entries(candidates[p.adcode]||{});
 const match=choices.find(([,n])=>n['zh-hans']===p.name||n.zh===p.name)|| (choices.length===1?choices[0]:null);
 if(!match?.[1].en)throw Error('Unresolved district name '+p.adcode+' '+p.name);
 const [qid,n]=match;regions[p.adcode]={en:n.en,zh:p.name,regional:[],source:'https://www.wikidata.org/wiki/'+qid};
}
const ids=Object.values(regions).map(n=>n.source.split('/').at(-1)).filter(id=>/^Q\d+$/.test(id)),entities={};
for(let i=0;i<ids.length;i+=50){
 const url='https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',format:'json',ids:ids.slice(i,i+50).join('|'),props:'sitelinks',sitefilter:'enwiki|zhwiki'});
 const response=await fetch(url);if(!response.ok)throw Error(response.status);Object.assign(entities,(await response.json()).entities);
}
const articles=JSON.parse(fs.readFileSync('dist/data/region-articles.json'));
articles.regions['suzhou-industrial-park']={en:{title:'Suzhou Industrial Park',url:'https://en.wikipedia.org/wiki/Suzhou_Industrial_Park'},zh:{title:'苏州工业园区',url:'https://zh.wikipedia.org/wiki/%E8%8B%8F%E5%B7%9E%E5%B7%A5%E4%B8%9A%E5%9B%AD%E5%8C%BA'}};
for(const [code,n] of Object.entries(regions)){
 const qid=n.source.split('/').at(-1),links=entities[qid]?.sitelinks,record={wikidata:qid};
 for(const lang of ['en','zh'])if(links?.[lang+'wiki'])record[lang]={title:links[lang+'wiki'].title,url:`https://${lang}.wikipedia.org/wiki/`+encodeURIComponent(links[lang+'wiki'].title.replaceAll(' ','_'))};
 if(record.en||record.zh)articles.regions[code]=record;
}
fs.writeFileSync('dist/data/city-district-names.json',JSON.stringify({regions}));
fs.writeFileSync('dist/data/region-articles.json',JSON.stringify(articles));
fs.writeFileSync(base+'wikipedia-sitelinks.json',JSON.stringify(entities));
console.log('Verified district names:',Object.keys(regions).length);
