import fs from 'node:fs/promises';
import {readData} from './read-data.mjs';
const display=readData('display-boundaries.json');
const features=[...display.provinces.features,...display.subdivisions.features].filter(f=>f.properties.level!=='taiwan-region');
const statsCode=code=>String(code).match(/.{2}/g).join(' ').replace(/(?: 00)+$/,'');
const codes=[...new Set(features.map(f=>statsCode(f.properties.adcode)))];
const records=[];
for(let i=0;i<codes.length;i+=75){
  const values=codes.slice(i,i+75).map(c=>JSON.stringify(c)).join(' ');
  const query=`SELECT DISTINCT ?item ?code ?name ?native WHERE {
    VALUES ?code { ${values} } ?item wdt:P442 ?code; rdfs:label ?name.
    FILTER(LANG(?name) IN ("en","zh","zh-cn","zh-hans","bo","ug","kk-arab","kk-cn","mn"))
    OPTIONAL { ?item wdt:P1705 ?native }
  }`;
  const response=await fetch('https://query.wikidata.org/sparql?query='+encodeURIComponent(query)+'&format=json',{headers:{'User-Agent':'ChinaBoundaryAtlas/1.0 (region-name research; https://china-boundary-atlas.hys0423.chatgpt.site/)'},signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error(`Wikidata: ${response.status}`);
  records.push(...(await response.json()).results.bindings);
  console.log(`Retrieved batch ${Math.floor(i/75)+1}/${Math.ceil(codes.length/75)}`);
}
await fs.mkdir(new URL('name-sources/',import.meta.url),{recursive:true});
await fs.writeFile(new URL('name-sources/wikidata.json',import.meta.url),JSON.stringify({retrieved:new Date().toISOString(),source:'https://www.wikidata.org/',license:'CC0',records}));
console.log(`Saved ${records.length} source records.`);
