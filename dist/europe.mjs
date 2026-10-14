import {addRegionalCountry} from './regional-country.mjs';
import './countries.js';

// Each country's levels and map settings are declared in countries.js.
const {countries,byAdapter}=globalThis.AtlasCountries;
const definitions=Object.fromEntries(byAdapter('europe').map(id=>[id,{name:countries[id].en,prefix:countries[id].prefix,lang:countries[id].lang,...countries[id].map}]));
export const configurations=Object.fromEntries(Object.entries(definitions).map(([country,definition])=>[country,{country,firstLabel:'Country',searchLabel:'Find a place',...definition,base:`data/europe/${country}/`,nationalFlag:`vendor/flag-${definition.prefix}.svg`,contextLabels:true,flags:{},detailFlags:{},hasStatistics:()=>!!definition.statistics,attribution:`${definition.name}: <a href="data/europe/${country}/sources.json">Boundary sources & coverage</a>`}]));
// Unreleased countries are added only once developer mode allows one, so public
// visitors download none of their geometry.
export function createEurope(map,host){
 const portals={};let adding=null;
 const allowedAny=()=>Object.keys(configurations).some(country=>window.AtlasDev?.allows(country));
 function ensure(){if(!allowedAny())return Promise.resolve();adding??=(async()=>{
  // Subdivision flags load with the countries, so public visitors download none.
  const {europeFlags}=await import('./europe-flags.mjs');
  for(const [country,c] of Object.entries(configurations)){Object.assign(c.flags,europeFlags[country]?.firstFlags);Object.assign(c.detailFlags,europeFlags[country]?.detailFlags);portals[country]=await addRegionalCountry(map,host,c);}
 })();return adding;}
 return {portals,ensure,handles:country=>country in configurations,syncDeveloper(){for(const portal of Object.values(portals))portal.sync();}};
}
