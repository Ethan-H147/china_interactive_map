import {addWorkerSource} from './geo-pack.mjs';
import {emptyGeometryFiles} from './compact-files.mjs';

// Only shared background sources use this lifecycle. Active administrative sources,
// selections and their buffers remain owned by their existing country adapters.
const hubs=new WeakMap(),empty=new Set(emptyGeometryFiles);
const blobURL=source=>{const data=source?.serialize?.().data??source?.data;return typeof data==='string'&&data.startsWith('atlas-data://')?new URL(data).searchParams.get('url'):null;};
const revoke=record=>{if(record.blob?.startsWith('blob:'))URL.revokeObjectURL(record.blob);record.blob=null;};
export function createContextSources(map,scene,{definitions,onRestore=()=>{},onRelease=()=>{},loadSource=addWorkerSource,retentionMs=3000,now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}){
 if(!scene)throw Error('Context sources require the shared scene');
 // The shared hub owns these resources, independently of the first adapter's
 // temporary loading facade and its failure cleanup.
 map=map.style?.map||map;
 let hub=hubs.get(scene);
 if(!hub){
  const records=new Set();let queued=false,disposed=false,enabled=true,evictionTimer=null;
  const needed=record=>!record.disposed&&(record.definition.retain?.()||(!record.definition.visible||record.definition.visible())&&record.visibilityLayers.some(layer=>scene.contextLayerVisible(layer,record.file)));
  const wanted=record=>!record.disposed&&(!enabled||needed(record));
  const release=record=>{
   const changed=record.present;
   for(const layer of record.layers)if(map.getLayer(layer.id))map.removeLayer(layer.id);
   if(map.getSource(record.definition.id)){
    record.blob??=blobURL(map.getSource(record.definition.id));
    map.removeSource(record.definition.id);
   }
   revoke(record);
   record.layers=[];record.present=false;
   if(changed)record.onRelease();
  };
  const install=record=>{
   if(record.present||record.pending||record.empty||disposed)return record.pending;
   const d=record.definition;
   record.pending=(async()=>{
    try{
     await loadSource(map,d.id,d.url,d.options,d.transform,{skipEmpty:d.skipEmpty});
     if(disposed)return;
     record.blob=blobURL(map.getSource(d.id));
     // A camera reversal can finish a source download just after its last
     // visible frame. Keep that work through the same short residency window.
     if(record.disposed||!wanted(record)&&now()-record.lastNeeded>=retentionMs){release(record);return;}
     record.layers=d.layers();
     for(const layer of record.layers)map.addLayer(layer);
     record.present=true;record.onRestore();
    }catch(error){if(disposed)return;release(record);if(!record.disposed)throw error;}
    finally{record.pending=null;}
   })();
   return record.pending;
  };
  const refresh=()=>{
   queued=false;if(disposed)return;
   const time=now();let nextEviction=Infinity;
   if(evictionTimer!==null){clearTimer(evictionTimer);evictionTimer=null;}
   for(const record of records){
    if(needed(record))record.lastNeeded=time;
    if(wanted(record))install(record)?.catch(error=>console.warn('Country context could not load: '+record.definition.id,error));
    // Wheel zoom consists of many short gestures. Releasing at every moveend
    // repeatedly reparses identical geometry when the zoom reverses direction.
    else if(record.present&&!map.isMoving()){
     const remaining=record.lastNeeded+retentionMs-time;
     if(remaining<=0)release(record);else nextEviction=Math.min(nextEviction,remaining);
    }
   }
   if(Number.isFinite(nextEviction))evictionTimer=setTimer(()=>{evictionTimer=null;schedule();},nextEviction);
  };
  const schedule=()=>{if(!queued&&!disposed){queued=true;queueMicrotask(refresh);}};
  const events=['move','moveend','idle','atlascontextchange','style.load'];
  for(const event of events)map.on(event,schedule);
  map.on('remove',()=>{disposed=true;if(evictionTimer!==null)clearTimer(evictionTimer);for(const event of events)map.off(event,schedule);for(const record of records)revoke(record);records.clear();});
  hub={records,needed,wanted,install,release,schedule,setEnabled(value){enabled=!!value;schedule();},async whenReady(){refresh();await Promise.all([...records].map(r=>r.pending));},snapshot:()=>({enabled,registered:records.size,resident:[...records].filter(r=>r.present).map(r=>r.definition.id),pending:[...records].filter(r=>r.pending).map(r=>r.definition.id)})};
  hubs.set(scene,hub);globalThis.AtlasContextSourcesController=hub;
 }
 const records=definitions.map(definition=>{
  const file=definition.url.replace(/^data\//,''),visibilityLayers=definition.layers().map(layer=>definition.visible?{...layer,layout:{...layer.layout,visibility:'visible'}}:layer),record={definition,file,visibilityLayers,onRestore,onRelease,lastNeeded:-Infinity,present:false,pending:null,layers:[],empty:!!definition.skipEmpty&&empty.has(file)};
  hub.records.add(record);return record;
 });
 return {refresh:hub.schedule,dispose(){for(const record of records){record.disposed=true;hub.records.delete(record);hub.release(record);}},async ensure(){
  hub.schedule();
  await Promise.all(records.filter(hub.wanted).map(record=>{if(hub.needed(record))record.lastNeeded=now();return hub.install(record);}));
 }};
}
