import {createNameRound,submitName,nameHint,nameScore,serializeNameRound,shortEnglish} from './name-quiz-engine.mjs';
const $=id=>document.getElementById(id),key='china-atlas-name-quiz-v1';
const read=()=>{try{const value=JSON.parse(localStorage.getItem(key));return value&&typeof value==='object'?value:{};}catch{return{};}};
const write=value=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
const time=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
export function createNameQuiz(host){
  let round,scope,scopeName,started=0,ticker,ticks=0,paused=true,practice=false,revealed=false;
  function elapsed(){return round.elapsed+(paused?0:Date.now()-started);}
  function stop(){if(!round||paused)return;round.elapsed=elapsed();paused=true;clearInterval(ticker);}
  function save(){
    if(!round||practice)return;
    const data=read();data.drafts||={};
    if(round.complete||revealed)delete data.drafts[scope];
    else data.drafts[scope]={...serializeNameRound(round),elapsed:elapsed()};
    const saved=write(data);
    if(!saved)$('name-save-note').textContent='Browser storage is unavailable. Keep this tab open to retain progress.';
    return saved;
  }
  function updateBest(){
    if(practice||!round.complete)return;
    const data=read(),score=nameScore(round);data.best||={};const old=data.best[scope];
    if(!old||score.unassisted>old.unassisted||(score.unassisted===old.unassisted&&round.elapsed<old.elapsed))data.best[scope]={unassisted:score.unassisted,total:score.total,elapsed:round.elapsed};
    write(data);
  }
  function render(){
    const score=nameScore(round),done=round.complete||revealed;
    $('name-progress').textContent=`${score.found} / ${score.total} named`;
    $('name-progress-bar').style.width=score.found/score.total*100+'%';
    $('name-timer').textContent=time(elapsed());
    $('name-scope').textContent=(practice?'Practice · ':'')+scopeName;
    $('name-form').hidden=done;$('name-live-actions').hidden=done;$('name-results').hidden=!done;
    $('name-summary').textContent=done?`${score.found} of ${score.total} named · ${score.unassisted} without hints · ${time(elapsed())}`:'';
    $('name-result-title').textContent=round.complete?'All places named':'Round finished';
    const list=$('name-list');list.replaceChildren();
    for(const p of round.places.filter(p=>done||round.found.has(p.code))){
      const button=document.createElement('button');button.type='button';button.className='name-place '+(round.found.has(p.code)?'named':'missed');button.dataset.quizNav='';
      const title=document.createElement('span');title.textContent=shortEnglish(p.en)+' · '+p.zh;
      const note=document.createElement('small');note.textContent=round.found.has(p.code)?round.hinted.has(p.code)?'Named with hint':'Named':'Not named';
      button.append(title,note);button.onclick=()=>host.view(p.code);list.append(button);
    }
    $('name-list-title').textContent=done?'Review places':'Named places';
    $('name-practice').hidden=!done||score.found===score.total;
    $('name-map-count').textContent=`${score.found} / ${score.total} named`;
    $('name-map-entry').hidden=done;
    host.labels();host.controls();
  }
  function finish(showRemaining=false){
    revealed=showRemaining;stop();save();updateBest();
    if(showRemaining)for(const p of round.places)if(!round.found.has(p.code))host.mark(p.code,false);
    render();$('name-result-title').focus({preventScroll:true});
  }
  function begin(places,newScope,newScopeName,resume=false,isPractice=false){
    stop();scope=newScope;scopeName=newScopeName;practice=isPractice;revealed=false;
    round=createNameRound(places,resume?read().drafts?.[scope]:undefined);
    started=Date.now();paused=false;
    for(const p of round.places)if(round.found.has(p.code))host.mark(p.code,true);
    $('name-feedback').textContent='';$('name-answer').value='';
    $('name-pause').textContent=practice?'Exit practice':'Save & exit';
    $('name-save-note').textContent=practice?'Practice results do not change your personal best.':'Progress is saved in this browser.';
    ticks=0;render();if(round.complete)finish();else{ticker=setInterval(()=>{$('name-timer').textContent=time(elapsed());if(++ticks%5===0)save();},1000);save();}
  }
  $('name-form').addEventListener('submit',event=>{
    event.preventDefault();if(!round||paused||event.isComposing)return;
    const result=submitName(round,$('name-answer').value),feedback=$('name-feedback');
    feedback.dataset.status=result.status;
    if(result.status==='correct'){
      host.mark(result.place.code,true);feedback.textContent=`${shortEnglish(result.place.en)} · ${result.place.zh} — correct`;
      $('name-answer').value='';save();render();if(round.complete)finish();
    }else feedback.textContent=result.status==='duplicate'?`${shortEnglish(result.place.en)} is already named.`:result.status==='ambiguous'?'Use the full place name.':result.status==='empty'?'Enter a place name.':'No match in this province. Check the spelling or try its Chinese name.';
    if(!round.complete)$('name-answer').focus({preventScroll:true});
  });
  $('name-answer').addEventListener('keydown',event=>{if(event.key==='Enter'&&event.isComposing)event.preventDefault();});
  $('name-hint').onclick=()=>{if(!round||paused)return;const hint=nameHint(round);if(hint){$('name-feedback').textContent=`One remaining name starts with “${hint.en}” in English or “${hint.zh}” in Chinese.`;save();}};
  $('name-finish').onclick=()=>finish(true);
  $('name-pause').onclick=()=>host.exit();
  $('name-change').onclick=()=>host.exit();
  $('name-practice').onclick=()=>{const missed=round.places.filter(p=>!round.found.has(p.code));host.clear();host.limit(missed.map(p=>p.code));begin(missed,scope,scopeName,false,true);host.focusInput();};
  $('name-map-entry').onclick=()=>{$('name-answer').scrollIntoView({block:'center',behavior:'instant'});$('name-answer').focus({preventScroll:true});};
  window.addEventListener('pagehide',save);
  return{
    start:begin,
    pause(){stop();save();},
    labels(){return round?round.places.filter(p=>round.found.has(p.code)||revealed):[];},
    draft(scope){const draft=read().drafts?.[scope];return draft&&Array.isArray(draft.found)&&draft.found.length?draft:null;},
    best(scope){const best=read().best?.[scope];return best?`Personal best: ${best.unassisted} / ${best.total} without hints · ${time(best.elapsed)}`:'';},
    focus(){if(round&&!round.complete&&!revealed)$('name-answer').focus({preventScroll:true});}
  };
}
