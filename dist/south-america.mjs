import {createPlaceSearch} from './place-search.mjs';
import {loadCompressed} from './korea-data.mjs';
import {createArgentinaLocal} from './argentina-local.mjs';
import {renderStatistics,clearStatistics} from './statistics.mjs';
import {argentinaFlags} from './argentina-flags.mjs';
export const countries={
 brazil:{name:'Brazil',local:'Brasil',flag:'br',center:[-52,-13],bounds:[[-74,-34],[-34,6]],color:'#dcebd9',line:'#527b59',selected:'#b9d6b2'},
 uruguay:{name:'Uruguay',local:'',flag:'uy',center:[-56,-33],bounds:[[-59,-35.5],[-53,-30]],color:'#e0edf4',line:'#5883a0',selected:'#bcd9ec'},
 argentina:{name:'Argentina',local:'',flag:'ar',center:[-65,-39],bounds:[[-74,-56],[-53,-21]],color:'#dfebf3',line:'#5883a0',selected:'#bcd9ec'}
};
export function createSouthAmerica(map,host){
 let data,loading,active=null,selected=null,labels=[],pending,sourceWait,layerEpoch=0;
 let brazilLayer='states',layerBusy=false;
 try{const saved=window.AtlasView?.fromHash(location.hash)||window.AtlasView?.read('brazil',localStorage);if(saved?.country==='brazil'&&['states','ddd','cep'].includes(saved.scope))brazilLayer=saved.scope;}catch{}
 const postalSource='https://docs.precisely.com/docs-gated/data/gfk-boundaries/2022/en-us/pdf/EN_GfK_Worldwide_digital_maps_without_prices.pdf';
 const installed=new Map(),catalogues=new Map(),jobs=new Map();
 const argentina=createArgentinaLocal(map,{active:()=>active==='argentina'&&window.AtlasDev.enabled,selected:()=>selected,outlines:()=>$('outlines').checked,waitForSources,changed:()=>{if(active==='argentina')syncLayers();},status:message=>{if(active==='argentina'){$('layer-status').hidden=!message;$('layer-status').textContent=message;}}});
 const sidebar=document.createElement('aside');sidebar.id='south-america-sidebar';sidebar.className='sidebar south-america-sidebar';sidebar.hidden=true;
 sidebar.setAttribute('aria-label','Explore South America');
 sidebar.innerHTML=`<div class="sidebar-tools">
  <label class="sr-only" for="south-search">Find a division</label><input id="south-search" type="search" placeholder="Find a division" autocomplete="off"><div id="south-results" hidden aria-live="polite"></div>
  <div class="panel-tabs"><button id="south-tab-layers" type="button" aria-pressed="true" aria-controls="south-layers-panel">Map settings</button><button id="south-tab-explore" type="button" hidden aria-pressed="false" aria-controls="south-explore-panel">Discover</button></div>
  <p id="south-layer-status" role="status" class="south-layer-status" hidden></p>
 </div><div class="sidebar-scroll">
  <section id="south-explore-panel" hidden><div class="selection-top"><button class="back-button" id="south-reset"></button><div class="south-flags"><img id="south-national-flag" alt=""><a id="south-flag-source" hidden target="_blank" rel="noopener"><img id="south-province-flag" alt="" decoding="async"></a></div></div><span class="eyebrow" id="south-kind"></span><h2></h2><p class="country-local"></p><p class="preview-note"></p><div class="south-statistics-anchor"></div><section id="south-code-details" class="south-code-details" hidden></section></section>
  <section id="south-layers-panel"><div id="south-map-types" class="south-map-types" role="group" aria-label="Brazil map view" hidden><button type="button" data-layer="states">States</button><button type="button" data-layer="ddd">DDD</button><button type="button" data-layer="cep">CEP</button></div><p id="south-cep-status" hidden>Exact CEP boundaries are pending a licensed dataset.</p><label class="field-label" for="south-division">Division</label><select id="south-division"></select><section class="layers"><h3>Visible layers</h3><label><span>Division outlines</span><input id="south-outlines" type="checkbox" checked></label><label><span>Region names</span><input id="south-names" type="checkbox" checked></label></section></section>
 </div><footer class="sidebar-footer"><a id="south-source" target="_blank" rel="noopener">Boundary source</a><span>Created by Ethan Hu</span></footer>`;
 document.querySelector('.workspace').insertBefore(sidebar,document.getElementById('map-shell'));
 const $=id=>sidebar.querySelector('#south-'+id);
 const panel=name=>{for(const key of ['explore','layers']){$(key+'-panel').hidden=key!==name;$('tab-'+key).setAttribute('aria-pressed',String(key===name));}sidebar.querySelector('.sidebar-scroll').scrollTop=0;};
 $('tab-explore').onclick=()=>panel('explore');$('tab-layers').onclick=()=>panel('layers');
 const provinceFlagImages=new Map();let flagsWarming=null;
 function preloadProvinceFlags(){
  if(flagsWarming)return;
  const queue=Object.entries(argentinaFlags).filter(([id])=>!provinceFlagImages.has(id));
  async function next(){
   while(active==='argentina'&&window.AtlasDev.enabled&&queue.length){
    const [id,reference]=queue.shift(),image=new Image(),entry={image,ready:false};
    provinceFlagImages.set(id,entry);image.decoding='async';image.fetchPriority='low';image.src=reference.file;
    try{await image.decode();entry.ready=true;}catch{provinceFlagImages.delete(id);}
   }
  }
  flagsWarming=Promise.all(Array.from({length:3},next)).finally(()=>{flagsWarming=null;});
 }
 let provinceFlagId=null;
 function renderProvinceFlag(){
  const id=active==='argentina'?(selected?.level===2?selected.parent:selected?.id):null;
  if(id===provinceFlagId)return;
  provinceFlagId=id;
  const flag=$('province-flag'),link=$('flag-source'),reference=argentinaFlags[id];
  link.hidden=true;flag.onload=null;flag.onerror=null;flag.removeAttribute('src');
  if(!reference){link.removeAttribute('href');return;}
  flag.alt='Flag of '+reference.name;
  link.href=reference.page;link.title=reference.name+' flag · '+reference.credit+' · '+reference.license+' — source and license';
  flag.onload=()=>{if(active==='argentina'&&provinceFlagId===id)link.hidden=false;};
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
 const arrow=document.createElement('button');arrow.className='continent-flight';arrow.type='button';arrow.innerHTML='<span aria-hidden="true">↙</span>';document.getElementById('map-shell').append(arrow);
 let lastAsia='china';arrow.onclick=()=>{if(host.isBusy())return;const current=host.country();if(!countries[current]){lastAsia=current;host.switchAtlas('brazil',true,true);}else host.switchAtlas(lastAsia,true,true);};
 function syncArrow(){arrow.hidden=!window.AtlasDev.enabled;const south=!!countries[host.country()];arrow.firstElementChild.textContent=south?'↗':'↙';arrow.setAttribute('aria-label',south?'Fly to East Asia':'Fly to South America');arrow.title=arrow.getAttribute('aria-label');}
 function syncDeveloper(){syncArrow();for(const id of ['south-america-fill','south-america-lines'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',window.AtlasDev.enabled?'visible':'none');for(const [id,entry] of installed)for(const layer of entry.layers)map.setLayoutProperty(layer,'visibility',window.AtlasDev.enabled&&active===id?'visible':'none');if(!window.AtlasDev.enabled){argentina.clear();cancelPending();clearLabels();}contextFilters();}
 syncArrow();
 function clearLabels(){labels.forEach(l=>l.remove());labels=[];}
 function updateLabels(){
  clearLabels();if(!active||map.isMoving()||!$('names').checked)return;
  const first=catalogue()?.records||[],records=active==='argentina'?[...first.filter(p=>p.id!==argentina.scope),...argentina.visibleRecords,...(argentina.visibleRecords.length?[]:first.filter(p=>p.id===argentina.scope))]:first,b=map.getBounds();
  const visible=records.filter(p=>p.center[0]>=b.getWest()&&p.center[0]<=b.getEast()&&p.center[1]>=b.getSouth()&&p.center[1]<=b.getNorth());
  if(selected&&!visible.includes(selected))visible.unshift(selected);
  const candidates=visible.map(p=>({...p,local:p.id==='AR-94'?'':p.id==='AR-02'?'Buenos Aires (CABA)':p.local,selected:p===selected||p.id==='AR-02'}));
  for(const [id,c] of Object.entries(countries))if(id!==active||!records.length)candidates.push({id,en:c.name,local:c.local,center:c.center});
  labels=window.AtlasLabels.render(map,candidates,'province-label');
 }
 function contextFilters(){const exclusion=installed.has(active)?active:'';for(const id of ['south-america-fill','south-america-lines'])if(map.getLayer(id))map.setFilter(id,['all',['!=',['get','country'],''],['!=',['get','country'],exclusion]]);if(map.getLayer('world-land'))map.setFilter('world-land',window.AtlasDev.enabled&&data?['==',['get','country'],'']:null);if(map.getLayer('south-river-boundaries'))map.setLayoutProperty('south-river-boundaries','visibility',window.AtlasDev.enabled&&['argentina','uruguay'].includes(active)?'visible':'none');}
 async function warm(){
  if(!window.AtlasDev.enabled)throw Error('Developer mode is required');if(data)return;if(loading)return loading;
  loading=(async()=>{
   const context=await loadCompressed('data/flight-context.bin');data=context;
   map.addSource('flight-context',{type:'geojson',data:context,tolerance:.25,buffer:64,maxzoom:16,attribution:'Country silhouettes: Natural Earth · IBGE · IGN · IGM / IDE Uruguay'});
   map.addLayer({id:'south-america-fill',type:'fill',source:'flight-context',paint:{'fill-color':'#d7d7d3'}});
   map.addLayer({id:'south-america-lines',type:'line',source:'flight-context',paint:{'line-color':'#9aaba5','line-width':1}});
   map.addSource('south-river-borders',{type:'geojson',data:context.riverBorders,tolerance:.25,attribution:'International river boundary: <a href="https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/CapasSIG">IGN</a>'});
   map.addLayer({id:'south-river-boundaries',type:'line',source:'south-river-borders',minzoom:4,layout:{visibility:'none','line-join':'round'},paint:{'line-color':'#9aaba5','line-width':1,'line-dasharray':[3,3]}});
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
  await warm();if(id==='brazil'&&mode==='cep')return;
  if(installed.get(id)?.mode===mode){if(id==='argentina')await argentina.warm(catalogues.get(id).records);return;}
  const jobKey=id+':'+mode,epoch=layerEpoch;if(jobs.get(jobKey)?.epoch===epoch)return jobs.get(jobKey).promise;
  const job=(async()=>{
   const payload=await prepare(id,mode);if(host.country()!==id||!window.AtlasDev.enabled||epoch!==layerEpoch)return;
   const c=countries[id],sources=[],layers=[],urls=[],suffix=mode==='ddd'?'-ddd':'';
   const cleanup=()=>{for(const layer of [...layers].reverse())if(map.getLayer(layer))map.removeLayer(layer);for(const source of sources)if(map.getSource(source))map.removeSource(source);urls.forEach(URL.revokeObjectURL);};
   try{
    for(const [name,blob] of Object.entries(payload.sources)){const key='south-'+id+suffix+'-'+name,url=URL.createObjectURL(blob);urls.push(url);sources.push(key);map.addSource(key,{type:'geojson',data:url,promoteId:name==='regions'?'id':undefined,tolerance:.25,buffer:64,maxzoom:16,attribution:mode==='ddd'?'<a href="https://informacoes.anatel.gov.br/paineis/areas-tarifarias">Anatel DDD</a> · <a href="https://www.ibge.gov.br/geociencias/">IBGE · 2025</a>':id==='brazil'?'<a href="https://www.ibge.gov.br/geociencias/">IBGE · 2025</a>':id==='uruguay'?'<a href="https://www.ide.uy/">IGM / IDE Uruguay</a>':'<a href="https://www.ign.gob.ar/">IGN, Argentina</a>'});}
    const add=layer=>{layer.layout={...layer.layout,visibility:'none'};map.addLayer(layer);layers.push(layer.id);};
    add({id:'south-'+id+suffix+'-fill',type:'fill',source:sources[0],paint:{'fill-color':['case',['boolean',['feature-state','selected'],false],c.selected,c.color],'fill-antialias':false}});
    add({id:'south-'+id+suffix+'-borders',type:'line',source:sources[1],layout:{'line-join':'round'},paint:{'line-color':c.line,'line-width':['interpolate',['linear'],['zoom'],2,.6,7,1.15],'line-opacity':.8}});
    add({id:'south-'+id+suffix+'-selection',type:'line',source:sources[0],filter:['==',['get','id'],''],layout:{'line-join':'round'},paint:{'line-color':c.line,'line-width':2}});
    const controller=new AbortController();sourceWait=controller;
    if(installed.has(id))await waitForSources(sources,controller.signal);
    if(sourceWait===controller)sourceWait=null;
    if(host.country()!==id||epoch!==layerEpoch||!window.AtlasDev.enabled){cleanup();return;}
    for(const other of [...installed.keys()])remove(other);
    installed.set(id,{sources,layers,urls,mode});catalogues.set(id,{records:payload.records,search:createPlaceSearch(payload.records)});
   }catch(error){cleanup();throw error;}
   if(id==='argentina')await argentina.warm(catalogues.get(id).records);
  })().finally(()=>{if(jobs.get(jobKey)?.promise===job)jobs.delete(jobKey);});jobs.set(jobKey,{epoch,promise:job});return job;
 }
 function renderControls(){
  const records=catalogue()?.records||[],ddd=active==='brazil'&&brazilLayer==='ddd',cep=active==='brazil'&&brazilLayer==='cep';
  const noun=ddd?'area code':active==='brazil'?'state':active==='uruguay'?'department':'province';
  $('division').replaceChildren(new Option(ddd?'All DDD areas':'All '+countries[active].name,''));for(const p of records)$('division').append(new Option(p.en,p.id));
  $('division').hidden=!records.length;$('division').previousElementSibling.hidden=!records.length;$('division').previousElementSibling.textContent=ddd?'Area code':'Division';
  $('search').disabled=!records.length;$('search').placeholder=cep?'CEP boundaries pending':ddd?'Find DDD or municipality':active==='argentina'?'Find a province, department or partido':'Find a '+noun;
  sidebar.querySelector('label[for="south-search"]').textContent=$('search').placeholder;sidebar.querySelector('.layers').hidden=!records.length;
  $('source').href=cep?postalSource:active==='argentina'?'data/south-america/argentina-local/sources.json':'data/south-america/'+active+(ddd?'-ddd':'')+'-sources.json';$('source').textContent=cep?'Postal boundary dataset':'Boundary source';
  document.getElementById('map-hint').textContent=cep?'CEP boundaries pending':ddd?'Select a DDD area':'Select a '+noun;
  syncTypeButtons();
 }
 async function setBrazilLayer(mode){
  if(active!=='brazil'||!['states','ddd','cep'].includes(mode))return;
  if(mode===brazilLayer&&!layerBusy)return;
  const epoch=++layerEpoch;cancelPending();layerBusy=true;syncTypeButtons();$('results').hidden=true;
  $('layer-status').hidden=false;$('layer-status').textContent=mode==='cep'?'Opening postal view…':'Loading '+(mode==='ddd'?'DDD areas':'states')+'…';
  try{
   if(mode!=='cep')await warmCountry('brazil',mode);
   if(epoch!==layerEpoch||active!=='brazil')return;
   if(mode==='cep')remove('brazil');
   brazilLayer=mode;selected=null;$('search').value='';sidebar.querySelector('.sidebar-scroll').scrollTop=0;renderControls();renderSelection();syncLayers();saveLayer();
  }finally{if(epoch===layerEpoch){layerBusy=false;syncTypeButtons();$('layer-status').hidden=true;}}
 }
 function syncLayers(){const entry=installed.get(active);if(entry){map.setLayoutProperty(entry.layers[0],'visibility','visible');map.setLayoutProperty(entry.layers[1],'visibility',$('outlines').checked?'visible':'none');map.setLayoutProperty(entry.layers[2],'visibility','visible');map.setFilter(entry.layers[2],['==',['get','id'],selected?.level===2?selected.parent:selected?.id||'']);}if(active==='argentina')argentina.sync();contextFilters();updateLabels();}
 function renderSelection(){
  renderProvinceFlag();
  $('tab-explore').hidden=!selected;if(!selected)panel('layers');
  const c=countries[active],record=selected,ddd=active==='brazil'&&brazilLayer==='ddd',cep=active==='brazil'&&brazilLayer==='cep';
  sidebar.querySelector('h2').textContent=record?.en||(ddd?'DDD areas':cep?'CEP regions':c.name);
  sidebar.querySelector('.country-local').textContent=record?(record.local===record.en?'':record.local):c.local;
  $('kind').textContent=record?.kind||(ddd?'TELEPHONE AREA CODES':cep?'TWO-DIGIT POSTCODES':'SOUTH AMERICA');
  $('reset').textContent=active==='argentina'&&record?.level===2?record.parentName:ddd?'All DDD areas':'All '+c.name;$('division').value=record?.level===2?record.parent:record?.id||'';
  sidebar.querySelector('.preview-note').textContent=ddd?(record?'+55 '+record.code+' · '+record.states.join(' / ')+' · '+record.municipalityCount+' municipalities':'67 DDD areas. Each follows the municipalities assigned by Anatel; some cross state borders.'):(cep?'Exact CEP boundaries are pending a licensed dataset. Two-digit postal regions can divide a city, so state and municipal outlines cannot substitute for them. No postal boundaries are drawn here.':record?.id==='AR-94'?'Continental territory and nearby islands are shown here. The source also includes Antarctic and disputed South Atlantic claims, which are outside this view.':active==='brazil'?'26 states and the Federal District.':active==='argentina'?'23 provinces and Buenos Aires autonomous city.':record?.id==='UY-AR'?'19 departments. IGM separately marks Rincón de Maneco and Isla Brasileña as contested areas; those areas are outside the regular department fill.':'19 departments.');
  const details=$('code-details');details.replaceChildren();details.hidden=!cep&&!(ddd&&record);
  if(active==='argentina'){
   const parent=record?.level===2?record.parent:record?.id,children=argentina.children(parent);
   sidebar.querySelector('.preview-note').textContent=record?.id==='AR-02'?'Buenos Aires is Argentina’s national capital and an autonomous city, separate from Buenos Aires Province. It is divided into 15 comunas.':record?.level===2?record.kind+' · '+record.parentName+' · INDEC code '+record.code:record?.id==='AR-94'?'3 departments in this view. Antarctic and disputed South Atlantic claims remain outside the atlas.':record?children.length+' '+(record.id==='AR-06'?'partidos':'departments')+'. Select a subdivision below or on the map.':'23 provinces and Buenos Aires autonomous city, the national capital. Provinces use departments; Buenos Aires Province uses partidos. Detailed borders appear within the selected province.';
   details.hidden=false;
   if(!record){const capital=document.createElement('button');capital.className='quiet-button';capital.textContent='Buenos Aires City · National capital ↗';capital.onclick=()=>select(catalogue().records.find(p=>p.id==='AR-02'));details.append(capital);}
   if(children.length){const heading=document.createElement('h3');heading.textContent=parent==='AR-06'?'Partidos':parent==='AR-02'?'Comunas':'Departments';const input=document.createElement('input');input.type='search';input.placeholder='Filter '+heading.textContent.toLowerCase();input.setAttribute('aria-label',input.placeholder);input.className='arg-local-filter';const list=document.createElement('div');list.className='arg-local-list';let limit=20;
    const draw=()=>{list.replaceChildren();const q=(input.value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase(),matches=children.filter(r=>r.en.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().includes(q));for(const child of matches.slice(0,limit)){const button=document.createElement('button');button.className='search-result';button.textContent=child.en;button.setAttribute('aria-current',String(child.id===record?.id));button.onclick=()=>select(child);list.append(button);}if(matches.length>limit){const more=document.createElement('button');more.className='quiet-button';more.textContent='Show more ('+(matches.length-limit)+')';more.onclick=()=>{limit+=20;draw();};list.append(more);}};input.oninput=()=>{limit=20;draw();};draw();details.append(heading,input,list);
   }
  }
  if(cep){const p=document.createElement('p');p.textContent='The reference map uses GfK postal polygons. Precisely lists 98 two-digit areas for Brazil. These can be added when a dataset licensed for this website is available.';const a=document.createElement('a');a.href=postalSource;a.target='_blank';a.rel='noopener';a.textContent='View the postal boundary catalogue ↗';details.append(p,a);}
  if(ddd&&record){const note=document.createElement('p');note.textContent='Official municipal assignments · IBGE 2025 boundaries, generalized to 75 m.';const disclosure=document.createElement('details'),summary=document.createElement('summary');summary.textContent=record.municipalityCount+' municipalities';disclosure.append(summary);disclosure.ontoggle=()=>{if(!disclosure.open||disclosure.children.length>1)return;const list=document.createElement('ul');for(const m of record.municipalities){const li=document.createElement('li');li.textContent=m.name+' · '+m.state;list.append(li);}disclosure.append(list);};details.append(note,disclosure);}
  const breadcrumb=document.getElementById('breadcrumb-region');breadcrumb.hidden=!record;breadcrumb.textContent=record?.level===2?record.parentName+' / '+record.en:record?.en||'';document.getElementById('map-shell').dataset.selected=String(!!record);
  const anchor=sidebar.querySelector('.south-statistics-anchor');if(active==='argentina'&&record?.level===1)renderStatistics(anchor,'argentina:'+record.id);else clearStatistics(anchor);
 }
 async function select(record,fit=true,camera={}){if(!active||layerBusy)return;const entry=installed.get(active),parentId=r=>r?.level===2?r.parent:r?.id;if(entry&&selected)map.setFeatureState({source:entry.sources[0],id:parentId(selected)},{selected:false});selected=record||null;panel(record?'explore':'layers');if(entry&&selected)map.setFeatureState({source:entry.sources[0],id:parentId(selected)},{selected:true});$('results').hidden=true;$('search').value='';renderSelection();syncLayers();if(fit)host.fit(selected?.bounds||countries[active].bounds,undefined,camera);if(active==='argentina'){if(selected)await argentina.setMode(2,true,parentId(selected));else argentina.clear();updateLabels();}}
 function renderSearch(){const q=$('search').value.trim(),box=$('results');box.replaceChildren();box.hidden=!q;const index=catalogue();if(!q||!index)return;const results=active==='argentina'?argentina.search(q):index.search(q);if(!results.length){const p=document.createElement('p');p.textContent=active==='brazil'&&brazilLayer==='ddd'?'No matching DDD or municipality.':'No matching divisions.';box.append(p);}for(const record of results){const button=document.createElement('button');button.className='search-result';const name=document.createElement('strong'),kind=document.createElement('small');name.textContent=record.en;kind.textContent=record.kind+(record.parentName?' · '+record.parentName:record.code?' · '+record.states.join(' / '):'');button.append(name,kind);button.onclick=()=>select(record);box.append(button);}}
 $('search').oninput=renderSearch;$('search').onkeydown=e=>{if(e.key==='Enter')$('results').querySelector('button')?.click();if(e.key==='Escape')$('results').hidden=true;};$('division').onchange=()=>select(catalogue()?.records.find(p=>p.id===$('division').value));$('reset').onclick=()=>select(active==='argentina'&&selected?.level===2?catalogue().records.find(p=>p.id===selected.parent):null);$('outlines').onchange=syncLayers;$('names').onchange=updateLabels;
 map.on('movestart',clearLabels);map.on('moveend',updateLabels);map.on('resize',updateLabels);
 map.on('click',e=>{
  if(!window.AtlasDev.enabled||host.isBusy()||layerBusy)return;
  if(active==='argentina'){const hit=argentina.hit(e.point);if(hit){select(hit);return;}}
  const entry=installed.get(active);if(entry){const hit=map.queryRenderedFeatures(e.point,{layers:[entry.layers[0]]})[0];if(hit){select(catalogues.get(active).records.find(p=>p.id===hit.properties.id));return;}}
  if(map.getLayer('south-america-fill')){const hit=map.queryRenderedFeatures(e.point,{layers:['south-america-fill']})[0];if(hit)host.switchAtlas(hit.properties.country);}
 });
 function portal(id){const c=countries[id];return{
  bounds:c.bounds,get ready(){return !!data&&(id==='brazil'&&brazilLayer==='cep'||installed.has(id));},warm:()=>warmCountry(id),
  async enter(){active=id;selected=null;sidebar.hidden=false;sidebar.querySelector('.sidebar-scroll').scrollTop=0;const flag=$('national-flag');flag.src='vendor/flag-'+c.flag+'.svg';flag.alt='Flag of '+c.name;for(const key of ['mode-province','mode-prefecture','mode-lock'])document.getElementById(key).hidden=id!=='argentina';if(id==='argentina'){document.getElementById('mode-province').textContent='Provinces';document.getElementById('mode-prefecture').textContent='Subdivisions';await argentina.setMode(1);}renderControls();renderSelection();panel('layers');syncLayers();syncArrow();if(id==='argentina')preloadProvinceFlags();},
  leave(){clearStatistics(sidebar.querySelector('.south-statistics-anchor'));layerEpoch++;layerBusy=false;if(id==='argentina')argentina.clear();active=null;selected=null;renderProvinceFlag();cancelPending();remove(id);sidebar.hidden=true;$('results').hidden=true;$('search').value='';clearLabels();contextFilters();for(const key of ['mode-province','mode-prefecture','mode-lock'])document.getElementById(key).hidden=false;},
  updateLabels,pauseLabels:clearLabels,getSelection:()=>selected?.id||null,getScope:()=>id==='brazil'?brazilLayer:id==='argentina'?argentina.scope||'':'',restore:async(key,scope)=>{if(id==='brazil'){const mode=['states','ddd','cep'].includes(scope)?scope:String(key||'').startsWith('BR-DDD-')?'ddd':'states';await setBrazilLayer(mode);}await select(catalogue()?.records.find(p=>p.id===key)||(id==='argentina'?argentina.find(key):null),false);},setMode(value){if(id==='argentina'){argentina.setMode(value);syncLayers();}},home:()=>select(null),viewParent:(camera={})=>select(id==='argentina'&&selected?.level===2?catalogue().records.find(p=>p.id===selected.parent):null,true,camera),random(){const records=id==='argentina'&&argentina.visibleRecords.length?argentina.visibleRecords:catalogue()?.records||[];if(records.length)select(records[Math.floor(Math.random()*records.length)]);}
 };}
 async function fly(bounds){await warm();const target=map.cameraForBounds(bounds,{padding:45,maxZoom:6});if(!target)return;return new Promise(resolve=>{map.once('moveend',resolve);map.flyTo({...target,duration:2800,curve:1.65,minZoom:.65,retainPadding:false,essential:false,easing:t=>t*t*(3-2*t)});});}
 return{portals:Object.fromEntries(Object.keys(countries).map(id=>[id,portal(id)])),fly,syncArrow,syncDeveloper};
}
