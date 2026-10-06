import {createPlaceSearch} from './place-search.mjs';
import {loadCompressed} from './korea-data.mjs';
export const countries={
 brazil:{name:'Brazil',local:'Brasil',flag:'br',center:[-52,-13],bounds:[[-74,-34],[-34,6]],color:'#dcebd9',line:'#527b59',selected:'#b9d6b2'},
 uruguay:{name:'Uruguay',local:'',flag:'uy',center:[-56,-33],bounds:[[-59,-35.5],[-53,-30]],color:'#e0edf4',line:'#5883a0',selected:'#bcd9ec'},
 argentina:{name:'Argentina',local:'',flag:'ar',center:[-65,-39],bounds:[[-74,-56],[-53,-21]],color:'#dfebf3',line:'#5883a0',selected:'#bcd9ec'}
};
export function createSouthAmerica(map,host){
 let data,loading,active=null,selected=null,labels=[],pending;
 const installed=new Map(),catalogues=new Map(),jobs=new Map();
 const sidebar=document.createElement('aside');sidebar.className='sidebar south-america-sidebar';sidebar.hidden=true;
 sidebar.setAttribute('aria-label','Explore South America');
 sidebar.innerHTML='<div class="sidebar-tools"><label class="sr-only" for="south-search">Find a state or province</label><input id="south-search" type="search" placeholder="Find a state or province" autocomplete="off"><div id="south-results" hidden aria-live="polite"></div></div><div class="sidebar-scroll"><div class="selection-top"><button class="back-button" id="south-reset"></button><img alt=""></div><span class="eyebrow" id="south-kind"></span><h2></h2><p class="country-local"></p><p class="preview-note"></p><label class="field-label" for="south-division">Division</label><select id="south-division"></select><section class="layers"><h3>Visible layers</h3><label><span>Division outlines</span><input id="south-outlines" type="checkbox" checked></label><label><span>Region names</span><input id="south-names" type="checkbox" checked></label></section><nav aria-label="South American countries" class="south-america-countries"></nav><a class="quiet-button" href="#china">Back to East Asia ↗</a></div><footer class="sidebar-footer"><a id="south-source" target="_blank" rel="noopener">Boundary source</a><span>Created by Ethan Hu</span></footer>';
 document.querySelector('.workspace').insertBefore(sidebar,document.getElementById('map-shell'));
 const $=id=>sidebar.querySelector('#south-'+id),nav=sidebar.querySelector('nav');
 for(const [id,c] of Object.entries(countries)){const b=document.createElement('button');b.className='search-result';b.textContent=c.name;b.onclick=()=>host.switchAtlas(id);b.dataset.country=id;nav.append(b);}
 const arrow=document.createElement('button');arrow.className='continent-flight';arrow.type='button';arrow.innerHTML='<span aria-hidden="true">↙</span>';document.getElementById('map-shell').append(arrow);
 let lastAsia='china';arrow.onclick=()=>{if(host.isBusy())return;const current=host.country();if(!countries[current]){lastAsia=current;host.switchAtlas('brazil',true,true);}else host.switchAtlas(lastAsia,true,true);};
 function syncArrow(){arrow.hidden=!window.AtlasDev.enabled;const south=!!countries[host.country()];arrow.firstElementChild.textContent=south?'↗':'↙';arrow.setAttribute('aria-label',south?'Fly to East Asia':'Fly to South America');arrow.title=arrow.getAttribute('aria-label');}
 function syncDeveloper(){syncArrow();for(const id of ['flight-world','south-america-fill','south-america-lines'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',window.AtlasDev.enabled?'visible':'none');for(const [id,entry] of installed)for(const layer of entry.layers)map.setLayoutProperty(layer,'visibility',window.AtlasDev.enabled&&active===id?'visible':'none');if(!window.AtlasDev.enabled){cancelPending();clearLabels();}}
 syncArrow();
 function clearLabels(){labels.forEach(l=>l.remove());labels=[];}
 function updateLabels(){
  clearLabels();if(!active||map.isMoving()||!$('names').checked)return;
  const records=catalogues.get(active)?.records||[],b=map.getBounds();
  const visible=records.filter(p=>p.center[0]>=b.getWest()&&p.center[0]<=b.getEast()&&p.center[1]>=b.getSouth()&&p.center[1]<=b.getNorth());
  if(selected&&!visible.includes(selected))visible.unshift(selected);
  const candidates=visible.map(p=>({...p,local:p.id==='AR-94'?'':p.id==='AR-02'?'CABA':p.local,selected:p===selected}));
  for(const [id,c] of Object.entries(countries))if(id!==active||!records.length)candidates.push({id,en:c.name,local:c.local,center:c.center});
  labels=window.AtlasLabels.render(map,candidates,'province-label');
 }
 function contextFilters(){const exclusion=installed.has(active)?active:'';for(const id of ['south-america-fill','south-america-lines'])if(map.getLayer(id))map.setFilter(id,['all',['!=',['get','country'],''],['!=',['get','country'],exclusion]]);if(map.getLayer('flight-world'))map.setFilter('flight-world',['!=',['get','country'],exclusion]);}
 async function warm(){
  if(!window.AtlasDev.enabled)throw Error('Developer mode is required');if(data)return;if(loading)return loading;
  loading=(async()=>{
   const context=await loadCompressed('data/flight-context.bin');data=context;
   map.addSource('flight-context',{type:'geojson',data:context,tolerance:.5,attribution:'Country silhouettes: <a href="https://www.naturalearthdata.com/">Natural Earth</a>'});
   map.addLayer({id:'flight-world',type:'fill',source:'flight-context',maxzoom:4,paint:{'fill-color':'#d7d7d3','fill-opacity':['interpolate',['linear'],['zoom'],2,1,4,0],'fill-antialias':false}},'china-context');
   map.addLayer({id:'south-america-fill',type:'fill',source:'flight-context',paint:{'fill-color':['match',['get','country'],...Object.entries(countries).flatMap(([id,c])=>[id,c.color]),'#d7d7d3']}});
   map.addLayer({id:'south-america-lines',type:'line',source:'flight-context',paint:{'line-color':'#9aaba5','line-width':1}});
   contextFilters();syncDeveloper();
  })();try{await loading;}catch(e){loading=null;data=null;throw e;}
 }
 function cancelPending(){if(pending){const request=pending;pending=null;request.worker.terminate();request.reject(new DOMException('Country changed','AbortError'));}}
 function prepare(id){return new Promise((resolve,reject)=>{cancelPending();const worker=new Worker(new URL('./south-america-worker.mjs',import.meta.url),{type:'module'}),request={id,worker,reject};pending=request;const finish=()=>{worker.terminate();if(pending===request)pending=null;};worker.onmessage=({data})=>{finish();data.error?reject(Error(data.error)):resolve(data);};worker.onerror=e=>{finish();reject(Error(e.message));};worker.postMessage({url:'data/south-america/'+id+'-first.bin'});});}
 function remove(id){const entry=installed.get(id);if(!entry)return;for(const layer of [...entry.layers].reverse())if(map.getLayer(layer))map.removeLayer(layer);for(const source of entry.sources)if(map.getSource(source))map.removeSource(source);entry.urls.forEach(URL.revokeObjectURL);installed.delete(id);}
 async function warmCountry(id){
  await warm();if(id==='uruguay'||installed.has(id))return;if(jobs.has(id))return jobs.get(id);
  const job=(async()=>{
   const payload=await prepare(id);if(host.country()!==id||!window.AtlasDev.enabled)return;
   for(const other of installed.keys())if(other!==id)remove(other);
   const c=countries[id],sources=[],layers=[],urls=[];
   for(const [name,blob] of Object.entries(payload.sources)){const key='south-'+id+'-'+name,url=URL.createObjectURL(blob);urls.push(url);sources.push(key);map.addSource(key,{type:'geojson',data:url,promoteId:name==='regions'?'id':undefined,tolerance:.25,buffer:64,maxzoom:16,attribution:id==='brazil'?'<a href="https://www.ibge.gov.br/geociencias/">IBGE · 2025</a>':'<a href="https://www.ign.gob.ar/">IGN, Argentina</a>'});}
   const add=layer=>{layer.layout={...layer.layout,visibility:'none'};map.addLayer(layer);layers.push(layer.id);};
   add({id:'south-'+id+'-fill',type:'fill',source:sources[0],paint:{'fill-color':['case',['boolean',['feature-state','selected'],false],c.selected,c.color],'fill-antialias':false}});
   add({id:'south-'+id+'-borders',type:'line',source:sources[1],layout:{'line-join':'round'},paint:{'line-color':c.line,'line-width':['interpolate',['linear'],['zoom'],2,.6,7,1.15],'line-opacity':.8}});
   add({id:'south-'+id+'-selection',type:'line',source:sources[0],filter:['==',['get','id'],''],layout:{'line-join':'round'},paint:{'line-color':c.line,'line-width':2}});
   installed.set(id,{sources,layers,urls});catalogues.set(id,{records:payload.records,search:createPlaceSearch(payload.records)});
  })().finally(()=>{if(jobs.get(id)===job)jobs.delete(id);});jobs.set(id,job);return job;
 }
 function syncLayers(){const entry=installed.get(active);if(entry){map.setLayoutProperty(entry.layers[0],'visibility','visible');map.setLayoutProperty(entry.layers[1],'visibility',$('outlines').checked?'visible':'none');map.setLayoutProperty(entry.layers[2],'visibility','visible');map.setFilter(entry.layers[2],['==',['get','id'],selected?.id||'']);}contextFilters();updateLabels();}
 function renderSelection(){const c=countries[active],record=selected;sidebar.querySelector('h2').textContent=record?.en||c.name;sidebar.querySelector('.country-local').textContent=record?(record.local===record.en?'':record.local):c.local;$('kind').textContent=record?.kind||'SOUTH AMERICA';$('reset').textContent='All '+c.name;$('division').value=record?.id||'';sidebar.querySelector('.preview-note').textContent=record?.id==='AR-94'?'Continental territory and nearby islands are shown here. The source also includes Antarctic and disputed South Atlantic claims, which are outside this view.':active==='brazil'?'26 states and the Federal District.':active==='argentina'?'23 provinces and Buenos Aires autonomous city.':'Country preview · subdivisions coming next.';const breadcrumb=document.getElementById('breadcrumb-region');breadcrumb.hidden=!record;breadcrumb.textContent=record?.en||'';document.getElementById('map-shell').dataset.selected=String(!!record);}
 function select(record,fit=true){if(!active)return;const entry=installed.get(active);if(entry&&selected)map.setFeatureState({source:entry.sources[0],id:selected.id},{selected:false});selected=record||null;if(entry&&selected)map.setFeatureState({source:entry.sources[0],id:selected.id},{selected:true});$('results').hidden=true;$('search').value='';renderSelection();syncLayers();if(fit)host.fit(selected?.bounds||countries[active].bounds);}
 function renderSearch(){const q=$('search').value.trim(),box=$('results');box.replaceChildren();box.hidden=!q;const catalogue=catalogues.get(active);if(!q||!catalogue)return;const results=catalogue.search(q);if(!results.length){const p=document.createElement('p');p.textContent='No matching divisions.';box.append(p);}for(const record of results){const button=document.createElement('button');button.className='search-result';const name=document.createElement('strong'),kind=document.createElement('small');name.textContent=record.en;kind.textContent=record.kind;button.append(name,kind);button.onclick=()=>select(record);box.append(button);}}
 $('search').oninput=renderSearch;$('search').onkeydown=e=>{if(e.key==='Enter')$('results').querySelector('button')?.click();if(e.key==='Escape')$('results').hidden=true;};$('division').onchange=()=>select(catalogues.get(active)?.records.find(p=>p.id===$('division').value));$('reset').onclick=()=>select(null);$('outlines').onchange=syncLayers;$('names').onchange=updateLabels;
 map.on('movestart',clearLabels);map.on('moveend',updateLabels);map.on('resize',updateLabels);
 map.on('click',e=>{
  if(!window.AtlasDev.enabled||host.isBusy())return;
  const entry=installed.get(active);if(entry){const hit=map.queryRenderedFeatures(e.point,{layers:[entry.layers[0]]})[0];if(hit){select(catalogues.get(active).records.find(p=>p.id===hit.properties.id));return;}}
  if(map.getLayer('south-america-fill')){const hit=map.queryRenderedFeatures(e.point,{layers:['south-america-fill']})[0];if(hit)host.switchAtlas(hit.properties.country);}
 });
 function portal(id){const c=countries[id];return{
  bounds:c.bounds,get ready(){return !!data&&(id==='uruguay'||installed.has(id));},warm:()=>warmCountry(id),
  async enter(){active=id;selected=null;sidebar.hidden=false;const flag=sidebar.querySelector('img');flag.src='vendor/flag-'+c.flag+'.svg';flag.alt='Flag of '+c.name;for(const b of nav.children)b.setAttribute('aria-current',String(b.dataset.country===id));for(const key of ['mode-province','mode-prefecture','mode-lock'])document.getElementById(key).hidden=true;const records=catalogues.get(id)?.records||[];$('division').replaceChildren(new Option('All '+c.name,''));for(const p of records)$('division').append(new Option(p.en,p.id));$('division').hidden=!records.length;$('division').previousElementSibling.hidden=!records.length;$('search').disabled=!records.length;sidebar.querySelector('.layers').hidden=!records.length;$('source').href=records.length?'data/south-america/'+id+'-sources.json':'data/flight-context-sources.json';document.getElementById('map-hint').textContent=records.length?'Select a '+(id==='brazil'?'state':'province'):'Select Brazil, Uruguay or Argentina';renderSelection();syncLayers();syncArrow();},
  leave(){active=null;selected=null;cancelPending();remove(id);sidebar.hidden=true;$('results').hidden=true;$('search').value='';clearLabels();contextFilters();for(const key of ['mode-province','mode-prefecture','mode-lock'])document.getElementById(key).hidden=false;},
  updateLabels,pauseLabels:clearLabels,getSelection:()=>selected?.id||null,restore:async key=>select(catalogues.get(id)?.records.find(p=>p.id===key),false),setMode(){},home:()=>select(null),viewParent:()=>select(null),random(){const records=catalogues.get(id)?.records||[];if(records.length)select(records[Math.floor(Math.random()*records.length)]);}
 };}
 async function fly(bounds){await warm();const target=map.cameraForBounds(bounds,{padding:45,maxZoom:6});if(!target)return;return new Promise(resolve=>{map.once('moveend',resolve);map.flyTo({...target,duration:2800,curve:1.65,minZoom:.65,retainPadding:false,essential:false,easing:t=>t*t*(3-2*t)});});}
 return{portals:Object.fromEntries(Object.keys(countries).map(id=>[id,portal(id)])),fly,syncArrow,syncDeveloper};
}
