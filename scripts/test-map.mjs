export function testMap(){
 const layers=[],sources=new Map(),events=new Map();
 const emit=(type,event)=>{for(const handler of events.get(type)||[])handler(event);};
 const map={
  getStyle:()=>({version:8,sources:Object.fromEntries(sources),layers:structuredClone(layers)}),
  getLayer:id=>layers.find(l=>l.id===id),getSource:id=>sources.get(id),
  addSource(id,source){if(sources.has(id))throw Error('Duplicate source: '+id);sources.set(id,source);},
  removeSource(id){sources.delete(id);},
  addLayer(layer,before){if(map.getLayer(layer.id))throw Error('Duplicate layer: '+layer.id);const i=layers.findIndex(l=>l.id===before);layers.splice(i<0?layers.length:i,0,structuredClone(layer));},
  removeLayer(id){const i=layers.findIndex(l=>l.id===id);if(i>=0)layers.splice(i,1);},
  moveLayer(id,before){const layer=map.getLayer(id);if(!layer)throw Error('Missing layer: '+id);layers.splice(layers.findIndex(l=>l.id===id),1);const i=layers.findIndex(l=>l.id===before);layers.splice(i<0?layers.length:i,0,layer);},
  setPaintProperty(id,key,value){(map.getLayer(id).paint??={})[key]=structuredClone(value);},
  getPaintProperty:(id,key)=>map.getLayer(id)?.paint?.[key],
  setLayoutProperty(id,key,value){(map.getLayer(id).layout??={})[key]=value;},
  getLayoutProperty:(id,key)=>map.getLayer(id)?.layout?.[key],
  on(type,handler){if(!events.has(type))events.set(type,new Set());events.get(type).add(handler);},
  off(type,handler){events.get(type)?.delete(handler);},
  emit
 };return map;
}
