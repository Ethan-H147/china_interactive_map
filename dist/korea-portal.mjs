import {loadCompressed} from './korea-data.mjs';
import {createKoreaAtlas} from './korea.js';
import {lineData,adaptiveOpacity,lineSourceOptions} from './adaptive-lines.mjs';
export async function addKoreaPortal(map,host){
 const data=await loadCompressed('data/korea-outline.bin');
 map.addSource('korea-portal',{type:'geojson',data,tolerance:0,maxzoom:18,buffer:128});
 map.addSource('korea-portal-edges',{...lineSourceOptions,data:lineData(data)});
 map.addLayer({id:'korea-portal-fill',type:'fill',source:'korea-portal',paint:{'fill-color':'#d7d7d3','fill-opacity':1,'fill-antialias':false}},'province-fill');
 map.addLayer({id:'korea-portal-line',type:'line',source:'korea-portal-edges',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#aaa9a2','line-width':.75,'line-opacity':adaptiveOpacity()}},'province-fill');
 const controller=createKoreaAtlas(map,host);
 const visit=()=>{if(!controller.active&&!host.isBusy())host.switchAtlas('korea');};
 map.on('click',['korea-portal-fill','korea-portal-fill-motion'],visit);
 return Object.assign(controller,{context(active){map.setPaintProperty('korea-portal-line','line-opacity',active?0:adaptiveOpacity());}});
}
