import {addWorkerSource} from './geo-pack.mjs';
import {createKoreaAtlas} from './korea.js';
export async function addKoreaPortal(map,host){
 await addWorkerSource(map,'korea-portal','data/korea-context.bin',{type:'geojson',tolerance:0,maxzoom:18,buffer:128});
 map.addLayer({id:'korea-portal-fill',type:'fill',source:'korea-portal',paint:{'fill-color':'#d7d7d3','fill-opacity':1,'fill-antialias':false}},map.getLayer('province-fill')?'province-fill':undefined);
 const controller=createKoreaAtlas(map,host);
 return Object.assign(controller,{context(){}});
}
