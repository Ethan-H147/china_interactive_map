import {createFirstLevelQuiz} from './first-level-quiz.mjs';
import {loadCompressed} from './korea-data.mjs';
import {selectionLineData} from './outline-detail.mjs';
const empty=()=>({type:'FeatureCollection',features:[]});
export function attachUsCountyQuiz(map,host,atlas){
 if(atlas.countyQuiz)return atlas.countyQuiz;
 const country='united-states',definition=AtlasCountries.countries[country],sidebar=document.getElementById(country+'-sidebar');if(!sidebar)return;
 const key='quiz-us-counties',tab=document.createElement('button');tab.id='us-tab-county-quiz';tab.type='button';tab.textContent='County quiz';tab.setAttribute('aria-pressed','false');sidebar.querySelector('.panel-tabs').append(tab);
 const stateTab=document.getElementById('us-tab-quiz');if(stateTab)stateTab.textContent='State quiz';
 let quiz,index,indexJob,data,loadedScope='',warming,generation=0,countryActive=true,frame,enforcing=false;const hidden=new Map();
 function remove(){for(const id of [key+'-selected',key+'-lines',key+'-fill'])if(map.getLayer(id))map.removeLayer(id);for(const id of [key+'-selection',key+'-borders',key])if(map.getSource(id))map.removeSource(id);}
 function enforce(){if(!quiz?.active||enforcing)return;enforcing=true;try{for(const layer of map.getStyle().layers)if(typeof layer.source==='string'&&layer.source.startsWith(country+'-')){const visibility=map.getLayoutProperty(layer.id,'visibility')||'visible';if(!hidden.has(layer.id))hidden.set(layer.id,visibility);if(visibility!=='none')map.setLayoutProperty(layer.id,'visibility','none');}}finally{enforcing=false;}}
 const spinner=document.createElement('div');spinner.className='quiz-geography-spinner';spinner.hidden=true;spinner.setAttribute('role','status');spinner.setAttribute('aria-label','Preparing county quiz');
 function release(){generation++;data=undefined;loadedScope='';warming=undefined;remove();spinner.hidden=true;}
 async function loadScope(scope){
  if(data&&loadedScope===scope)return;if(warming?.scope===scope)return warming.promise;
  const state=index.scopes.find(s=>s.id===scope);if(!state)return;const token=++generation;data=undefined;loadedScope='';spinner.hidden=false;spinner.innerHTML=AtlasSymbols.markup(country);quiz.setup();
  const promise=loadCompressed(state.file).then(value=>{if(token!==generation)return;data=value;loadedScope=scope;spinner.hidden=true;quiz.setup();}).catch(()=>{if(token!==generation)return;const note=document.createElement('p');note.className='quiz-note';note.textContent='County geography could not load. Open County quiz to retry.';spinner.replaceChildren(note);}).finally(()=>{if(warming?.promise===promise)warming=undefined;});warming={scope,promise};return promise;
 }
 async function prepare(){
  if(index)return;if(!indexJob){tab.setAttribute('aria-busy','true');indexJob=fetch(definition.quiz.counties.index).then(r=>{if(!r.ok)throw Error('County list unavailable');return r.json();}).then(value=>{index=value;}).finally(()=>{indexJob=undefined;tab.removeAttribute('aria-busy');});}await indexJob;
 }
 function mount(){
  if(quiz)return;
  quiz=createFirstLevelQuiz(map,host,{country,sidebar,prefix:'us-counties',tab,overlay:true,config:{level:2,plural:'Counties & equivalents',singular:'county or equivalent',scopeLabel:'State',scopes:index.scopes},storageKey:scope=>'united-states-counties:'+scope,
   records:()=>data?.records||[],ready:()=>!!data&&loadedScope===quiz?.scope&&atlas.ready,onOpen:scope=>void loadScope(scope),onScopeChange:scope=>void loadScope(scope),
   fillLayers:[key+'-fill'],lineLayer:key+'-lines',mark:(r,state)=>{if(map.getSource(key))map.setFeatureState({source:key,id:r.id},state);},pick:point=>map.getLayer(key+'-fill')?map.queryRenderedFeatures(point,{layers:[key+'-fill']})[0]?.properties.id:null,capture:()=>({}),hideLabels:()=>atlas.pauseLabels?.(),
   async begin(){await loadScope(quiz.scope);if(!data||loadedScope!==quiz.scope)throw Error('County geography unavailable');remove();map.addSource(key,{type:'geojson',data:data.regions,promoteId:'id',tolerance:0,buffer:128});map.addSource(key+'-borders',{type:'geojson',data:data.boundaries,tolerance:0});map.addSource(key+'-selection',{type:'geojson',data:empty(),tolerance:0});map.addLayer({id:key+'-fill',type:'fill',source:key,paint:{'fill-color':'#e9e5dc','fill-opacity':1}});map.addLayer({id:key+'-lines',type:'line',source:key+'-borders',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':definition.map.line,'line-width':.8}});map.addLayer({id:key+'-selected',type:'line',source:key+'-selection',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#926b16','line-width':1.4}});},
   onActiveChange(){document.getElementById('map-shell').dataset.quizOverlay=String(quiz.active);if(quiz.active)enforce();else{for(const [id,visibility]of hidden)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',visibility);hidden.clear();}},
   review(r,state={}){if(map.getSource(key+'-selection'))map.getSource(key+'-selection').setData(r?selectionLineData({type:'FeatureCollection',features:data.regions.features.filter(f=>f.properties.id===r.id)}):empty());if(map.getLayer(key+'-selected'))map.setPaintProperty(key+'-selected','line-color',state.wrong?'#b44737':state.target?'#926b16':'#548165');},restore(){remove();atlas.sync?.();atlas.updateLabels?.();}
  });
  quiz.panel.querySelector('[data-q=setup]').append(spinner);
 }
 const controller={get active(){return !!quiz?.active;},get panel(){return quiz?.panel;},get scope(){return quiz?.scope;},async open(options={}){try{await prepare();if(!countryActive||!atlas.ready)return;mount();quiz.open(options);tab.title='';tab.textContent='County quiz';}catch{tab.textContent='County quiz · Retry';tab.title='County list could not load. Select County quiz to retry.';}},end:()=>quiz?.end(),fit:()=>quiz?.fit(),setCountryActive(value){countryActive=value;tab.hidden=!value;if(!value&&quiz)quiz.panel.hidden=true;}};
 tab.onclick=()=>controller.open();
 const home=atlas.home.bind(atlas),leave=atlas.leave?.bind(atlas),unload=atlas.unload?.bind(atlas);atlas.home=(...args)=>quiz?.active?quiz.end():home(...args);if(leave)atlas.leave=(...args)=>{release();return leave(...args);};if(unload)atlas.unload=(...args)=>{release();return unload(...args);};
 map.on('styledata',()=>{if(!quiz?.active||frame)return;frame=requestAnimationFrame(()=>{frame=null;enforce();});});
 atlas.countyQuiz=controller;return controller;
}
