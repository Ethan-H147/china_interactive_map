export const countySources=['city-districts','city-district-boundaries','city-districts-selection-edges'];
export const emptyCollection=()=>({type:'FeatureCollection',features:[]});
export const mobileChinaUrl=(id,scope)=>'atlas-data://'+id+'?url='+encodeURIComponent(new URL('data/china-mobile/'+(scope?'counties/'+scope+'/':'')+id+(!scope&&id.endsWith('-selection-edges')?'-repaired':'')+'.bin',globalThis.location.href).href);
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
 let wanted=null,loaded=null,running=null,disposed=false;
 async function drain(){
  while(!disposed&&loaded!==wanted){
   const scope=wanted;loaded=undefined;
   for(const id of countySources)await setSourceData(map,id,emptyCollection());
   if(disposed)break;
   if(scope!==wanted)continue;
   if(scope)for(const id of countySources){
    if(disposed||scope!==wanted)break;
    await setSourceData(map,id,mobileChinaUrl(id,scope));
   }
   if(disposed)break;
   if(scope===wanted){loaded=scope;changed();}
  }
 }
 return {
  get loaded(){return loaded;},
  ensure(scope){wanted=scope||null;if(disposed)return Promise.resolve();if(!running&&loaded!==wanted)running=drain().finally(()=>{running=null;});return running||Promise.resolve();},
  async dispose(){disposed=true;wanted=null;await running?.catch(()=>{});loaded=null;}
 };
}
