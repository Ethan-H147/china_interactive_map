import {quizRecords} from './quiz-records.mjs';
import {quizTime,quizModeLabels} from './quiz-records-core.mjs';
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const fold=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
const icons={find:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',name:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 9h.01M11 9h.01M15 9h.01M7 12h.01M11 12h.01M15 12h.01M8 15h8"/>',identify:'<path d="m12 3 8 5v8l-8 5-8-5V8zM12 8v5m0 3h.01"/>'};
const descriptions={find:'Find each named place on the map.',name:'Name as many places as you can.',identify:'Name the place highlighted on the map.'};
export function mountQuizDashboard(container,{play}){
 container.className='quiz-dashboard';
 container.innerHTML=`<div class="quiz-dashboard-heading"><h3>Your quiz record</h3><span data-record-status role="status"></span></div><div class="quiz-stat-grid" aria-label="Quiz totals"></div>
 <nav class="quiz-view-tabs" aria-label="Quiz dashboard"><button type="button" data-quiz-view="countries" aria-pressed="true">Countries</button><button type="button" data-quiz-view="history" aria-pressed="false">Recent rounds<span data-history-count hidden></span></button></nav>
 <section data-country-library aria-labelledby="quiz-library-title"><div class="quiz-library-heading"><h3 id="quiz-library-title">Choose a country</h3><span data-country-count></span></div><div class="quiz-country-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><label class="sr-only" for="quiz-country-search">Search countries</label><input id="quiz-country-search" type="search" placeholder="Search countries" autocomplete="off" spellcheck="false"><button type="button" data-clear-country aria-label="Clear country search" hidden>×</button></div><div class="quiz-country-grid" aria-label="Country quizzes"></div><p class="quiz-country-empty" role="status" hidden>No countries found. Try another name.</p></section>
 <section class="quiz-country-detail" data-country-detail hidden aria-labelledby="quiz-country-title"><button type="button" class="quiz-country-back" data-country-back><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>All countries</button><header class="quiz-country-hero"><div data-country-flag></div><div><span class="quiz-detail-eyebrow">Country quiz</span><h3 id="quiz-country-title" tabindex="-1"></h3><p data-quiz-divisions></p></div></header><div class="quiz-launch-fields"><label data-level-label hidden>Divisions<select data-quiz-level><option value="1">Provincial divisions</option><option value="2">Prefectures</option></select></label><label data-scope-label hidden>Scope<select data-quiz-scope></select></label></div><fieldset class="quiz-mode-fieldset"><legend>How would you like to play?</legend><div class="quiz-mode-grid"></div></fieldset><div class="quiz-personal-best"></div><button type="button" class="account-primary" data-play-quiz>Open quiz</button><p class="quiz-record-note">Fastest times are for perfect full rounds without hints or revealed answers.</p></section>
 <section class="quiz-history" data-country-history hidden aria-labelledby="quiz-history-title"><div class="quiz-dashboard-heading"><h3 id="quiz-history-title">Recent rounds</h3><select data-history-filter aria-label="Filter quiz history"><option value="all">All countries</option><option value="selected">Selected country</option></select></div><div data-quiz-history></div><button class="account-secondary quiz-history-more" type="button" data-history-more hidden>Show more</button></section>`;
 const $=s=>container.querySelector(s),level=$('[data-quiz-level]'),scopePicker=$('[data-quiz-scope]'),historyFilter=$('[data-history-filter]'),search=$('#quiz-country-search');
 const definitions=globalThis.AtlasCountries.countries,available=Object.values(definitions).filter(c=>c.quiz&&!c.snapshot).sort((a,b)=>a.en.localeCompare(b.en));
 let country=available.find(c=>c.id===globalThis.AtlasEntry?.current)?.id||available[0]?.id||'',mode='name',view='countries',detail=false,user=null,loadingMore=false,prefectureScopes=null,countyScopes=null,scopeSignature='',libraryLoading=false,libraryScroll=0;
 const cards=new Map(),modeControls=new Map();
 function flags(definition,cls='quiz-country-flags',eager=false){
  const holder=make('span',undefined,cls);holder.setAttribute('aria-hidden','true');
  for(const file of definition.quiz.flags){const img=make('img');img.src=file;img.alt='';img.loading=eager?'eager':'lazy';img.decoding='async';holder.append(img);}
  if(definition.quiz.flags.length>1)holder.classList.add('quiz-flags-pair');return holder;
 }
 function top(){const dialog=container.closest('dialog');if(dialog)dialog.scrollTop=0;}
 function openCountry(id){if(!definitions[id]?.quiz)return;libraryScroll=container.closest('dialog')?.scrollTop||0;country=id;level.replaceChildren(...(id==='china'?[new Option('Provincial divisions','1'),new Option('Prefectures','2')]:definitions[id].quiz.counties?[new Option('States & territories','1'),new Option('Counties & equivalents','2')]:[new Option(definitions[id].quiz.plural,'1')]));level.value='1';scopeSignature='';detail=true;view='countries';render();top();$('#quiz-country-title').focus({preventScroll:true});}
 for(const definition of available){
  const card=make('button',undefined,'quiz-country-card');card.type='button';card.dataset.quizCard=definition.id;card.setAttribute('aria-label',definition.en+' quizzes');card.style.setProperty('--quiz-country-tint',definition.background);
  const art=make('span',undefined,'quiz-card-art');art.append(flags(definition));
  const body=make('span',undefined,'quiz-card-body'),name=make('strong',definition.en),caption=make('span',definition.id==='china'?'Provinces · Prefectures':definition.quiz.counties?'States · Counties':definition.quiz.plural,'quiz-card-divisions'),foot=make('span',undefined,'quiz-card-foot'),played=make('span',undefined,'quiz-card-played');foot.append(played);body.append(name,caption,foot);card.append(art,body);card.onclick=()=>openCountry(definition.id);$('.quiz-country-grid').append(card);cards.set(definition.id,{card,played,query:fold(definition.en+' '+definition.local+' '+definition.prefix)});
 }
 for(const [id,label]of Object.entries(quizModeLabels)){
  const choice=make('label',undefined,'quiz-mode-choice'),radio=make('input');radio.type='radio';radio.name='account-quiz-mode';radio.value=id;radio.dataset.quizMode=id;
  const surface=make('span',undefined,'quiz-mode-surface'),icon=make('span',undefined,'quiz-mode-icon');icon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[id]+'</svg>';surface.append(icon,make('strong',label),make('span',descriptions[id],'quiz-mode-description'));choice.append(radio,surface);radio.onchange=()=>{if(radio.checked){mode=id;render();}};$('.quiz-mode-grid').append(choice);modeControls.set(id,radio);
 }
 function render(){
  const data=quizRecords.data,s=data.summary,definition=definitions[country],division=(country==='china'||definition?.quiz?.counties)?Number(level.value):definition?.quiz?.level||1;
  container.dataset.countryOpen=String(view==='countries'&&detail);
  $('[data-country-library]').hidden=view!=='countries'||detail;$('[data-country-detail]').hidden=view!=='countries'||!detail;$('[data-country-history]').hidden=view!=='history';
  for(const tab of container.querySelectorAll('[data-quiz-view]'))tab.setAttribute('aria-pressed',String(tab.dataset.quizView===view));
  const count=$('[data-history-count]');count.hidden=!s.rounds;count.textContent=String(s.rounds);
  const query=fold(search.value),rounds=new Map();for(const best of data.bests)rounds.set(best.country,(rounds.get(best.country)||0)+best.rounds);
  let shown=0;for(const [id,{card,played,query:terms}]of cards){card.hidden=!terms.includes(query);if(!card.hidden)shown++;const n=rounds.get(id)||0;played.textContent=n?n+' '+(n===1?'round played':'rounds played'):'';played.parentElement.hidden=!n;played.classList.toggle('has-rounds',n>0);}
  $('[data-country-count]').textContent=shown+' '+(shown===1?'country':'countries');$('.quiz-country-empty').hidden=shown>0;$('[data-clear-country]').hidden=!search.value;
  const grid=$('.quiz-stat-grid');grid.replaceChildren();for(const [label,value]of [['Rounds',s.rounds],['Accuracy',s.total?Math.round(s.correct/s.total*100)+'%':'—'],['Perfect rounds',s.perfect],['Countries',s.countries]]){const card=make('div',undefined,'quiz-stat');card.append(make('strong',String(value)),make('span',label));grid.append(card);}
  const status=$('[data-record-status]');status.textContent=!user?'Saved on this device':({synced:'Synced to your account',saving:'Syncing…',offline:'Saved on this device · sync will retry',signin:'Sign in again to sync',storage:'Device storage is full'})[quizRecords.status]||'Syncing…';status.dataset.state=quizRecords.status;
  if(detail){
   const hero=$('.quiz-country-hero');hero.style.setProperty('--quiz-country-tint',definition.background);
   if(hero.dataset.country!==country){$('[data-country-flag]').replaceChildren(flags(definition,'quiz-country-flags',true));hero.dataset.country=country;}
   $('#quiz-country-title').textContent=definition.en;$('[data-quiz-divisions]').textContent=division===2?(definition.quiz.counties?'Counties & equivalents':'Prefectures'):definition.quiz.plural;
   $('[data-level-label]').hidden=country!=='china'&&!definition.quiz.counties;let scopes=definition.quiz.scopes||[];
   if((country==='china'||definition.quiz.counties)&&division===2){
    if(!libraryLoading&&prefectureScopes===null){libraryLoading=true;fetch('data/quiz/library.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{prefectureScopes=data.prefectureScopes||[];countyScopes=data.usCountyScopes||[];render();}).catch(()=>{prefectureScopes=[];countyScopes=[];render();});}
    const known=data.bests.filter(a=>a.country==='china'&&a.level===2&&a.scope).map(a=>({id:a.scope,label:a.scopeLabel||a.scope}));
    scopes=definition.quiz.counties?(countyScopes||[]):[...(mode==='name'?[]:[{id:'',label:'All China'}]),...new Map([...(prefectureScopes||[]),...known].map(s=>[s.id,s])).values()];
   }
   const signature=country+':'+division+':'+scopes.map(s=>s.id).join(',');
   if(signature!==scopeSignature){const previous=scopeSignature.startsWith(country+':'+division+':')?scopePicker.value:null;scopePicker.replaceChildren(...scopes.map(s=>new Option(s.label,s.id)));if(previous!==null&&scopes.some(s=>s.id===previous))scopePicker.value=previous;scopeSignature=signature;}
   $('[data-scope-label]').firstChild.textContent=definition.quiz.counties?'State':'Scope';$('[data-scope-label]').hidden=!scopes.length;scopePicker.disabled=!scopes.length;for(const [id,radio]of modeControls)radio.checked=id===mode;
   $('[data-play-quiz]').disabled=division===2&&(!!definition.quiz.counties||country==='china'&&mode==='name')&&!scopes.length;
   const best=data.bests.filter(a=>a.country===country&&a.level===division&&a.mode===mode&&a.fullRound&&(a.scope||'')===(scopePicker.value||'')).sort((a,b)=>(b.lastPlayed||b.finishedAt||'').localeCompare(a.lastPlayed||a.finishedAt||''))[0],personal=$('.quiz-personal-best');personal.replaceChildren();
   for(const [label,value]of [['Best score',best?best.bestCorrect+' / '+best.total:'—'],['Fastest perfect',best?.fastestMs!==null&&best?.fastestMs!==undefined?quizTime(best.fastestMs):'—']]){const e=make('div');e.append(make('span',label),make('strong',value));personal.append(e);}
  }
  const history=$('[data-quiz-history]'),recent=data.recent.filter(a=>historyFilter.value==='all'||a.country===country);history.replaceChildren();if(!recent.length)history.append(make('p',user?'Your completed rounds will appear here.':'Sign in to keep quiz records across devices.','quiz-record-empty'));
  for(const a of recent){
   const row=make('div',undefined,'quiz-history-row'),place=make('div',undefined,'quiz-history-place'),title=make('div',undefined,'quiz-history-title'),def=definitions[a.country];if(def?.quiz)place.append(flags(def,'quiz-history-flag'));
   title.append(make('strong',def?.en||a.country),make('span',[a.level===2?(a.country==='china'?'Prefectures':def?.quiz?.counties?'Counties & equivalents':def?.quiz?.plural||'Subdivisions'):def?.quiz?.plural||def?.levelNames?.[0],quizModeLabels[a.mode],a.scopeLabel||'',a.fullRound?'All places':a.total+' questions'].filter(Boolean).join(' · ')));place.append(title);
   const result=make('div',undefined,'quiz-history-result');result.append(make('strong',a.correct+' / '+a.total),make('span',quizTime(a.elapsedMs)+(a.hints?' · '+a.hints+' hints':'')+(a.reveals?' · answers shown':'')));const date=make('time',new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(new Date(a.finishedAt)));date.dateTime=a.finishedAt;date.title=new Date(a.finishedAt).toLocaleString();row.append(place,result,date);history.append(row);
  }
  $('[data-history-more]').hidden=!user||!data.nextCursor;$('[data-history-more]').disabled=loadingMore;
 }
 for(const tab of container.querySelectorAll('[data-quiz-view]'))tab.onclick=()=>{view=tab.dataset.quizView;render();top();};
 $('[data-country-back]').onclick=()=>{detail=false;render();const dialog=container.closest('dialog');if(dialog)dialog.scrollTop=libraryScroll;cards.get(country)?.card.focus({preventScroll:true});};
 search.oninput=render;$('[data-clear-country]').onclick=()=>{search.value='';render();search.focus();};level.onchange=scopePicker.onchange=historyFilter.onchange=render;
 $('[data-play-quiz]').onclick=()=>play({country,level:(country==='china'||definitions[country].quiz.counties)?Number(level.value):definitions[country].quiz.level||1,mode,scope:scopePicker.value||''});
 $('[data-history-more]').onclick=async()=>{loadingMore=true;render();try{await quizRecords.more();}finally{loadingMore=false;render();}};
 quizRecords.subscribe(render);render();
 return{setUser(id){if(user!==id){view='countries';detail=false;search.value='';}user=id;quizRecords.connect(id);render();},refresh(){render();void quizRecords.retry();},focus(){(view==='history'?historyFilter:detail?$('[data-country-back]'):search).focus({preventScroll:true});}};
}
