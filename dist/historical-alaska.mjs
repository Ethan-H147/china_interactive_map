import {compactUrl,decodeData,fetchBytes} from './geo-pack.mjs';
// Physical land comes from the same Alaska feature as the administrative map.
// This display replacement does not rewrite any historical jurisdiction data.
export function createHistoricalAlaska(map,{country,base,packShapes,shapeAt,ownLayers}){
 const id=country+'-history-alaska';ownLayers.add(id);let data,url,shapes,replaced;
 return {
  async load(history){if(country!=='united-states')return;const bytes=await fetchBytes(compactUrl(base+'history/alaska.bin'));data=await decodeData(bytes);if(data.historySource!==history.source.sha256)throw Error('Alaska land does not match the retained history');url=URL.createObjectURL(new Blob([bytes]));shapes=packShapes(data.land.features);replaced=new Set([...data.affected.faces,data.face]);},
  exclude(field,filter){if(!data)return filter;const ids=data.affected[field==='f'?'faces':field==='a'?'edges':'borders'];return ['all',filter,['!',['in',['get',field],['literal',ids]]]];},
  // A dated face this land display replaces; off Alaska's land such a face is sea or hidden coast.
  replaces(face){return !!replaced?.has(face);},
  pick(point){if(!data)return undefined;const hit=shapeAt(map,shapes,point);if(hit)return data.face;const p=map.unproject(point),x=((p.lng+540)%360+360)%360-180;return p.lat>50&&(x<-129||x>170)?null:undefined;},
  draw(config,colorOf){if(!data)return;if(!map.getSource(id)){map.addSource(id,{type:'geojson',data:'atlas-data://'+id+'?url='+encodeURIComponent(url)+'&member=land',tolerance:.25});map.addLayer({id,type:'fill',source:id,paint:{'fill-color':'rgba(0,0,0,0)','fill-antialias':false}});}const unit=config.units[config.face[data.face]];map.setPaintProperty(id,'fill-color',unit?colorOf(unit):'rgba(0,0,0,0)');},
  remove(){if(map.getLayer(id))map.removeLayer(id);if(map.getSource(id))map.removeSource(id);},
  dispose(){this.remove();if(url)URL.revokeObjectURL(url);data=null;shapes=null;url=null;replaced=null;}
 };
}
