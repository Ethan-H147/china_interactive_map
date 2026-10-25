import {addRegionalCountry} from './regional-country.mjs';
import {withTelephoneAreas} from './telephone-areas.mjs';
import {createRegionalCollection} from './regional-collection.mjs';
import {southernAfricaFlags} from './southern-africa-flags.mjs';
import './countries.js';

// Each country's levels and map settings are declared in countries.js.
const {countries,byAdapter}=globalThis.AtlasCountries;
const definitions=Object.fromEntries(byAdapter('southern-africa').map(id=>[id,{name:countries[id].en,prefix:countries[id].prefix,lang:countries[id].lang,...countries[id].map}]));
export const configurations=Object.fromEntries(Object.entries(definitions).map(([country,definition])=>[country,{country,...definition,base:`data/southern-africa/${country}/`,nationalFlag:`vendor/flag-${definition.prefix}.svg`,contextLabels:true,flags:southernAfricaFlags[country]?.firstFlags||{},detailFlags:southernAfricaFlags[country]?.detailFlags||{},hasStatistics:()=>true,attribution:`${definition.name}: <a href="data/southern-africa/${country}/sources.json">Boundary sources & coverage</a>`}]));
export async function addSouthernAfrica(map,host){
 const collection=createRegionalCollection(map,host,configurations,{load:async(map,host,config)=>{const adapter=await addRegionalCountry(map,host,config);return config.country==='south-africa'?withTelephoneAreas(map,host,adapter,{country:config.country,name:'South Africa',prefix:'za',idPrefix:'ZA',base:config.base+'area-codes/',portalSource:'south-africa-portal',fill:'#f1f3ec',selected:'#bdd49c',line:'#4d6c3b'}):adapter;}});
 return collection;
}
