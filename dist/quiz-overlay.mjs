import {createFirstLevelQuiz} from './first-level-quiz.mjs';
import {loadCompressed} from './korea-data.mjs';
import {selectionLineData} from './outline-detail.mjs';
const empty=()=>({type:'FeatureCollection',features:[]});
export function attachQuizOverlay(map,host,country,atlas){
 const definition=globalThis.AtlasCountries.countries[country];if(!definition?.quiz?.overlay||atlas.quiz)return atlas.quiz;
 const sidebar=[...document.querySelectorAll('.workspace > aside.sidebar')].find(e=>!e.hidden&&e.querySelector('.panel-tabs')&&e.querySelector('.sidebar-scroll')&&getComputedStyle(e).display!=='none');if(!sidebar)return;
 const key='quiz-overlay-'+country,prefix='quiz-'+country,tab=document.createElement('button');tab.type='button';tab.textContent='Quiz';sidebar.querySelector('.panel-tabs').append(tab);
 let data,warming,quiz,hidden=new Map(),enforcing=false,frame,generation=0;
 const owned=source=>typeof source==='string'&&[country+'-','south-'+country+'-',definition.prefix+'-'].some(prefix=>source.startsWith(prefix));
 function enforce(){if(!quiz?.active||enforcing)return;enforcing=true;try{for(const layer of map.getStyle().layers){if(owned(layer.source)){const visibility=map.getLayoutProperty(layer.id,'visibility')||'visible';if(!hidden.has(layer.id))hidden.set(layer.id,visibility);if(visibility!=='none')map.setLayoutProperty(layer.id,'visibility','none');}}}finally{enforcing=false;}}
 function remove(){for(const id of [key+'-selected',key+'-lines',key+'-fill'])if(map.getLayer(id))map.removeLayer(id);for(const id of [key+'-selection',key+'-borders',key])if(map.getSource(id))map.removeSource(id);}
 const spinner=document.createElement('div');spinner.className='quiz-geography-spinner';spinner.hidden=true;spinner.setAttribute('role','status');spinner.setAttribute('aria-label','Preparing quiz');
 async function warm(){if(data)return;if(warming)return warming;const token=generation;spinner.hidden=false;spinner.innerHTML=AtlasSymbols.markup(country);const job=loadCompressed('data/quiz/'+country+'.bin').then(value=>{if(token!==generation)return;data=value;quiz.setup();}).catch(error=>{if(token===generation){const message=document.createElement('p');message.textContent='Quiz geography could not load. Open the Quiz tab to retry.';message.className='quiz-note';spinner.replaceChildren(message);}throw error;}).finally(()=>{if(warming===job)warming=null;if(token===generation&&data)spinner.hidden=true;});warming=job;return job;}
 quiz=createFirstLevelQuiz(map,host,{country,sidebar,prefix,tab,attachTab:false,overlay:true,records:()=>data?.records||[],ready:()=>!!data&&atlas.ready,
  fillLayers:[key+'-fill'],lineLayer:key+'-lines',mark:(r,state)=>{if(map.getSource(key))map.setFeatureState({source:key,id:r.id},state);},pick:point=>map.getLayer(key+'-fill')?map.queryRenderedFeatures(point,{layers:[key+'-fill']})[0]?.properties.id:null,
  capture:()=>({}),hideLabels:()=>atlas.pauseLabels?.(),async begin(){await warm();remove();map.addSource(key,{type:'geojson',data:data.regions,promoteId:'id',tolerance:0,buffer:128});map.addSource(key+'-borders',{type:'geojson',data:data.boundaries,tolerance:0});map.addSource(key+'-selection',{type:'geojson',data:empty(),tolerance:0});map.addLayer({id:key+'-fill',type:'fill',source:key,paint:{'fill-color':'#e9e5dc','fill-opacity':1,'fill-antialias':true}});map.addLayer({id:key+'-lines',type:'line',source:key+'-borders',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':definition.map?.line||'#8f8675','line-width':.8}});map.addLayer({id:key+'-selected',type:'line',source:key+'-selection',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#926b16','line-width':1.4}});},
  onActiveChange(){document.getElementById('map-shell').dataset.quizOverlay=String(quiz.active);if(quiz.active)enforce();else{for(const [id,visibility]of hidden)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',visibility);hidden.clear();}},
  review(r,state={}){if(map.getSource(key+'-selection'))map.getSource(key+'-selection').setData(r?selectionLineData({type:'FeatureCollection',features:data.regions.features.filter(f=>f.properties.id===r.id)}):empty());if(map.getLayer(key+'-selected'))map.setPaintProperty(key+'-selected','line-color',state.wrong?'#b44737':state.target?'#926b16':'#548165');},
  restore(){remove();atlas.sync?.();atlas.updateLabels?.();}
 });
 quiz.panel.querySelector('[data-q=setup]').append(spinner);
 const originalOpen=quiz.open;quiz.open=options=>{originalOpen(options);void warm().catch(()=>{});};tab.onclick=()=>quiz.open();
 map.on('styledata',()=>{if(!quiz.active||frame)return;frame=requestAnimationFrame(()=>{frame=null;enforce();});});
 const leave=atlas.leave?.bind(atlas),unload=atlas.unload?.bind(atlas),home=atlas.home?.bind(atlas);
 function release(){generation++;remove();data=undefined;warming=null;spinner.hidden=true;}
 if(leave)atlas.leave=(...args)=>{release();return leave(...args);};if(unload)atlas.unload=(...args)=>{release();return unload(...args);};if(home)atlas.home=(...args)=>quiz.active?quiz.end():home(...args);
 quiz.setCountryActive=value=>{tab.hidden=!value;if(!value)quiz.panel.hidden=true;};atlas.quiz=quiz;return quiz;
}
