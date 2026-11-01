import {sceneLayers} from './map-scene.mjs';
import './countries.js';
const {countries}=globalThis.AtlasCountries;
export function applyAtlasTheme(map,country){
 document.body.dataset.atlas=country;
 document.documentElement.dataset.atlas=country;
 map.setPaintProperty('background','background-color',countries[country].background);
 for(const layer of sceneLayers(map))if(layer.metadata?.atlas?.sea)map.setPaintProperty(layer.id,'fill-color',countries[country].background);
}
