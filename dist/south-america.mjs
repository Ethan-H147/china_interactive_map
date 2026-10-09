import {createCountryPage,setSubdivisionHeading} from './country-page.mjs';
import {createPlaceSearch} from './place-search.mjs';
import {loadCompressed} from './korea-data.mjs';
import {createCityDots} from './argentina-city-dots.mjs';
import {createArgentinaLocal} from './argentina-local.mjs';
import {renderStatistics,clearStatistics} from './statistics.mjs';
import {argentinaFlags} from './argentina-flags.mjs';
import {brazilFlags} from './brazil-flags.mjs';
import {renderMunicipalityList} from './municipality-list.mjs';
import {lineData,lineSourceOptions,adaptiveOpacity} from './adaptive-lines.mjs';
export const countries={
 brazil:{name:'Brazil',local:'Brasil',flag:'br',center:[-52,-13],bounds:[[-74,-34],[-34,6]],color:'#dcebd9',line:'#527b59',selected:'#b9d6b2'},
 uruguay:{name:'Uruguay',local:'',flag:'uy',center:[-56,-33],bounds:[[-59,-35.5],[-53,-30]],color:'#e0edf4',line:'#5883a0',selected:'#bcd9ec'},
 argentina:{name:'Argentina',local:'',flag:'ar',center:[-65,-39],bounds:[[-74,-56],[-53,-21]],color:'#dfebf3',line:'#5883a0',selected:'#bcd9ec'}
};
export function cityDescription(record){
 if(record.cityRank===1)return 'Autonomous city';
 if(!record.boundaryAvailable)return 'City · Municipal boundary pending';
 return record.en!==record.boundaryName?'City · Municipality: '+record.boundaryName:'City · Municipal boundary';
}
export function argentinaMapLabel(record){
 return record.id==='AR-02'||record.cityRank===1?{...record,en:'Buenos Aires (CABA)',local:'Buenos Aires (CABA)'}:record;
}
export function stateStatisticsKey(country,record,scope='states'){
 return record?.level===1&&(country==='argentina'||country==='uruguay'||country==='brazil'&&scope==='states')?country+':'+record.id:'';
}
export function createSouthAmerica(map,host){
 let data,loading,active=null,selected=null,labels=[],pending,sourceWait,layerEpoch=0;
 let brazilLayer='states',layerBusy=false,argentinaSearch;
 try{const saved=window.AtlasView?.fromHash(location.hash)||window.AtlasView?.read('brazil',localStorage);if(saved?.country==='brazil'&&['states','ddd','cep'].includes(saved.scope))brazilLayer=saved.scope;}catch{}
 const postalSource='https://docs.precisely.com/docs-gated/data/gfk-boundaries/2022/en-us/pdf/EN_GfK_Worldwide_digital_maps_without_prices.pdf';
 const installed=new Map(),catalogues=new Map(),jobs=new Map();
 const allowed=id=>window.AtlasDev.allows(id),availableCountries=()=>Object.keys(countries).filter(allowed);
 if(map.getSource('world-land'))map.addLayer({id:'south-america-portal-fill',type:'fill',source:'world-land',filter:['in',['get','country'],['literal',availableCountries()]],paint:{'fill-color':'#d7d7d3','fill-antialias':false}});
 const detailHost=city=>({active:()=>active==='argentina'&&(!city||selected?.level===3),selected:()=>selected,outlines:()=>$('outlines').checked,waitForSources,changed:()=>{if(active==='argentina')syncLayers();},status:message=>{if(active==='argentina'&&(!city||selected?.level===3)){$('layer-status').hidden=!message;$('layer-status').textContent=message;}}});
 const argentina=createArgentinaLocal(map,detailHost(false));
 const brazil=createArgentinaLocal(map,{active:()=>active==='brazil'&&allowed('brazil')&&brazilLayer==='states'&&!layerBusy,selected:()=>selected,outlines:()=>$('outlines').checked,waitForSources,changed:()=>{if(active==='brazil')syncLayers();},status:message=>{if(active==='brazil'&&!layerBusy){$('layer-status').hidden=!message;$('layer-status').textContent=message;}}},{base:'data/south-america/brazil-local/',prefix:'br-local-',before:'south-brazil-borders',noun:'municipalities',parentNoun:'state',fill:'#91bb86',line:'#527b59',adaptive:true,attribution:'Municipal boundaries: <a href="https://www.ibge.gov.br/geociencias/organizacao-do-territorio/estrutura-territorial/15774-malhas.html">IBGE · 2025</a>'});
 const uruguay=createArgentinaLocal(map,{active:()=>active==='uruguay'&&allowed('uruguay'),selected:()=>selected,outlines:()=>$('outlines').checked,waitForSources,changed:()=>{if(active==='uruguay')syncLayers();},status:message=>{if(active==='uruguay'){$('layer-status').hidden=!message;$('layer-status').textContent=message;}}},{base:'data/south-america/uruguay-local/',prefix:'uy-local-',before:'south-uruguay-borders',noun:'municipalities',parentNoun:'department',fill:'#a9cee6',line:'#5883a0',adaptive:true,attribution:'Municipal boundaries: <a href="https://visualizador.ide.uy/geonetwork/static/api/records/82c71a84-97ac-4cf1-8ac9-c0296b2383ad">DINOT · IDE · AGESIC · 2025</a>'});
 const argentinaCities=createArgentinaLocal(map,detailHost(true),{base:'data/south-america/argentina-cities/',prefix:'arg-city-',level:3,selectedOnly:true,noun:'city boundaries',attribution:'Municipal boundaries: <a href="https://www.ign.gob.ar/">IGN, Argentina</a>'});
 const cityDots=createCityDots(map,{active:()=>active==='argentina',enabled:()=>$('city-dots').checked,selected:()=>selected});
 async function warmArgentina(first){await Promise.all([argentina.warm(first),argentinaCities.warm(first)]);argentinaSearch||=createPlaceSearch([...first,...argentina.records,...argentinaCities.records.filter(r=>r.cityRank!==1)]);}
 const provinceId=record=>record?.level>1?record.parent:record?.id;
 const sidebar=createCountryPage({id:'south-america-sidebar',label:'Explore South America',classes:'sidebar south-america-sidebar',
 prefix:`south-`,
 search:{
 id:`south-search`,
 label:`Find a division`,
 placeholder:`Find a division`,
 resultsId:`south-results`,
 disabled:false,
 dataNav:false
},
 settings:`<div id="south-map-types" class="south-map-types" role="group" aria-label="Brazil map view" hidden><button type="button" data-layer="states">States</button><button type="button" data-layer="ddd">DDD</button><button type="button" data-layer="cep">CEP</button></div><p id="south-cep-status" hidden>Exact CEP boundaries are pending a licensed dataset.</p><label class="field-label" for="south-division">Division</label><select id="south-division"></select><section class="layers"><h3>Visible layers</h3><label><span>Division outlines</span><input id="south-outlines" type="checkbox" checked></label><label><span>Region names</span><input id="south-names" type="checkbox" checked></label><label id="south-city-dots-control" hidden><span>City dots</span><input id="south-city-dots" type="checkbox" checked></label></section><details id="south-coverage" class="south-code-details" hidden><summary>Coverage &amp; sources</summary><p>23 provinces and Buenos Aires autonomous city. Detailed borders load within the selected province.</p><p>The 80 city markers follow a historical population list using 2010 and 2001 figures. Outlines show municipal jurisdictions; some cities share one municipality. Santiago del Estero and La Banda have no municipal polygon in this dataset.</p><p>Population and area cover all 24 jurisdictions. Nominal provincial GDP covers eight; other jurisdictions show separately labeled real economic output. Subdivision and city statistics are not yet included.</p><a href="data/south-america/argentina-cities/sources.json" target="_blank" rel="noopener">City boundary sources</a> · <a href="data/statistics-methodology.html" target="_blank" rel="noopener">Statistics coverage</a></details>`,
 heading:{
 navigation:`<button class="back-button" id="south-reset"></button><div class="south-flags"><img id="south-national-flag" alt=""><a id="south-flag-source" hidden target="_blank" rel="noopener"><img id="south-province-flag" alt="" decoding="async"></a></div>`,
 kindId:`south-kind`,
 nameId:``,
 nameLang:``,
 names:`<p class="country-local"></p>`
},
 cards:`<div class="south-statistics-anchor country-card-anchor" hidden></div><details class="boundary-info-card" hidden><summary>Boundary notes</summary><p class="preview-note"></p></details>`,
 subdivisions:`<section id="south-code-details" class="south-code-details" hidden></section>`,
 actions:``,
 footer:`<a id="south-source" target="_blank" rel="noopener">Boundary source</a><span>Created by Ethan Hu</span>`,
 tools:`<p id="south-layer-status" role="status" class="south-layer-status" hidden></p>`,
 extraPanels:``,
 afterPanels:``
});
 document.querySelector('.workspace').insertBefore(sidebar,document.getElementById('map-shell'));
 const $=id=>sidebar.querySelector('#south-'+id);
 const panel=name=>{for(const key of ['explore','layers']){$(key+'-panel').hidden=key!==name;$('tab-'+key).setAttribute('aria-pressed',String(key===name));}sidebar.querySelector('.sidebar-scroll').scrollTop=0;};
 $('tab-explore').onclick=()=>panel('explore');$('tab-layers').onclick=()=>panel('layers');
 const provinceFlagImages=new Map(),flagJobs=new Map();
 function preloadProvinceFlags(country=active){
  const references=country==='brazil'?{'BR-national':{file:'vendor/flag-br.svg'},...brazilFlags}:argentinaFlags;
  if(flagJobs.has(country))return;
  const queue=Object.entries(references).filter(([id])=>!provinceFlagImages.has(id));
  async function next(){
   while(host.country()===country&&queue.length){
    const [id,reference]=queue.shift(),image=new Image(),entry={image,ready:false};
    provinceFlagImages.set(id,entry);image.decoding='async';image.fetchPriority='low';image.src=reference.file;
    try{await image.decode();entry.ready=true;if(active===country&&provinceFlagId===id)$('flag-source').hidden=false;}catch{provinceFlagImages.delete(id);}
   }
  }
  flagJobs.set(country,Promise.all(Array.from({length:3},next)).finally(()=>{flagJobs.delete(country);}));
 }
 let provinceFlagId=null;
 function renderProvinceFlag(){
  const country=active,id=active==='argentina'||active==='brazil'&&brazilLayer==='states'?provinceId(selected):null;
  if(id===provinceFlagId)return;
  provinceFlagId=id;
  const flag=$('province-flag'),link=$('flag-source'),reference=(active==='brazil'?brazilFlags:argentinaFlags)[id];
  link.hidden=true;flag.onload=null;flag.onerror=null;flag.removeAttribute('src');
  if(!reference){link.removeAttribute('href');return;}
  flag.alt='Flag of '+reference.name;
  link.href=reference.page;link.title=reference.name+' flag · '+reference.credit+' · '+reference.license+' — source and license';
  flag.onload=()=>{if(active===country&&provinceFlagId===id)link.hidden=false;};
  flag.onerror=()=>{if(provinceFlagId===id)link.hidden=true;};
  flag.src=reference.file;
  if(provinceFlagImages.get(id)?.ready)link.hidden=false;
 }
 const typeButtons=[];
 // Resolve only these three controls; ordinary state results keep their own index.
 for(const mode of ['states','ddd','cep']){const button=sidebar.querySelector('[data-layer="'+mode+'"]');typeButtons.push(button);button.onclick=()=>setBrazilLayer(mode).catch(error=>{if(error.name!=='AbortError')showLayerError();});}
 const catalogue=()=>active==='brazil'&&brazilLayer==='cep'?null:catalogues.get(active);
 function showLayerError(){$('layer-status').hidden=false;$('layer-status').textContent='Could not load this view. Choose it again to retry.';}
 function syncTypeButtons(){for(let i=0;i<typeButtons.length;i++)typeButtons[i].setAttribute('aria-pressed',String(['states','ddd','cep'][i]===brazilLayer));$('map-types').hidden=active!=='brazil';$('cep-status').hidden=active!=='brazil'||brazilLayer!=='cep';$('map-types').setAttribute('aria-busy',String(layerBusy));}
 function saveLayer(){document.dispatchEvent(new Event('change'));}
 function syncDeveloper(){if(map.getLayer('south-america-fill'))map.setLayoutProperty('south-america-fill','visibility','visible');for(const [id,entry] of installed)for(const layer of entry.layers)map.setLayoutProperty(layer,'visibility',allowed(id)&&active===id?'visible':'none');if(active&&!allowed(active)){cancelPending();brazil.clear();uruguay.clear();clearLabels();}if(active&&allowed(active))syncLayers();else contextFilters();}
 function clearLabels(){labels.forEach(l=>l.remove());labels=[];}
 function updateLabels(){
  clearLabels();if(map.isMoving()||(active&&!$('names').checked))return;
  const first=catalogue()?.records||[],detail=active==='brazil'?brazil:active==='uruguay'?uruguay:argentina,records=active==='argentina'||active==='uruguay'||active==='brazil'&&brazilLayer==='states'?[...first.filter(p=>p.id!==detail.scope),...detail.visibleRecords,...(detail.visibleRecords.length?[]:first.filter(p=>p.id===detail.scope))]:first,b=map.getBounds();
  const visible=records.filter(p=>p.center[0]>=b.getWest()&&p.center[0]<=b.getEast()&&p.center[1]>=b.getSouth()&&p.center[1]<=b.getNorth());
  if(selected&&!visible.includes(selected)){const same=visible.findIndex(r=>r.id===selected.boundaryId);if(same>=0)visible.splice(same,1);visible.unshift(selected);}
  const candidates=visible.map(p=>argentinaMapLabel({...p,en:p.level===3&&p.boundaryAvailable&&p!==selected?p.boundaryName:p.en,local:p.id==='AR-94'?'':p.local,selected:p===selected}));
  for(const [id,c] of Object.entries(countries))if(allowed(id)&&(id!==active||!records.length))candidates.push({id,en:c.name,local:c.local,center:c.center});
  labels=window.AtlasLabels.render(map,candidates,'province-label');
 }
 function contextFilters(){const exclusion=installed.has(active)?active:'',available=availableCountries();if(map.getLayer('south-america-fill'))map.setFilter('south-america-fill',['all',['in',['get','country'],['literal',available]],['!=',['get','country'],exclusion]]);if(map.getLayer('south-america-portal-fill')){map.setFilter('south-america-portal-fill',['in',['get','country'],['literal',available]]);map.setLayoutProperty('south-america-portal-fill','visibility',data?'none':'visible');}if(map.getLayer('world-land'))map.setFilter('world-land',['!',['in',['get','country'],['literal',[...available,...['malaysia','singapore','south-africa','eswatini','lesotho'].filter(allowed)]]]]);for(const id of ['south-land-boundaries','south-river-boundaries'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',active&&allowed(active)?'visible':'none');}
 async function warm(){
  if(data)return;if(loading)return loading;
  loading=(async()=>{
   const context=await loadCompressed('data/flight-context.bin');data=context;
   map.addSource('flight-context',{type:'geojson',data:context,tolerance:.25,buffer:64,maxzoom:16,attribution:'Country silhouettes: Natural Earth · IBGE · IGN · IGM / IDE Uruguay'});
   map.addLayer({id:'south-america-fill',type:'fill',source:'flight-context',paint:{'fill-color':'#d7d7d3','fill-antialias':false}});
   map.addSource('south-land-borders',{...lineSourceOptions,data:lineData(context.landBorders)});
   map.addSource('south-river-borders',{...lineSourceOptions,data:lineData(context.riverBorders),attribution:'International river boundary: <a href="https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/CapasSIG">IGN</a>'});
   for(const [id,source] of [['south-land-boundaries','south-land-borders'],['south-river-boundaries','south-river-borders']])map.addLayer({id,type:'line',source,layout:{visibility:'none','line-join':'round','line-cap':'round'},paint:{'line-color':'#8b867a','line-width':['interpolate',['linear'],['zoom'],2,.55,6,.85,10,1],'line-opacity':adaptiveOpacity()}});
   contextFilters();syncDeveloper();
  })();try{await loading;}catch(e){loading=null;data=null;throw e;}
 }
 function cancelPending(){sourceWait?.abort();sourceWait=null;if(pending){const request=pending;pending=null;request.worker.terminate();request.reject(new DOMException('Country changed','AbortError'));}}
 function prepare(id,mode){return new Promise((resolve,reject)=>{cancelPending();const worker=new Worker(new URL('./south-america-worker.mjs',import.meta.url),{type:'module'}),request={id,worker,reject};pending=request;const finish=()=>{worker.terminate();if(pending===request)pending=null;};worker.onmessage=({data})=>{finish();data.error?reject(Error(data.error)):resolve(data);};worker.onerror=e=>{finish();reject(Error(e.message));};worker.postMessage({url:'data/south-america/'+id+(mode==='ddd'?'-ddd':'-first')+'.bin'});});}
 function remove(id){const entry=installed.get(id);if(!entry)return;for(const layer of [...entry.layers].reverse())if(map.getLayer(layer))map.removeLayer(layer);for(const source of entry.sources)if(map.getSource(source))map.removeSource(source);entry.urls.forEach(URL.revokeObjectURL);installed.delete(id);}
 // Hold the previous view until both replacement sources are ready to draw.
 function waitForSources(sources,signal){
  if(!map.isSourceLoaded)return Promise.resolve();
  return new Promise((resolve,reject)=>{
   let timer;const cleanup=()=>{clearTimeout(timer);map.off('sourcedata',check);map.off('error',failed);signal.removeEventListener('abort',aborted);};
   const finish=error=>{cleanup();error?reject(error):resolve();};
   const check=()=>{if(sources.every(id=>map.getSource(id)&&map.isSourceLoaded(id)))finish();};
   const failed=e=>{if(sources.includes(e.sourceId))finish(Error('Boundary source failed'));};
   const aborted=()=>finish(new DOMException('Map view changed','AbortError'));
   map.on('sourcedata',check);map.on('error',failed);signal.addEventListener('abort',aborted,{once:true});
   timer=setTimeout(()=>finish(Error('Boundary source timed out')),15000);if(signal.aborted)aborted();else check();
  });
 }
 async function warmCountry(id,mode=id==='brazil'?brazilLayer:'states'){
  if(!allowed(id))throw Error('Developer mode is required');
  if(id==='brazil')preloadProvinceFlags(id);
  await warm();if(id==='brazil'&&mode==='cep')return;
  if(installed.get(id)?.mode===mode){if(id==='argentina')await warmArgentina(catalogues.get(id).records);if(id==='brazil'&&mode==='states')await brazil.warm(catalogues.get(id).records);if(id==='uruguay')await uruguay.warm(catalogues.get(id).records);return;}
  const jobKey=id+':'+mode,epoch=layerEpoch;if(jobs.get(jobKey)?.epoch===epoch)return jobs.get(jobKey).promise;
  const job=(async()=>{
   const payload=await prepare(id,mode);if(host.country()!==id||!allowed(id)||epoch!==layerEpoch)return;
   const c=countries[id],sources=[],layers=[],urls=[],suffix=mode==='ddd'?'-ddd':'';
   const cleanup=()=>{for(const layer of [...layers].reverse())if(map.getLayer(layer))map.removeLayer(layer);for(const source of sources)if(map.getSource(source))map.removeSource(source);urls.forEach(URL.revokeObjectURL);};
   try{
    for(const [name,blob] of Object.entries(payload.sources)){const key='south-'+id+suffix+'-'+name,url=URL.createObjectURL(blob);urls.push(url);sources.push(key);map.addSource(key,{type:'geojson',data:url,promoteId:name==='regions'?'id':undefined,tolerance:.25,buffer:64,maxzoom:16,...(id==='uruguay'&&name==='lines'?lineSourceOptions:{}),attribution:mode==='ddd'?'<a href="https://informacoes.anatel.gov.br/paineis/areas-tarifarias">Anatel DDD</a> · <a href="https://www.ibge.gov.br/geociencias/">IBGE · 2025</a>':id==='brazil'?'<a href="https://www.ibge.gov.br/geociencias/">IBGE · 2025</a>':id==='uruguay'?'<a href="https://www.ide.uy/">IGM / IDE Uruguay</a>':'<a href="https://www.ign.gob.ar/">IGN, Argentina</a>'});}
    const add=layer=>{layer.layout={...layer.layout,visibility:'none'};map.addLayer(layer);layers.push(layer.id);};
    add({id:'south-'+id+suffix+'-fill',type:'fill',source:sources[0],paint:{'fill-color':['case',['boolean',['feature-state','selected'],false],c.selected,c.color],'fill-antialias':false}});
    add({id:'south-'+id+suffix+'-borders',type:'line',source:sources[1],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':c.line,'line-width':['interpolate',['linear'],['zoom'],2,.6,7,1.15],'line-opacity':id==='uruguay'?adaptiveOpacity(.8):.8}});
    add({id:'south-'+id+suffix+'-selection',type:'line',source:sources[1],filter:['in','',['get','regionIds']],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':c.line,'line-width':2,...(id==='uruguay'?{'line-opacity':adaptiveOpacity()}: {})}});
    const controller=new AbortController();sourceWait=controller;
    if(installed.has(id))await waitForSources(sources,controller.signal);
    if(sourceWait===controller)sourceWait=null;
    if(host.country()!==id||epoch!==layerEpoch||!allowed(id)){cleanup();return;}
    for(const other of [...installed.keys()])remove(other);
    installed.set(id,{sources,layers,urls,mode});catalogues.set(id,{records:payload.records,search:createPlaceSearch(payload.records)});
   }catch(error){cleanup();throw error;}
   if(id==='argentina')await warmArgentina(catalogues.get(id).records);
   if(id==='brazil'&&mode==='states')await brazil.warm(catalogues.get(id).records);if(id==='uruguay')await uruguay.warm(catalogues.get(id).records);
  })().finally(()=>{if(jobs.get(jobKey)?.promise===job)jobs.delete(jobKey);});jobs.set(jobKey,{epoch,promise:job});return job;
 }
 function renderControls(){
  const records=catalogue()?.records||[],ddd=active==='brazil'&&brazilLayer==='ddd',cep=active==='brazil'&&brazilLayer==='cep';
  const noun=ddd?'area code':active==='brazil'?'state':active==='uruguay'?'department':'province';
  $('division').replaceChildren(new Option(ddd?'All DDD areas':'All '+countries[active].name,''));for(const p of records)$('division').append(new Option(p.en,p.id));
  $('division').hidden=!records.length;$('division').previousElementSibling.hidden=!records.length;$('division').previousElementSibling.textContent=ddd?'Area code':'Division';
  $('search').disabled=!records.length;$('search').placeholder=cep?'CEP boundaries pending':ddd?'Find DDD or municipality':active==='argentina'?'Find a province, subdivision or city':active==='brazil'?'Find a state or municipality':active==='uruguay'?'Find a department or municipality':'Find a '+noun;
  sidebar.querySelector('label[for="south-search"]').textContent=$('search').placeholder;sidebar.querySelector('.layers').hidden=!records.length;
  $('source').href=cep?postalSource:active==='argentina'?'data/south-america/argentina-local/sources.json':active==='brazil'&&!ddd?'data/south-america/brazil-local/sources.json':active==='uruguay'?'data/south-america/uruguay-local/sources.json':'data/south-america/'+active+(ddd?'-ddd':'')+'-sources.json';$('source').textContent=cep?'Postal boundary dataset':'Boundary source';
  document.getElementById('map-hint').textContent=cep?'CEP boundaries pending':ddd?'Select a DDD area':'Select a '+noun;
  $('city-dots-control').hidden=active!=='argentina';$('coverage').hidden=active!=='argentina';
  syncTypeButtons();
  if(active==='brazil')for(const key of ['mode-province','mode-prefecture','mode-lock'])document.getElementById(key).hidden=brazilLayer!=='states';
 }
 async function setBrazilLayer(mode){
  if(active!=='brazil'||!['states','ddd','cep'].includes(mode))return;
  if(mode===brazilLayer&&!layerBusy)return;
  const epoch=++layerEpoch;cancelPending();brazil.clear();layerBusy=true;syncTypeButtons();$('results').hidden=true;
  $('layer-status').hidden=false;$('layer-status').textContent=mode==='cep'?'Opening postal view…':'Loading '+(mode==='ddd'?'DDD areas':'states')+'…';
  try{
   if(mode!=='cep')await warmCountry('brazil',mode);
   if(epoch!==layerEpoch||active!=='brazil')return;
   if(mode==='cep')remove('brazil');
   brazilLayer=mode;selected=null;$('search').value='';sidebar.querySelector('.sidebar-scroll').scrollTop=0;if(mode==='states')await brazil.setMode(1);renderControls();renderSelection();syncLayers();saveLayer();
  }finally{if(epoch===layerEpoch){layerBusy=false;syncTypeButtons();$('layer-status').hidden=true;}}
 }
 function syncLayers(){const entry=installed.get(active);if(entry){map.setLayoutProperty(entry.layers[0],'visibility','visible');map.setLayoutProperty(entry.layers[1],'visibility',$('outlines').checked?'visible':'none');map.setLayoutProperty(entry.layers[2],'visibility','visible');map.setFilter(entry.layers[2],['in',provinceId(selected)||'',['get','regionIds']]);}if(active==='argentina'){argentina.sync();argentinaCities.sync();cityDots.sync();}if(active==='brazil')brazil.sync();if(active==='uruguay')uruguay.sync();contextFilters();for(const id of ['south-land-boundaries','south-river-boundaries'])if(map.getLayer(id))map.moveLayer(id);host.syncAppearance?.();updateLabels();}
 function renderSelection(){
  renderProvinceFlag();
  $('tab-explore').hidden=!selected;if(!selected)panel('layers');
  const c=countries[active],record=selected,ddd=active==='brazil'&&brazilLayer==='ddd',cep=active==='brazil'&&brazilLayer==='cep';
  sidebar.querySelector('h2').textContent=record?.en||(ddd?'DDD areas':cep?'CEP regions':c.name);
  sidebar.querySelector('.country-local').textContent=record?(record.local===record.en?'':record.local):c.local;
  $('kind').textContent=(record?.level===3?cityDescription(record):record?.kind)||(ddd?'TELEPHONE AREA CODES':cep?'TWO-DIGIT POSTCODES':'SOUTH AMERICA');
  $('reset').textContent=(active==='argentina'||active==='uruguay'||active==='brazil'&&!ddd)&&record?.level>1?record.parentName:ddd?'All DDD areas':'All '+c.name;$('division').value=provinceId(record)||'';
  sidebar.querySelector('.preview-note').textContent=ddd?(record?'+55 '+record.code+' · '+record.states.join(' / '):''):(cep?'Exact CEP boundaries are pending a licensed dataset. No postal boundaries are drawn here.':'');
  const details=$('code-details');details.replaceChildren();details.hidden=!cep&&!(ddd&&record);
  if(active==='argentina'){
   const parent=provinceId(record),children=argentina.children(parent);
   sidebar.querySelector('.preview-note').textContent=record?.id==='AR-94'?'Antarctic and disputed South Atlantic claims remain outside this view.':'';
   if(record?.level===3)sidebar.querySelector('.preview-note').textContent=record.cityRank===1?'Buenos Aires autonomous city (CABA), separate from Buenos Aires Province.':!record.boundaryAvailable?'Municipal boundary pending: IGN’s municipal layer has no polygon for this city. No locality or department outline is substituted.':record.en!==record.boundaryName?'Municipal jurisdiction: '+record.boundaryName+'. '+record.en+' is a city within this municipality; the outline covers the whole municipality.':'Municipal jurisdiction: '+record.boundaryName+'. Its territory can extend beyond the built-up city.';
   details.hidden=false;
   if(record?.level===3){const info=document.createElement('details'),summary=document.createElement('summary'),note=document.createElement('p'),source=document.createElement('a');summary.textContent='City coverage & sources';note.textContent='The 80 entries follow the supplied ranking, which uses 2010 and 2001 figures. IGN provides municipal jurisdictions. Some cities share a municipality; these are drawn once. In Buenos Aires Province, municipal borders coincide with partidos. Santiago del Estero and La Banda remain searchable with their municipal boundaries pending; locality outlines are not substituted.';source.href='data/south-america/argentina-cities/sources.json';source.target='_blank';source.rel='noopener';source.textContent='Boundary sources';info.append(summary,note,source);details.append(info);if(record?.level===3){const a=document.createElement('a');a.href=record.sourceURL;a.target='_blank';a.rel='noopener';a.textContent=record.boundaryAvailable?record.source+' · '+record.kind+' boundary':'IGN municipal coverage';details.append(a);}}
   if(!record){const capital=document.createElement('button');capital.className='quiet-button';capital.textContent='Buenos Aires City · National capital ↗';capital.onclick=()=>select(catalogue().records.find(p=>p.id==='AR-02'));details.append(capital);}
   if(children.length){const heading=document.createElement('h3');const label=parent==='AR-06'?'Partidos':parent==='AR-02'?'Comunas':'Departments';setSubdivisionHeading(heading,label,children.length);const input=document.createElement('input');input.type='search';input.placeholder='Filter '+label.toLowerCase();input.setAttribute('aria-label',input.placeholder);input.className='arg-local-filter';const list=document.createElement('div');list.className='arg-local-list';let limit=20;
    const draw=()=>{list.replaceChildren();const q=(input.value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase(),matches=children.filter(r=>r.en.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().includes(q));for(const child of matches.slice(0,limit)){const button=document.createElement('button');button.className='search-result';button.textContent=child.en;button.setAttribute('aria-current',String(child.id===record?.id));button.onclick=()=>select(child);list.append(button);}if(matches.length>limit){const more=document.createElement('button');more.className='quiet-button';more.textContent='Show more ('+(matches.length-limit)+')';more.onclick=()=>{limit+=20;draw();};list.append(more);}};input.oninput=()=>{limit=20;draw();};draw();details.append(heading,input,list);
   }
  }
  if(active==='brazil'&&!ddd&&!cep||active==='uruguay'){
   const detail=active==='brazil'?brazil:uruguay,parent=provinceId(record),children=detail.children(parent);details.hidden=!record;
   sidebar.querySelector('.preview-note').textContent='';
   if(children.length)renderMunicipalityList(details,children,record,select);
  }
  sidebar.querySelector('.preview-note').hidden=!sidebar.querySelector('.preview-note').textContent;const boundaryCard=sidebar.querySelector('.boundary-info-card');boundaryCard.hidden=!sidebar.querySelector('.preview-note').textContent;
  if(cep){const p=document.createElement('p');p.textContent='The reference map uses GfK postal polygons. Precisely lists 98 two-digit areas for Brazil. These can be added when a dataset licensed for this website is available.';const a=document.createElement('a');a.href=postalSource;a.target='_blank';a.rel='noopener';a.textContent='View the postal boundary catalogue ↗';details.append(p,a);}
  if(ddd&&record){const note=document.createElement('p');note.textContent='Official municipal assignments · IBGE 2025 boundaries, generalized to 75 m.';const disclosure=document.createElement('details'),summary=document.createElement('summary');summary.textContent=record.municipalityCount+' municipalities';disclosure.append(summary);disclosure.ontoggle=()=>{if(!disclosure.open||disclosure.children.length>1)return;const list=document.createElement('ul');for(const m of record.municipalities){const li=document.createElement('li');li.textContent=m.name+' · '+m.state;list.append(li);}disclosure.append(list);};details.append(note,disclosure);}
  const breadcrumb=document.getElementById('breadcrumb-region');breadcrumb.hidden=!record;breadcrumb.textContent=record?.level>1?record.parentName+' / '+record.en:record?.en||'';document.getElementById('map-shell').dataset.selected=String(!!record);
  const anchor=sidebar.querySelector('.south-statistics-anchor'),key=stateStatisticsKey(active,record,brazilLayer);if(key)renderStatistics(anchor,key);else clearStatistics(anchor);
 }
 async function select(record,fit=true,camera={}){if(!active||layerBusy)return;if(record?.cityRank===1)record=catalogues.get('argentina')?.records.find(r=>r.id==='AR-02')||record;const entry=installed.get(active),parentId=provinceId;if(entry&&selected)map.setFeatureState({source:entry.sources[0],id:parentId(selected)},{selected:false});selected=record||null;panel(record?'explore':'layers');if(entry&&selected)map.setFeatureState({source:entry.sources[0],id:parentId(selected)},{selected:true});$('results').hidden=true;$('search').value='';renderSelection();syncLayers();if(fit&&selected?.boundaryAvailable!==false)host.fit(selected?.bounds||countries[active].bounds,undefined,camera);if(active==='argentina'){if(selected)await argentina.setMode(2,true,parentId(selected));else argentina.clear();if(selected?.level===3&&selected.boundaryAvailable)await argentinaCities.show(parentId(selected));else argentinaCities.clear();updateLabels();}if(active==='brazil'&&brazilLayer==='states'){if(selected)await brazil.setMode(2,true,parentId(selected));else brazil.clear();updateLabels();}if(active==='uruguay'){if(selected)await uruguay.setMode(2,true,parentId(selected));else uruguay.clear();updateLabels();}}
 function renderSearch(){const q=$('search').value.trim(),box=$('results');box.replaceChildren();box.hidden=!q;const index=catalogue();if(!q||!index)return;const results=active==='argentina'?argentinaSearch(q):active==='brazil'&&brazilLayer==='states'?brazil.search(q):active==='uruguay'?uruguay.search(q):index.search(q);if(!results.length){const p=document.createElement('p');p.textContent=active==='brazil'&&brazilLayer==='ddd'?'No matching DDD or municipality.':'No matching divisions.';box.append(p);}for(const record of results){const button=document.createElement('button');button.className='search-result';const name=document.createElement('strong'),kind=document.createElement('small');name.textContent=record.en;kind.textContent=(record.level===3?cityDescription(record):record.kind)+(record.parentName?' · '+record.parentName:record.code?' · '+record.states.join(' / '):'');button.append(name,kind);button.onclick=()=>select(record);box.append(button);}}
 $('search').oninput=renderSearch;$('search').onkeydown=e=>{if(e.key==='Enter')$('results').querySelector('button')?.click();if(e.key==='Escape')$('results').hidden=true;};$('division').onchange=()=>select(catalogue()?.records.find(p=>p.id===$('division').value));$('reset').onclick=()=>select((active==='argentina'||active==='uruguay'||active==='brazil'&&brazilLayer==='states')&&selected?.level>1?catalogue().records.find(p=>p.id===selected.parent):null);$('outlines').onchange=syncLayers;$('names').onchange=updateLabels;$('city-dots').onchange=()=>cityDots.sync();
 map.on('movestart',clearLabels);map.on('moveend',updateLabels);map.on('resize',updateLabels);
 map.on('click',e=>{
  if(host.isBusy()||layerBusy)return;
  if(!data&&map.getLayer('south-america-portal-fill')){const hit=map.queryRenderedFeatures(e.point,{layers:['south-america-portal-fill']})[0];if(hit&&allowed(hit.properties.country)){host.switchAtlas(hit.properties.country);return;}}
  if(active==='brazil'&&brazilLayer==='states'){const hit=brazil.hit(e.point);if(hit){select(hit);return;}}
  if(active==='uruguay'){const hit=uruguay.hit(e.point);if(hit){select(hit);return;}}
  if(active==='argentina'){const dot=cityDots.hit(e.point);if(dot){select(dot);return;}const hit=argentina.hit(e.point);if(hit){select(hit);return;}}
  const entry=installed.get(active);if(entry){const hit=map.queryRenderedFeatures(e.point,{layers:[entry.layers[0]]})[0];if(hit){select(catalogues.get(active).records.find(p=>p.id===hit.properties.id));return;}}
  if(map.getLayer('south-america-fill')){const hit=map.queryRenderedFeatures(e.point,{layers:['south-america-fill']})[0];if(hit&&allowed(hit.properties.country))host.switchAtlas(hit.properties.country);}
 });
 function portal(id){const c=countries[id];return{
  bounds:c.bounds,get ready(){return !!data&&(id==='brazil'&&brazilLayer==='cep'||installed.has(id));},warm:()=>warmCountry(id),
  async enter(){if(!allowed(id))return;active=id;selected=null;sidebar.hidden=false;sidebar.querySelector('.sidebar-scroll').scrollTop=0;const flag=$('national-flag');flag.src='vendor/flag-'+c.flag+'.svg';flag.alt='Flag of '+c.name;for(const key of ['mode-province','mode-prefecture','mode-lock'])document.getElementById(key).hidden=false;if(id==='brazil'){document.getElementById('mode-province').textContent='States';document.getElementById('mode-prefecture').textContent='Municipalities';await brazil.setMode(1);}if(id==='uruguay'){document.getElementById('mode-province').textContent='Departments';document.getElementById('mode-prefecture').textContent='Municipalities';await uruguay.setMode(1);}if(id==='argentina'){document.getElementById('mode-province').textContent='Provinces';document.getElementById('mode-prefecture').textContent='Subdivisions';await argentina.setMode(1);cityDots.install(argentinaCities.records);}renderControls();renderSelection();panel('layers');syncLayers();if(id==='argentina'||id==='brazil')preloadProvinceFlags();},
  leave(){clearStatistics(sidebar.querySelector('.south-statistics-anchor'));layerEpoch++;layerBusy=false;if(id==='brazil')brazil.clear();if(id==='uruguay')uruguay.clear();if(id==='argentina'){argentina.clear();argentinaCities.clear();cityDots.clear();}active=null;selected=null;renderProvinceFlag();cancelPending();remove(id);sidebar.hidden=true;$('results').hidden=true;$('search').value='';clearLabels();contextFilters();for(const key of ['mode-province','mode-prefecture','mode-lock'])document.getElementById(key).hidden=false;},
  updateLabels,pauseLabels:clearLabels,getSelection:()=>selected?.id||null,getScope:()=>id==='brazil'?brazilLayer:id==='argentina'?argentina.scope||'':id==='uruguay'?uruguay.scope||'':'',restore:async(key,scope)=>{if(id==='brazil'){const mode=['states','ddd','cep'].includes(scope)?scope:String(key||'').startsWith('BR-DDD-')?'ddd':'states';await setBrazilLayer(mode);}await select(catalogue()?.records.find(p=>p.id===key)||(id==='argentina'?argentina.find(key)||argentinaCities.find(key):id==='brazil'&&brazilLayer==='states'?brazil.find(key):id==='uruguay'?uruguay.find(key):null),false);},setMode(value){if(id==='uruguay'){uruguay.setMode(value);syncLayers();}if(id==='argentina'){argentina.setMode(value);syncLayers();}if(id==='brazil'&&brazilLayer==='states'){brazil.setMode(value);syncLayers();}},home:()=>select(null),viewParent:(camera={})=>select((id==='argentina'||id==='uruguay'||id==='brazil'&&brazilLayer==='states')&&selected?.level>1?catalogue().records.find(p=>p.id===selected.parent):null,true,camera),random(){const records=id==='argentina'&&argentina.visibleRecords.length?argentina.visibleRecords:id==='brazil'&&brazilLayer==='states'&&brazil.visibleRecords.length?brazil.visibleRecords:id==='uruguay'&&uruguay.visibleRecords.length?uruguay.visibleRecords:catalogue()?.records||[];if(records.length)select(records[Math.floor(Math.random()*records.length)]);}
 };}
 async function fly(bounds){await warm();const target=map.cameraForBounds(bounds,{padding:45,maxZoom:6});if(!target)return;return new Promise(resolve=>{map.once('moveend',resolve);map.flyTo({...target,duration:2800,curve:1.65,minZoom:.65,retainPadding:false,essential:false,easing:t=>t*t*(3-2*t)});});}
 contextFilters();updateLabels();
 return{portals:Object.fromEntries(Object.keys(countries).map(id=>[id,portal(id)])),fly,syncDeveloper};
}
