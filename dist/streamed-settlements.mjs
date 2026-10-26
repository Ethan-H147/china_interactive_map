import {loadCompressed} from './korea-data.mjs';
import {localityRecord,normalizeLocalityQuery} from './locality-search-index.mjs';
import {settlementDotLayers} from './settlement-layer.mjs';
const empty=()=>({type:'FeatureCollection',features:[]});
const feature=r=>({type:'Feature',properties:{id:r.id,minzoom:r.dotzoom,dotzoom:r.dotzoom},geometry:{type:'Point',coordinates:r.center}});
export function mergeLocalityResults(local,remote,query){
 const q=normalizeLocalityQuery(query),rows=remote.slice();
 for(const record of local){const names=[record.en,record.local,...(record.aliases||[]),record.en+' '+record.parentName,record.parentName+' '+record.en].filter(Boolean).map(normalizeLocalityQuery);rows.push({record,rank:names.includes(q)?0:names.some(n=>n.startsWith(q))?1:2});}
 const group=r=>r.settlement?(r.kind==='City / town'?-1:1):0;
 rows.sort((a,b)=>a.rank-b.rank||group(a.record)-group(b.record)||a.record.level-b.record.level||(a.record.searchOrder??Infinity)-(b.record.searchOrder??Infinity)||a.record.en.localeCompare(b.record.en));
 const seen=new Set();return rows.filter(r=>!seen.has(r.record.id)&&seen.add(r.record.id)).slice(0,20).map(r=>r.record);
}
export async function createStreamedSettlements(map,{country,base,manifestFile,color,onRecords,onError=()=>{}}){
 const url=new URL(base+manifestFile,location.href),root=new URL('./',url),manifest=await loadCompressed(url),source=country+'-settlements',cache=new Map(),locators=new Map(),requests=new Map();
 let enabled=false,closed=false,selected=null,worker=null,messageId=0,epoch=0,abort=null,busy=false,current=[],visible=[],viewKey='',lastError=null;const lifetime=new AbortController();
 map.addSource(source,{type:'geojson',promoteId:'id',data:empty(),maxzoom:16});
 const layers=settlementDotLayers(source,{features:manifest.zooms.map(dotzoom=>({properties:{dotzoom}}))},color);for(const layer of layers)map.addLayer(layer);
 const layerIds=layers.map(l=>l.id);
 const remember=(key,value)=>{cache.delete(key);cache.set(key,value);while(cache.size>manifest.cacheTiles)cache.delete(cache.keys().next().value);};
 async function tile(id,signal=lifetime.signal){if(cache.has(id)){const value=cache.get(id);remember(id,value);return value;}const rows=await loadCompressed(new URL('tiles/'+id+'.bin',root),{signal});if(!closed&&!signal?.aborted)remember(id,rows);return rows;}
 function publish(records){if(closed||!map.getSource(source))return;visible=records;const all=new Map(records.map(r=>[r.id,r]));if(selected)all.set(selected.id,selected);current=[...all.values()];const features=current.map(feature);map.getSource(source).setData({type:'FeatureCollection',features});onRecords(current,features);}
 async function refresh(force=false){
  if(closed||!enabled||map.isMoving())return;const b=map.getBounds(),bounds=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()],zoom=map.getZoom(),key=bounds.map(v=>v.toFixed(5)).join(',')+'|'+zoom.toFixed(2);
  if(!force&&viewKey===key)return;viewKey=key;const token=++epoch;abort?.abort();abort=new AbortController();const signal=abort.signal;busy=true;lastError=null;
  const crosses=bounds[0]>bounds[2],inside=p=>p[1]>=bounds[1]&&p[1]<=bounds[3]&&(crosses?p[0]>=bounds[0]||p[0]<=bounds[2]:p[0]>=bounds[0]&&p[0]<=bounds[2]);
  const tiles=manifest.tiles.filter(t=>t.minzoom<=zoom&&t.bounds[3]>=bounds[1]&&t.bounds[1]<=bounds[3]&&(crosses?t.bounds[2]>=bounds[0]||t.bounds[0]<=bounds[2]:t.bounds[2]>=bounds[0]&&t.bounds[0]<=bounds[2])),records=new Map();let cursor=0;
  try{await Promise.all(Array.from({length:Math.min(3,tiles.length)},async()=>{while(cursor<tiles.length){const t=tiles[cursor++],rows=await tile(t.id,signal);if(closed||token!==epoch)return;for(const row of rows)if(row[6]<=zoom&&inside([row[2],row[3]])){const r=localityRecord(row,manifest);records.set(r.id,r);}}}));if(!closed&&token===epoch)publish([...records.values()]);}
  catch(error){if(error.name!=='AbortError'&&token===epoch){lastError=error.message;viewKey='';onError(error);}}
  finally{if(token===epoch)busy=false;}
 }
 function rpc(type,fields){
  if(closed)return Promise.reject(new DOMException('Country changed','AbortError'));
  if(!worker){worker=new Worker(new URL('./locality-search-worker.mjs',import.meta.url),{type:'module'});worker.postMessage({type:'init',manifest:{parents:manifest.parents,recordDefaults:manifest.recordDefaults,metricDefaults:manifest.metricDefaults,indexUrl:new URL(manifest.search.file,root).href}});worker.onmessage=({data})=>{const request=requests.get(data.id);if(!request)return;requests.delete(data.id);data.error?request.reject(Error(data.error)):request.resolve(data.result);};worker.onerror=event=>{for(const request of requests.values())request.reject(Error(event.message));requests.clear();worker?.terminate();worker=null;};}
  const id=++messageId;return new Promise((resolve,reject)=>{requests.set(id,{resolve,reject});worker.postMessage({id,type,...fields});});
 }
 async function resolve(id){
  if(closed||!/^MX-LOC-\d{9}$/.test(String(id)))return null;const known=current.find(r=>r.id===id);if(known)return known;const state=id.slice(7,9),descriptor=manifest.locators[state];if(!descriptor)return null;
  if(!locators.has(state)){const pending=loadCompressed(new URL(descriptor.file,root),{signal:lifetime.signal});locators.set(state,pending);while(locators.size>2)locators.delete(locators.keys().next().value);pending.catch(()=>locators.delete(state));}
  const rows=await locators.get(state),code=+id.slice(7);let lo=0,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>>1;if(rows[mid][0]<code)lo=mid+1;else hi=mid;}if(rows[lo]?.[0]!==code||closed)return null;
  const points=await tile(String(rows[lo][1]));if(closed)return null;const row=points.find(r=>r[0]===code);return row?localityRecord(row,manifest):null;
 }
 const move=()=>{void refresh();};map.on('moveend',move);map.on('resize',move);
 return {layers:layerIds,manifest,merge:mergeLocalityResults,search:query=>rpc('search',{query}),children:(parent,query,offset)=>rpc('children',{parent,query,offset}),resolve,
  setEnabled(value){value=!!value;if(enabled===value)return;enabled=value;if(value){viewKey='';void refresh();}else{epoch++;abort?.abort();busy=false;cache.clear();publish([]);}},
  select(record){const next=record?.settlement?record:null;if(selected?.id===next?.id)return;selected=next;publish(visible);},
  retry(){void refresh(true);},
  stats(){return {cacheTiles:cache.size,cacheLimit:manifest.cacheTiles,cachedRecords:[...cache.values()].reduce((n,r)=>n+r.length,0),visibleRecords:current.length,worker:!!worker,pending:requests.size,busy,error:lastError};},
  dispose(){if(closed)return;closed=true;epoch++;abort?.abort();lifetime.abort();map.off('moveend',move);map.off('resize',move);worker?.terminate();worker=null;for(const request of requests.values())request.reject(new DOMException('Country changed','AbortError'));requests.clear();cache.clear();locators.clear();current=[];visible=[];selected=null;for(const id of layerIds)if(map.getLayer(id))map.removeLayer(id);if(map.getSource(source))map.removeSource(source);}
 };
}
