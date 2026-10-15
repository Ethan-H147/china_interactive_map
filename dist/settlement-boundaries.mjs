import {loadCompressed} from './korea-data.mjs';
import {lineData,lineSourceOptions,adaptiveOpacity,setLayerVisible} from './adaptive-lines.mjs';

// Census places are an independent layer, never another administrative level.
// Keep just one province's polygons installed and discard superseded requests.
export function createSettlementBoundaries(map,{country,base,manifest,line,fill,onChange=()=>{},load=loadCompressed}){
 const source=country+'-city-regions',edge=country+'-city-edges',outline=country+'-city-outlines';
 const layers=[country+'-city-hit',country+'-city-fill',country+'-city-selected'];
 let province=null,pending=null,epoch=0,selected='',enabled=true,active=true,opacity=1,installed=false;
 function remove(){for(const id of layers)if(map.getLayer(id))map.removeLayer(id);for(const id of [source,edge,outline])if(map.getSource(id))map.removeSource(id);installed=false;province=null;}
 function sync(){if(!installed)return;for(const id of layers)setLayerVisible(map,id,active&&enabled&&!!selected);for(const id of layers.slice(0,2))map.setFilter(id,['==',['get','id'],selected]);map.setFilter(layers[2],['==',['get','id'],selected]);map.setPaintProperty(layers[1],'fill-opacity',.2*opacity);}
 async function setProvince(id,selection=''){
  selected=selection||'';sync();if(!selected){this.clear();return;}if(!active||!enabled||!manifest.provinces[id])return;
  if(province===id)return;if(pending?.id===id)return pending.promise;
  pending?.controller.abort();const token=++epoch;remove();
  const job={id,controller:new AbortController()};pending=job;
  job.promise=(async()=>{try{
   const data=await load(base+manifest.provinces[id].file,{signal:job.controller.signal});if(token!==epoch||!active||!enabled)return;
   map.addSource(source,{type:'geojson',data:data.regions,promoteId:'id',attribution:'Census 2011 · Statistics South Africa',tolerance:0,buffer:128,maxzoom:16});
   map.addSource(edge,{...lineSourceOptions,tolerance:1.5,data:lineData(data.boundaries)});
   // The selected outline as lines split below the renderer's vertex limit.
   map.addSource(outline,{...lineSourceOptions,tolerance:0,data:lineData(data.regions)});
   const before=map.getLayer(country+'-settlements')?country+'-settlements':undefined;
   map.addLayer({id:layers[0],type:'fill',source,minzoom:7,paint:{'fill-color':fill,'fill-opacity':0}},before);
   map.addLayer({id:layers[1],type:'fill',source,filter:['==',['get','id'],selected],paint:{'fill-color':fill,'fill-opacity':.2}},before);
   map.addLayer({id:layers[2],type:'line',source:outline,filter:['==',['get','id'],selected],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':line,'line-width':['interpolate',['linear'],['zoom'],4,.6,8,1.1,13,1.8],'line-opacity':adaptiveOpacity()}},before);
   installed=true;province=id;sync();onChange();
  }catch(error){if(token===epoch)remove();if(error.name!=='AbortError')throw error;}finally{if(pending===job)pending=null;}})();return job.promise;
 }
 return {setProvince,select(id){selected=id||'';sync();},setEnabled(value){enabled=!!value;if(!enabled)this.clear();sync();},appearance(satellite,amount){opacity=satellite?1-amount:1;if(installed){for(const id of layers.slice(2))map.setPaintProperty(id,'line-color',satellite&&amount>.5?'#fff0bb':line);sync();}},pick(point){if(!active||!enabled||!installed||!selected||map.getZoom()<7)return null;return map.queryRenderedFeatures(point,{layers:[layers[0]]}).find(f=>f.properties.id===selected)?.properties.id||null;},clear(){selected='';epoch++;pending?.controller.abort();pending=null;remove();},leave(){active=false;this.clear();},enter(){active=true;},get province(){return province;},get pending(){return !!pending;},bounds:id=>manifest.cities[id]?.bounds};
}
