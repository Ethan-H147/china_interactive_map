import {createCountryPage,showCountryPanel,setMapBreadcrumb} from './country-page.mjs';
import {addWorkerSource} from './geo-pack.mjs';
import {onMapHover} from './pointer-performance.mjs';
const base='data/antarctica/';
const key=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export async function addAntarctica(map,host){
 const sidebar=createCountryPage({id:'antarctica-sidebar',label:'Explore Antarctica',classes:'sidebar regional-sidebar',prefix:'aq-',
  search:{id:'aq-search',label:'Find a station or research facility',resultsId:'aq-search-results',dataNav:true},
  settings:`<label class="field-label" for="aq-facilities">Facilities</label><select id="aq-facilities"><option value="all">All facilities</option><option value="stations">Stations</option><option value="support">Camps &amp; support sites</option></select><section class="layers"><h3>Visible layers</h3><label><span>Station dots</span><input id="aq-station-layer" type="checkbox" checked data-nav></label><label><span>Place names</span><input id="aq-label-layer" type="checkbox" checked data-nav></label></section><p class="country-note antarctic-legend"><span>Year-round <span class="antarctic-key year-round"></span></span><span>Seasonal <span class="antarctic-key seasonal"></span></span><span>Temporarily closed <span class="antarctic-key temporarily-closed"></span></span></p><p class="country-note">Facility status: November 2024.</p>`,
  heading:{navigation:'<button id="aq-reset" class="back-button">All Antarctica</button><div id="aq-flags" class="division-flags"></div>',kindId:'aq-kind',nameId:'aq-name',names:'<p id="aq-local" class="country-local"></p>'},
  cards:'<section class="country-info-cards antarctic-facts" id="aq-facts"></section>',
  footer:'<details class="country-source-options"><summary>Sources &amp; coverage</summary><a href="https://www.comnap.aq/antarctic-facilities-information" target="_blank" rel="noopener">COMNAP facilities · November 2024</a><a href="https://data.bas.ac.uk/items/cc111b81-5066-42dd-be60-9f05abcb5873" target="_blank" rel="noopener">SCAR Antarctic Digital Database coastline 7.7 · CC BY 4.0</a><a href="data/antarctica/flag-sources.json" target="_blank" rel="noopener">Flag sources &amp; credits</a><a href="data/antarctica/sources.json" target="_blank" rel="noopener">Map sources &amp; coverage</a><a href="https://www.ats.aq/e/antarctictreaty.html" target="_blank" rel="noopener">Antarctic Treaty</a><p>Article IV preserves positions on territorial claims without resolving sovereignty. Claim sectors appear only in claimant-country maps.</p></details><span>Created by Ethan Hu</span>'});
 document.querySelector('.workspace').insertBefore(sidebar,document.getElementById('map-shell'));sidebar.hidden=true;
 const $=id=>document.getElementById('aq-'+id),bounds=[[-180,-90],[180,-60]],definition=globalThis.AtlasCountries.countries.antarctica;
 let active=false,ready=false,records=[],index=new Map(),selected=null,loading,flagData,labels=[];
 await addWorkerSource(map,'antarctica-portal',base+'context.bin',{type:'geojson',tolerance:.01,maxzoom:8,attribution:'Antarctic coast: <a href="https://data.bas.ac.uk/items/cc111b81-5066-42dd-be60-9f05abcb5873">SCAR Antarctic Digital Database</a> (CC BY 4.0)'});
 map.addLayer({id:'antarctica-portal-fill',type:'fill',source:'antarctica-portal',metadata:{atlas:{role:'context',contextCountry:'antarctica'}},paint:{'fill-color':definition.portal.fill,'fill-antialias':false}});
 // While this map is open, the full medium-resolution coast replaces the 500 m shared outline,
 // which other maps load at startup. It loads after the first view (host.started) and only here.
 let coast=null;
 // Set unconditionally: while the globe overview hides both, the rendered visibility is 'none'
 // and a compare-first update would leave the scene's own state stale.
 function syncCoast(){const detailed=active&&!!map.getLayer('antarctica-coast-fill');for(const [id,on] of [['antarctica-coast-fill',detailed],['antarctica-portal-fill',!detailed]])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none');}
 function loadCoast(){
  coast??=addWorkerSource(map,'antarctica-coast',base+'coast.bin',{type:'geojson',tolerance:.25,maxzoom:10,attribution:'Antarctic coast: <a href="https://data.bas.ac.uk/items/cc111b81-5066-42dd-be60-9f05abcb5873">SCAR Antarctic Digital Database</a> (CC BY 4.0)'})
   .then(()=>{if(!map.getLayer('antarctica-coast-fill'))map.addLayer({id:'antarctica-coast-fill',type:'fill',source:'antarctica-coast',metadata:{atlas:{role:'context',contextCountry:'antarctica'}},layout:{visibility:'none'},paint:{'fill-color':definition.portal.fill,'fill-antialias':false}});syncCoast();})
   .catch(error=>{coast=null;console.warn('Antarctic coast detail unavailable',error);});
  return coast;
 }
 function unloadCoast(){coast=null;if(map.getLayer('antarctica-coast-fill'))map.removeLayer('antarctica-coast-fill');if(map.getSource('antarctica-coast'))map.removeSource('antarctica-coast');syncCoast();}
 const panel=name=>showCountryPanel(sidebar,$(name+'-panel'));
 function homeCamera(){
  const size=map.getContainer(),padding=window.AtlasSheet?.navigationPadding({selection:false})||{left:32,right:32,top:80,bottom:64};
  const available=Math.max(180,Math.min(size.clientWidth-padding.left-padding.right,size.clientHeight-padding.top-padding.bottom));
  return {center:[0,-85],zoom:Math.log2(available/850),bearing:0,pitch:0,padding,retainPadding:false};
 }
 const visible=r=>$('facilities').value==='all'||($('facilities').value==='stations')===(r.kind==='Station');
 function clearLabels(){labels.forEach(m=>m.remove());labels=[];}
 // Stations are one GPU circle source: DOM markers were repositioned and occlusion-tested on
 // every frame, which made drags stutter on phones. The globe hides circles on its far side.
 const dotSource='antarctica-stations',dotLayers=['antarctica-station-halo','antarctica-station-dots'];
 function installDots(){
  if(map.getSource(dotSource))return;
  map.addSource(dotSource,{type:'geojson',promoteId:'id',data:{type:'FeatureCollection',features:[]}});
  const selectedState=['boolean',['feature-state','selected'],false],closed=['get','closed'];
  map.addLayer({id:dotLayers[0],type:'circle',source:dotSource,metadata:{atlas:{role:'marker'}},layout:{visibility:'none'},paint:{'circle-radius':['case',selectedState,11,6.5],'circle-color':['case',selectedState,'#426f88','#314b5d'],'circle-opacity':['case',selectedState,.32,.4],'circle-pitch-alignment':'map'}});
  map.addLayer({id:dotLayers[1],type:'circle',source:dotSource,metadata:{atlas:{role:'marker'}},layout:{visibility:'none'},paint:{'circle-radius':['case',selectedState,5,3.5],'circle-color':['case',closed,'#ffffff',['get','yearRound'],'#3d7898','#bb8050'],'circle-stroke-width':2,'circle-stroke-color':['case',closed,'#6b7d89','#ffffff'],'circle-pitch-alignment':'map'}});
 }
 let dotIds=new Set(),selectedDot=null,poleMarkers=[];
 // Map tiles stop at 85.051129°S, so the Amundsen–Scott station keeps a DOM marker (one, not 112).
 const tileLimit=-85.051129,beyondTiles=r=>r.center[1]<tileLimit;
 function clearPoleMarkers(){poleMarkers.forEach(m=>m.remove());poleMarkers=[];}
 function poleMarker(r){
  const button=document.createElement('button');button.type='button';button.className='antarctic-station-dot '+(r.season==='Year-Round'?'year-round':'seasonal');
  button.classList.toggle('selected-station',r.id===selected?.id);button.classList.toggle('temporarily-closed',r.status==='Temporarily Closed');button.dataset.atlasPlace=r.id;button.setAttribute('aria-label',r.en);
  button.addEventListener('click',e=>{e.stopPropagation();if(!host.isBusy())void select(r);});
  return new window.maplibregl.Marker({element:button,anchor:'center',opacityWhenCovered:0}).setLngLat(r.center).addTo(map);
 }
 function clearDots(){clearPoleMarkers();for(const id of dotLayers)if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');}
 function pickDot(point){
  if(!active||!ready||!$('station-layer').checked||!map.getLayer(dotLayers[1]))return;
  // A larger hit area keeps the visible dot small, including on touchscreens.
  const hits=map.queryRenderedFeatures([[point.x-12,point.y-12],[point.x+12,point.y+12]],{layers:[dotLayers[1]]});
  let found,distance=Infinity;for(const f of hits){const r=index.get(f.properties.id),p=r&&map.project(r.center),d=p?(p.x-point.x)**2+(p.y-point.y)**2:Infinity;if(d<distance){distance=d;found=r;}}
  return found;
 }
 map.on('click',e=>{if(host.isBusy())return;const r=pickDot(e.point);if(r)void select(r);});
 let pointing=false;
 onMapHover(map,e=>{const hit=!!(active&&!map.isMoving()&&pickDot(e.point));if(hit!==pointing){pointing=hit;map.getCanvas().style.cursor=hit?'pointer':'';}});
 function updateLabels(){
  clearLabels();if(!active||!ready||host.isMoving?.()||map.isMoving()||!$('station-layer').checked||!$('label-layer').checked)return;
  labels=window.AtlasLabels.render(map,records.filter(visible).map(r=>({...r,lines:[r.en],selected:r.id===selected?.id,priority:r.season==='Year-Round'?2:1,onClick:()=>select(r)})),'korea-marker antarctic-label');
 }
 function drawDots(){
  if(!active||!ready||!$('station-layer').checked){clearDots();return;}
  installDots();
  clearPoleMarkers();poleMarkers=records.filter(r=>visible(r)&&beyondTiles(r)).map(poleMarker);
  const shown=records.filter(r=>visible(r)&&!beyondTiles(r)),ids=new Set(shown.map(r=>r.id));
  if(ids.size!==dotIds.size||[...ids].some(id=>!dotIds.has(id))){
   dotIds=ids;selectedDot=null;
   map.getSource(dotSource).setData({type:'FeatureCollection',features:shown.map(r=>({type:'Feature',properties:{id:r.id,yearRound:r.season==='Year-Round',closed:r.status==='Temporarily Closed'},geometry:{type:'Point',coordinates:r.center}}))});
  }
  const next=selected&&ids.has(selected.id)?selected.id:null;
  if(next!==selectedDot){if(selectedDot)map.setFeatureState({source:dotSource,id:selectedDot},{selected:false});if(next)map.setFeatureState({source:dotSource,id:next},{selected:true});selectedDot=next;}
  for(const id of dotLayers)map.setLayoutProperty(id,'visibility','visible');
 }
 function sync(){
  if(active){document.getElementById('mode-province').textContent='Research facilities';document.getElementById('mode-province').setAttribute('aria-pressed','true');document.getElementById('mode-prefecture').hidden=true;if(document.getElementById('mode-third'))document.getElementById('mode-third').hidden=true;document.getElementById('mode-lock').parentElement.hidden=true;document.getElementById('map-hint').textContent='Select a station';}
  drawDots();updateLabels();
 }
 async function warm(){if(ready)return;if(!loading)loading=Promise.all(['facilities.json','flags.json'].map(file=>fetch(base+file).then(r=>{if(!r.ok)throw Error('Antarctic facilities unavailable');return r.json();}))).then(([data,flags])=>{records=data.records;flagData=flags;index=new Map(records.map(r=>[r.id,r]));ready=true;}).finally(()=>{loading=null;});return loading;}
 function fact(label,value){if(value===null||value===undefined||value==='')return;const section=document.createElement('section');section.className='country-info-card';const h=document.createElement('h3');h.textContent=label;const p=document.createElement('p');p.textContent=value;section.append(h,p);$('facts').append(section);}
 function showFlags(record){
  const container=$('flags');container.replaceChildren();
  for(const operator of new Set(record.operators)){const flag=flagData.national[operator],image=document.createElement('img');image.src=flag.file;image.alt='Flag of '+flag.name;image.width=40;image.dataset.flagLevel='national';container.append(image);}
  const flag=flagData.stations[record.id];if(flag){const link=document.createElement('a'),image=document.createElement('img');link.href=flag.page;link.target='_blank';link.rel='noopener';link.title=flag.classification+' · '+flag.credit+' · '+flag.license;image.src=flag.file;image.alt='Flag of '+flag.name;image.width=40;image.dataset.flagLevel='station';image.dataset.flagFullSrc=flag.full;link.append(image);container.append(link);}
 }
 async function select(record,fit=true){
  if(!record)return;selected=record;showFlags(record);$('search-results').hidden=true;$('search-results').replaceChildren();$('search').value='';
  $('name').textContent=record.en;$('kind').textContent=record.kind;$('local').textContent=key(record.local.replace(/\s+Station$/i,''))!==key(record.en)?record.local:'';$('local').hidden=!$('local').textContent;$('facts').replaceChildren();
  fact(record.operators.length>1?'Operators':'Operator',record.operators.join(' · '));fact('Season',record.season==='Year-Round'?'Year-round':record.season);fact('Status · November 2024',record.status);fact('Established',record.established);
  fact('Coordinates',Math.abs(record.center[1]).toFixed(5)+'° S · '+Math.abs(record.center[0]).toFixed(5)+'° '+(record.center[0]<0?'W':'E'));
  const source=document.createElement('a');source.href='https://www.comnap.aq/antarctic-facilities-information';source.textContent='COMNAP facility reference';source.target='_blank';source.rel='noopener';$('facts').append(source);
  $('tab-explore').hidden=false;panel('explore');document.getElementById('map-shell').dataset.selected='true';setMapBreadcrumb([{label:record.en}]);sync();window.AtlasSheet?.expand?.();
  // Stations near the pole centre at the home camera latitude. Globe zoom is scaled by latitude,
  // so inland stations zoom out to show the same ground area as coastal ones.
  if(fit){const lat=Math.max(record.center[1],-85),r=Math.PI/180,camera={center:[record.center[0],lat],zoom:Math.min(2.8,2.8+Math.log2(Math.cos(lat*r)/Math.cos(72*r))),padding:window.AtlasSheet?.navigationPadding({selection:true})||{left:28,right:28,top:100,bottom:80},retainPadding:false};await host.fit(bounds,6,{manual:true,camera});}updateLabels();
 }
 async function home(fit=true){selected=null;$('tab-explore').hidden=true;panel('layers');document.getElementById('map-shell').dataset.selected='false';setMapBreadcrumb([]);sync();if(fit)await host.fit(bounds,6,{manual:true,overview:true,camera:homeCamera()});}
 $('tab-layers').onclick=()=>panel('layers');$('tab-explore').onclick=()=>panel('explore');$('reset').onclick=()=>home();
 for(const id of ['station-layer','label-layer','facilities'])$(id).addEventListener('change',sync);
 $('search').addEventListener('input',()=>{
  const query=key($('search').value),box=$('search-results');box.replaceChildren();box.hidden=!query;if(!query||!ready)return;
  const matches=records.filter(r=>[r.en,r.local,...r.aliases,...r.operators].some(n=>key(n).includes(query))).slice(0,30);
  for(const r of matches){const button=document.createElement('button');button.type='button';button.className='search-result';const name=document.createElement('span');name.textContent=r.en;const kind=document.createElement('small');kind.textContent=r.operators.join(' · ')+' · '+r.kind;button.append(name,kind);button.onclick=()=>{if(!visible(r))$('facilities').value='all';void select(r);};box.append(button);}
  if(!matches.length){const text=document.createElement('p');text.textContent='No matches.';box.append(text);}
 });
 const moveend=()=>updateLabels();map.on('moveend',moveend);
 const settingsChanged=()=>{if(active)sync();};globalThis.addEventListener('atlas-settings-change',settingsChanged);
 const nearest=point=>{let found,distance=16;for(const r of records.filter(visible)){const p=map.project(r.center),d=Math.hypot(point[0]-p.x,point[1]-p.y);if(d<distance){found=r;distance=d;}}return found;};
 return {bounds,homeCamera,get ready(){return ready;},get active(){return active;},warm,sync,updateLabels,pauseLabels:clearLabels,home,viewParent:()=>home(),getMode:()=>1,setMode:sync,getLanguage:()=> 'en',setLanguage(){},labelLanguages:[['en','English']],getSelection:()=>selected?.id||null,getScope:()=>definition.view.frame,hoverAt(point,id){return active&&$('station-layer').checked?(id?index.get(id):nearest(point)):null;},async restore(id,frame){await warm();if(id)await select(index.get(id),frame!==definition.view.frame);else await home(frame!==definition.view.frame);},async enter(){await warm();active=true;sidebar.hidden=false;document.getElementById('home').textContent='Antarctica';await home(false);void Promise.resolve(host.started).then(()=>active&&loadCoast()).then(syncCoast);},leave(){active=false;sidebar.hidden=true;clearLabels();clearDots();syncCoast();document.getElementById('mode-lock').parentElement.hidden=false;},unload(){records=[];flagData=null;index.clear();$('flags').replaceChildren();ready=false;selected=null;clearLabels();clearDots();unloadCoast();if(map.getSource(dotSource)){map.removeFeatureState({source:dotSource});map.getSource(dotSource).setData({type:'FeatureCollection',features:[]});}dotIds=new Set();selectedDot=null;},random(){const pool=records.filter(visible);if(pool.length)return select(pool[Math.floor(Math.random()*pool.length)]);}};
}
