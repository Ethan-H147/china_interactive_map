import {loadCompressed} from './korea-data.mjs';
import {lineData,lineSourceOptions,adaptiveOpacity,setLayerVisible} from './adaptive-lines.mjs';

// Census places are an independent layer, never another administrative level.
// Keep just one province's polygons installed and discard superseded requests.
export function createSettlementBoundaries(map,{country,base,manifest,line,fill,onChange=()=>{},load=loadCompressed}){
 const source=country+'-city-regions',edge=country+'-city-edges';
 const layers=[country+'-city-hit',country+'-city-fill',country+'-city-lines',country+'-city-selected'];
 let province=null,pending=null,epoch=0,selected='',enabled=true,active=true,opacity=1,installed=false;
 function remove(){for(const id of layers)if(map.getLayer(id))map.removeLayer(id);for(const id of [source,edge])if(map.getSource(id))map.removeSource(id);installed=false;province=null;}
 function sync(){if(!installed)return;for(const id of layers)setLayerVisible(map,id,active&&enabled);map.setFilter(layers[1],['==',['get','id'],selected]);map.setFilter(layers[3],['in',selected,['get','owners']]);map.setPaintProperty(layers[1],'fill-opacity',.2*opacity);}
 async function setProvince(id,selection=''){
  selected=selection||'';sync();if(!active||!enabled||!manifest.provinces[id])return;
  if(province===id)return;if(pending?.id===id)return pending.promise;
  pending?.controller.abort();const token=++epoch;remove();
  const job={id,controller:new AbortController()};pending=job;
  job.promise=(async()=>{try{
   const data=await load(base+manifest.provinces[id].file,{signal:job.controller.signal});if(token!==epoch||!active||!enabled)return;
   map.addSource(source,{type:'geojson',data:data.regions,promoteId:'id',attribution:'Census 2011 · Statistics South Africa',tolerance:0,buffer:128,maxzoom:16});
   map.addSource(edge,{...lineSourceOptions,tolerance:1.5,data:lineData(data.boundaries)});
   const before=map.getLayer(country+'-settlements')?country+'-settlements':undefined;
   map.addLayer({id:layers[0],type:'fill',source,minzoom:7,paint:{'fill-color':fill,'fill-opacity':0}},before);
   map.addLayer({id:layers[1],type:'fill',source,filter:['==',['get','id'],selected],paint:{'fill-color':fill,'fill-opacity':.2}},before);
   for(const [id,highlight] of [[layers[2],false],[layers[3],true]])map.addLayer({id,type:'line',source:edge,...(highlight?{filter:['in',selected,['get','owners']]}:{minzoom:7}),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':line,'line-width':['interpolate',['linear'],['zoom'],4,highlight?.6:.25,8,highlight?1.1:.45,13,highlight?1.8:.75],'line-opacity':adaptiveOpacity(highlight?1:.7)}},before);
   installed=true;province=id;sync();onChange();
  }catch(error){if(token===epoch)remove();if(error.name!=='AbortError')throw error;}finally{if(pending===job)pending=null;}})();return job.promise;
 }
 return {setProvince,select(id){selected=id||'';sync();},setEnabled(value){enabled=!!value;if(!enabled)this.clear();sync();},appearance(satellite,amount){opacity=satellite?1-amount:1;if(installed){for(const id of layers.slice(2))map.setPaintProperty(id,'line-color',satellite&&amount>.5?'#fff0bb':line);sync();}},pick(point){if(!active||!enabled||!installed||map.getZoom()<7)return null;return map.queryRenderedFeatures(point,{layers:[layers[0]]})[0]?.properties.id||null;},clear(){epoch++;pending?.controller.abort();pending=null;remove();},leave(){active=false;this.clear();},enter(){active=true;},get province(){return province;},get pending(){return !!pending;},bounds:id=>manifest.cities[id]?.bounds};
}
