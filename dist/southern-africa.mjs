import {createRegionalCollection} from './regional-collection.mjs';
import {southernAfricaFlags} from './southern-africa-flags.mjs';
import './countries.js';

// Each country's levels and map settings are declared in countries.js.
const {countries,byAdapter}=globalThis.AtlasCountries;
const definitions=Object.fromEntries(byAdapter('southern-africa').map(id=>[id,{name:countries[id].en,prefix:countries[id].prefix,lang:countries[id].lang,...countries[id].map}]));
export const configurations=Object.fromEntries(Object.entries(definitions).map(([country,definition])=>[country,{country,...definition,base:`data/southern-africa/${country}/`,nationalFlag:`vendor/flag-${definition.prefix}.svg`,contextLabels:true,flags:southernAfricaFlags[country]?.firstFlags||{},detailFlags:southernAfricaFlags[country]?.detailFlags||{},hasStatistics:()=>true,attribution:`${definition.name}: <a href="data/southern-africa/${country}/sources.json">Boundary sources & coverage</a>`}]));
export async function addSouthernAfrica(map,host){
 const collection=createRegionalCollection(map,host,configurations);
 await collection.ensure();return collection;
}
