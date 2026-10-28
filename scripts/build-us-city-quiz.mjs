// US city quiz: 232 cities in five cumulative difficulties, each a dot at the city's centre.
// Identity and state come from the Census places in the US catalogue; the dot is the city's
// Wikidata coordinate (fetch-us-city-quiz.mjs), or its downtown where Wikidata has no
// Census place code for the city.
import fs from 'node:fs';
import {load} from './geo-index.mjs';
import {cityQuizLevels,cityQuizAliases} from './us-city-quiz-definitions.mjs';
import {cityQuizPlaces} from './us-city-quiz-places.mjs';
const catalogue=load('dist/data/europe/united-states/catalogue.bin'),wikidata=load('scripts/boundary-sources/united-states/city-quiz-wikidata.json.gz');
const cityHalls={'36-51000':[-74.0060,40.7127],'12-45000':[-80.1918,25.7617],'11-50000':[-77.0365,38.8951],'25-07000':[-71.0589,42.3601],'27-43000':[-93.2650,44.9778],'21-46027':[-84.5037,38.0406],'09-52000':[-72.9279,41.3083],'45-16000':[-81.0348,34.0007],'20-71000':[-95.6752,39.0473],'46-49600':[-100.3510,44.3683],'13-49008':[-83.6324,32.8407]};
const states=new Map(catalogue.records.filter(r=>r.level===1).map(r=>[r.id,r.en]));
const places=cityQuizPlaces(catalogue),counts=new Map();for(const p of places)counts.set(p.name,(counts.get(p.name)||0)+1);
const records=places.map(({tier,name,state,record})=>{
 const fips=record.code.slice(0,2)+'-'+record.code.slice(2),items=wikidata.items.filter(i=>i.fips===fips),item=items.find(i=>i.label===name||i.label.startsWith(name+','))||items[0];
 const center=(item?[item.lon,item.lat]:cityHalls[fips])?.map(v=>Math.round(v*1e5)/1e5);if(!center)throw Error('City quiz: no centre for '+name+', '+state);
 const [[w,s],[e,n]]=record.bounds;if(center[0]<w-.02||center[0]>e+.02||center[1]<s-.02||center[1]>n+.02)throw Error('City quiz: '+name+', '+state+' centre lies outside its city limits');
 const stateName=states.get('US-'+state),en=state==='DC'?'Washington, D.C.':counts.get(name)>1?name+', '+stateName:name;
 const saint=name.replace(/^St\. /,'Saint ').replace(/ St\. /,' Saint '),bases=[...new Set([name,saint])];
 const aliases=[...new Set([...bases,...bases.flatMap(b=>[b+', '+state,b+' '+state,b+', '+stateName,b+' '+stateName]),...(cityQuizAliases[name]||[])])].filter(a=>a!==en);
 // A dot's bounds frame it when an answer is viewed.
 return {id:'US-CITY-'+record.code,en,tier,state:'US-'+state,stateName,center,bounds:[[center[0]-.35,center[1]-.25],[center[0]+.35,center[1]+.25]].map(p=>p.map(v=>Math.round(v*1e5)/1e5)),aliases,census:record.id,...(item?{wikidata:item.item}:{})};
});
const tiers=cityQuizLevels.map(l=>l.id);records.sort((a,b)=>tiers.indexOf(a.tier)-tiers.indexOf(b.tier)||a.en.localeCompare(b.en));
fs.mkdirSync('dist/data/quiz',{recursive:true});
fs.writeFileSync('dist/data/quiz/us-cities.json',JSON.stringify({version:1,levels:cityQuizLevels.map((l,i)=>({...l,count:records.filter(r=>tiers.indexOf(r.tier)<=i).length})),sources:{places:'US Census Bureau places (US catalogue)',centres:wikidata.provider+', retrieved '+wikidata.retrieved+' ('+wikidata.license+'); downtown points for '+Object.keys(cityHalls).length+' cities'},records}));
console.log('US city quiz:',records.length,'cities;',cityQuizLevels.map((l,i)=>l.label+' '+records.filter(r=>tiers.indexOf(r.tier)<=i).length).join(', '),';',records.filter(r=>!r.wikidata).length,'downtown points set here.');
