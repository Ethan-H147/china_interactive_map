// City quizzes outside the US: one dot per city at its Wikidata coordinate, chosen among the
// fetched candidates (fetch-city-quiz.mjs) by name, place type and population, and kept only when
// it lies in the country's regions (and in its own province or region where one is given).
// Usage: node scripts/build-city-quiz.mjs <country> (china, russia, spain, germany, united-kingdom, france, italy)
import fs from 'node:fs';
import '../dist/countries.js';
import {load,polygons,landIndex,lineIndex} from './geo-index.mjs';
import {tiers,chinaProvinces,chinaCities,russiaCities,russiaRegions,russiaDisplay,cityAliases,europeCities,europeRegions,europeOverseas,europeDisplay,europeAliases,searchNames} from './city-quiz-definitions.mjs';
const country=process.argv[2],codes={china:'CN',russia:'RU',spain:'ES',germany:'DE','united-kingdom':'GB',france:'FR',italy:'IT',brazil:'BR',canada:'CA',argentina:'AR'};
if(!codes[country])throw Error('Usage: build-city-quiz.mjs <country>');
const levels=globalThis.AtlasCountries.countries[country].quiz.cities.levels,order=levels.map(l=>l.id);
const source=load('scripts/boundary-sources/city-quiz/'+country+'-wikidata.json.gz');
// Regions: China's provinces (with Hong Kong, Macau and Taiwan), or each atlas's first level.
const regions=new Map();
if(country==='china')for(const f of JSON.parse(fs.readFileSync('dist/data/provinces.json','utf8')).features){const id=String(f.properties.adcode);if(chinaProvinces[id])regions.set(id,{name:chinaProvinces[id],rings:polygons(f.geometry).flat()});}
else if(['brazil','argentina'].includes(country)){const quiz=load('dist/data/south-america/'+country+'-first.bin'),names=new Map(quiz.records.map(r=>[r.id,r.en]));for(const f of quiz.regions.features){const r=regions.get(f.properties.id)||{name:names.get(f.properties.id),rings:[]};r.rings.push(...polygons(f.geometry).flat());regions.set(f.properties.id,r);}}
else{const base=country==='russia'?'dist/data/russia/':'dist/data/europe/'+country+'/',names=new Map(load(base+'catalogue.bin').records.filter(r=>r.level===1).map(r=>[r.id,r.en]));for(const f of load(base+'first.bin').regions.features){const r=regions.get(f.properties.id)||{name:names.get(f.properties.id),rings:[]};r.rings.push(...polygons(f.geometry).flat());regions.set(f.properties.id,r);}}
for(const r of regions.values()){r.inside=landIndex(r.rings);r.distance=lineIndex(r.rings);}
// A coastal or island city may sit just off a simplified outline: within 15 km counts.
const within=(region,p)=>region.inside(p)||region.distance(p)<=15000;
const regionId=name=>name?[...regions].find(([,r])=>r.name===name)?.[0]:null;
const hints=country==='russia'?russiaRegions:europeRegions[country]||{},display=country==='russia'?russiaDisplay:europeDisplay[country]||{},overseas=new Set(europeOverseas[country]||[]);
const entries=country==='china'?Object.entries(chinaCities).flatMap(([adcode,list])=>list.split(',').map(e=>{const [name,t]=[e.trim().replace(/ \w$/,''),e.trim().slice(-1)];return {name,tier:tiers[t],region:adcode};}))
 :Object.entries(country==='russia'?russiaCities:europeCities[country]).flatMap(([t,list])=>list.split(',').map(e=>({name:e.trim(),tier:tiers[t],region:regionId(hints[e.trim()])})));
