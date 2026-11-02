import {addWorkerSource} from './geo-pack.mjs';
import {internationalBorderPaint,internationalLineSourceOptions} from './adaptive-lines.mjs';
import './countries.js';

// Keep runtime ownership and the packaged border inputs in one inventory.
export function borderPreviewDefinitions(){
 const registry=globalThis.AtlasCountries;
 return [...['europe','southern-africa'].flatMap(adapter=>registry.byAdapter(adapter).filter(country=>!registry.countries[country].snapshot).map(country=>({country,base:adapter+'/'+country}))),{country:'russia',base:'russia'}];
}

export function borderPreviewFilter(map,country){
 // This is the canonical precise border set, independent of loaded country adapters.
 return ['all',['!=',['coalesce',['get','claimedBy'],''],country],['any',['!',['has','claimants']],['in',country||'-',['get','claimants']]]];
}

// Country adapters load on demand. Their national borders must also be present
// when looking at a neighbour, without loading its sidebar or subdivisions.
export async function addBorderPreviews(map){
 const id='country-border-previews';
 await addWorkerSource(map,id,'data/country-border-previews.bin',internationalLineSourceOptions);
 const owners=borderPreviewDefinitions().map(({country})=>country+'-international');
 map.addLayer({id,type:'line',source:id,metadata:{atlasInternationalBorder:true,atlas:{role:'border',borderPreviewOwners:owners}},layout:{'line-join':'round','line-cap':'round'},paint:internationalBorderPaint()});
 let country='',previous;
 function sync(){
  const filter=borderPreviewFilter(map,country);
  const signature=JSON.stringify(filter);if(signature===previous)return;previous=signature;
  map.setFilter(id,filter);
 }
 const controller={setCountry(value){country=value;sync();}};
 globalThis.AtlasBorderPreviews=controller;
 // Country loading never removes precise preview geometry or reloads this source.
 sync();return controller;
}
