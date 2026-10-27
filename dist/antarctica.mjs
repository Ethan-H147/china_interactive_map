import {createCountryPage,showCountryPanel,setMapBreadcrumb} from './country-page.mjs';
import {addWorkerSource} from './geo-pack.mjs';
const base='data/antarctica/';
const key=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export async function addAntarctica(map,host){
 const sidebar=createCountryPage({id:'antarctica-sidebar',label:'Explore Antarctica',classes:'sidebar regional-sidebar',prefix:'aq-',
  search:{id:'aq-search',label:'Find a station or research facility',resultsId:'aq-search-results',dataNav:true},
  settings:`<label class="field-label" for="aq-facilities">Facilities</label><select id="aq-facilities"><option value="all">All facilities</option><option value="stations">Stations</option><option value="support">Camps &amp; support sites</option></select><section class="layers"><h3>Visible layers</h3><label><span>Station dots</span><input id="aq-station-layer" type="checkbox" checked data-nav></label><label><span>Place names</span><input id="aq-label-layer" type="checkbox" checked data-nav></label></section><p class="country-note">Year-round <span class="antarctic-key year-round"></span> &nbsp; Seasonal <span class="antarctic-key seasonal"></span></p><p class="country-note">Facility status: November 2024.</p>`,
  heading:{navigation:'<button id="aq-reset" class="back-button">All Antarctica</button><div id="aq-flags" class="division-flags"></div>',kindId:'aq-kind',nameId:'aq-name',names:'<p id="aq-local" class="country-local"></p>'},
  cards:'<section class="country-info-cards antarctic-facts" id="aq-facts"></section>',
  footer:'<details class="country-source-options"><summary>Sources &amp; coverage</summary><a href="https://www.comnap.aq/antarctic-facilities-information" target="_blank" rel="noopener">COMNAP facilities · November 2024</a><a href="data/antarctica/flag-sources.json" target="_blank" rel="noopener">Flag sources &amp; credits</a><a href="data/antarctica/sources.json" target="_blank" rel="noopener">Map sources &amp; coverage</a><a href="https://www.ats.aq/e/antarctictreaty.html" target="_blank" rel="noopener">Antarctic Treaty</a><p>Article IV preserves positions on territorial claims without resolving sovereignty. Claim sectors appear only in claimant-country maps.</p></details><span>Created by Ethan Hu</span>'});
 document.querySelector('.workspace').insertBefore(sidebar,document.getElementById('map-shell'));sidebar.hidden=true;
 const $=id=>document.getElementById('aq-'+id),bounds=[[-180,-90],[180,-60]],definition=globalThis.AtlasCountries.countries.antarctica;
 let active=false,ready=false,records=[],index=new Map(),selected=null,loading,flagData,labels=[],dots=[];
 await addWorkerSource(map,'antarctica-portal',base+'context.bin',{type:'geojson',tolerance:.01,maxzoom:8});
 map.addLayer({id:'antarctica-portal-fill',type:'fill',source:'antarctica-portal',metadata:{atlas:{role:'context',contextCountry:'antarctica'}},paint:{'fill-color':definition.portal.fill,'fill-antialias':false}});
 const panel=name=>showCountryPanel(sidebar,$(name+'-panel'));
 function homeCamera(){
  const size=map.getContainer(),padding=window.AtlasSheet?.navigationPadding({selection:false})||{left:32,right:32,top:80,bottom:64};
  const available=Math.max(180,Math.min(size.clientWidth-padding.left-padding.right,size.clientHeight-padding.top-padding.bottom));
  return {center:[0,-85],zoom:Math.log2(available/850),bearing:0,pitch:0,padding,retainPadding:false};
 }
 const visible=r=>$('facilities').value==='all'||($('facilities').value==='stations')===(r.kind==='Station');
 function clearLabels(){labels.forEach(m=>m.remove());labels=[];}
 function clearDots(){dots.forEach(m=>m.remove());dots=[];}
 function updateLabels(){
  clearLabels();if(!active||!ready||host.isMoving?.()||map.isMoving()||!$('station-layer').checked||!$('label-layer').checked)return;
  labels=window.AtlasLabels.render(map,records.filter(visible).map(r=>({...r,lines:[r.en],selected:r.id===selected?.id,priority:r.season==='Year-Round'?2:1,onClick:()=>select(r)})),'korea-marker antarctic-label');
 }
 function drawDots(){
  clearDots();if(!active||!ready||!$('station-layer').checked)return;
  for(const r of records.filter(visible)){
   const button=document.createElement('button');button.type='button';button.className='antarctic-station-dot '+(r.season==='Year-Round'?'year-round':'seasonal');
   button.classList.toggle('selected-station',r.id===selected?.id);button.classList.toggle('temporarily-closed',r.status==='Temporarily Closed');button.dataset.atlasPlace=r.id;button.setAttribute('aria-label',r.en);
   button.addEventListener('click',e=>{e.stopPropagation();if(!host.isBusy())void select(r);});
   dots.push(new window.maplibregl.Marker({element:button,anchor:'center',opacityWhenCovered:0}).setLngLat(r.center).addTo(map));
  }
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
  if(fit){const camera=record.center[1]<-84.5?homeCamera():{center:record.center,zoom:2.8,padding:window.AtlasSheet?.navigationPadding({selection:true})||{left:28,right:28,top:100,bottom:80},retainPadding:false};await host.fit(bounds,6,{manual:true,camera});}updateLabels();
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
 return {bounds,homeCamera,get ready(){return ready;},get active(){return active;},warm,sync,updateLabels,pauseLabels:clearLabels,home,viewParent:()=>home(),getMode:()=>1,setMode:sync,getLanguage:()=> 'en',setLanguage(){},labelLanguages:[['en','English']],getSelection:()=>selected?.id||null,getScope:()=>definition.view.frame,hoverAt(point,id){return active&&$('station-layer').checked?(id?index.get(id):nearest(point)):null;},async restore(id,frame){await warm();if(id)await select(index.get(id),frame!==definition.view.frame);else await home(frame!==definition.view.frame);},async enter(){await warm();active=true;sidebar.hidden=false;document.getElementById('home').textContent='Antarctica';await home(false);},leave(){active=false;sidebar.hidden=true;clearLabels();clearDots();document.getElementById('mode-lock').parentElement.hidden=false;},unload(){records=[];flagData=null;index.clear();$('flags').replaceChildren();ready=false;selected=null;clearLabels();clearDots();},random(){const pool=records.filter(visible);if(pool.length)return select(pool[Math.floor(Math.random()*pool.length)]);}};
}