const typeScore=types=>{const t=types.join('|').toLowerCase();if(/former|constituency|electoral|subdistrict|neighbou?rhood|street|residential|community|village committee/.test(t)&&!/(city|town)/.test(t))return 0;if(/\b(province|oblast|krai|autonomous region|federal subject|island|mountain|river|lake|station|airport|temple|university|stadium|football|club)\b/.test(t)&&!/\b(city|town|commune|comune)\b/.test(t))return 0;return /city|town|metropolis|municipality|commune|comune|special administrative region|capital/.test(t)?3:/settlement|village|hamlet|urban service area|selo/.test(t)?2:/district|county|banner/.test(t)?1:0;};
const fold=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'');
// The item's own English label outranks an alias (Tolyatti was once called Stavropol).
const nameScore=(item,name)=>item.label===name||item.label===fold(name)?3:item.names.includes(name)||item.names.includes(fold(name))?2:item.label===name+' City'||item.names.includes(name+' City')?1.5:item.names.includes(name+' District')?1:0;
const warnings=[],records=[],taken=new Set();
for(const e of entries){
 // A listed exact label (Halle (Saale)) is required where the short name is ambiguous.
 const candidates=source.items.filter(i=>!taken.has(i.id)&&(searchNames[e.name]?i.label===searchNames[e.name]:nameScore(i,e.name)>0)&&typeScore(i.types)>0&&(e.region?within(regions.get(e.region),[i.lon,i.lat]):[...regions.values()].some(r=>within(r,[i.lon,i.lat]))));
 candidates.sort((a,b)=>nameScore(b,e.name)-nameScore(a,e.name)||typeScore(b.types)-typeScore(a.types)||b.population-a.population);
 const item=candidates[0];if(!item)throw Error(`City quiz ${country}: no Wikidata place for ${e.name} in ${e.region?regions.get(e.region).name:country}`);
 const rival=candidates.find(c=>c!==item&&typeScore(c.types)===typeScore(item.types)&&nameScore(c,e.name)===nameScore(item,e.name)&&c.population>=item.population*.5&&Math.hypot(c.lon-item.lon,c.lat-item.lat)>.3);
 if(rival)warnings.push(`${e.name}: chose ${item.id} (${item.population}) over ${rival.id} (${rival.population})`);
 const point=[item.lon,item.lat],region=e.region||([...regions].find(([,r])=>r.inside(point))||[...regions].find(([,r])=>within(r,point)))[0];
 records.push({...e,region,item});taken.add(item.id);
}
// Local names: the country's own language (Chinese in traditional characters for Taiwan).
const localLabel=(item,taiwan)=>({china:taiwan?item.labels['zh-hant']||item.labels.zh:item.labels['zh-hans']||item.labels.zh,russia:item.labels.ru,spain:item.labels.es,germany:item.labels.de,france:item.labels.fr,italy:item.labels.it,brazil:item.labels.pt,canada:item.labels.fr,argentina:item.labels.es}[country]||'');
const localLang=taiwan=>({china:taiwan?'zh-Hant':'zh-Hans',russia:'ru',spain:'es',germany:'de',france:'fr',italy:'it',brazil:'pt',canada:'fr',argentina:'es','united-kingdom':'en'}[country]);
const counts=new Map();for(const r of records)counts.set(r.name,(counts.get(r.name)||0)+1);
const ids=new Set(),out=records.map(({name,tier,region,item})=>{
 if(ids.has(item.id))throw Error(`City quiz ${country}: ${name} reuses ${item.id}`);ids.add(item.id);
 const regionName=regions.get(region).name,taiwan=region==='710000',local=localLabel(item,taiwan);
 const en=counts.get(name)>1?name+', '+regionName:display[name]||name;
 const bases=[...new Set([name,fold(name),name.replace(/'/g,''),fold(name).replace(/'/g,'')])],others=Object.values(item.labels).filter(l=>l&&l!==local);
 const aliases=[...new Set([...bases,...bases.flatMap(b=>[b+' City',b+', '+regionName,b+' '+regionName]),...(cityAliases[name]||[]),...(europeAliases[name]||[]),...(country==='china'?[]:others),...(local?[local,fold(local),local.replace(/(市|县|區|区|特别行政区|特別行政區)$/,'')]:[])])].filter(a=>a&&a!==en&&a!==local);
 const center=[item.lon,item.lat].map(v=>Math.round(v*1e5)/1e5);
 return {id:codes[country]+'-CITY-'+item.id,en,local:local&&local!==en?local:'',localLang:localLang(taiwan),tier,region,regionName,center,bounds:[[center[0]-.35,center[1]-.25],[center[0]+.35,center[1]+.25]].map(p=>p.map(v=>Math.round(v*1e5)/1e5)),aliases,...(taiwan||overseas.has(name)?{overseas:true}:{}),wikidata:item.id};
});
out.sort((a,b)=>order.indexOf(a.tier)-order.indexOf(b.tier)||a.en.localeCompare(b.en));
fs.writeFileSync('dist/data/quiz/'+country+'-cities.json',JSON.stringify({version:1,levels:levels.map((l,i)=>({...l,count:out.filter(r=>order.indexOf(r.tier)<=i).length})),sources:{centres:source.provider+', retrieved '+source.retrieved+' ('+source.license+')'},records:out}));
console.log(country,'city quiz:',out.length,'cities;',levels.map((l,i)=>l.label+' '+out.filter(r=>order.indexOf(r.tier)<=i).length).join(', '));
for(const w of warnings)console.log('check:',w);
