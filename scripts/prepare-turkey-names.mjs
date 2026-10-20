import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {load} from './geo-index.mjs';
const root='scripts/name-sources/turkey/',base='dist/data/europe/turkey/';
const plain=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').replace(/ı/g,'i').toLowerCase().replace(/[^a-z0-9]/g,'');
const ascii=s=>s.normalize('NFD').replace(/\p{M}/gu,'').replace(/ı/g,'i');
const decode=s=>s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).trim().normalize('NFC');
export function prepareTurkeyNames(){
 const manifest=load(root+'manifest.json'),raw=fs.readFileSync(root+'municipalities.html');assert.equal(createHash('sha256').update(raw).digest('hex'),manifest.files['municipalities.html'].sha256);
 const provinces=new Map();for(const chunk of raw.toString().split('<div class="accordion-item views-row">').slice(1)){
  const code=/data-code="(\d+)"/.exec(chunk)?.[1];if(!code)continue;const rows=[...chunk.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*class="[^"]*list-group-item-(info|light)[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>({url:m[1],head:m[2]==='info',name:decode(m[3])}));const head=rows.find(r=>r.head);assert(head,code+' municipality');assert(/ Belediyesi$/.test(head.name));provinces.set(code.padStart(2,'0'),{head,rows});
 }
 assert.equal(provinces.size,81);const cat=load(base+'catalogue.bin'),byId=new Map(cat.records.map(r=>[r.id,r])),spellings=load('scripts/statistics-sources/europe/turkey-names-osm.json'),names=new Map([...spellings.names,'Nazımiye','Sarıkaya'].map(n=>[plain(n),n.normalize('NFC')]));
 const type={1:['Statistical region','İstatistiki bölge'],2:['Province','İl'],3:['District','İlçe']};let municipalities=0;
 function aliases(r,values){r.aliases=[...new Set([...(r.aliases||[]),...values,...values.filter(Boolean).map(ascii)].filter(Boolean))];}
 function municipality(r,entry,english){if(!entry)return;r.municipality={name:entry.name,english,source:manifest.files['municipalities.html'].url,url:entry.url};delete r.administrativeEn;delete r.administrativeLocal;r.relatedGovernmentEn=english;r.relatedGovernmentLocal=entry.name;aliases(r,[entry.name,entry.name.replace(/ Belediyesi$/,''),r.en+' '+english]);municipalities++;}
 for(const r of cat.records){const old=r.en,local=r.local.normalize('NFC');r.local=r.level===1?local:names.get(plain(local))||local;r.en=r.level===1?(r.id==='TR-R-TR1'?'İstanbul':r.en):r.local;r.kindLocal=r.kind==='Central district'?'Merkez ilçe':type[r.level][1];r.localLang='tr';r.names={tr:r.local};aliases(r,[old,r.en,r.local]);
  if(r.level===2){const p=provinces.get(r.code||r.id.slice(-2));assert(p,r.id);municipality(r,p.head,p.head.name.includes('Büyükşehir')?'Metropolitan municipality':'Provincial capital municipality');}
  if(r.level===3){const p=provinces.get(r.parent.slice(-2));assert(p,r.id);const key=plain(r.local.replace(/ Merkez$/,'')),matches=p.rows.filter(entry=>plain(entry.name.replace(/ (Büyükşehir )?Belediyesi$/,''))===key);if(matches.length===1)municipality(r,matches[0],matches[0].head?'Provincial capital municipality':'Municipality');}
 }
 const settlements=fs.existsSync(base+'settlements.json')?load(base+'settlements.json'):null;
 for(const r of settlements?.records||[]){const old=r.en;r.name=(names.get(plain(r.name))||r.name).normalize('NFC');r.en=r.name;r.local=r.name;r.localLang='tr';r.kindLocal='İl merkezi';r.names={tr:r.local};aliases(r,[old,r.en,r.name]);let parent=byId.get(r.parentId||r.parent);while(parent&&parent.level!==2)parent=byId.get(parent.parent);const p=parent&&provinces.get(parent.code||parent.id.slice(-2));if(p){const matches=p.rows.filter(entry=>plain(entry.name.replace(/ (Büyükşehir )?Belediyesi$/,''))===plain(r.name));if(matches.length===1){r.kind=matches[0].head?'City (province centre)':'City';r.kindLocal=matches[0].head?'İl merkezi':'Şehir';municipality(r,matches[0],matches[0].name.includes('Büyükşehir')?'Metropolitan municipality':'Municipality');}}}
 fs.writeFileSync(base+'catalogue.bin',gzipSync(JSON.stringify(cat),{level:9}));if(settlements)fs.writeFileSync(base+'settlements.json',JSON.stringify(settlements)+'\n');
 const labels=new Map([...cat.records,...(settlements?.records||[])].map(r=>[r.id,r]));if(fs.existsSync(base+'statistics.json')){const d=load(base+'statistics.json');for(const [key,r]of Object.entries(d.regions)){const record=labels.get(key.split(':')[1]);if(record)r.name=record.en;}fs.writeFileSync(base+'statistics.json',JSON.stringify(d)+'\n');}
 const sources={version:1,retrieved:manifest.retrieved,sources:{administrativeNames:{title:spellings.title,url:spellings.url,license:spellings.license},municipalities:{...manifest.files['municipalities.html']}},coverage:{regions:12,provinces:81,districts:973,cityDots:settlements?.records.length||0,municipalNames:municipalities},policy:'Displayed names retain Turkish İ/i and I/ı. ASCII spellings remain search aliases. Municipality names are matched by province code and exact folded locality name in the TBB directory; they identify related municipal governments and do not change administrative polygon types or boundaries.'};fs.writeFileSync(base+'regional-names.json',JSON.stringify(sources,null,2)+'\n');
 return sources.coverage;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log('Turkey names:',prepareTurkeyNames());
