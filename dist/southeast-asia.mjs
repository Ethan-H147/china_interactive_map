import {createCountryPage,setSubdivisionHeading} from './country-page.mjs';
import {loadCompressed} from './korea-data.mjs';
import {createPlaceSearch} from './place-search.mjs';
import {setLayerVisible,lineSourceOptions,adaptiveOpacity} from './adaptive-lines.mjs';
import {malaysiaFlags} from './malaysia-flags.mjs';
import {renderStatistics,clearStatistics} from './statistics.mjs';
import {singaporeLabel,readSingaporeLanguage,singaporeLanguages} from './singapore-languages.mjs';

export const countries={
 malaysia:{name:'Malaysia',flag:'my',center:[109,4],zoom:4,bounds:[[99.5,.8],[119.5,7.5]],fill:'#f5f0dd',selected:'#e7dca8',line:'#817244'},
 singapore:{name:'Singapore',flag:'sg',center:[103.83,1.33],zoom:10,bounds:[[103.58,1.14],[104.12,1.49]],fill:'#fff6f5',selected:'#efcbc8',line:'#ad534e'}
};
export async function addCountryPortal(map,host,country){
 const c=countries[country],base='data/southeast-asia/',prefix=c.flag,isMalaysia=country==='malaysia';
 const context=await loadCompressed(base+country+'-context.bin');
 map.addSource(country+'-portal',{type:'geojson',data:context,tolerance:0,attribution:isMalaysia?'Malaysia: <a href="https://github.com/dosm-malaysia/data-open/tree/main/datasets/geodata">DOSM</a>':'Singapore: <a href="https://data.gov.sg/datasets/d_29f066d67df3eae91df8a42f443863c8/view">SLA</a> (Singapore Open Data Licence)'});
 map.addLayer({id:country+'-portal-fill',type:'fill',source:country+'-portal',layout:{visibility:'none'},paint:{'fill-color':'#d7d7d3','fill-antialias':false}});
 const sidebar=createCountryPage({id:country+'-sidebar',label:'Explore '+c.name,classes:'sidebar southeast-sidebar',
 prefix:`${prefix}-`,
 search:{
 id:`${prefix}-search`,
 label:`Find a ${isMalaysia?'state or district':'region or planning area'}`,
 placeholder:`Find a ${isMalaysia?'state or district':'region or planning area'}`,
 resultsId:`${prefix}-search-results`,
 disabled:false,
 dataNav:true
},
 settings:`<label class="field-label" for="${prefix}-province">${isMalaysia?'State / federal territory':'Region'}</label><select id="${prefix}-province" data-nav><option value="">All ${c.name}</option></select><section class="layers"><h3>Visible layers</h3><label><span>${isMalaysia?'State & territory':'Region'} outlines</span><input id="${prefix}-province-layer" type="checkbox" checked data-nav></label><label><span>${isMalaysia?'District':'Planning area'} outlines</span><input id="${prefix}-second-layer" type="checkbox" checked data-nav></label><label><span>Place names</span><input id="${prefix}-label-layer" type="checkbox" checked data-nav></label></section>`,
 heading:{
 navigation:`<button id="${prefix}-selection-reset" class="back-button">All ${c.name}</button><div class="division-flags"><img src="vendor/flag-${prefix}.webp" width="40" alt="Flag of ${c.name}">${isMalaysia?'<a id="my-flag-source" hidden target="_blank" rel="noopener"><img id="my-division-flag" width="40" alt=""></a>':''}</div>`,
 kindId:`${prefix}-selection-kind`,
 nameId:`${prefix}-selection-name`,
 nameLang:``,
 names:`<p id="${prefix}-selection-local" class="country-local"></p>`
},
 cards:`<div id="${prefix}-selection-meta" class="country-card-anchor" hidden></div>`,
 subdivisions:`<details id="${prefix}-subdivisions" hidden><summary id="${prefix}-child-summary">${isMalaysia?'Districts':'Planning areas'}</summary><div id="${prefix}-children" class="archipelago-children"></div></details>`,
 actions:`<button id="${prefix}-parent" class="quiet-button" hidden></button>`,
 footer:`<a href="${base+country}-sources.json" target="_blank" rel="noopener">Sources & coverage</a><span>Created by Ethan Hu</span>`,
 extraPanels:``,
 afterPanels:`<p id="${prefix}-detail-status" role="status" hidden></p><button id="${prefix}-retry" class="quiet-button" hidden>Retry boundaries</button>`
});
 document.querySelector('.workspace').insertBefore(sidebar,document.getElementById('map-shell'));
 const $=id=>document.getElementById(prefix+'-'+id),index=new Map(),installed=new Map();
 let active=false,ready=false,selected=null,scope=null,mode=1,labels=[],catalogue,search,warming,pending,cancelIndex,generation=0,selectionEpoch=0,detailEpoch=0,detailScope=null;
 let language='en';if(!isMalaysia)try{language=readSingaporeLanguage(localStorage);}catch{}
 function setLanguage(value){if(isMalaysia)return;language=singaporeLanguages.some(([code])=>code===value)?value:'en';try{localStorage.setItem('boundary-atlas-singapore-language-v1',language);}catch{}const control=sidebar.querySelector('[data-singapore-language]');if(control)control.value=language;if(selected)selectionNames();if(catalogue)populateRegions();updateLabels();}
 const name=record=>isMalaysia?record.en:singaporeLabel(record,language);
 function selectionNames(){
  $('selection-name').textContent=name(selected);$('selection-name').lang=isMalaysia?'en':language;
  const alternatives=isMalaysia?[selected.local]:['en','zh','ms','ta'].filter(code=>code!==language).map(code=>selected.names[code]);
  $('selection-local').textContent=[...new Set(alternatives.filter(v=>v&&v!==name(selected)))].join(' · ');$('selection-local').hidden=!$('selection-local').textContent;
  const parent=index.get(selected.parent);$('parent').textContent=parent?.level>0?'View '+name(parent):'';
  document.getElementById('breadcrumb-region').textContent=(parent?name(parent)+' / ':'')+name(selected);
  for(const childButton of $('children').querySelectorAll('button'))childButton.textContent=name(index.get(childButton.dataset.region));
 }
 function populateRegions(){const value=$('province').value;$('province').replaceChildren(new Option('All '+c.name,''));for(const r of catalogue.records.filter(r=>r.level===1).sort((a,b)=>name(a).localeCompare(name(b))))$('province').append(new Option(name(r),r.id));$('province').value=value;}
 const visible=(id,value)=>{if(map.getLayer(id))setLayerVisible(map,id,value);};
 const panel=name=>{for(const key of ['layers','explore']){$(key+'-panel').hidden=key!==name;$('tab-'+key).setAttribute('aria-pressed',String(key===name));}};
 function clearLabels(){labels.forEach(label=>label.remove());labels=[];}
 function remove(key){const entry=installed.get(key);if(!entry)return;entry.layers.forEach(id=>{if(map.getLayer(id))map.removeLayer(id);});for(const id of entry.sources)if(map.getSource(id))map.removeSource(id);entry.urls.forEach(URL.revokeObjectURL);installed.delete(key);}
 function cancel(){cancelIndex?.();if(pending){const p=pending;pending=null;p.worker.terminate();p.reject(new DOMException('Selection changed','AbortError'));}}
 function indexed(key,token){return new Promise(resolve=>{let timer;const finish=value=>{clearTimeout(timer);map.off('sourcedata',check);map.off('error',failed);if(cancelIndex===abort)cancelIndex=null;resolve(value);};const abort=()=>finish(false),check=()=>{if(!active||token!==detailEpoch)finish(false);else if(map.getSource(key)&&map.isSourceLoaded(key))finish(true);},failed=e=>{if(e.sourceId===key)finish(false);};cancelIndex=abort;map.on('sourcedata',check);map.on('error',failed);timer=setTimeout(abort,5000);check();});}
 function prepare(file){cancel();return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./southeast-asia-worker.mjs',import.meta.url),{type:'module'}),job={worker,reject};pending=job;const finish=()=>{worker.terminate();if(pending===job)pending=null;};worker.onmessage=({data})=>{finish();data.error?reject(Error(data.error)):resolve(data);};worker.onerror=e=>{finish();reject(Error(e.message));};worker.postMessage({url:base+file});});}
 function install(key,{blob,borders},level){
  const url=URL.createObjectURL(blob);map.addSource(key,{type:'geojson',data:url,promoteId:'id',tolerance:.15,buffer:64,maxzoom:16,attribution:isMalaysia?'Malaysia: <a href="https://github.com/dosm-malaysia/data-open/tree/main/datasets/geodata">DOSM</a>':'Singapore: <a href="https://data.gov.sg/datasets/d_2cc750190544007400b2cfd5d7f53209/view">URA</a> (Singapore Open Data Licence) · Names: <a href="https://en.wikipedia.org/wiki/Planning_areas_of_Singapore">Wikipedia</a> (CC BY-SA 4.0)'});
  const layers=[key+'-fill',key+'-lines',key+'-selected'];
  const urls=[url],sources=[key],edgeSource=borders?key+'-edges':key;
  if(borders){const edgeUrl=URL.createObjectURL(borders);urls.push(edgeUrl);sources.push(edgeSource);map.addSource(edgeSource,{...lineSourceOptions,data:edgeUrl});}
  map.addLayer({id:layers[0],type:'fill',source:key,layout:{visibility:'none'},paint:{'fill-color':c.fill,'fill-antialias':false}});
  map.addLayer({id:layers[1],type:'line',source:edgeSource,layout:{visibility:'none','line-join':'round','line-cap':'round'},paint:{'line-color':c.line,'line-width':level===1?.9:.55,'line-opacity':borders?adaptiveOpacity(level===1?.8:.65):level===1?.8:.65}});
  map.addLayer({id:layers[2],type:'line',source:edgeSource,filter:borders?['in','',['get','owners']]:['==',['get','id'],''],layout:{visibility:'none','line-join':'round','line-cap':'round'},paint:{'line-color':c.line,'line-width':1.8,...(borders?{'line-opacity':adaptiveOpacity()}:{})}});
  installed.set(key,{urls,sources,layers,level,borders:!!borders});
  // District fills stay below every state's outlines, even outside the selection.
  for(const entry of installed.values())if(entry.level===1)for(const id of entry.layers.slice(1))map.moveLayer(id);
 }
 function satellitePaint(){
  const satellite=document.getElementById('satellite-layer').checked,opacity=Number(document.getElementById('satellite-opacity').value)/100;
  for(const {layers} of installed.values()){map.setPaintProperty(layers[0],'fill-opacity',satellite?1-opacity:1);for(const id of layers.slice(1))map.setPaintProperty(id,'line-color',satellite&&opacity>.5?'#fff0bb':c.line);}
 }
 function sync(){
  for(const {layers,level,borders} of installed.values()){const detail=level===2,show=active&&(!detail||mode===2&&scope===detailScope);visible(layers[0],show);visible(layers[1],show&&(detail?$('second-layer').checked:$('province-layer').checked));visible(layers[2],show);const id=selected?.level===level?selected.id:'';map.setFilter(layers[2],borders?['in',id,['get','owners']]:['==',['get','id'],id]);map.setPaintProperty(layers[0],'fill-color',['case',['==',['get','id'],selected?.id||''],c.selected,c.fill]);}
  visible(country+'-portal-fill',window.AtlasDev.allows(country)&&!active);satellitePaint();host.syncAppearance?.();updateLabels();
 }
 function updateLabels(){if(!active||!ready||host.isMoving?.()||map.isMoving())return;clearLabels();if(!$('label-layer').checked)return;const b=map.getBounds(),list=catalogue.records.filter(r=>(r.level===1&&!(mode===2&&r.id===scope)||mode===2&&r.parent===scope&&r.level===2)&&r.center[0]>=b.getWest()&&r.center[0]<=b.getEast()&&r.center[1]>=b.getSouth()&&r.center[1]<=b.getNorth());labels=window.AtlasLabels.render(map,list.slice(0,75).map(r=>({...r,selected:r===selected,...(!isMalaysia?{lines:[name(r)],lang:language}:{})})),'korea-marker');}
 function setMode(value=mode,automatic=false){if(automatic&&document.getElementById('mode-lock').getAttribute('aria-pressed')==='true')value=mode;mode=value===2?2:1;for(const [id,text] of [['mode-province',isMalaysia?'States':'Regions'],['mode-prefecture',isMalaysia?'Districts':'Planning areas']]){document.getElementById(id).textContent=text;document.getElementById(id).hidden=false;}document.getElementById('mode-lock').hidden=false;document.getElementById('mode-province').setAttribute('aria-pressed',String(mode===1));document.getElementById('mode-prefecture').setAttribute('aria-pressed',String(mode===2));document.getElementById('map-hint').textContent=mode===2&&scope?'Select a '+(isMalaysia?'district':'planning area'):'Select a '+(isMalaysia?'state or federal territory':'region');sync();if(mode===2&&scope)return loadDetail();}
 function message(text,retry=false){$('detail-status').textContent=text;$('detail-status').hidden=!text;$('retry').hidden=!retry;}
 async function loadDetail(){
  if(!active||mode!==2||!scope||detailScope===scope)return;
  const chunk=catalogue.chunks[scope],token=++detailEpoch,target=scope;cancel();remove(country+'-second');detailScope=null;
  if(!chunk){message('');sync();return;}
  message('Loading '+(isMalaysia?'district':'planning-area')+' boundaries…');
  try{const blob=await prepare(chunk.file);if(!active||token!==detailEpoch||scope!==target||mode!==2)return;install(country+'-second',blob,2);if(!await indexed(country+'-second',token)){if(!active||token!==detailEpoch)return;remove(country+'-second');throw Error('District rendering failed');}detailScope=target;message('');sync();}
  catch(error){if(error.name!=='AbortError'&&active&&token===detailEpoch)message((isMalaysia?'District':'Planning-area')+' boundaries could not load.',true);}
 }
 async function select(record,fit=true,camera={}){
  if(!active||!ready||host.isBusy()||!record)return;if(record.level===0)return reset(fit,camera);const epoch=++selectionEpoch;selected=record;scope=record.level===1?record.id:record.parent;
  $('search-results').hidden=true;$('search').value='';$('selection-kind').textContent=record.kind.toUpperCase();$('selection-name').textContent=record.en;$('selection-local').textContent=record.local||'';$('selection-local').hidden=!record.local||record.local===record.en;
  const parent=index.get(record.parent),children=catalogue.records.filter(r=>r.parent===record.id);
  clearStatistics($('selection-meta'));if(!isMalaysia||record.level===1)renderStatistics($('selection-meta'),country+':'+record.id,undefined,{onRelatedPlace:id=>select(index.get(id))});
  if(isMalaysia){$('province').value=scope;const flag=malaysiaFlags[scope];$('flag-source').hidden=!flag;if(flag){$('flag-source').href=flag.page;$('flag-source').title=flag.credit+' · '+flag.license;$('division-flag').src=flag.file;$('division-flag').alt='Flag of '+index.get(scope).en;}$('subdivisions').hidden=!children.length;setSubdivisionHeading($('child-summary'),'Districts',children.length);$('children').replaceChildren();for(const child of children){const button=document.createElement('button');button.type='button';button.className='search-result';button.textContent=child.en;button.onclick=()=>select(child);$('children').append(button);}}
  if(!isMalaysia){$('province').value=scope;$('subdivisions').hidden=!children.length;setSubdivisionHeading($('child-summary'),'Planning areas',children.length);$('children').replaceChildren();for(const child of children){const button=document.createElement('button');button.type='button';button.className='search-result';button.dataset.region=child.id;button.textContent=name(child);button.onclick=()=>select(child);$('children').append(button);}}
  $('parent').hidden=!parent||(!isMalaysia&&parent.level===0);$('parent').textContent=$('parent').hidden?'':'View '+name(parent);$('parent').onclick=$('parent').hidden?null:()=>select(parent);$('tab-explore').hidden=false;panel('explore');sidebar.querySelector('.sidebar-scroll').scrollTop=0;document.getElementById('breadcrumb-region').hidden=false;document.getElementById('breadcrumb-region').textContent=(parent?name(parent)+' / ':'')+name(record);document.getElementById('map-shell').dataset.selected='true';if(!isMalaysia)selectionNames();
  await setMode(catalogue.chunks[scope]?2:1,true);if(epoch!==selectionEpoch||!active)return;if(fit)await host.fit(record.bounds,record.level===2?13:12,camera);
 }
 async function reset(fit=true,camera={}){clearStatistics($('selection-meta'));selected=null;scope=null;selectionEpoch++;detailEpoch++;cancel();remove(country+'-second');detailScope=null;message('');$('province').value='';$('tab-explore').hidden=true;panel('layers');document.getElementById('breadcrumb-region').hidden=true;document.getElementById('map-shell').dataset.selected='false';setMode(1,true);if(fit)await host.fit(c.bounds,isMalaysia?8:12,camera);}
 async function warm(){if(ready)return;if(warming)return warming;const token=generation;const job=(async()=>{catalogue??=await loadCompressed(base+country+'-catalogue.bin');if(token!==generation)throw new DOMException('Country changed','AbortError');index.clear();catalogue.records.forEach(r=>index.set(r.id,r));search??=createPlaceSearch(catalogue.records);populateRegions();const blob=await prepare(country+'-first.bin');if(token!==generation)throw new DOMException('Country changed','AbortError');install(country+'-first',blob,1);ready=true;})().finally(()=>{if(warming===job)warming=null;});warming=job;return job;}
 function picked(point){const keys=mode===2&&detailScope===scope?[country+'-second-fill',country+'-first-fill']:[country+'-first-fill'];const hits=map.queryRenderedFeatures(point,{layers:keys.filter(id=>map.getLayer(id))});return hits.map(f=>index.get(f.properties.id)).find(Boolean);}
 map.on('click',e=>{if(active&&ready&&!host.isBusy())select(picked(e.point));});map.on('moveend',updateLabels);map.on('resize',updateLabels);
 $('search').oninput=()=>{const q=$('search').value.trim(),box=$('search-results');box.replaceChildren();box.hidden=!q;if(!q||!search)return;const results=search(q);if(!results.length){const text=document.createElement('p');text.textContent='No matches. Try another name.';box.append(text);}for(const r of results){const button=document.createElement('button');button.type='button';button.className='search-result';const title=document.createElement('strong'),kind=document.createElement('small');title.textContent=name(r);kind.textContent=r.kind+(r.parent?' · '+name(index.get(r.parent)):'');button.append(title,kind);button.onclick=()=>select(r);box.append(button);}};
 $('search').onkeydown=e=>{if(e.key==='Enter')$('search-results').querySelector('button')?.click();if(e.key==='Escape')$('search-results').hidden=true;};$('province').onchange=()=>$('province').value?select(index.get($('province').value)):reset();$('selection-reset').onclick=()=>reset();$('tab-explore').onclick=()=>panel('explore');$('tab-layers').onclick=()=>panel('layers');$('retry').onclick=loadDetail;for(const id of ['province-layer','label-layer','second-layer'])$(id).onchange=sync;
 for(const id of ['satellite-layer','satellite-opacity'])document.getElementById(id).addEventListener(id.endsWith('opacity')?'input':'change',()=>{if(active)satellitePaint();});
 function syncDeveloper(){visible(country+'-portal-fill',window.AtlasDev.allows(country)&&!active);}
 syncDeveloper();
 return{hoverAt(point,id){if(!active||!ready||host.isBusy())return;return id?index.get(id):picked(point);},getLanguage:()=>language,setLanguage,bounds:c.bounds,warm,sync,setMode,updateLabels,syncDeveloper,pauseLabels:clearLabels,get ready(){return ready;},get active(){return active;},getSelection:()=>selected?.id||null,restore:async id=>{if(index.has(id))await select(index.get(id),false);},async enter(fit=true){await warm();active=true;sidebar.hidden=false;await reset(fit);sync();if(isMalaysia)for(const flag of Object.values(malaysiaFlags)){const image=new Image();image.src=flag.file;image.decode?.().catch(()=>{});}},leave(){clearStatistics($('selection-meta'));generation++;detailEpoch++;selectionEpoch++;active=false;sidebar.hidden=true;cancel();warming=null;clearLabels();for(const key of [...installed.keys()])remove(key);ready=false;selected=null;scope=null;detailScope=null;for(const id of ['mode-province','mode-prefecture','mode-lock'])document.getElementById(id).hidden=false;syncDeveloper();},home:()=>reset(),viewParent:(camera={})=>selected?.parent?select(index.get(selected.parent),true,camera):reset(true,camera),random(){const list=catalogue.records.filter(r=>r.level===mode);select(list[Math.floor(Math.random()*list.length)]);}};
}
