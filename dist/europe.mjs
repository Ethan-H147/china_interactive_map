import {createRegionalCollection} from './regional-collection.mjs';
import './countries.js';
import {vaticanProfile} from './vatican-profile.mjs';

// Each country's levels and map settings are declared in countries.js.
const {countries,byAdapter}=globalThis.AtlasCountries;
const definitions=Object.fromEntries(byAdapter('europe').map(id=>[id,{name:countries[id].en,prefix:countries[id].prefix,lang:countries[id].lang,...countries[id].map}]));
export const configurations=Object.fromEntries(Object.entries(definitions).map(([country,definition])=>[country,{country,firstLabel:'Country',searchLabel:'Find a place',...definition,base:`data/europe/${country}/`,nationalFlag:`vendor/flag-${definition.prefix}.svg`,contextLabels:true,flags:{},detailFlags:{},hasStatistics:()=>!!definition.statistics,attribution:`${definition.name}: <a href="data/europe/${country}/sources.json">Boundary sources & coverage</a>${definition.boundaryCredit?' · '+definition.boundaryCredit:''}`}]));
export function createEurope(map,host){
 let flags;
 const registry=globalThis.AtlasCountries;
 const flagSets={nordic:async()=>(await import('./nordic-flags.mjs')).nordicFlags,atlantic:async()=>(await import('./atlantic-flags.mjs')).atlanticFlags,oceania:async()=>(await import('./oceania-flags.mjs')).oceaniaFlags,'europe-expansion':async()=>(await import('./europe-expansion-flags.mjs')).europeExpansionFlags,'north-america':async()=>(await import('./north-america-flags.mjs')).northAmericaFlags};
 return createRegionalCollection(map,host,configurations,{async prepare(country,config){
  flags??=(await import('./europe-flags.mjs')).europeFlags;
  if(country==='vatican-city')Object.assign(config,vaticanProfile);
  config.childPages=registry.ids.filter(id=>registry.countries[id].parent===country).map(id=>({id,name:registry.countries[id].en,local:registry.countries[id].local}));
  config.parentPage=registry.countries[country].parent;
  const flagSet=registry.countries[country].flagSet;
  const selectedFlags=flags[country]||(flagSet?(await flagSets[flagSet]())[country]:null);
  Object.assign(config.flags,selectedFlags?.firstFlags);
  Object.assign(config.detailFlags,selectedFlags?.detailFlags);
  for(const extra of registry.countries[country].additionalFlagSets||[]){const additions=(await flagSets[extra]())[country];Object.assign(config.flags,additions?.firstFlags);Object.assign(config.detailFlags,additions?.detailFlags);}
 }});
}
