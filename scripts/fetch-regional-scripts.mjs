import fs from 'node:fs/promises';
const pages={150000:'Inner Mongolia',150100:'Hohhot',150200:'Baotou',150300:'Wuhai',150400:'Chifeng',150500:'Tongliao',150600:'Ordos City',150700:'Hulunbuir',150800:'Bayannur',150900:'Ulanqab',152200:'Hinggan League',152500:'Xilingol League',152900:'Alxa League',652700:'Bortala Mongol Autonomous Prefecture',652800:'Bayingolin Mongol Autonomous Prefecture',632800:'Haixi Mongol and Tibetan Autonomous Prefecture',653000:'Kizilsu Kyrgyz Autonomous Prefecture'};
const results={};
for(const [code,title] of Object.entries(pages)){
  const source='https://en.wikipedia.org/wiki/'+encodeURIComponent(title.replaceAll(' ','_'));
  const response=await fetch(source,{headers:{'User-Agent':'ChinaBoundaryAtlas/1.0 (region-name research)'},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`${title}: ${response.status}`);
  const html=await response.text();
  const mongolian=[...new Set([...html.matchAll(/>([\u1800-\u18af\u202f\u200c\u200d\s]+)</g)].map(m=>m[1].trim()).filter(s=>/[\u1820-\u18aa]/.test(s)))];
  const arabic=code==='653000'?[...new Set([...html.matchAll(/>([\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\s]+)</g)].map(m=>m[1].trim()))].slice(0,8):[];
  results[code]={source,mongolian:mongolian.slice(0,5),arabic};
  console.log(code,title,JSON.stringify(results[code]));
}
await fs.writeFile(new URL('name-sources/regional-scripts.json',import.meta.url),JSON.stringify({retrieved:new Date().toISOString(),license:'CC BY-SA 4.0',regions:results},null,2));
