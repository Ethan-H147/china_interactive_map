import {placeLines} from './settlement-layer.mjs';
import {setLayerVisible} from './adaptive-lines.mjs';
// Small reference points share the country lifecycle, language and label collision rules.
export function createRegionalCapitals(map,{country,base,line,onSelect,labelPriority=.8}){
 const id=country+'-capitals';let points=[],active=false,generation=0;
 return {
  async warm(){
   if(map.getSource(id))return;const token=generation,response=await fetch(base+'capitals.json');if(!response.ok)throw Error('Capital locations unavailable');const data=await response.json();if(token!==generation)throw new DOMException('Country changed','AbortError');points=data.records;
   map.addSource(id,{type:'geojson',data:{type:'FeatureCollection',features:points.map(p=>({type:'Feature',properties:{id:p.id,parent:p.parent},geometry:{type:'Point',coordinates:p.center}}))}});
   map.addLayer({id,type:'circle',source:id,layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],3,2.5,9,4],'circle-color':line,'circle-stroke-color':'#fffdf8','circle-stroke-width':1.25}});
  },
  sync(visible){active=!!visible;setLayerVisible(map,id,active);},
  labels(language,bounds,selected){return active?points.filter(p=>p.center[0]>=bounds.getWest()&&p.center[0]<=bounds.getEast()&&p.center[1]>=bounds.getSouth()&&p.center[1]<=bounds.getNorth()).map(p=>({...p,lines:placeLines(p,language),selected:p.parent===selected,priority:labelPriority,className:'settlement-label',onClick:()=>onSelect(p.parent)})):[];},
  pick(point){if(!active||!map.getLayer(id))return;return map.queryRenderedFeatures(point,{layers:[id]})[0]?.properties.parent;},
  dispose(){generation++;active=false;points=[];if(map.getLayer(id))map.removeLayer(id);if(map.getSource(id))map.removeSource(id);}
 };
}
