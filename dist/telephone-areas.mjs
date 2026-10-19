import {configureMapViewPicker,clearMapViewPicker} from './map-view-picker.mjs';
import {createCountryPage,setMapBreadcrumb} from './country-page.mjs';
import {loadCompressed} from './korea-data.mjs';
import {createPlaceSearch} from './place-search.mjs';
import {onMapHover} from './pointer-performance.mjs';
// Telephone coverage is an independent map view, with its own selection and source scope.
export function withTelephoneAreas(map,host,administrative,config){
 const {country,prefix,base,portalSource,fill,line,selected:selectionColor}=config,key=country+'-telephone',ui=prefix+'-phone-view-',$=id=>document.getElementById(ui+id);
 let open=false,thematic=false,busy=false,generation=0,catalogue,search,records=new Map(),groups=new Map(),places=new Map(),selected=null,labels=[],workerJob,prepared,administrativeSaved,highlighted=new Set();
 const layers=[],sources=[],urls=[];
 const sidebar=createCountryPage({id:country+'-telephone-sidebar',label:config.name+' area codes',prefix:ui,
  search:{id:ui+'search',label:'Find an area code or place',placeholder:'Find an area code or place',resultsId:ui+'results'},
  settings:`<p id="${ui}coverage" class="country-note"></p><p id="${ui}warning" class="coverage-note"></p><section class="layers"><h3>Visible layers</h3><label><span>Reference outlines</span><input id="${ui}outlines" type="checkbox" checked data-nav></label><label><span>Area-code labels</span><input id="${ui}labels" type="checkbox" checked data-nav></label></section><details><summary>All area codes</summary><div id="${ui}codes" class="archipelago-children"></div></details>`,
  heading:{navigation:`<button id="${ui}reset" class="back-button">All area codes</button>`,kindId:ui+'kind',nameId:ui+'name',names:`<p id="${ui}international" class="population-scope"></p>`},
  cards:`<section id="${ui}card" class="place-phone-card"></section>`,
  footer:`<a href="${base}sources.json" target="_blank" rel="noopener">Sources &amp; coverage</a><span>Created by Ethan Hu</span>`,afterPanels:`<p id="${ui}error" class="coverage-note" role="status" hidden></p>`});
 sidebar.querySelector('.region-color-control').hidden=true;document.querySelector('.workspace').insertBefore(sidebar,document.getElementById('map-shell'));
 const panel=name=>{for(const p of ['layers','explore']){$(p+'-panel').hidden=p!==name;$( 'tab-'+p).setAttribute('aria-pressed',String(p===name));}};
 function picker(){if(open)configureMapViewPicker({country,value:thematic?'area-codes':'administrative',options:[{value:'administrative',label:'Administrative'},{value:'area-codes',label:'Area codes'}],busy,thematic,onChange:value=>setView(value).catch(error=>{if(error.name!=='AbortError'){$('error').textContent='Area-code view could not load. Try again.';$('error').hidden=false;}})});}
 const clearLabels=()=>{labels.forEach(l=>l.remove());labels=[];};
 function removeGeometry(){clearLabels();highlighted.clear();if(workerJob){workerJob.worker.terminate();workerJob.reject(new DOMException('View changed','AbortError'));workerJob=null;}for(const id of layers.splice(0))if(map.getLayer(id))map.removeLayer(id);for(const id of sources.splice(0))if(map.getSource(id))map.removeSource(id);urls.splice(0).forEach(URL.revokeObjectURL);prepared=null;}
 async function load(token){
  if(!catalogue){const data=await loadCompressed(base+'catalogue.bin');if(token!==generation||!open)throw new DOMException('Country changed','AbortError');catalogue=data;records=new Map(data.records.map(r=>[r.id,r]));groups=new Map(data.groups.map(g=>[g.id,g]));places=new Map(data.places.map(p=>[p.id,p]));search=createPlaceSearch(data.records);$('coverage').textContent=data.coverage;$('warning').textContent=data.warning;$('codes').replaceChildren(...data.records.map(r=>{const b=document.createElement('button');b.type='button';b.className='search-result';b.textContent=r.code+(r.regionName?' · '+r.regionName:'');b.onclick=()=>select(r);return b;}));}
  if(prepared)return prepared;
  return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./country-boundary-worker.mjs',import.meta.url),{type:'module'}),job={worker,reject};workerJob=job;worker.onmessage=({data})=>{worker.terminate();if(workerJob===job)workerJob=null;data.error?reject(Error(data.error)):resolve(data);};worker.onerror=e=>{worker.terminate();if(workerJob===job)workerJob=null;reject(Error(e.message));};worker.postMessage({url:base+'geometry.bin'});});
 }
 function install(payload){
  if(layers.length)return;prepared=payload;
  const land=key+'-land-fill';map.addLayer({id:land,type:'fill',source:portalSource,metadata:{atlas:{thematic:true}},paint:{'fill-color':fill,'fill-antialias':false}});layers.push(land);
  for(const [id,blob]of [[key,payload.blob],[key+'-edges',payload.borders],[key+'-outlines',payload.outlines]]){const url=URL.createObjectURL(blob);urls.push(url);sources.push(id);map.addSource(id,{type:'geojson',data:url,promoteId:'id',tolerance:.25,buffer:128,maxzoom:16,attribution:`<a href="${base}sources.json">${config.name} telephone-code sources &amp; coverage</a>`});}
  map.addLayer({id:key+'-fill',metadata:{atlas:{thematic:true}},type:'fill',source:key,paint:{'fill-color':['case',['boolean',['get','uncertain'],false],'#dfdcd5',['boolean',['feature-state','selected'],false],['coalesce',['get','selectedColor'],selectionColor],['get','color']],'fill-antialias':false}});
  map.addLayer({id:key+'-lines',type:'line',source:key+'-edges',paint:{'line-color':line,'line-width':.7,'line-opacity':.8},layout:{'line-join':'round'}});
  if(payload.towns){for(const [id,blob]of [[key+'-towns',payload.towns.blob],[key+'-town-outlines',payload.towns.outlines]]){const url=URL.createObjectURL(blob);urls.push(url);sources.push(id);map.addSource(id,{type:'geojson',data:url,promoteId:'id',tolerance:.25,buffer:128,maxzoom:16});}
   map.addLayer({id:key+'-town-fill',metadata:{atlas:{thematic:true}},type:'fill',source:key+'-towns',paint:{'fill-color':['get','color'],'fill-opacity':.85,'fill-antialias':false}});
   map.addLayer({id:key+'-town-lines',type:'line',source:key+'-town-outlines',paint:{'line-color':line,'line-width':['interpolate',['linear'],['zoom'],4,.25,10,.65],'line-opacity':.4}});layers.push(key+'-town-fill',key+'-town-lines');
  }
  map.addLayer({id:key+'-selected',metadata:{atlas:{role:'selection'}},type:'line',source:key+'-outlines',filter:['==',['get','id'],''],paint:{'line-color':line,'line-width':2},layout:{'line-join':'round'}});layers.push(key+'-fill',key+'-lines',key+'-selected');
 }
 function sync(){
  if(!thematic){administrative.sync?.();picker();return;}
  for(const id of layers)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',open&&(![key+'-lines',key+'-town-lines'].includes(id)||$('outlines').checked)?'visible':'none');picker();updateLabels();
 }
 const idsFor=r=>r?.footprints||(r&&groups.has(r.id)?[r.id]:[]);
 function highlight(record){const ids=idsFor(record);const next=new Set(ids);for(const id of highlighted)if(!next.has(id))map.setFeatureState({source:key,id},{selected:false});for(const id of next)if(!highlighted.has(id))map.setFeatureState({source:key,id},{selected:true});highlighted=next;map.setFilter(key+'-selected',['in',['get','id'],['literal',ids]]);}
 function sourceLink(title,url){const a=document.createElement('a');a.textContent=title;a.href=url;a.target='_blank';a.rel='noopener';return a;}
 async function select(record,fit=true){
  if(!open||!thematic||!record)return;selected=record;highlight(record);$('search').value='';$('results').hidden=true;$('kind').textContent=record.kind||'Telephone area';$('name').textContent=record.en;$('international').textContent=record.international||'';const card=$('card');card.replaceChildren();
  if(record.regionName){const p=document.createElement('p');p.textContent=record.regionName;card.append(p);}
  const note=document.createElement('p');note.className='country-note';note.textContent=record.ambiguous?'This municipality contains several codes. Its internal telephone boundaries are not mapped.':catalogue.warning;card.append(note);
  if(record.codes?.length>1)for(const code of record.codes){const b=document.createElement('button');b.type='button';b.className='quiet-button';b.textContent='Area code '+code;b.onclick=()=>select(catalogue.records.find(r=>r.code===code));card.append(b);}
  if(record.note){const p=document.createElement('p');p.textContent=record.note;card.append(p);}
  const areaPlaces=(record.placeIds||[]).map(id=>places.get(id)).filter(Boolean),details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Mapped places · '+areaPlaces.length;details.append(summary);for(const place of areaPlaces){const p=document.createElement('p');p.textContent=place.en+(place.local&&place.local!==place.en?' · '+place.local:'')+' · '+place.codes.join(' / ');details.append(p);}card.append(details);
  if(record.officialCoverage?.length){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Official coverage & address exceptions';details.append(summary);for(const row of record.officialCoverage){const p=document.createElement('p');p.lang='ja';p.textContent=row.text;details.append(p);}card.append(details);}
  card.append(sourceLink(catalogue.sourceName+' · '+catalogue.asOf,catalogue.source));$('tab-explore').hidden=false;panel('explore');sidebar.querySelector('.sidebar-scroll').scrollTop=0;setMapBreadcrumb([{label:record.en}]);document.getElementById('map-shell').dataset.selected='true';if(fit&&record.bounds)await host.fit(record.bounds,12);updateLabels();
 }
 function picked(point){if(!thematic||!layers.length)return;const hit=map.queryRenderedFeatures(point,{layers:map.getLayer(key+'-town-fill')?[key+'-town-fill',key+'-fill']:[key+'-fill']})[0],g=hit&&groups.get(hit.properties.id);return g&&(g.codes.length===1?catalogue.records.find(r=>r.code===g.codes[0]):g);}
 function updateLabels(){
  if(!thematic){administrative.updateLabels?.();return;}if(!open||host.isMoving?.()||map.isMoving())return;clearLabels();if(!$('labels').checked)return;const b=map.getBounds(),inside=p=>p.center[0]>=b.getWest()&&p.center[0]<=b.getEast()&&p.center[1]>=b.getSouth()&&p.center[1]<=b.getNorth();
  const candidates=catalogue.records.filter(r=>inside(r)&&r.code!=='010').map(r=>({...r,en:r.overlays?.includes('010')?'010 / 011':r.code,local:'',kind:'Telephone area code',onClick:()=>select(r),selected:r.id===selected?.id}));labels=window.AtlasLabels.render(map,candidates,'korea-marker');
 }
 async function reset(){if(!thematic)return administrative.home?.();selected=null;highlight(null);$('tab-explore').hidden=true;panel('layers');setMapBreadcrumb([]);document.getElementById('map-shell').dataset.selected='false';updateLabels();}
 async function setView(value){
  const next=value==='area-codes';if(next===thematic&&!busy){picker();return;}const token=++generation;busy=true;picker();$('error').hidden=true;
  try{if(next){const payload=await load(token);if(token!==generation||!open)throw new DOMException('Country changed','AbortError');administrativeSaved={id:administrative.getSelection?.(),scope:administrative.getScope?.(),mode:administrative.getMode?.()||Number(document.getElementById('mode-prefecture').getAttribute('aria-pressed')==='true')+1};administrative.leave();thematic=true;install(payload);sidebar.hidden=false;await reset();sync();}
   else{removeGeometry();sidebar.hidden=true;thematic=false;await administrative.enter(false);if(token!==generation||!open)return;if(administrativeSaved?.id)await administrative.restore?.(administrativeSaved.id,administrativeSaved.scope);administrative.setMode?.(administrativeSaved?.mode||1,false,true);selected=null;sync();}
  }finally{if(token===generation){busy=false;picker();host.syncAppearance?.();host.controls?.();}}
 }
 $('tab-layers').onclick=()=>panel('layers');$('tab-explore').onclick=()=>panel('explore');$('reset').onclick=reset;for(const id of ['outlines','labels'])$(id).onchange=sync;
 $('search').oninput=()=>{const q=$('search').value.trim(),box=$('results');box.replaceChildren();box.hidden=!q;if(!q||!search)return;for(const record of search(q)){const b=document.createElement('button'),strong=document.createElement('strong'),small=document.createElement('small');b.type='button';b.className='search-result';strong.textContent=record.en;small.textContent='Telephone area code'+(record.regionName?' · '+record.regionName:'');b.append(strong,small);b.onclick=()=>select(record);box.append(b);}};
 $('search').onkeydown=e=>{if(e.key==='Enter')$('results').querySelector('button')?.click();if(e.key==='Escape')$('results').hidden=true;};
 map.on('click',e=>{if(open&&thematic&&!host.isBusy())select(picked(e.point));});onMapHover(map,e=>{if(open&&thematic&&!host.isBusy()&&!map.isMoving())map.getCanvas().style.cursor=picked(e.point)?'pointer':'';});map.on('moveend',()=>{if(thematic)updateLabels();});map.on('resize',()=>{if(thematic)updateLabels();});
 const adapter=Object.create(administrative);Object.assign(adapter,{
  warm:()=>thematic?Promise.resolve():administrative.warm?.(),
  async enter(fit=true){open=true;await administrative.enter(fit);picker();},
  leave(){generation++;open=false;busy=false;removeGeometry();sidebar.hidden=true;thematic=false;selected=null;administrative.leave();clearMapViewPicker(country);},
  unload(){generation++;removeGeometry();catalogue=search=undefined;records.clear();groups.clear();places.clear();selected=administrativeSaved=null;$('codes').replaceChildren();$('results').replaceChildren();$('card').replaceChildren();administrative.unload?.();},
  sync,updateLabels,pauseLabels(){clearLabels();administrative.pauseLabels?.();},
  getSelection:()=>thematic?selected?.id||null:administrative.getSelection?.(),getScope:()=>thematic?'area-codes':administrative.getScope?.()||'',getMode:()=>thematic?1:administrative.getMode?.()||Number(document.getElementById('mode-prefecture').getAttribute('aria-pressed')==='true')+1,
  async restore(id,scope){if(scope==='area-codes'||String(id).startsWith(config.idPrefix+'-TEL-')||String(id).startsWith(config.idPrefix+'-PHONE-')){await setView('area-codes');if(id)await select(records.get(id)||groups.get(id),false);}else{if(thematic)await setView('administrative');await administrative.restore?.(id,scope);}},
  setMode(value,automatic=false,restoring=false){if(thematic){if(!restoring&&!automatic)return setView('administrative');return;}return administrative.setMode?.(value,automatic,restoring);},
  home:reset,viewParent:camera=>thematic?reset():administrative.viewParent?.(camera),random(){if(thematic){const list=catalogue.records;return select(list[Math.floor(Math.random()*list.length)]);}return administrative.random?.();},hoverAt(point,id){return thematic?(id?records.get(id)||groups.get(id):picked(point)):administrative.hoverAt?.(point,id);}
 });Object.defineProperties(adapter,{ready:{get:()=>thematic?!!layers.length:administrative.ready},active:{get:()=>open&&(thematic||administrative.active)}});return adapter;
}