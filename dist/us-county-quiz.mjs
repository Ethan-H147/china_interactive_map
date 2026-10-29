import {createFirstLevelQuiz} from './first-level-quiz.mjs';
import {createQuizMapSession} from './map-quiz.mjs';
import {createCityQuiz} from './city-quiz.mjs';
import {createUsMiscQuiz} from './us-misc-quiz.mjs';
export function attachUsCountyQuiz(map,host,atlas){
 if(atlas.countyQuiz)return atlas.countyQuiz;
 const country='united-states',definition=AtlasCountries.countries[country],sidebar=document.getElementById(country+'-sidebar');if(!sidebar)return;
 const tab=document.getElementById('us-tab-quiz');if(!tab||!atlas.quiz)return;tab.textContent='Quiz';
 const openStates=atlas.quiz.open.bind(atlas.quiz),pickers=[];let level='1',navigation=0;
 const selectLevel=value=>{level=value;for(const picker of pickers)picker.value=value;};
 function addPicker(panel,value){const label=document.createElement('label');label.className='field-label';label.textContent='Category';const picker=document.createElement('select');picker.id=panel.id+'-divisions';picker.dataset.usQuizLevel='';label.htmlFor=picker.id;picker.append(new Option('States','1'),new Option('Counties & equivalents','2'),...(definition.quiz.cities?[new Option('Cities','3')]:[]),new Option('Miscellaneous','4'));picker.value=value;label.append(picker);panel.querySelector('[data-q=scope-label]').after(label);pickers.push(picker);picker.onchange=()=>{if(picker.value==='4')void controller.open({level:4});else if(picker.value==='3')void controller.open({level:3});else if(picker.value==='2')void controller.open();else atlas.quiz.open();};}
 const hidePanels=except=>{for(const q of [quiz,cities])if(q&&q!==except&&!q.active)q.panel.hidden=true;if(misc&&misc!==except)misc.hide();};
 atlas.quiz.open=(options={})=>{navigation++;selectLevel('1');hidePanels();openStates(options);};addPicker(atlas.quiz.panel,'1');
 // With a state (or one of its counties) selected, the Quiz tab opens that state's county quiz.
 const route=async()=>{const state=!controller.active&&!atlas.quiz.active&&atlas.getSelectionRoot?.();if(state){try{await prepare();}catch{}if(index?.scopes.some(s=>s.id===state)){void controller.open({scope:state});return;}} if(level==='4')void controller.open({level:4});else if(level==='3')void controller.open({level:3});else if(level==='2')void controller.open();else atlas.quiz.open();};
 let quiz,cities,misc,index,indexJob,countryActive=true;
 const native=atlas.quizMap.forLevel(2,()=>quiz?.scope),session=createQuizMapSession(map,atlas,country,native);
 async function prepare(){
  if(index)return;if(!indexJob){tab.setAttribute('aria-busy','true');indexJob=fetch(definition.quiz.counties.index).then(r=>{if(!r.ok)throw Error('County list unavailable');return r.json();}).then(value=>{index=value;}).finally(()=>{indexJob=undefined;tab.removeAttribute('aria-busy');});}await indexJob;
 }
 function mount(){
  if(quiz)return;
  quiz=createFirstLevelQuiz(map,host,{country,sidebar,prefix:'us-counties',tab,returnPanelId:'us-counties-quiz-panel',config:{level:2,plural:'Counties & equivalents',singular:'county or equivalent',scopeLabel:'State',scopes:index.scopes},storageKey:scope=>'united-states-counties:'+scope,
   records:native.records,ready:()=>atlas.ready,
   fillLayers:session.fills,lineLayer:()=>session.lines()[0],mark:session.mark,pick:session.pick,capture:session.capture,hideLabels:()=>atlas.pauseLabels?.(),
   begin:session.begin,onActiveChange:()=>session.setActive(quiz.active),review:session.review,restore:session.restore
  });
  addPicker(quiz.panel,'2');tab.onclick=route;
 }
 // Cities (level 3) share this tab, picker and controller with counties.
 const openCities=options=>{navigation++;selectLevel('3');cities??=createCityQuiz(map,host,atlas,{country,sidebar,tab,prefix:'us-cities',addPicker});if(!cities||!countryActive||!atlas.ready)return;hidePanels(cities);cities.open(options);};
 const openMisc=options=>{navigation++;selectLevel('4');misc??=createUsMiscQuiz(map,host,atlas,{sidebar,tab,addPicker});if(!countryActive||!atlas.ready)return;hidePanels(misc);misc.open(options);};
 const controller={get active(){return !!quiz?.active||!!cities?.active||!!misc?.active;},get panel(){return misc?.active||level==='4'?misc?.panel:cities?.active?cities.panel:quiz?.panel;},get scope(){return misc?.active||level==='4'?misc?.scope:cities?.active?cities.scope:quiz?.scope;},async open(options={}){if(options.level===4)return openMisc(options);if(options.level===3)return openCities(options);const request=++navigation;selectLevel('2');try{await prepare();if(request!==navigation||!countryActive||!atlas.ready)return;mount();hidePanels(quiz);quiz.open(options);tab.title='';}catch{if(request===navigation){selectLevel('1');openStates();tab.title='County list could not load. Select Counties again to retry.';}}},end:()=>misc?.active?misc.end():cities?.active?cities.end():quiz?.end(),fit:()=>misc?.active?misc.fit():cities?.active?cities.fit():quiz?.fit(),setCountryActive(value){countryActive=value;if(!value)navigation++;tab.hidden=!value;if(!value)misc?.hide();if(!value)for(const q of [quiz,cities])if(q)q.panel.hidden=true;}};
 tab.onclick=route;sidebar.querySelector('.panel-tabs').addEventListener('click',event=>{const button=event.target.closest('button');if(button&&button!==tab)navigation++;});
 const home=atlas.home.bind(atlas),leave=atlas.leave?.bind(atlas),unload=atlas.unload?.bind(atlas);atlas.home=(...args)=>controller.active?controller.end():home(...args);if(leave)atlas.leave=(...args)=>{cities?.release();misc?.release();return leave(...args);};if(unload)atlas.unload=(...args)=>{cities?.release();misc?.release();return unload(...args);};
 atlas.countyQuiz=controller;return controller;
}
