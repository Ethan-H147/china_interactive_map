import {createCountryPage,setSubdivisionHeading} from './country-page.mjs';
import {loadCompressed} from './korea-data.mjs';
import {createPlaceSearch} from './place-search.mjs';
import {setLayerVisible,lineSourceOptions,adaptiveOpacity} from './adaptive-lines.mjs';
import {renderStatistics,clearStatistics} from './statistics.mjs';

// A two-level country adapter: layout, cards and rendering are shared; names,
// levels, flags, palette and data paths are supplied by the country config.
export async function addRegionalCountry(map,host,c){
 const {country,prefix,base}=c;
 const sidebar=createCountryPage({id:country+'-sidebar',label:'Explore '+c.name,classes:'sidebar regional-sidebar',prefix:prefix+'-',
  search:{id:prefix+'-search',label:'Find a region or district',resultsId:prefix+'-search-results',dataNav:true},
  settings:`<label class="field-label" for="${prefix}-province">Region</label><select id="${prefix}-province" data-nav><option value="">All ${c.name}</option></select><section class="layers"><h3>Visible layers</h3><label><span>Regional outlines</span><input id="${prefix}-province-layer" type="checkbox" checked data-nav></label><label><span>District outlines</span><input id="${prefix}-second-layer" type="checkbox" checked data-nav></label><label><span>Place names</span><input id="${prefix}-label-layer" type="checkbox" checked data-nav></label></section>`,
  heading:{navigation:`<button id="${prefix}-reset" class="back-button">All ${c.name}</button><div class="division-flags"><img src="${c.nationalFlag}" width="40" alt="Flag of ${c.name}"><a id="${prefix}-flag-source" target="_blank" rel="noopener" hidden><img id="${prefix}-flag" width="40" alt=""></a></div>`,kindId:prefix+'-kind',nameId:prefix+'-name',names:`<p id="${prefix}-local" class="country-local" lang="${c.lang}"></p>`},
  cards:`<div id="${prefix}-statistics" class="country-card-anchor" hidden></div><section id="${prefix}-capital-card" class="region-capital" hidden><h3>Capital</h3><p id="${prefix}-capital"></p></section>`,
  subdivisions:`<details id="${prefix}-subdivisions" hidden><summary id="${prefix}-children-heading">Districts</summary><label class="sr-only" for="${prefix}-child-filter">Find a district in this region</label><input id="${prefix}-child-filter" class="division-filter" type="search" placeholder="Find a district" autocomplete="off"><div id="${prefix}-children" class="archipelago-children"></div></details>`,
  actions:`<button id="${prefix}-parent" class="quiet-button" hidden></button>`,
  footer:`<a href="${base}sources.json" target="_blank" rel="noopener">Sources & coverage</a><span>Created by Ethan Hu</span>`,
  afterPanels:`<span id="${prefix}-detail-spinner" class="country-detail-spinner" hidden aria-label="Loading boundaries"></span><p id="${prefix}-error" role="status" hidden></p><button id="${prefix}-retry" class="quiet-button" hidden>Retry boundaries</button>`});
 document.querySelector('.workspace').insertBefore(sidebar,document.getElementById('map-shell'));
 const $=id=>document.getElementById(prefix+'-'+id),installed=new Map(),index=new Map();
 let active=false,ready=false,catalogue,search,selected,scope,detailScope,mode=1,labels=[],warming,pending,cancelIndex,generation=0,detailEpoch=0,selectionEpoch=0;
 const context=await loadCompressed(base+'context.bin');
 map.addSource(country+'-portal',{type:'geojson',data:context,tolerance:0,attribution:c.attribution});
 map.addLayer({id:country+'-portal-fill',type:'fill',source:country+'-portal',paint:{'fill-color':'#d7d7d3','fill-antialias':false}});
 const international=await loadCompressed(base+'international.bin');
 map.addSource(country+'-international',{...lineSourceOptions,data:international,attribution:c.attribution});
 map.addLayer({id:country+'-international',type:'line',source:country+'-international',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#aaa9a2','line-width':.9,'line-opacity':adaptiveOpacity()}});
 function panel(name){for(const key of ['layers','explore']){$(key+'-panel').hidden=key!==name;$('tab-'+key).setAttribute('aria-pressed',String(key===name));}}
 function clearLabels(){labels.forEach(label=>label.remove());labels=[];}
 function remove(key){const entry=installed.get(key);if(!entry)return;for(const id of entry.layers)if(map.getLayer(id))map.removeLayer(id);for(const id of entry.sources)if(map.getSource(id))map.removeSource(id);entry.urls.forEach(URL.revokeObjectURL);installed.delete(key);}
 function cancel(){cancelIndex?.();if(pending){const job=pending;pending=null;job.worker.terminate();job.reject(new DOMException('Selection changed','AbortError'));}}
 function prepare(file){cancel();return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./country-boundary-worker.mjs',import.meta.url),{type:'module'}),job={worker,reject};pending=job;const finish=()=>{worker.terminate();if(pending===job)pending=null;};worker.onmessage=({data})=>{finish();data.error?reject(Error(data.error)):resolve(data);};worker.onerror=e=>{finish();reject(Error(e.message));};worker.postMessage({url:base+file});});}
 function indexed(key,token){return new Promise(resolve=>{let timer;const finish=value=>{clearTimeout(timer);map.off('sourcedata',check);map.off('error',failed);if(cancelIndex===abort)cancelIndex=null;resolve(value);};const abort=()=>finish(false),check=()=>{if(!active||token!==detailEpoch)finish(false);else if(map.getSource(key)&&map.isSourceLoaded(key))finish(true);},failed=e=>{if(e.sourceId===key)finish(false);};cancelIndex=abort;map.on('sourcedata',check);map.on('error',failed);timer=setTimeout(abort,15000);check();});}
 function install(key,payload,level){
  const url=URL.createObjectURL(payload.blob),edgeUrl=URL.createObjectURL(payload.borders),edge=key+'-edges';
  map.addSource(key,{type:'geojson',data:url,promoteId:'id',tolerance:0,buffer:128,maxzoom:16,attribution:c.attribution});
  map.addSource(edge,{...lineSourceOptions,data:edgeUrl});
  const layers=[key+'-fill',key+'-lines',key+'-selected'];
  map.addLayer({id:layers[0],type:'fill',source:key,layout:{visibility:'none'},paint:{'fill-color':c.fill,'fill-antialias':false}});
  for(const [id,selectedLine] of [[layers[1],false],[layers[2],true]])map.addLayer({id,type:'line',source:edge,...(selectedLine?{filter:['in','',['get','owners']]}:{}),layout:{visibility:'none','line-join':'round','line-cap':'round'},paint:{'line-color':c.line,'line-width':selectedLine?1.7:level===1?.9:.55,'line-opacity':adaptiveOpacity(selectedLine?1:level===1?.8:.65)}});
  installed.set(key,{layers,sources:[key,edge],urls:[url,edgeUrl],level});
  for(const entry of installed.values())if(entry.level===1)for(const id of entry.layers.slice(1))map.moveLayer(id);
  map.moveLayer(country+'-international');
 }
 function satellitePaint(){const satellite=document.getElementById('satellite-layer').checked,opacity=Number(document.getElementById('satellite-opacity').value)/100;for(const entry of installed.values()){map.setPaintProperty(entry.layers[0],'fill-opacity',satellite?1-opacity:1);for(const id of entry.layers.slice(1))map.setPaintProperty(id,'line-color',satellite&&opacity>.5?'#fff0bb':c.line);}}
 function sync(){
  for(const {layers,level} of installed.values()){const detail=level===2,show=active&&(!detail||mode===2&&scope===detailScope);setLayerVisible(map,layers[0],show);setLayerVisible(map,layers[1],show&&(detail?$('second-layer').checked:$('province-layer').checked));setLayerVisible(map,layers[2],show);map.setFilter(layers[2],['in',selected?.level===level?selected.id:'',['get','owners']]);map.setPaintProperty(layers[0],'fill-color',['case',['==',['get','id'],selected?.id||''],c.selected,c.fill]);}
  setLayerVisible(map,country+'-portal-fill',!active);satellitePaint();host.syncAppearance?.();updateLabels();
 }
 function updateLabels(){if(!active||!ready||host.isMoving?.()||map.isMoving())return;clearLabels();if(!$('label-layer').checked)return;const b=map.getBounds(),list=catalogue.records.filter(r=>(r.level===1&&!(mode===2&&r.id===scope)||mode===2&&r.parent===scope)&&r.center[0]>=b.getWest()&&r.center[0]<=b.getEast()&&r.center[1]>=b.getSouth()&&r.center[1]<=b.getNorth());labels=window.AtlasLabels.render(map,list.slice(0,90).map(r=>({...r,selected:r===selected})),'korea-marker');}
 function loading(value){$('detail-spinner').hidden=!value;sidebar.setAttribute('aria-busy',String(value));if(value)$('detail-spinner').innerHTML=window.AtlasSymbols.markup(country);}
 function message(text=''){$('error').textContent=text;$('error').hidden=!text;$('retry').hidden=!text;}
 async function loadDetail(){
  if(!active||mode!==2||!scope||detailScope===scope)return;
  const target=scope,chunk=catalogue.chunks[target],token=++detailEpoch;cancel();remove(country+'-second');detailScope=null;message();
  if(!chunk){loading(false);sync();return;}
  loading(true);
  try{const payload=await prepare(chunk.file);if(!active||token!==detailEpoch||scope!==target||mode!==2)return;install(country+'-second',payload,2);if(!await indexed(country+'-second',token)){if(!active||token!==detailEpoch)return;remove(country+'-second');throw Error('District rendering failed');}detailScope=target;sync();}
  catch(error){if(error.name!=='AbortError'&&active&&token===detailEpoch)message('District boundaries could not load.');}
  finally{if(token===detailEpoch)loading(false);}
 }
 function setMode(value=mode,automatic=false){
  if(automatic&&document.getElementById('mode-lock').getAttribute('aria-pressed')==='true')value=document.getElementById('mode-province').getAttribute('aria-pressed')==='true'?1:2;
  mode=value===2?2:1;document.getElementById('mode-province').textContent=c.firstLabel;document.getElementById('mode-prefecture').textContent=c.secondLabel;for(const [id,pressed] of [['mode-province',mode===1],['mode-prefecture',mode===2]])document.getElementById(id).setAttribute('aria-pressed',String(pressed));
  if(mode===1){detailEpoch++;cancel();remove(country+'-second');detailScope=null;loading(false);message();}sync();if(mode===2&&scope)return loadDetail();
 }
 function children(){const list=catalogue.records.filter(r=>r.level===2&&r.parent===selected?.id),query=$('child-filter').value.trim(),matches=query?createPlaceSearch(list)(query):list.sort((a,b)=>a.en.localeCompare(b.en));$('children').replaceChildren();for(const r of matches){const button=document.createElement('button');button.type='button';button.className='search-result';button.textContent=r.en;button.onclick=()=>select(r);$('children').append(button);}if(query&&!matches.length){const p=document.createElement('p');p.textContent='No matches.';$('children').append(p);}}
 async function select(record,fit=true,camera={}){
  if(!active||!ready||host.isBusy()||!record)return;const epoch=++selectionEpoch;selected=record;scope=record.level===1?record.id:record.parent;
  $('search').value='';$('search-results').hidden=true;$('province').value=scope;$('kind').textContent=record.kind.toUpperCase();$('name').textContent=record.en;$('name').classList.toggle('long-name',record.en.length>28);$('local').textContent=record.local||'';$('local').hidden=!record.local||record.local===record.en;
  clearStatistics($('statistics'));if(record.level===1)renderStatistics($('statistics'),country+':'+record.id);
  $('capital-card').hidden=!record.capital||record.capital===record.en;$('capital').textContent=record.capital||'';
  const flag=c.flags[scope];$('flag-source').hidden=!flag;if(flag){$('flag-source').href=flag.page;$('flag-source').title=flag.credit+' · '+flag.license;$('flag').src=flag.file;$('flag').alt='Flag of '+index.get(scope).en;}
  const count=catalogue.chunks[record.id]?.count||0;$('subdivisions').hidden=!count;setSubdivisionHeading($('children-heading'),c.secondLabel,count);$('child-filter').value='';children();
  const parent=index.get(record.parent);$('parent').hidden=!parent;$('parent').textContent=parent?parent.en:'';$('parent').onclick=parent?()=>select(parent):null;
  $('tab-explore').hidden=false;panel('explore');sidebar.querySelector('.sidebar-scroll').scrollTop=0;document.getElementById('breadcrumb-region').hidden=false;document.getElementById('breadcrumb-region').textContent=(parent?parent.en+' / ':'')+record.en;document.getElementById('map-shell').dataset.selected='true';
  await setMode(catalogue.chunks[scope]?2:1,true);if(epoch!==selectionEpoch||!active)return;if(fit)await host.fit(record.bounds,record.level===2?13:10,camera);
 }
 async function reset(fit=true,camera={}){clearStatistics($('statistics'));selected=null;scope=null;selectionEpoch++;detailEpoch++;cancel();remove(country+'-second');detailScope=null;loading(false);message();$('province').value='';$('tab-explore').hidden=true;panel('layers');document.getElementById('breadcrumb-region').hidden=true;document.getElementById('map-shell').dataset.selected='false';setMode(1,true);if(fit)await host.fit(c.bounds,8,camera);}
 async function warm(){if(ready)return;if(warming)return warming;const token=generation;const job=(async()=>{preloadFlags();catalogue??=await loadCompressed(base+'catalogue.bin');if(token!==generation)throw new DOMException('Country changed','AbortError');index.clear();catalogue.records.forEach(r=>index.set(r.id,r));search??=createPlaceSearch(catalogue.records);$('province').replaceChildren(new Option('All '+c.name,''));for(const r of catalogue.records.filter(r=>r.level===1).sort((a,b)=>a.en.localeCompare(b.en)))$('province').append(new Option(r.en,r.id));const payload=await prepare('first.bin');if(token!==generation)throw new DOMException('Country changed','AbortError');install(country+'-first',payload,1);ready=true;})().finally(()=>{if(warming===job)warming=null;});warming=job;return job;}
 function picked(point){const layers=[...(mode===2&&detailScope===scope?[country+'-second-fill']:[]),country+'-first-fill'].filter(id=>map.getLayer(id));return map.queryRenderedFeatures(point,{layers}).map(f=>index.get(f.properties.id)).find(Boolean);}
 map.on('click',event=>{if(active&&ready&&!host.isBusy())select(picked(event.point));});map.on('mousemove',event=>{if(active&&ready&&!host.isBusy()&&!map.isMoving())map.getCanvas().style.cursor=picked(event.point)?'pointer':'';});map.on('moveend',updateLabels);map.on('resize',updateLabels);
 $('search').oninput=()=>{const query=$('search').value.trim(),box=$('search-results');box.replaceChildren();box.hidden=!query;if(!query||!search)return;for(const r of search(query)){const button=document.createElement('button');button.type='button';button.className='search-result';const title=document.createElement('strong'),kind=document.createElement('small');title.textContent=r.en;kind.textContent=r.kind+(r.parent?' · '+index.get(r.parent).en:'');button.append(title,kind);button.onclick=()=>select(r);box.append(button);}if(!box.childNodes.length){const p=document.createElement('p');p.textContent='No matches.';box.append(p);}};
 $('search').onkeydown=event=>{if(event.key==='Enter')$('search-results').querySelector('button')?.click();if(event.key==='Escape')$('search-results').hidden=true;};$('child-filter').oninput=children;$('child-filter').onkeydown=event=>{if(event.key==='Enter')$('children').querySelector('button')?.click();};
 $('province').onchange=()=>$('province').value?select(index.get($('province').value)):reset();$('reset').onclick=()=>reset();$('tab-explore').onclick=()=>panel('explore');$('tab-layers').onclick=()=>panel('layers');$('retry').onclick=loadDetail;for(const id of ['province-layer','second-layer','label-layer'])$(id).onchange=sync;
 for(const id of ['satellite-layer','satellite-opacity'])document.getElementById(id).addEventListener(id.endsWith('opacity')?'input':'change',()=>{if(active)satellitePaint();});
 let flagsLoading;function preloadFlags(){flagsLoading??=(async()=>{const files=[c.nationalFlag,...Object.values(c.flags).map(f=>f.file)],images=[];let next=0;await Promise.all(Array.from({length:3},async()=>{while(next<files.length){const image=new Image();images.push(image);image.src=files[next++];await image.decode?.().catch(()=>{});}}));return images;})();return flagsLoading;}
 return{bounds:c.bounds,warm,sync,setMode,updateLabels,pauseLabels:clearLabels,get ready(){return ready;},get active(){return active;},getSelection:()=>selected?.id||null,restore:async id=>{if(index.has(id))await select(index.get(id),false);},async enter(fit=true){await warm();active=true;sidebar.hidden=false;await reset(fit);sync();preloadFlags();},leave(){clearStatistics($('statistics'));generation++;detailEpoch++;selectionEpoch++;active=false;sidebar.hidden=true;cancel();warming=null;clearLabels();for(const key of [...installed.keys()])remove(key);ready=false;selected=null;scope=null;detailScope=null;loading(false);sync();},home:()=>reset(),viewParent:(camera={})=>selected?.parent?select(index.get(selected.parent),true,camera):reset(true,camera),random(){const list=catalogue.records.filter(r=>r.level===mode&&(mode===1||!scope||r.parent===scope));if(list.length)select(list[Math.floor(Math.random()*list.length)]);}};
}
