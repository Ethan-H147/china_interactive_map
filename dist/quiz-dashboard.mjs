import {savedDashboardQuizzes} from './quiz-drafts.mjs';
import {chinaMiscQuizzes} from './china-misc-definitions.mjs';
import {usMiscQuizzes} from './us-misc-definitions.mjs';
import {usSportsQuizForScope} from './us-sports-definitions.mjs';
import {mountQuizTrophies} from './quiz-trophies.mjs';
import {mountMedalCabinet} from './medal-cabinet.mjs';
import {collectiblesRevealed} from './settings.mjs';
import {quizRecords} from './quiz-records.mjs';
import {quizTime,quizModeLabels} from './quiz-records-core.mjs';
import {medalMarkup,highestMedal,perfectLevels,lockedMedalMarkup} from './quiz-medals.mjs';
import {usMiscMedalIds,usMiscMedalMarkup} from './us-misc-medals.mjs';
import {chinaMiscMedalIds,chinaMiscMedalMarkup} from './china-misc-medals.mjs';
import {footballMedalCountries,footballMedalMarkup,footballMedalName} from './football-medals.mjs';
const miscMedals={'united-states':[usMiscMedalIds,usMiscMedalMarkup],china:[chinaMiscMedalIds,chinaMiscMedalMarkup]};
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const fold=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
const icons={find:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',name:'<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="7" cy="9" r=".7" fill="currentColor" stroke="none"/><circle cx="12" cy="9" r=".7" fill="currentColor" stroke="none"/><circle cx="17" cy="9" r=".7" fill="currentColor" stroke="none"/><circle cx="7" cy="12" r=".7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r=".7" fill="currentColor" stroke="none"/><circle cx="17" cy="12" r=".7" fill="currentColor" stroke="none"/><path d="M8 15h8"/>',identify:'<path d="M3 5h13l5 7-5 7H3z"/><circle cx="17" cy="12" r="1"/>'};
export function mountQuizDashboard(container,{play}){
 container.className='quiz-dashboard';
 container.innerHTML=`<div class="quiz-dashboard-heading"><h3>Your quiz record</h3><span data-record-status role="status"></span></div><div class="quiz-stat-grid" aria-label="Quiz totals"></div>
 <nav class="quiz-view-tabs" aria-label="Quiz dashboard"><button type="button" data-quiz-view="countries" aria-pressed="true">Countries</button><button type="button" data-quiz-view="history" aria-pressed="false">Recent rounds<span data-history-count hidden></span></button><button type="button" data-quiz-view="collection" aria-pressed="false">Collection<span data-collection-count hidden></span></button></nav>
 <section data-quiz-resumes hidden aria-labelledby="quiz-resumes-title"><h3 id="quiz-resumes-title">Continue your quiz</h3><div class="quiz-resume-list"></div></section>
 <section data-country-library aria-labelledby="quiz-library-title"><div class="quiz-library-heading"><h3 id="quiz-library-title">Choose a country</h3><span data-country-count></span></div><div class="quiz-country-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><label class="sr-only" for="quiz-country-search">Search countries</label><input id="quiz-country-search" type="search" placeholder="Search countries" autocomplete="off" spellcheck="false"><button type="button" data-clear-country aria-label="Clear country search" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><p class="quiz-pin-status" data-pin-status role="status" hidden></p><div class="quiz-country-grid" aria-label="Country quizzes"></div><p class="quiz-country-empty" role="status" hidden>No countries found. Try another name.</p></section>
 <section class="quiz-country-detail" data-country-detail hidden aria-labelledby="quiz-country-title"><button type="button" class="quiz-country-back" data-country-back><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>All countries</button><header class="quiz-country-hero"><div data-country-flag></div><div><h3 id="quiz-country-title" tabindex="-1"></h3><p data-quiz-divisions></p></div><button type="button" class="quiz-header-pin" data-pin-country aria-label="Pin country" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3 6 0-1 6 4 4v2H6v-2l4-4zM12 15v6"/></svg></button></header><div class="quiz-launch-fields"><label data-level-label hidden>Category<select data-quiz-level><option value="1">Provincial divisions</option><option value="2">Prefectures</option></select></label><label data-scope-label hidden>Scope<select data-quiz-scope></select></label><label data-football-difficulty-label hidden>Difficulty<select data-football-difficulty></select></label></div><fieldset class="quiz-mode-fieldset"><legend>How would you like to play?</legend><div class="quiz-mode-row"><div class="quiz-mode-grid"></div><div class="quiz-mode-medal" data-mode-medal hidden></div></div></fieldset><div class="quiz-personal-best"></div><button type="button" class="account-primary" data-play-quiz>Open quiz</button><p class="quiz-record-note">Fastest times are for perfect full rounds without hints or revealed answers.</p><section class="quiz-state-progress" data-state-progress hidden aria-labelledby="quiz-state-title"><div class="quiz-state-heading"><h4 id="quiz-state-title">States</h4><span data-state-count></span><div class="quiz-state-legend"></div></div><div class="quiz-state-grid"></div></section></section>
 <section class="quiz-history" data-country-history hidden aria-labelledby="quiz-history-title"><div class="quiz-dashboard-heading"><h3 id="quiz-history-title">Recent rounds</h3><select data-history-filter aria-label="Filter quiz history"><option value="all">All countries</option><option value="selected">Selected country</option></select></div><p class="quiz-record-note">The latest 1,000 rounds are kept here. Lifetime totals, personal bests and medals are preserved.</p><div data-quiz-history></div><button class="account-secondary quiz-history-more" type="button" data-history-more hidden>Show more</button></section><nav class="quiz-collection-tabs" data-collection-tabs hidden aria-label="Collection"><button type="button" data-collection-tab="medals" aria-pressed="true">Medals</button><button type="button" data-collection-tab="trinkets" aria-pressed="false">Trinkets</button></nav><section data-medal-cabinet hidden></section><section data-quiz-collection hidden></section>`;
 const $=s=>container.querySelector(s),level=$('[data-quiz-level]'),scopePicker=$('[data-quiz-scope]'),footballDifficulty=$('[data-football-difficulty]'),historyFilter=$('[data-history-filter]'),search=$('#quiz-country-search');
 const definitions=globalThis.AtlasCountries.countries,available=Object.values(definitions).filter(c=>c.quiz&&!c.snapshot).sort((a,b)=>a.en.localeCompare(b.en));
 let country=available.find(c=>c.id===globalThis.AtlasEntry?.current)?.id||available[0]?.id||'',mode='name',view='countries',shelf='medals',detail=false,user=null,loadingMore=false,prefectureScopes=null,countyScopes=null,scopeSignature='',libraryLoading=false,libraryScroll=0;
 const collection=mountQuizTrophies($('[data-quiz-collection]'),{snapshot:()=>quizRecords.data,play,revealed:collectiblesRevealed}),cabinet=mountMedalCabinet($('[data-medal-cabinet]'),{snapshot:()=>quizRecords.data,definitions,revealed:collectiblesRevealed});
 const cards=new Map(),modeControls=new Map();
 const pinsKey=()=> 'boundary-atlas-quiz-pins-v1:'+(user||'guest');
 function readPins(){try{const value=JSON.parse(localStorage.getItem(pinsKey()));return Array.isArray(value)?[...new Set(value.filter(id=>available.some(c=>c.id===id)))].slice(0,5):[];}catch{return [];}}
 let pins=readPins(),pinsStored=true;
 function togglePin(id){if(pins.includes(id))pins=pins.filter(p=>p!==id);else if(pins.length<5)pins=[...pins,id];else return;
  try{localStorage.setItem(pinsKey(),JSON.stringify(pins));pinsStored=true;}catch{pinsStored=false;}render();$('[data-pin-country]').focus({preventScroll:true});
 }
 function flags(definition,cls='quiz-country-flags',eager=false){
  const holder=make('span',undefined,cls);holder.setAttribute('aria-hidden','true');
  for(const file of definition.quiz.flags){const img=make('img');img.src=file;img.alt='';img.loading=eager?'eager':'lazy';img.decoding='async';holder.append(img);}
  if(definition.quiz.flags.length>1)holder.classList.add('quiz-flags-pair');return holder;
 }
 function top(){const dialog=container.closest('dialog');if(dialog)dialog.scrollTop=0;}
 // Countries with more than one quiz level choose it here; city quizzes are level 3.
 const hasLevels=id=>id==='china'||!!definitions[id]?.quiz?.counties||!!definitions[id]?.quiz?.cities||!!definitions[id]?.quiz?.football;
 function openCountry(id){if(!definitions[id]?.quiz)return;libraryScroll=container.closest('dialog')?.scrollTop||0;country=id;const q=definitions[id].quiz,cities=[...(q.cities?[new Option(q.cities.plural,'3')]:[]),...((q.football||['united-states','china'].includes(id))?[new Option('Miscellaneous','4')]:[])];level.replaceChildren(...(id==='china'?[new Option('Provincial divisions','1'),new Option('Prefectures','2'),...cities]:q.counties?[new Option('States','1'),new Option('Counties & equivalents','2'),...cities]:[new Option(q.plural,'1'),...cities]));level.value='1';scopeSignature='';detail=true;view='countries';render();top();$('#quiz-country-title').focus({preventScroll:true});}
 for(const definition of available){
  const card=make('button',undefined,'quiz-country-card');card.type='button';card.dataset.quizCard=definition.id;card.setAttribute('aria-label',definition.en+' quizzes');card.style.setProperty('--quiz-country-tint',definition.background);
  const art=make('span',undefined,'quiz-card-art');art.append(flags(definition));
  const body=make('span',undefined,'quiz-card-body'),name=make('strong',definition.en),caption=make('span',definition.id==='china'?'Provinces, Prefectures & Cities':definition.quiz.counties?'States, Counties & Cities':definition.quiz.cities?definition.quiz.plural+' & Cities':definition.quiz.plural,'quiz-card-divisions');body.append(name,caption);card.append(art,body);card.onclick=()=>openCountry(definition.id);const item=make('div',undefined,'quiz-country-item');item.append(card);$('.quiz-country-grid').append(item);cards.set(definition.id,{card,item,query:fold(definition.en+' '+definition.local+' '+definition.prefix)});
 }
 for(const [id,label]of Object.entries(quizModeLabels)){
  const choice=make('label',undefined,'quiz-mode-choice'),radio=make('input');radio.type='radio';radio.name='account-quiz-mode';radio.value=id;radio.dataset.quizMode=id;
  const surface=make('span',undefined,'quiz-mode-surface'),icon=make('span',undefined,'quiz-mode-icon');icon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[id]+'</svg>';surface.append(icon,make('strong',label));choice.append(radio,surface);radio.onchange=()=>{if(radio.checked){mode=id;render();}};$('.quiz-mode-grid').append(choice);modeControls.set(id,radio);
 }
 for(const [id,label]of Object.entries(quizModeLabels)){const item=make('span'),light=make('i',undefined,'quiz-state-light on');light.dataset.mode=id;item.append(light,label);$('.quiz-state-legend').append(item);}
 // US county and China prefecture quizzes: one card per state or province, each mode's light
 // on once it has a perfect full round there. Provinces have no flags, so they show their short Chinese name.
 let stateCards=null,stateCountry='';
 const shortChinese=name=>name.replace(/(壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市)$/,'');
 function stateProgress(data,scopes,division){
  const section=$('[data-state-progress]');section.hidden=!scopes;if(!scopes)return;
  if(stateCountry!==country){stateCards=null;stateCountry=country;$('.quiz-state-grid').replaceChildren();$('#quiz-state-title').textContent=country==='china'?'Provinces':'States';}
  if(!stateCards){stateCards=new Map();for(const s of scopes){
   const card=make('button',undefined,'quiz-state-card'),lights=make('span',undefined,'quiz-state-lights'),dots={};card.type='button';let art;
   if(country==='china'){art=make('span',shortChinese(s.local||s.label),'quiz-state-glyph');art.lang=s.id==='710000'?'zh-Hant':'zh-Hans';art.setAttribute('aria-hidden','true');}
   else{art=make('img');art.src='vendor/north-america-flags/'+s.id+'.webp';art.alt='';art.loading='lazy';art.decoding='async';}
   for(const id of Object.keys(quizModeLabels)){const dot=make('i',undefined,'quiz-state-light');dot.dataset.mode=id;lights.append(dot);dots[id]=dot;}
   card.append(art,make('span',s.label,'quiz-state-name'),lights);card.onclick=()=>{scopePicker.value=s.id;render();};$('.quiz-state-grid').append(card);stateCards.set(s.id,{card,dots,label:s.label});
  }}
  const perfect=new Set(data.bests.filter(a=>a.country===country&&a.level===division&&a.fullRound&&a.fastestMs!==null&&a.fastestMs!==undefined).map(a=>a.scope+':'+a.mode));let lit=0;
  for(const [id,{card,dots,label}]of stateCards){const done=[];for(const [mode,dot]of Object.entries(dots)){const on=perfect.has(id+':'+mode);dot.classList.toggle('on',on);if(on){done.push(quizModeLabels[mode]);lit++;}}card.setAttribute('aria-pressed',String(scopePicker.value===id));card.title=label+(done.length?' · Perfect: '+done.join(', '):'');card.setAttribute('aria-label',card.title);}
  $('[data-state-count]').textContent=lit+' / '+stateCards.size*Object.keys(quizModeLabels).length;
 }
 function render(){
  const resumes=savedDashboardQuizzes(user);const resumeBox=$('[data-quiz-resumes]');resumeBox.hidden=!resumes.length||view!=='countries'||detail;const resumeList=resumeBox.querySelector('.quiz-resume-list');resumeList.replaceChildren();for(const draft of resumes){const b=make('button',undefined,'quiz-resume-card');b.type='button';const def=definitions[draft.country];if(!def)continue;const category=draft.level===1?def.quiz.plural:draft.level===2?(draft.country==='china'?'Prefectures':def.quiz.counties?'Counties':def.levelNames?.[1]||'Subdivisions'):/^(misc-|football-)/.test(draft.scope||'')?'Miscellaneous':def.quiz.cities?.plural||'Cities';const progress=make('progress');progress.max=draft.total;progress.value=draft.done;progress.setAttribute('aria-label',draft.done+' of '+draft.total+' answered');b.append(make('strong',def.en),make('span',category+' — '+quizModeLabels[draft.mode]+(draft.scopeLabel?' — '+draft.scopeLabel:'')),make('span',draft.done+' / '+draft.total+' answered'),progress);b.onclick=()=>play(draft);resumeList.append(b);}
  const data=quizRecords.data,s=data.summary,definition=definitions[country],division=hasLevels(country)?Number(level.value):definition?.quiz?.level||1;
  container.dataset.countryOpen=String(view==='countries'&&detail);
  $('[data-country-library]').hidden=view!=='countries'||detail;$('[data-country-detail]').hidden=view!=='countries'||!detail;$('[data-country-history]').hidden=view!=='history';// Collection: Medals (the cabinet) first, then Trinkets (the 3D collectibles).
  const trinkets=view==='collection'&&shelf==='trinkets';$('[data-collection-tabs]').hidden=view!=='collection';for(const tab of container.querySelectorAll('[data-collection-tab]'))tab.setAttribute('aria-pressed',String(tab.dataset.collectionTab===shelf));
  $('[data-medal-cabinet]').hidden=view!=='collection'||trinkets;if(view==='collection'&&!trinkets)cabinet.refresh();$('[data-quiz-collection]').hidden=!trinkets;collection.refresh();collection.setActive(trinkets);$('[data-collection-count]').hidden=!collection.count;$('[data-collection-count]').textContent=String(collection.count);
  for(const tab of container.querySelectorAll('[data-quiz-view]'))tab.setAttribute('aria-pressed',String(tab.dataset.quizView===view));
  const count=$('[data-history-count]');count.hidden=!s.rounds;count.textContent=String(Math.min(s.rounds,1000));
  const query=fold(search.value);
  let shown=0;for(const {item,query:terms}of cards.values()){item.hidden=!terms.includes(query);if(!item.hidden)shown++;}
  const ordered=[...pins,...available.map(c=>c.id).filter(id=>!pins.includes(id))],countryGrid=$('.quiz-country-grid');
  ordered.forEach((id,i)=>{const item=cards.get(id).item;if(countryGrid.children[i]!==item)countryGrid.insertBefore(item,countryGrid.children[i]||null);});
  const pinStatus=$('[data-pin-status]');pinStatus.hidden=!pins.length&&pinsStored;pinStatus.textContent=pinsStored?pins.length+' / 5 pinned'+(pins.length===5?' — unpin a country to pin another.':''):'Pins apply to this tab; device storage is unavailable.';
  $('[data-country-count]').textContent=shown+' '+(shown===1?'country':'countries');$('.quiz-country-empty').hidden=shown>0;$('[data-clear-country]').hidden=!search.value;
  const grid=$('.quiz-stat-grid');grid.replaceChildren();for(const [label,value]of [['Rounds',s.rounds],['Accuracy',s.total?Math.round(s.correct/s.total*100)+'%':'—'],['Perfect rounds',s.perfect],['Countries',s.countries]]){const card=make('div',undefined,'quiz-stat');card.append(make('strong',String(value)),make('span',label));grid.append(card);}
  const status=$('[data-record-status]');status.textContent=!user?'Saved on this device':({synced:'Synced to your account',saving:'Syncing…',offline:'Saved on this device · sync will retry',signin:'Sign in again to sync',storage:'Device storage is full'})[quizRecords.status]||'Syncing…';status.dataset.state=quizRecords.status;if(quizRecords.status==='offline'&&quizRecords.error)status.textContent+=' · '+quizRecords.error;
  if(detail){
   const pin=$('[data-pin-country]'),pinned=pins.includes(country);pin.dataset.pinCountry=country;pin.setAttribute('aria-pressed',String(pinned));pin.setAttribute('aria-label',(pinned?'Unpin ':'Pin ')+definition.en);pin.disabled=!pinned&&pins.length>=5;pin.title=pin.disabled?'Unpin a country first (5 maximum)':(pinned?'Unpin ':'Pin ')+definition.en;
   const hero=$('.quiz-country-hero');hero.style.setProperty('--quiz-country-tint',definition.background);
   if(hero.dataset.country!==country){$('[data-country-flag]').replaceChildren(flags(definition,'quiz-country-flags',true));hero.dataset.country=country;}
   $('#quiz-country-title').textContent=definition.en;$('[data-quiz-divisions]').textContent=division===4?'Miscellaneous':division===3?definition.quiz.cities.plural:division===2?(definition.quiz.counties?'Counties & equivalents':'Prefectures'):definition.quiz.plural;
   $('[data-level-label]').hidden=!hasLevels(country);let scopes=definition.quiz.scopes||[];
   if((country==='china'||definition.quiz.counties)&&division===2){
    if(!libraryLoading&&prefectureScopes===null){libraryLoading=true;fetch('data/quiz/library.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{prefectureScopes=data.prefectureScopes||[];countyScopes=data.usCountyScopes||[];render();}).catch(()=>{prefectureScopes=[];countyScopes=[];render();});}
    const known=data.bests.filter(a=>a.country==='china'&&a.level===2&&a.scope).map(a=>({id:a.scope,label:a.scopeLabel||a.scope}));
    scopes=definition.quiz.counties?(countyScopes||[]):[...(mode==='name'?[]:[{id:'',label:'All China'}]),...(prefectureScopes||[]),...new Map(known.filter(s=>!(prefectureScopes||[]).some(p=>p.id===s.id)).map(s=>[s.id,s])).values()];
   }
   if(division===3&&definition.quiz.cities)scopes=definition.quiz.cities.levels;
   const football=division===4&&!!definition.quiz.football;
   if(division===4)scopes=football?[{id:'football',label:'Football clubs'}]:country==='china'?chinaMiscQuizzes:usMiscQuizzes;
   const signature=country+':'+division+':'+scopes.map(s=>s.id).join(',');
   if(signature!==scopeSignature){const previous=scopeSignature.startsWith(country+':'+division+':')?scopePicker.value:null;scopePicker.replaceChildren(...scopes.map(s=>new Option(s.label,s.id)));if(previous!==null&&scopes.some(s=>s.id===previous))scopePicker.value=previous;scopeSignature=signature;}
   const sport=country==='united-states'&&division===4?usSportsQuizForScope(scopePicker.value):null,extra=football?definition.quiz.football:sport,extraKey=football?country:sport?.id;
   $('[data-football-difficulty-label]').hidden=!extra||extra.levels.length<2;footballDifficulty.disabled=!extra;
   if(extra&&footballDifficulty.dataset.country!==extraKey){footballDifficulty.replaceChildren(...extra.levels.map(l=>new Option(l.label,l.id)));footballDifficulty.dataset.country=extraKey;}
   // Medals beside the modes, separate for each mode: city quizzes show the highest level with a
   // perfect round; football clubs show their league's medal in the highest difficulty's material;
   // US and China Miscellaneous topics show their own medal. A question mark until earned.
   const soccer=extra&&footballMedalCountries.includes(country)&&(football||sport.id==='misc-soccer')?extra.levels:null;
   const cities=division===3&&!!definition.quiz.cities,misc=division===4&&!!miscMedals[country]?.[0].includes(scopePicker.value),showMedal=cities||misc||!!soccer,modeMedal=$('[data-mode-medal]');
   const won=soccer&&highestMedal(data.bests,country,3,soccer,mode),medal=won?{...won,medal:footballMedalName(soccer.indexOf(won)),football:true}:cities?highestMedal(data.bests,country,3,definition.quiz.cities.levels,mode):null,miscEarned=misc&&perfectLevels(data.bests,country,3,mode).has(scopePicker.value),earned=!!medal||miscEarned,topic=misc?scopes.find(s=>s.id===scopePicker.value)?.label:'';
   modeMedal.hidden=!showMedal;$('.quiz-mode-row').classList.toggle('has-medal',showMedal);
   if(showMedal){const key=mode+':'+scopePicker.value+':'+(medal?.id||miscEarned);if(modeMedal.dataset.medal!==key){modeMedal.dataset.medal=key;modeMedal.innerHTML=!earned?lockedMedalMarkup():misc?miscMedals[country][1](scopePicker.value):medal.football?footballMedalMarkup(country,medal.medal):medalMarkup(medal.medal);}modeMedal.setAttribute('role','img');
    modeMedal.setAttribute('aria-label',misc?(earned?topic+' medal earned':'No '+topic+' medal yet'):medal?'Highest level completed: '+medal.label+', '+medal.medal+' medal':'No medal yet');modeMedal.title=misc?(earned?topic+' · perfect round':'Finish a perfect round to earn this medal'):medal?medal.label+' · '+medal.medal:'Complete a level perfectly to earn its medal';}
   $('[data-scope-label]').firstChild.textContent=division===4?'Quiz':division===3?'Difficulty':definition.quiz.counties?'State':'Scope';$('[data-scope-label]').hidden=!scopes.length;scopePicker.disabled=!scopes.length;for(const [id,radio]of modeControls)radio.checked=id===mode;
   $('[data-play-quiz]').disabled=division===2&&(!!definition.quiz.counties||country==='china'&&mode==='name')&&!scopes.length;
   const best=data.bests.filter(a=>a.country===country&&a.level===(division===4?3:division)&&a.mode===mode&&a.fullRound&&(a.scope||'')===((extra?footballDifficulty.value:scopePicker.value)||'')).sort((a,b)=>(b.lastPlayed||b.finishedAt||'').localeCompare(a.lastPlayed||a.finishedAt||''))[0],personal=$('.quiz-personal-best');personal.replaceChildren();
   for(const [label,value]of [['Best score',best?best.bestCorrect+' / '+best.total:'—'],['Fastest perfect',best?.fastestMs!==null&&best?.fastestMs!==undefined?quizTime(best.fastestMs):'—']]){const e=make('div');e.append(make('span',label),make('strong',value));personal.append(e);}
  }
  const progressScopes=!detail||view!=='countries'?null:division===2?(definition?.quiz?.counties?countyScopes:country==='china'?prefectureScopes:null):null;
  stateProgress(data,progressScopes?.length?progressScopes:null,division);
  const history=$('[data-quiz-history]'),recent=data.recent.filter(a=>historyFilter.value==='all'||a.country===country);history.replaceChildren();if(!recent.length)history.append(make('p',user?'Your completed rounds will appear here.':'Sign in to keep quiz records across devices.','quiz-record-empty'));
  for(const a of recent){
   const row=make('div',undefined,'quiz-history-row'),place=make('div',undefined,'quiz-history-place'),title=make('div',undefined,'quiz-history-title'),def=definitions[a.country],sport=a.country==='united-states'&&a.level===3?usSportsQuizForScope(a.scope):null;if(def?.quiz)place.append(flags(def,'quiz-history-flag'));
   title.append(make('strong',def?.en||a.country),make('span',[sport?'Miscellaneous · '+sport.label:a.level===3&&a.scope?.startsWith('football-')?'Miscellaneous · Football clubs':a.level===3&&a.scope?.startsWith('misc-')?'Miscellaneous':a.level===3?def?.quiz?.cities?.plural||'Cities':a.level===2?(a.country==='china'?'Prefectures':def?.quiz?.counties?'Counties & equivalents':def?.quiz?.plural||'Subdivisions'):def?.quiz?.plural||def?.levelNames?.[0],quizModeLabels[a.mode],a.scopeLabel||'',a.fullRound?'All places':a.total+' questions'].filter(Boolean).join(' · ')));place.append(title);
   const result=make('div',undefined,'quiz-history-result');result.append(make('strong',a.correct+' / '+a.total),make('span',quizTime(a.elapsedMs)+(a.hints?' · '+a.hints+' hints':'')+(a.reveals?' · answers shown':'')));const date=make('time',new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(new Date(a.finishedAt)));date.dateTime=a.finishedAt;date.title=new Date(a.finishedAt).toLocaleString();row.append(place,result,date);if(globalThis.AtlasDev?.enabled){const actions=make('div',undefined,'quiz-history-actions'),remove=make('button','Remove round');remove.type='button';remove.dataset.removeRound=a.id;remove.disabled=!quizRecords.canRemove(a.id);remove.title=remove.disabled?'Sync your rounds before removing one.':'Undo this result and recalculate totals and medals';actions.append(remove);remove.onclick=()=>{const text=make('span','Remove this result? Totals, personal bests and medals will be recalculated.'),yes=make('button','Remove round'),cancel=make('button','Cancel');yes.type=cancel.type='button';yes.dataset.confirmRemove=a.id;actions.replaceChildren(text,yes,cancel);cancel.onclick=()=>{actions.replaceChildren(remove);remove.focus();};yes.onclick=async()=>{yes.disabled=cancel.disabled=true;yes.textContent='Removing…';try{await quizRecords.remove(a.id);}catch(error){const message=make('span',error.message);message.setAttribute('role','alert');actions.replaceChildren(message);}};yes.focus();};row.append(actions);}history.append(row);
  }
  $('[data-history-more]').hidden=!user||!data.nextCursor;$('[data-history-more]').disabled=loadingMore;
 }
 for(const tab of container.querySelectorAll('[data-quiz-view]'))tab.onclick=()=>{view=tab.dataset.quizView;render();top();};
 for(const tab of container.querySelectorAll('[data-collection-tab]'))tab.onclick=()=>{shelf=tab.dataset.collectionTab;render();};
 $('[data-pin-country]').onclick=()=>togglePin(country);
 $('[data-country-back]').onclick=()=>{detail=false;render();const dialog=container.closest('dialog');if(dialog)dialog.scrollTop=libraryScroll;cards.get(country)?.card.focus({preventScroll:true});};
 search.oninput=render;$('[data-clear-country]').onclick=()=>{search.value='';render();search.focus();};level.onchange=scopePicker.onchange=footballDifficulty.onchange=historyFilter.onchange=render;
 $('[data-play-quiz]').onclick=()=>play({country,level:hasLevels(country)?Number(level.value):definitions[country].quiz.level||1,mode,scope:(level.value==='4'&&(definitions[country].quiz.football||country==='united-states'&&usSportsQuizForScope(scopePicker.value))?footballDifficulty.value:scopePicker.value)||''});
 $('[data-history-more]').onclick=async()=>{loadingMore=true;render();try{await quizRecords.more();}finally{loadingMore=false;render();}};
 globalThis.addEventListener('storage',event=>{if(event.key===pinsKey()||event.key===null){pins=readPins();render();}});
 globalThis.addEventListener('atlas-quiz-drafts-change',()=>{if(container.checkVisibility())render();});
 globalThis.addEventListener('atlas-developer-change',render);quizRecords.subscribe(render);globalThis.addEventListener('atlas-collectibles-reveal',render);render();
 return{setOwner(name){if(cabinet.setOwner(name)&&view==='collection')render();},setUser(id){if(user!==id){view='countries';shelf='medals';detail=false;search.value='';collection.reset();}user=id;pins=readPins();pinsStored=true;quizRecords.connect(id);render();},refresh(){render();void quizRecords.retry();},focus(){if(view==='collection'){collection.focus();return;}(view==='history'?historyFilter:detail?$('[data-country-back]'):search).focus({preventScroll:true});}};
}
