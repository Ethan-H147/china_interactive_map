import {loadCompressed} from './korea-data.mjs';
import {createPlaceSearch} from './place-search.mjs';
import {lineSourceOptions,adaptiveOpacity} from './adaptive-lines.mjs';

export function createArgentinaLocal(map,host,config={}){
 let index,indexJob,search,worker,rejectPending,epoch=0,entry,scope=null,mode=1,wait,loadJob;
 const base=config.base||'data/south-america/argentina-local/',prefix=config.prefix||'arg-local-',level=config.level||2,noun=config.noun||'subdivisions';
 const selectedId=()=>{const record=host.selected();return record?.level===level?(config.level===3?record.boundaryId:record.id)||null:null;};
 async function warm(first){
  if(index)return;
  indexJob||=loadCompressed(base+'index.bin').then(value=>{index=value;search=createPlaceSearch([...first,...value.records]);}).catch(error=>{indexJob=null;throw error;});
  await indexJob;
 }
 function release(){
  epoch++;loadJob=null;wait?.abort();wait=null;worker?.terminate();worker=null;rejectPending?.(new DOMException('Subdivision view changed','AbortError'));rejectPending=null;
  if(entry){for(const id of [...entry.layers].reverse())if(map.getLayer(id))map.removeLayer(id);for(const id of entry.sources)if(map.getSource(id))map.removeSource(id);entry.urls.forEach(URL.revokeObjectURL);entry=null;}
 }
 function sync(){
  if(!entry)return;
  const visible=host.active()&&(config.selectedOnly||mode===2)&&scope===entry.scope;
  for(const id of entry.layers)map.setLayoutProperty(id,'visibility',visible?'visible':'none');
  map.setLayoutProperty(entry.layers[1],'visibility',visible&&host.outlines()&&!config.selectedOnly?'visible':'none');
  map.setFilter(entry.layers[2],['in',selectedId()||'',['get','regionIds']]);
  const next=selectedId();
  if(entry.selected!==next){if(entry.selected)map.setFeatureState({source:entry.sources[0],id:entry.selected},{selected:false});if(next)map.setFeatureState({source:entry.sources[0],id:next},{selected:true});entry.selected=next;}
 }
 function show(parent){
  const next=parent||null;if(loadJob&&scope===next&&host.active()&&mode===2)return loadJob;
  scope=next;const job=install();loadJob=job;const done=()=>{if(loadJob===job)loadJob=null;};job.then(done,done);return job;
 }
 async function install(){
  if(!host.active()||(!config.selectedOnly&&mode!==2)||!scope||(config.base&&!index?.groups[scope])){release();host.status('');host.changed();return;}
  if(entry?.scope===scope){sync();return;}
  release();const token=epoch,requested=scope;
  host.status('');
  let staged;
  try{
   const payload=await new Promise((resolve,reject)=>{
    rejectPending=reject;const task=new Worker(new URL('./south-america-worker.mjs',import.meta.url),{type:'module'});worker=task;
    const finish=()=>{task.terminate();if(worker===task){worker=null;rejectPending=null;}};
    task.onmessage=({data})=>{finish();data.error?reject(Error(data.error)):resolve(data);};task.onerror=e=>{finish();reject(Error(e.message));};
    task.postMessage({url:base+requested+'.bin'});
   });
   if(token!==epoch||!host.active())return;
   staged={scope:requested,records:payload.records,sources:[],layers:[],urls:[]};
   for(const [name,blob] of Object.entries(payload.sources)){const id=prefix+requested+'-'+name,url=URL.createObjectURL(blob);staged.sources.push(id);staged.urls.push(url);map.addSource(id,{type:'geojson',data:url,promoteId:name==='regions'?'id':undefined,tolerance:.25,buffer:64,maxzoom:16,...(config.adaptive&&name==='lines'?lineSourceOptions:{}),attribution:config.attribution||'Departments / partidos / comunas: <a href="https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/CapasSIG">IGN, Argentina</a>'});}
   const add=layer=>{layer.layout={...layer.layout,visibility:'none'};map.addLayer(layer,config.before||'south-argentina-borders');staged.layers.push(layer.id);};
   add({id:prefix+requested+'-fill',type:'fill',source:staged.sources[0],paint:{'fill-color':config.fill||'#a9cee6','fill-opacity':['case',['boolean',['feature-state','selected'],false],config.selectedOnly?.18:.65,0],'fill-antialias':false}});
   add({id:prefix+requested+'-borders',type:'line',source:staged.sources[1],layout:{'line-join':'round'},paint:{'line-color':config.line||'#5883a0','line-width':['interpolate',['linear'],['zoom'],3,.4,8,.8],'line-opacity':config.adaptive?adaptiveOpacity(.65):.65}});
   add({id:prefix+requested+'-selection',type:'line',source:staged.sources[1],filter:['in','',['get','regionIds']],layout:{'line-join':'round'},paint:{'line-color':config.line||'#3979a3','line-width':2,...(config.adaptive?{'line-opacity':adaptiveOpacity()}: {})}});
   wait=new AbortController();await host.waitForSources(staged.sources,wait.signal);
   if(token!==epoch||!host.active())return;
   entry=staged;staged=null;sync();host.status('');host.changed();
  }catch(error){if(token===epoch&&error.name!=='AbortError')host.status('Could not load '+noun+'. Select the '+(config.parentNoun||'province')+' again to retry.');}
  finally{if(staged){for(const id of [...staged.layers].reverse())if(map.getLayer(id))map.removeLayer(id);for(const id of staged.sources)if(map.getSource(id))map.removeSource(id);staged.urls.forEach(URL.revokeObjectURL);}}
 }
 function setMode(value,automatic=false,parent=scope){
  if(automatic&&document.getElementById('mode-lock').getAttribute('aria-pressed')==='true')return show(parent);
  mode=value===2?2:1;
  document.getElementById('mode-province').setAttribute('aria-pressed',String(mode===1));document.getElementById('mode-prefecture').setAttribute('aria-pressed',String(mode===2));document.getElementById('map-shell').dataset.level=mode===1?'province':'prefecture';
  document.getElementById('map-hint').textContent=config.parentNoun?(mode===1?'Select a state':parent?'Select a municipality':'Select a state to view municipalities'):mode===1?'Select a province':config.level===3?(parent?'Select a city':'Select a province to view cities'):parent==='AR-06'?'Select a partido':parent==='AR-02'?'Select a comuna':parent?'Select a department':'Select a province to view subdivisions';
  return show(parent);
 }
 return{warm,search:q=>search?.(q)||[],find:id=>index?.records.find(r=>r.id===id),children:parent=>index?.records.filter(r=>r.parent===parent)||[],
  get mode(){return mode;},get scope(){return scope;},get records(){return index?.records||[];},get visibleRecords(){return mode===2?entry?.records||[]:[];},
  show,setMode,sync,clear(){scope=null;release();host.status('');if(host.active()){document.getElementById('map-hint').textContent=mode===1?'Select a province':'Select a province to view subdivisions';host.changed();}},hit(point){if(mode!==2||!entry)return;const feature=map.queryRenderedFeatures(point,{layers:[entry.layers[0]]})[0];return feature&&index.records.find(r=>r.id===feature.properties.id);}
 };
}
