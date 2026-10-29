import {createLatestScope} from './interaction-policy.mjs';
export const countySources=['city-districts','city-district-boundaries','city-districts-selection-edges'];
export const emptyCollection=()=>({type:'FeatureCollection',features:[]});
export const mobileChinaUrl=(id,scope)=>'atlas-data://'+id+'?url='+encodeURIComponent(new URL((String(scope).startsWith('TW-')?'data/taiwan-townships/'+scope+'/':'data/china-mobile/'+(scope?'counties/'+scope+'/':''))+id+'.bin',globalThis.location.href).href)+(id.endsWith('-selection-edges')?'&transform=selection-outline':'');
export function setSourceData(map,id,data){
 return new Promise((resolve,reject)=>{
  const failed=event=>{if(event.sourceId===id)reject(event.error||Error('China source failed: '+id));};
  map.on('error',failed);
  Promise.resolve().then(()=>map.getSource(id)?.setData(data)).then(resolve,reject).finally(()=>map.off('error',failed));
 });
}

// A single replaceable county area. Serialize changes so rapid taps cannot accumulate
// geometry loads or let an older response replace the most recently selected area.
export function createCountyScope(map,{changed=()=>{}}={}){
 return createLatestScope(async(scope,current)=>{
  for(const id of countySources){if(!current())return;await setSourceData(map,id,mobileChinaUrl(id,scope));}
 },{clear:async()=>{for(const id of countySources)await setSourceData(map,id,emptyCollection());},changed});
}
