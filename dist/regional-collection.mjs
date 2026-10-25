import {addRegionalCountry} from './regional-country.mjs';
import {createCountryLoader} from './country-loader.mjs';

export function createRegionalCollection(map,host,configurations,{prepare=async()=>{},load=addRegionalCountry}={}){
 const portals={};
 const loader=createCountryLoader(async country=>{
  const config=configurations[country];if(!config)throw Error('Unknown country: '+country);
  await prepare(country,config);
  const portal=await load(map,host,config);portals[country]=portal;return portal;
 });
 return {portals,handles:country=>country in configurations,status:loader.status,
  ensure(country){
   if(country){
    const dependencies=configurations[country]?.previewCountries||[];
    return dependencies.length?Promise.all([loader.ensure(country),...dependencies.map(id=>loader.ensure(id))]).then(([portal])=>portal):loader.ensure(country);
   }
   const background=Object.keys(configurations).filter(id=>!configurations[id].snapshot);
   return loader.ensureAll(background).then(results=>{
    results.forEach((result,i)=>{if(result.status==='rejected')console.warn(background[i]+' outline could not load',result.reason);});
    return results;
   });
  },
  syncDeveloper(){for(const portal of Object.values(portals))portal.sync();}
 };
}
