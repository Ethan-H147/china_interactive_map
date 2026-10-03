import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {readData} from './read-data.mjs';
const read=async path=>JSON.parse(await fs.readFile(new URL(path,import.meta.url),'utf8'));
const display=readData('display-boundaries.json');
const wikidata=await read('name-sources/wikidata.json');
const scripts=await read('name-sources/regional-scripts.json');
const overrides=await read('name-sources/overrides.json');
const manchu=await read('name-sources/manchu.json');
const autonomous=await read('name-sources/autonomous-prefectures.json');
const features=[...display.provinces.features,...display.subdivisions.features];
const stat=code=>String(code).match(/.{2}/g).join(' ').replace(/(?: 00)+$/,'');
const regionNames={};
const languageCounts={};
function local(text,lang,language,source,license='CC0'){
  languageCounts[language]=(languageCounts[language]||0)+1;
  return {text,lang,language,dir:['ug','kk-Arab','ky-Arab'].includes(lang)?'rtl':'ltr',vertical:['mn-Mong','mnc-Mong'].includes(lang),source,license};
}
for(const {properties:p} of features){
  const rows=p.level==='taiwan-region'?[]:wikidata.records.filter(r=>r.code.value===stat(p.adcode));
  const english=[...new Set(rows.filter(r=>r.name['xml:lang']==='en').map(r=>r.name.value))];
  const item=rows[0]?.item.value.replace('http:','https:').replace('/entity/','/wiki/');
  const override=p.level==='taiwan-region'?{text:p.englishName,source:'https://data.gov.tw/dataset/7442'}:p.provinceCode===820000?{text:p.englishName,source:'https://webmap.gis.gov.mo/MapGIS/index.html'}:overrides.english[p.adcode];
  assert(override||english.length===1,`Ambiguous or missing English: ${p.adcode}`);
  const entry={en:override?.text||english[0],zh:p.name,source:override?.source||item,regional:[]};
  const values=lang=>[...new Set(rows.flatMap(r=>[r.native,r.name].filter(Boolean).filter(v=>v['xml:lang']===lang).map(v=>v.value)))];
  if(p.adcode===540000||p.provinceCode===540000||p.name.includes('藏族')){
    const text=values('bo').find(s=>/[\u0f00-\u0fff]/.test(s));
    if(text)entry.regional.push(local(text,'bo','Tibetan',item));
  }
  const wiki=scripts.regions[p.adcode];
  if(wiki&&p.adcode!==653000){
    const candidates=wiki.mongolian.filter(s=>/[\u1820-\u18aa]/.test(s));
    // These infoboxes split the short name and administrative suffix into spans.
    const text=(p.adcode===632800?candidates.find(s=>s.includes('ᠥᠪᠡᠷᠲᠡᠭᠡᠨ')):[150200,150600].includes(p.adcode)?candidates.find(s=>s.endsWith('ᠬᠣᠲᠠ')):candidates[0])?.replace(/\n/g,' ');
    assert(text,`Missing traditional Mongolian: ${p.adcode}`);
    entry.regional.push(local(text,'mn-Mong','Mongolian',wiki.source,'CC BY-SA 4.0'));
  }
  if(p.adcode===654000){
    const text=values('kk-arab').find(s=>/[\u0600-\u06ff]/.test(s));
    assert(text,'Ili Kazakh name required');
    entry.regional.push(local(text,'kk-Arab','Kazakh',item));
  }
  if(p.adcode===653000){
    const text=wiki.arabic.find(s=>s==='قىزىلسۇۇ قىرعىز اپتونوم وبلاسى');
    assert(text,'Kizilsu Kyrgyz name required');
    entry.regional.push(local(text,'ky-Arab','Kyrgyz',wiki.source,'CC BY-SA 4.0'));
  }
  if(p.adcode===650000||p.provinceCode===650000){
    const text=values('ug').find(s=>/[\u0600-\u06ff]/.test(s));
    if(text)entry.regional.push(local(text,'ug','Uyghur',item));
  }
  assert(!entry.regional.some(n=>n.lang==='mn-Mong'&&/[\u0400-\u04ff]/.test(n.text)));
  const manchuName=manchu.regions[p.adcode];
  if(manchuName)entry.regional.push({...local(manchuName.text,'mnc-Mong','Manchu',manchuName.source,manchu.license),romanization:manchuName.romanization,retrieved:manchu.retrieved});
  regionNames[p.adcode]=entry;
  for(const n of autonomous.regions[p.adcode]||[])entry.regional.push({...local(n.text,n.lang,n.language,n.source||autonomous.defaultSource,autonomous.license),retrieved:autonomous.retrieved});
}
await fs.writeFile(new URL('../dist/data/region-names.json',import.meta.url),JSON.stringify({retrieved:wikidata.retrieved,regions:regionNames},null,2));
console.log(JSON.stringify({regions:Object.keys(regionNames).length,regionalNames:languageCounts}));
