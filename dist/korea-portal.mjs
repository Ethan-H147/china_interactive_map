import {loadCompressed} from './korea-data.mjs';
export async function addKoreaPortal(map){
 const data=await loadCompressed('data/korea-outline.bin');
 map.addSource('korea-portal',{type:'geojson',data,tolerance:0,maxzoom:18,buffer:128});
 map.addLayer({id:'korea-portal-fill',type:'fill',source:'korea-portal',paint:{'fill-color':'#e3d4b8','fill-opacity':.8,'fill-antialias':false}},'province-fill');
 map.addLayer({id:'korea-portal-line',type:'line',source:'korea-portal',paint:{'line-color':'#987343','line-width':1.1}},'province-fill');
 const visit=()=>{if(!map.isMoving()&&document.getElementById('map-shell').getAttribute('aria-busy')!=='true')location.assign('korea.html');};
 map.on('click','korea-portal-fill',visit);
 const el=document.createElement('button');el.className='korea-portal-label';el.textContent='Korea · 한반도';el.setAttribute('aria-label','Explore North and South Korea');el.onclick=visit;
 new window.maplibregl.Marker({element:el}).setLngLat([128.05,38.7]).addTo(map);
}
