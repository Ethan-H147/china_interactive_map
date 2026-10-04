import fs from 'node:fs/promises';
import {readData} from './read-data.mjs';
const cache=new URL('../artifacts/explore/',import.meta.url);
await fs.mkdir(cache,{recursive:true});
const headers={'User-Agent':'ChinaAtlas/1.0 (https://china-boundary-atlas.hys0423.chatgpt.site/; public map references)'};
async function get(url){const r=await fetch(url,{headers,signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error(r.status+' '+url);return r.json();}
const api=(host,params)=>get(`https://${host}/w/api.php?`+new URLSearchParams({format:'json',formatversion:'2',...params}));
const display=readData('display-boundaries.json'),names=readData('region-names.json').regions;
const wanted=[...display.provinces.features,...display.subdivisions.features];
const qids=[...new Set(wanted.map(f=>names[f.properties.adcode]?.source.match(/Q\d+/)?.[0]).filter(Boolean))];
const entities={};
for(let i=0;i<qids.length;i+=50){Object.assign(entities,(await api('www.wikidata.org',{action:'wbgetentities',ids:qids.slice(i,i+50).join('|'),props:'sitelinks',sitefilter:'enwiki|zhwiki'})).entities);console.log('Article batch',i/50+1);}
const articles={};
for(const f of wanted){const code=f.properties.adcode,qid=names[code]?.source.match(/Q\d+/)?.[0],links=entities[qid]?.sitelinks;if(!links)continue;const record={wikidata:qid};for(const lang of ['en','zh'])if(links[lang+'wiki'])record[lang]={title:links[lang+'wiki'].title,url:`https://${lang}.wikipedia.org/wiki/`+encodeURIComponent(links[lang+'wiki'].title.replaceAll(' ','_'))};if(record.en||record.zh)articles[code]=record;}
await fs.writeFile(new URL('wikipedia-entities.json',cache),JSON.stringify(entities));
await fs.writeFile(new URL('../dist/data/region-articles.json',import.meta.url),JSON.stringify({checked:'2026-10-04',source:'Wikidata Wikipedia sitelinks',regions:articles}));
const prefectures=display.subdivisions.features.filter(f=>f.properties.level==='city'&&String(f.properties.adcode).slice(2,4)!=='90');console.log('Missing prefecture articles',prefectures.filter(f=>!articles[f.properties.adcode]).map(f=>f.properties));
const sites=[
 ['forbidden-city',110000,110101,'Forbidden City','故宫','Forbidden City'],
 ['temple-of-heaven',110000,110101,'Temple of Heaven','天坛','Temple of Heaven'],
 ['oriental-pearl',310000,310115,'Oriental Pearl Tower','东方明珠广播电视塔','Oriental Pearl Tower'],
 ['the-bund',310000,310101,'The Bund','外滩','The Bund'],
 ['west-lake',330100,330106,'West Lake','西湖','West Lake'],
 ['leifeng-pagoda',330100,330106,'Leifeng Pagoda','雷峰塔','Leifeng Pagoda'],
 ['sun-yat-sen',320100,320102,'Sun Yat-sen Mausoleum','中山陵',"Sun Yat-sen Mausoleum"],
 ['fuzimiao',320100,320104,'Confucius Temple','夫子庙','Nanjing Fuzimiao'],
 ['humble-garden',320500,320508,"Humble Administrator’s Garden",'拙政园',"Humble Administrator's Garden"],
 ['tiger-hill',320500,320508,'Tiger Hill Pagoda','虎丘塔','Yunyan Pagoda'],
 ['canton-tower',440100,440105,'Canton Tower','广州塔','Canton Tower'],
 ['chen-clan',440100,440103,'Chen Clan Ancestral Hall','陈家祠','Chen Clan Ancestral Hall'],
 ['ping-an',440300,440304,'Ping An Finance Centre','平安金融中心','Ping An Finance Centre'],
 ['civic-center',440300,440304,'Shenzhen Civic Centre','深圳市民中心','Shenzhen Civic Center'],
 ['terracotta-army',610100,610115,'Terracotta Army','兵马俑','Terracotta Army'],
 ['giant-wild-goose',610100,610113,'Giant Wild Goose Pagoda','大雁塔','Giant Wild Goose Pagoda'],
 ['chengdu-pandas',510100,510108,'Chengdu Panda Base','成都大熊猫繁育研究基地','Chengdu Research Base of Giant Panda Breeding'],
 ['wuhou-shrine',510100,510107,'Wuhou Shrine','武侯祠','Wuhou Shrine'],
 ['hongya-cave',500000,500103,'Hongya Cave','洪崖洞','Hongya Cave'],
 ['dazu-carvings',500000,500111,'Dazu Rock Carvings','大足石刻','Dazu Rock Carvings']
].map(([id,city,district,en,zh,article])=>({id,city,district,en,zh,article}));
await fs.writeFile(new URL('landmarks.json',cache),JSON.stringify(sites,null,2));
const pages=await api('en.wikipedia.org',{action:'query',titles:sites.map(s=>s.article).join('|'),redirects:'1',prop:'pageimages|extracts|info',piprop:'name|original',exintro:'1',explaintext:'1',exsentences:'2',inprop:'url'});
await fs.writeFile(new URL('landmark-pages.json',cache),JSON.stringify(pages));
for(const s of sites){const title=pages.query.redirects?.find(r=>r.from===s.article)?.to||s.article;const p=pages.query.pages.find(p=>p.title===title);console.log(JSON.stringify({id:s.id,page:p?.title,image:p?.pageimage,description:p?.extract?.slice(0,350)}));}
