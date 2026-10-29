import {createHoverOverview} from './hover-overview.mjs';
import {createFirstLevelQuiz} from './first-level-quiz.mjs';
import {createQuizMapSession} from './map-quiz.mjs';
import {quizRecords} from './quiz-records.mjs';
import {medalMarkup,highestMedal} from './quiz-medals.mjs';
// A country's cities as dots, in cumulative difficulties (definition.quiz.cities).
// Its first-level fills and borders stay as context; with hidePrefix, every other layer from the
// country's sources is hidden, and any map marker is hidden, so no name or settlement dot gives
// an answer. Country adapters supply the label lifecycle and context layers.
export function createCityQuiz(map,host,atlas,{country,sidebar,tab,prefix,addPicker,hidePrefix=country+'-',context=[country+'-first-fill',country+'-first-lines'],lineLayer=country+'-first-lines',hideLabels=()=>atlas.pauseLabels?.(),restore=()=>{atlas.sync?.();atlas.updateLabels?.();}}){
 const definition=AtlasCountries.countries[country],cities=definition.quiz.cities,key='quiz-'+prefix,levels=cities.levels,order=levels.map(l=>l.id);
 const nativeSession=atlas.quizMap?createQuizMapSession(map,atlas,country):null;
 const contextLayers=new Set(context),hidden=new Map();
 let quiz,data,loading,cache={},enforcing=false,frame,reviewed=null,previewing=false,previewSaved,previewHover;
 const load=()=>data?Promise.resolve(data):loading??=fetch(cities.file).then(r=>{if(!r.ok)throw Error('City list unavailable');return r.json();}).then(value=>{data=value;quiz?.setup();updateMedal();renderCoverage();return value;}).finally(()=>{loading=undefined;});
 // Every level includes the easier ones. Records carry the chosen level as their parent scope.
 function records(){const scope=quiz?.scope||order[0];if(!data)return [];return cache[scope]??=data.records.filter(r=>order.indexOf(r.tier)<=order.indexOf(scope)).map(r=>({...r,level:3,parent:scope,local:r.local||''}));}
 function remove(){previewHover?.clear();if(map.getLayer(key+'-dots'))map.removeLayer(key+'-dots');if(map.getSource(key))map.removeSource(key);}
 function enforce(){if(!(quiz?.active||previewing)||enforcing||!hidePrefix)return;enforcing=true;try{for(const layer of map.getStyle().layers)if(typeof layer.source==='string'&&layer.source.startsWith(hidePrefix)&&!contextLayers.has(layer.id)){const visibility=map.getLayoutProperty(layer.id,'visibility')||'visible';if(!hidden.has(layer.id))hidden.set(layer.id,visibility);if(visibility!=='none')map.setLayoutProperty(layer.id,'visibility','none');}}finally{enforcing=false;}}
 const state=name=>['boolean',['feature-state',name],false];
 function pick(point){
  if(!map.getLayer(key+'-dots'))return null;const [x,y]=point.x===undefined?point:[point.x,point.y],r=12;
  const hits=map.queryRenderedFeatures([[x-r,y-r],[x+r,y+r]],{layers:[key+'-dots']});let best=null,distance=Infinity;
  for(const f of hits){const p=map.project(f.geometry.coordinates),d=Math.hypot(p.x-x,p.y-y);if(d<distance){distance=d;best=f.properties.id;}}return best;
 }
 // Naming a highlighted city zooms toward it, just far enough that its nearest neighbour sits
 // about 32 px away (at least one step in, never past regional scale); other modes frame the country.
 async function fitScope({target}={}){
  // Click rounds free the map; typing rounds keep their input in the sheet.
  if(!target&&document.getElementById(prefix+'-quiz-type').value==='find')await window.AtlasSheet?.collapse();
  const frame=cities.bounds,frameZoom=(definition.home?.maxZoom||8)-1;if(!target)return host.fit(frame,frameZoom,{manual:true,overview:false});
  const [lon,lat]=target.center,cos=Math.cos(lat*Math.PI/180),base=Math.min(frameZoom,map.cameraForBounds(frame,{padding:40})?.zoom??3);
  let nearest=Infinity;for(const r of records())if(r.id!==target.id)nearest=Math.min(nearest,Math.hypot((r.center[0]-lon)*cos,r.center[1]-lat));
  const needed=Number.isFinite(nearest)?Math.log2(32*360*cos/(512*nearest)):base,zoom=Math.min(7.5,Math.max(base+1,needed));
  // A box smaller than the view, so the zoom cap (not the map padding) sets the scale.
  const {clientWidth:w,clientHeight:h}=map.getContainer(),dx=w/8*360/(512*2**zoom),dy=dx*cos*h/w;
  return host.fit([[lon-dx,lat-dy],[lon+dx,lat+dy]],zoom,{manual:true,overview:false});
 }
 const coverage=document.createElement('details');coverage.className='city-quiz-coverage';coverage.dataset.cityCoverage='';coverage.hidden=true;
 const coverageSummary=document.createElement('summary'),coverageList=document.createElement('div');coverageList.className='city-quiz-coverage-list';coverageList.dataset.cityCoverageList='';coverage.append(coverageSummary,coverageList);
 coverage.addEventListener('toggle',()=>{if(coverage.open)coverage.scrollIntoView({block:'start'});});
 function renderCoverage(){
  if(!data||!quiz)return;
  const includeOverseas=quiz.panel.querySelector('[data-q=overseas]').checked,pool=records().filter(r=>includeOverseas||!r.overseas);
  coverageSummary.textContent='Cities included ('+pool.length+')';coverageList.replaceChildren();
  for(const level of levels){
   const included=pool.filter(r=>r.tier===level.id).sort((a,b)=>a.en.localeCompare(b.en));if(!included.length)continue;
   const group=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('ul');heading.textContent=level.label+' · '+included.length;
   for(const record of included){const item=document.createElement('li');item.textContent=record.en;list.append(item);}
   group.append(heading,list);coverageList.append(group);
  }
  coverage.hidden=false;
 }
 const medal=document.createElement('p');medal.className='quiz-note quiz-medal-note';medal.hidden=true;
 // The medal shown is the chosen quiz type's own.
 function updateMedal(){const best=highestMedal(quizRecords.data.bests,country,3,levels,document.getElementById(prefix+'-quiz-type')?.value);medal.hidden=!best;if(best)medal.innerHTML=medalMarkup(best.medal)+'<span>Highest level · '+best.label+'</span>';}
 quiz=createFirstLevelQuiz(map,host,{country,sidebar,prefix,tab,attachTab:false,overlay:true,returnPanelId:prefix+'-quiz-panel',
  config:{level:3,plural:'Cities',singular:'city',title:'City quiz',scopeLabel:'Difficulty',scopes:levels.map(l=>({id:l.id,label:l.label})),bounds:cities.bounds,overseasLabel:cities.overseasLabel,includeOverseas:cities.overseasDefault??!!cities.overseasLabel},storageKey:scope=>country+'-cities:'+scope,
  records,fitScope,ready:()=>!!data&&atlas.ready!==false,onOpen:()=>void load().then(renderCoverage),onScopeChange:renderCoverage,
  fillLayers:[],lineLayer,
  mark:(r,value)=>{if(map.getSource(key))map.setFeatureState({source:key,id:r.id},value);},pick,capture:()=>nativeSession?.capture()||{},hideLabels,
  async begin(){await load();if(nativeSession)await nativeSession.begin();installDots(records());},
  onActiveChange(){if(nativeSession){nativeSession.setActive(quiz.active);return;}document.getElementById('map-shell').dataset.quizOverlay=String(quiz.active);if(quiz.active)enforce();else{for(const [id,visibility]of hidden)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',visibility);hidden.clear();}},
  review(r){if(!map.getSource(key))return;if(reviewed&&reviewed!==r?.id)map.setFeatureState({source:key,id:reviewed},{review:false});reviewed=r?.id||null;if(r)map.setFeatureState({source:key,id:r.id},{review:true});},
  restore(saved){remove();reviewed=null;return nativeSession?nativeSession.restore(saved):restore();}
 });
 if(!quiz)return null;

 function installDots(pool){remove();
   map.addSource(key,{type:'geojson',data:{type:'FeatureCollection',features:pool.map(r=>({type:'Feature',properties:{id:r.id},geometry:{type:'Point',coordinates:r.center}}))},promoteId:'id'});
   const emphasis=['any',state('quizTarget'),state('review')];
   map.addLayer({id:key+'-dots',type:'circle',source:key,paint:{
    'circle-radius':['interpolate',['linear'],['zoom'],3,['case',emphasis,7,4.5],8,['case',emphasis,10,7]],
    'circle-color':['case',state('quizCorrect'),'#548165',state('quizWrong'),'#b44737',state('quizTarget'),'#d4ad55',definition.map?.line||'#6b5a49'],
    'circle-stroke-color':'#fff','circle-stroke-width':1.5}});
 }
 const previewButton=document.createElement('button');previewButton.type='button';previewButton.className='quiz-text-button';previewButton.dataset.cityPreviewStart='';previewButton.textContent='Preview';
 const previewPanel=document.createElement('div');previewPanel.dataset.cityPreview='';previewPanel.hidden=true;
 const previewHeading=document.createElement('h2');previewHeading.textContent='Preview';
 const previewNote=document.createElement('p');previewNote.className='quiz-note';previewNote.textContent='Hover over or tap a dot to see the city name.';
 const previewEnd=document.createElement('button');previewEnd.type='button';previewEnd.className='quiz-primary';previewEnd.textContent='Back to quiz';previewEnd.dataset.cityPreviewEnd='';previewEnd.onclick=()=>void endPreview();previewPanel.append(previewHeading,previewNote,previewEnd);
 async function startPreview(){
  if(previewing||quiz.active)return;previewButton.disabled=true;
  try{
   await load();previewSaved={adapter:nativeSession?.capture()||{},home:document.getElementById('home').textContent,hint:document.getElementById('map-hint').textContent};
   if(nativeSession)await nativeSession.begin();previewing=true;
   const overseas=quiz.panel.querySelector('[data-q=overseas]').checked,pool=records().filter(r=>overseas||!r.overseas);
   installDots(pool);hideLabels();if(nativeSession)nativeSession.setActive(true);else enforce();
   for(const section of sidebar.querySelectorAll('.sidebar-scroll > section'))section.hidden=section!==quiz.panel;
   quiz.panel.hidden=false;for(const b of sidebar.querySelectorAll('.panel-tabs button'))b.setAttribute('aria-pressed',String(b===tab));
   quiz.panel.querySelector('[data-q=setup]').hidden=true;previewPanel.hidden=false;sidebar.dataset.quiz='true';
   for(const b of sidebar.querySelectorAll('.panel-tabs button'))b.disabled=b!==tab;
   document.getElementById('home').textContent='End preview';document.getElementById('map-hint').textContent='Hover over or tap a city';
   host.setQuizActive(true);await window.AtlasSheet?.collapse();await host.fit(cities.bounds,7,{manual:true,overview:false});previewEnd.focus({preventScroll:true});
  }catch(error){await endPreview();previewNote.textContent=error.message;throw error;}finally{previewButton.disabled=false;}
 }
 async function endPreview(){
  if(!previewing)return;await host.stopCamera?.();previewing=false;remove();nativeSession?.setActive(false);
  for(const [id,visibility]of hidden)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',visibility);hidden.clear();
  host.setQuizActive(false);delete sidebar.dataset.quiz;for(const b of sidebar.querySelectorAll('.panel-tabs button'))b.disabled=false;
  document.getElementById('home').textContent=previewSaved.home;document.getElementById('map-hint').textContent=previewSaved.hint;
  if(nativeSession)await nativeSession.restore(previewSaved.adapter);else await restore();
  for(const section of sidebar.querySelectorAll('.sidebar-scroll > section'))section.hidden=section!==quiz.panel;quiz.panel.hidden=false;
  for(const b of sidebar.querySelectorAll('.panel-tabs button'))b.setAttribute('aria-pressed',String(b===tab));
  previewPanel.hidden=true;quiz.panel.querySelector('[data-q=setup]').hidden=false;quiz.setup();window.AtlasSheet?.expand();previewButton.focus({preventScroll:true});
 }
 // Use the same hover renderer, type styles and positioning as ordinary atlas places.
 previewHover=createHoverOverview(map,{id:key+'-preview-hover',blocked:()=>!previewing,resolve:point=>{
  const r=records().find(r=>r.id===pick(point));return r?{en:r.en,local:r.local,kind:r.regionName||r.stateName}:null;
 }});
 previewButton.onclick=()=>void startPreview().catch(error=>{console.warn('City preview:',error.message);});
 // Touch users tap a city; desktop pointer movement is handled by the shared renderer.
 map.on('click',event=>{if(previewing)previewHover.show(event.point);});
 quiz.panel.querySelector('[data-q=start]').before(previewButton);quiz.panel.append(previewPanel);

 addPicker?.(quiz.panel,'3');quiz.panel.querySelector('[data-q=setup]').append(medal);quiz.panel.querySelector('[data-q=start]').before(coverage);
 quiz.panel.querySelector('[data-q=overseas]').addEventListener('change',renderCoverage);
 quizRecords.subscribe(updateMedal);quiz.panel.querySelector('#'+prefix+'-quiz-type').addEventListener('change',updateMedal);updateMedal();
 map.on('styledata',()=>{if(nativeSession||!(quiz.active||previewing)||frame||!hidePrefix)return;frame=requestAnimationFrame(()=>{frame=null;enforce();});});
 return{get active(){return quiz.active||previewing;},get previewing(){return previewing;},get panel(){return quiz.panel;},get scope(){return quiz.scope;},open:options=>{void load();quiz.open(options);},end:()=>previewing?endPreview():quiz.end(),fit:()=>previewing?host.fit(cities.bounds,7,{manual:true,overview:false}):quiz.fit(),labels:()=>quiz.labels(),release(){if(previewing)void endPreview();else remove();}};
}
// Regional countries (Russia): a Divisions picker beside the first-level quiz switches to cities.
export function attachCityQuiz(map,host,atlas,country){
 if(atlas.cityQuiz)return atlas.cityQuiz;
 const definition=AtlasCountries.countries[country],first=atlas.quiz,sidebar=atlas.quizMap?.sidebar||document.getElementById(country+'-sidebar');if(!first||!sidebar||!definition.quiz.cities)return null;
 const tab=document.getElementById(first.panel.id.replace(/-quiz-panel$/,'-tab-quiz'));if(!tab)return null;
 const pickers=[],openFirst=first.open.bind(first);let level='1',cities,countryActive=true;
 const select=value=>{level=value;for(const picker of pickers)picker.value=value;};
 function addPicker(panel,value){const label=document.createElement('label');label.className='field-label';label.textContent='Divisions';const picker=document.createElement('select');picker.id=panel.id+'-divisions';label.htmlFor=picker.id;picker.append(new Option(definition.quiz.plural,'1'),new Option(definition.quiz.cities.plural,'3'));picker.value=value;label.append(picker);panel.querySelector('[data-q=scope-label]').after(label);pickers.push(picker);picker.onchange=()=>picker.value==='3'?openCities():first.open();}
 function openCities(options={}){if(!countryActive||!atlas.ready)return;select('3');cities??=createCityQuiz(map,host,atlas,{country,sidebar,tab,prefix:country+'-cities',addPicker});cities?.open(options);}
 first.open=(options={})=>{select('1');openFirst(options);};addPicker(first.panel,'1');
 tab.onclick=()=>level==='3'?openCities():first.open();
 const home=atlas.home.bind(atlas),leave=atlas.leave?.bind(atlas),unload=atlas.unload?.bind(atlas);
 atlas.home=(...args)=>cities?.active?cities.end():home(...args);if(leave)atlas.leave=(...args)=>{cities?.release();return leave(...args);};if(unload)atlas.unload=(...args)=>{cities?.release();return unload(...args);};
 atlas.cityQuiz={get active(){return !!cities?.active;},get panel(){return cities?.panel;},get scope(){return cities?.scope;},open:openCities,end:()=>cities?.end(),fit:()=>cities?.fit(),setCountryActive(value){countryActive=value;if(!value&&cities&&!cities.active)cities.panel.hidden=true;}};
 return atlas.cityQuiz;
}
