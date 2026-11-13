export function mapRoundDraft(round,elapsed){return {questions:round.questions.map(q=>String(q.record.id)),index:round.index,results:round.results.map(r=>({...r})),elapsed,hinted:[...(round.hinted||[])],spellingWarnings:round.spellingWarnings||0};}
export function restoreMapRound(pool,draft){
 if(!Array.isArray(draft?.questions)||!draft.questions.length||new Set(draft.questions).size!==draft.questions.length||!Array.isArray(draft.results)||!Number.isInteger(draft.index)||draft.index<0||draft.index>=draft.questions.length)return null;
 const byId=new Map(pool.map(q=>[String(q.record.id),q]));if(draft.questions.some(id=>!byId.has(String(id)))||draft.results.length>draft.index+1||draft.results.length<draft.index||draft.results.length===draft.questions.length)return null;
 const questions=draft.questions.map(id=>byId.get(String(id))),results=[];
 for(const [i,r]of draft.results.entries()){if(String(r.expected)!==String(questions[i].record.id)||!['correct','incorrect','skipped'].includes(r.status)||r.chosen!==null&&!byId.has(String(r.chosen)))return null;const expected=questions[i].record.id,chosen=r.chosen===null?null:byId.get(String(r.chosen)).record.id;if(r.status==='correct'&&chosen!==expected||r.status==='skipped'&&chosen!==null)return null;results.push({...r,expected,chosen});}
 const questionIds=new Set(questions.map(q=>String(q.record.id))),hinted=new Set((Array.isArray(draft.hinted)?draft.hinted:[]).map(String).filter(id=>questionIds.has(id)));
 return {questions,eligible:new Set(pool.map(q=>q.record.id)),index:draft.index,results,hinted,complete:false,elapsed:Math.max(0,Number(draft.elapsed)||0),spellingWarnings:Math.max(0,Math.min(2,Number(draft.spellingWarnings)||0))};
}
export function savedDashboardQuizzes(owner){
 const prefix='boundary-atlas-first-quiz-v2:'+(owner||'guest')+':',saved=[];
 try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key.startsWith(prefix))continue;let data;try{data=JSON.parse(localStorage.getItem(key));}catch{continue;}const info=data?.savedQuiz,draft=data?.draft;if(!info||!draft||!['find','name','identify'].includes(info.mode)||!info.country||!Number.isFinite(info.savedAt))continue;const done=info.mode==='name'?draft.found?.length||0:draft.results?.length||0,total=info.total;if(!Number.isInteger(total)||total<=done||total<1)continue;saved.push({...info,done,total,resume:true,overseas:!!draft.overseas,storageKey:key});}}catch{}
 return saved.sort((a,b)=>b.savedAt-a.savedAt).slice(0,5);
}

// Remove only this saved round; retain preferences and other stored data.
export function removeSavedDashboardQuiz(owner,quiz){
 const prefix='boundary-atlas-first-quiz-v2:'+(owner||'guest')+':';
 if(!quiz?.storageKey?.startsWith(prefix))return false;
 try{const data=JSON.parse(localStorage.getItem(quiz.storageKey));if(!data?.draft||!data.savedQuiz||data.savedQuiz.savedAt!==quiz.savedAt)return false;delete data.draft;delete data.savedQuiz;localStorage.setItem(quiz.storageKey,JSON.stringify(data));window.dispatchEvent(new Event('atlas-quiz-drafts-change'));return true;}catch{return false;}
}
