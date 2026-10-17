import {addRegionalCountry} from './regional-country.mjs';
import './countries.js';

// Each country's levels and map settings are declared in countries.js.
const {countries,byAdapter}=globalThis.AtlasCountries;
const definitions=Object.fromEntries(byAdapter('europe').map(id=>[id,{name:countries[id].en,prefix:countries[id].prefix,lang:countries[id].lang,...countries[id].map}]));
export const configurations=Object.fromEntries(Object.entries(definitions).map(([country,definition])=>[country,{country,firstLabel:'Country',searchLabel:'Find a place',...definition,base:`data/europe/${country}/`,nationalFlag:`vendor/flag-${definition.prefix}.svg`,contextLabels:true,flags:{},detailFlags:{},hasStatistics:()=>!!definition.statistics,attribution:`${definition.name}: <a href="data/europe/${country}/sources.json">Boundary sources & coverage</a>`}]));
// Every country here gets its portal, released or not: an unreleased country's portal still draws its
// land (Chile beside Argentina); its map opens only in developer mode (portal.sync). Each call adds
// the countries not yet added.
export function createEurope(map,host){
 const portals={},queued=new Set();let adding=Promise.resolve(),flags=null;
 function ensure(){
  if(!Object.keys(configurations).some(country=>window.AtlasDev?.allows(country)))return adding;
  const wanted=Object.keys(configurations).filter(country=>!queued.has(country));
  if(!wanted.length)return adding;
  for(const country of wanted)queued.add(country);
  adding=adding.catch(()=>{}).then(async()=>{
   flags??=(await import('./europe-flags.mjs')).europeFlags;
   for(const country of wanted){const c=configurations[country];Object.assign(c.flags,flags[country]?.firstFlags);Object.assign(c.detailFlags,flags[country]?.detailFlags);portals[country]=await addRegionalCountry(map,host,c);}
  });
  return adding;
 }
 return {portals,ensure,handles:country=>country in configurations,syncDeveloper(){for(const portal of Object.values(portals))portal.sync();}};
}
