import {addWorkerSource} from './geo-pack.mjs';
import {addInternationalBorder,internationalLineSourceOptions} from './adaptive-lines.mjs';
import {getMapScene} from './map-scene.mjs';

export function borderPreviewFilter(map,country){
 const scene=getMapScene(map);
 const replaced=map.getStyle().layers.filter(l=>l.id!=='country-border-previews'&&l.metadata?.atlasInternationalBorder&&scene?.baseVisibility(l.id)!=='none').map(l=>l.id).sort();
 return ['all',['!',['in',['get','previewLayer'],['literal',replaced]]],['!=',['coalesce',['get','claimedBy'],''],country],['any',['!',['has','claimants']],['in',country||'-',['get','claimants']]]];
}

// Country adapters load on demand. Their national borders must also be present
// when looking at a neighbour, without loading its sidebar or subdivisions.
export async function addBorderPreviews(map){
 const id='country-border-previews';
 await addWorkerSource(map,id,'data/country-border-previews.bin',internationalLineSourceOptions);
 addInternationalBorder(map,id,id);
 let country='',previous;
 function sync(){
  const filter=borderPreviewFilter(map,country);
  const signature=JSON.stringify(filter);if(signature===previous)return;previous=signature;
  map.setFilter(id,filter);
 }
 const controller={setCountry(value){country=value;sync();}};
 globalThis.AtlasBorderPreviews=controller;
 // A newly installed or re-enabled adapter takes over its exact same geometry.
 map.on('styledata',sync);sync();return controller;
}
