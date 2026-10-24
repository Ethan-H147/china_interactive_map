import {quizRecords} from './quiz-records.mjs';
import {quizTime,quizModeLabels} from './quiz-records-core.mjs';
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
export function mountQuizDashboard(container,{play}){
 container.className='quiz-dashboard';container.innerHTML=`<div class="quiz-dashboard-heading"><h3>Your quiz record</h3><span data-record-status role="status"></span></div><div class="quiz-stat-grid" aria-label="Quiz totals"></div><section class="quiz-launch"><h3>Choose a quiz</h3><div class="quiz-launch-fields"><label>Country<select data-quiz-country></select></label><label data-level-label hidden>Divisions<select data-quiz-level><option value="1">Provinces & territories</option><option value="2">Prefectures</option></select></label><label data-scope-label hidden>Scope<select data-quiz-scope></select></label><label>Quiz type<select data-quiz-mode></select></label></div><p data-quiz-divisions class="account-caption"></p><div class="quiz-personal-best"></div><button type="button" class="account-primary" data-play-quiz>Open quiz</button><p class="quiz-record-note">Fastest times are for perfect full rounds without hints or revealed answers.</p></section><section class="quiz-history"><div class="quiz-dashboard-heading"><h3>Recent rounds</h3><select data-history-filter aria-label="Filter quiz history"><option value="all">All countries</option><option value="selected">Selected country</option></select></div><div data-quiz-history></div><button class="account-secondary quiz-history-more" type="button" data-history-more hidden>Show more</button></section>`;
 const $=s=>container.querySelector(s),country=$('[data-quiz-country]'),level=$('[data-quiz-level]'),mode=$('[data-quiz-mode]'),scopePicker=$('[data-quiz-scope]'),historyFilter=$('[data-history-filter]');
 const definitions=globalThis.AtlasCountries.countries,available=Object.values(definitions).filter(c=>c.quiz&&!c.snapshot).sort((a,b)=>a.en.localeCompare(b.en));
 for(const c of available)country.append(new Option(c.en,c.id));for(const [id,label]of Object.entries(quizModeLabels))mode.append(new Option(label,id));mode.value='name';country.value=available.some(c=>c.id===globalThis.AtlasEntry?.current)?globalThis.AtlasEntry.current:available[0]?.id||'';
 let user=null,loadingMore=false,prefectureScopes=null,scopeSignature='',libraryLoading=false;
 function render(){
  const data=quizRecords.data,s=data.summary,definition=definitions[country.value],division=country.value==='china'?Number(level.value):definition?.quiz?.level||1;
  let scopes=definition?.quiz?.scopes||[];
  if(country.value==='china'&&division===2){
   if(!libraryLoading&&prefectureScopes===null){libraryLoading=true;fetch('data/quiz/library.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{prefectureScopes=data.prefectureScopes||[];render();}).catch(()=>{prefectureScopes=[];render();});}
   const known=data.bests.filter(a=>a.country==='china'&&a.level===2&&a.scope).map(a=>({id:a.scope,label:a.scopeLabel||a.scope}));
   scopes=[...(mode.value==='name'?[]:[{id:'',label:'All China'}]),...new Map([...(prefectureScopes||[]),...known].map(s=>[s.id,s])).values()];
  }
  const signature=country.value+':'+division+':'+scopes.map(s=>s.id).join(',');
  if(signature!==scopeSignature){const previous=scopeSignature.startsWith(country.value+':'+division+':')?scopePicker.value:null;scopePicker.replaceChildren(...scopes.map(s=>new Option(s.label,s.id)));if(previous!==null&&scopes.some(s=>s.id===previous))scopePicker.value=previous;scopeSignature=signature;}
  $('[data-scope-label]').hidden=!scopes.length;scopePicker.disabled=!scopes.length;
  $('[data-play-quiz]').disabled=country.value==='china'&&division===2&&mode.value==='name'&&!scopes.length;
  const stats=[['Rounds',s.rounds],['Accuracy',s.total?Math.round(s.correct/s.total*100)+'%':'—'],['Perfect rounds',s.perfect],['Countries',s.countries]];
  const grid=$('.quiz-stat-grid');grid.replaceChildren();for(const [label,value]of stats){const card=make('div',undefined,'quiz-stat');card.append(make('strong',String(value)),make('span',label));grid.append(card);}
  $('[data-level-label]').hidden=country.value!=='china';$('[data-quiz-divisions]').textContent=country.value==='china'&&division===2?'China · Prefectures, with an optional province scope':definition?.quiz?.plural||definition?.levelNames?.[0]||'Subdivisions';
  const candidates=data.bests.filter(a=>a.country===country.value&&a.level===division&&a.mode===mode.value&&a.fullRound&&(a.scope||'')===(scopePicker.value||'')).sort((a,b)=>(b.lastPlayed||b.finishedAt||'').localeCompare(a.lastPlayed||a.finishedAt||'')),best=candidates[0],personal=$('.quiz-personal-best');personal.replaceChildren();
  for(const [label,value]of [['Best score',best?best.bestCorrect+' / '+best.total:'—'],['Fastest perfect',best?.fastestMs!==null&&best?.fastestMs!==undefined?quizTime(best.fastestMs):'—']]){const e=make('div');e.append(make('span',label),make('strong',value));personal.append(e);}
  const status=$('[data-record-status]');status.textContent=!user?'Saved on this device':({synced:'Synced to your account',saving:'Syncing…',offline:'Saved on this device · sync will retry',signin:'Sign in again to sync',storage:'Device storage is full'})[quizRecords.status]||'Syncing…';status.dataset.state=quizRecords.status;
  const history=$('[data-quiz-history]'),recent=data.recent.filter(a=>historyFilter.value==='all'||a.country===country.value);history.replaceChildren();
  if(!recent.length)history.append(make('p',user?'Your completed rounds will appear here.':'Sign in to keep quiz records across devices.','quiz-record-empty'));
  for(const a of recent){const row=make('div',undefined,'quiz-history-row'),title=make('div',undefined,'quiz-history-place');title.append(make('strong',definitions[a.country]?.en||a.country),make('span',[a.level===2?(a.country==='china'?'Prefectures':definitions[a.country]?.quiz?.plural||'Subdivisions'):definitions[a.country]?.quiz?.plural||definitions[a.country]?.levelNames?.[0],quizModeLabels[a.mode],a.scopeLabel||'',a.fullRound?'All places':a.total+' questions'].filter(Boolean).join(' · ')));const result=make('div',undefined,'quiz-history-result');result.append(make('strong',a.correct+' / '+a.total),make('span',quizTime(a.elapsedMs)+(a.hints?' · '+a.hints+' hints':'')+(a.reveals?' · answers shown':'')));const date=make('time',new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(new Date(a.finishedAt)));date.dateTime=a.finishedAt;date.title=new Date(a.finishedAt).toLocaleString();row.append(title,result,date);history.append(row);}
  $('[data-history-more]').hidden=!user||!data.nextCursor;$('[data-history-more]').disabled=loadingMore;
 }
 country.onchange=()=>{level.value='1';render();};level.onchange=mode.onchange=scopePicker.onchange=historyFilter.onchange=render;
 $('[data-play-quiz]').onclick=()=>play({country:country.value,level:country.value==='china'?Number(level.value):definitions[country.value].quiz.level||1,mode:mode.value,scope:scopePicker.value||''});
 $('[data-history-more]').onclick=async()=>{loadingMore=true;render();try{await quizRecords.more();}finally{loadingMore=false;render();}};
 quizRecords.subscribe(render);render();
 return{setUser(id){user=id;quizRecords.connect(id);render();},refresh(){render();void quizRecords.retry();},focus(){country.focus();}};
}
