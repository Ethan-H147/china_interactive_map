import {spanishNameRows,spanishCardNames} from './spanish-names.mjs';
import {italianNameRows,italianCardNames} from './italian-names.mjs';
import {configureSouthAmericanCountry,southAmericanFlags} from './south-america-regional.mjs';
import {createRegionalCollection} from './regional-collection.mjs';
import './countries.js';
import {vaticanProfile} from './vatican-profile.mjs';
import {renderRegionalNames} from './regional-names.mjs';

// Each country's levels and map settings are declared in countries.js.
const {countries,byAdapter}=globalThis.AtlasCountries;
const definitions=Object.fromEntries(byAdapter('europe').map(id=>[id,{name:countries[id].en,prefix:countries[id].prefix,lang:countries[id].lang,...countries[id].map}]));
const nationalThumbnails={'united-kingdom':'vendor/flag-gb-3x5.svg',ireland:'vendor/flag-ie-2x3.svg'};
export const configurations=Object.fromEntries(Object.entries(definitions).map(([country,definition])=>[country,{country,firstLabel:'Country',searchLabel:'Find a place',...definition,base:`data/europe/${country}/`,nationalFlag:nationalThumbnails[country]||`vendor/flag-${definition.prefix}.svg`,contextLabels:true,flags:{},detailFlags:{},hasStatistics:()=>!!definition.statistics,attribution:`${definition.name}: <a href="data/europe/${country}/sources.json">Boundary sources & coverage</a>${definition.boundaryCredit?' · '+definition.boundaryCredit:''}${['qatar','saudi-arabia'].includes(country)?' · Inlet coast © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>':''}`}]));

// Native forms retain the official catalogue; Navarre: https://bon.navarra.es/eu/
// Spain's cards follow the atlas heading hierarchy. Language labels precede native forms.
function renderSpanishNames(container,record){
 const regionalNames=spanishNameRows(record).filter(([,lang,name])=>lang!=='es'&&name).map(([language,lang,text])=>({language,lang,text}));
 renderRegionalNames(container,{...record,regionalNames},{labelFirst:true,shownNames:[record.en,spanishCardNames(record).local]});
}


const atlanticLanguages={"cy":"Welsh","gd":"Scottish Gaelic","sco":"Scots","ga":"Irish","kw":"Cornish","gv":"Manx","sco-x-ulster":"Ulster Scots","br":"Breton","fr-x-gallo":"Gallo","eu":"Basque","oc":"Occitan","ca":"Catalan","co":"Corsican","gsw":"Alsatian","und-x-platt":"Lorraine Franconian","vls":"West Flemish","frp":"Franco-Provençal / Arpitan","nrm":"Norman","pcd":"Picard"};
function atlanticRegionalNames(record){
 const names=[...(record.regionalNames||[])];
 for(const [lang,value]of Object.entries(record.names||{})){
  if(!atlanticLanguages[lang]||value?.type==='historical language label'||names.some(n=>n.lang===lang))continue;
  const text=typeof value==='string'?value:value.name;
  if(text)names.push({lang,language:atlanticLanguages[lang],text,source:value.source||'https://www.ordnancesurvey.co.uk/products/os-open-names'});
 }
 return {...record,regionalNames:names};
}

export function createEurope(map,host){
 let flags;
 const registry=globalThis.AtlasCountries;
 const flagSets={'south-america':async()=>southAmericanFlags,'regional-flags':async()=>(await import('./regional-flags.mjs')).regionalFlags,liberia:async()=>(await import('./liberia-flags.mjs')).liberiaFlags,'horn-islands':async()=>(await import('./horn-islands-flags.mjs')).hornIslandsFlags,'mexico-state':async()=>(await import('./mexico-state-flags.mjs')).mexicoStateFlags,'central-europe':async()=>(await import('./central-europe-flags.mjs')).centralEuropeFlags,poland:async()=>(await import('./poland-flags.mjs')).polandFlags,baltic:async()=>(await import('./baltic-flags.mjs')).balticFlags,soviet:async()=>(await import('./soviet-flags.mjs')).sovietFlags,nordic:async()=>(await import('./nordic-flags.mjs')).nordicFlags,atlantic:async()=>(await import('./atlantic-flags.mjs')).atlanticFlags,oceania:async()=>(await import('./oceania-flags.mjs')).oceaniaFlags,'europe-expansion':async()=>(await import('./europe-expansion-flags.mjs')).europeExpansionFlags,'north-america':async()=>(await import('./north-america-flags.mjs')).northAmericaFlags,'major-city':async()=>(await import('./major-city-flags.mjs')).majorCityFlags};
 return createRegionalCollection(map,host,configurations,{async prepare(country,config){
  flags??=(await import('./europe-flags.mjs')).europeFlags;
  if(country==='vatican-city')Object.assign(config,vaticanProfile);
  config.childPages=registry.ids.filter(id=>registry.countries[id].parent===country&&!['monaco','vatican-city'].includes(id)).map(id=>({id,name:registry.countries[id].en,local:registry.countries[id].local}));
  config.parentPage=registry.countries[country].parent;
  configureSouthAmericanCountry(country,config);
  if(['united-kingdom','france'].includes(country))Object.assign(config,{
   nameVariants:{collapseAfter:3},
   cardNames:record=>({...record,local:country==='united-kingdom'?'':record.local?.trim()||'',localLang:country==='france'?'fr':'en'}),
   renderCardNames:(container,record)=>renderRegionalNames(container,atlanticRegionalNames(record),{labelFirst:true,shownNames:[record.en,country==='france'?record.local:'']}),
   nameAliases:record=>atlanticRegionalNames(record).regionalNames.flatMap(name=>[name.text,...(name.aliases||[])])
  });
  if(country==='spain')Object.assign(config,{cardNames:spanishCardNames,renderCardNames:renderSpanishNames,nameAliases:record=>spanishNameRows(record).map(([, ,name])=>name).filter(Boolean)});
  if(country==='italy')Object.assign(config,{cardNames:italianCardNames,renderCardNames:(container,record)=>renderRegionalNames(container,{...record,regionalNames:italianNameRows(record).filter(([,lang,name])=>lang!=='it'&&name).map(([language,lang,text])=>({language,lang,text}))},{labelFirst:true,shownNames:[italianCardNames(record).en,italianCardNames(record).local]}),nameAliases:record=>italianNameRows(record).map(([, ,name])=>name).filter(Boolean)});
  const flagSet=registry.countries[country].flagSet;
  const selectedFlags=flags[country]||(flagSet?(await flagSets[flagSet]())[country]:null);
  Object.assign(config.flags,selectedFlags?.firstFlags);
  Object.assign(config.detailFlags,selectedFlags?.detailFlags);
  for(const extra of registry.countries[country].additionalFlagSets||[]){const additions=(await flagSets[extra]())[country];Object.assign(config.flags,additions?.firstFlags);Object.assign(config.detailFlags,additions?.detailFlags);}
 }});
}
