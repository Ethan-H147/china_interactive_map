import {loadCompressed} from './korea-data.mjs';
import {createKoreaAtlas} from './korea.js';
export async function addKoreaPortal(map,host){
 const data=await loadCompressed('data/korea-outline.bin');
 map.addSource('korea-portal',{type:'geojson',data,tolerance:0,maxzoom:18,buffer:128});
 map.addLayer({id:'korea-portal-fill',type:'fill',source:'korea-portal',paint:{'fill-color':'#d7d7d3','fill-opacity':1,'fill-antialias':false}},'province-fill');
 map.addLayer({id:'korea-portal-line',type:'line',source:'korea-portal',paint:{'line-color':'#aaa9a2','line-width':.9}},'province-fill');
 const controller=createKoreaAtlas(map,host);
 const visit=()=>{if(!controller.active&&!host.isBusy())host.switchAtlas('korea');};
 map.on('click','korea-portal-fill',visit);
 const marker=(text,position,action)=>{const el=document.createElement('button');el.className='korea-portal-label';el.textContent=text;el.onclick=action;return new window.maplibregl.Marker({element:el}).setLngLat(position);};
 const korea=marker('Korea · 한반도',[128.05,38.7],visit).addTo(map);
 const china=marker('China · 中国',[105,36],()=>host.switchAtlas('china'));
 return Object.assign(controller,{context(active){if(active){korea.remove();china.addTo(map);}else{china.remove();korea.addTo(map);}}});
}
