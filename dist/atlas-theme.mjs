import './countries.js';
const {countries}=globalThis.AtlasCountries;
export function applyAtlasTheme(map,country){
 document.body.dataset.atlas=country;
 document.documentElement.dataset.atlas=country;
 map.setPaintProperty('background','background-color',countries[country].background);
}
