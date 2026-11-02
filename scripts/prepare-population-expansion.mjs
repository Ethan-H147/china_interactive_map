import fs from 'node:fs';
import '../dist/countries.js';
import {applyPopulationExpansion,populationExpansion} from './population-expansion.mjs';
for(const country of Object.keys(populationExpansion().countries)){
 const file=new URL('../dist/'+globalThis.AtlasCountries.countries[country].statistics,import.meta.url),data=JSON.parse(fs.readFileSync(file));
 console.log(country,applyPopulationExpansion(country,data));fs.writeFileSync(file,JSON.stringify(data));
}
