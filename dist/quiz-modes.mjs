import {aliases,normalizeName,spellingCandidate} from './name-quiz-engine.mjs';
export const quizNamePlace=record=>({code:record.id,en:record.en,zh:record.local||'',aliases:[...(record.aliases||[]),record.en.replace(/\s+(?:State|Province|Region)$/i,'')]});
export function answerSpecified(round,value,place=quizNamePlace(round.questions[round.index].record),places=round.questions.filter(q=>q.record).map(q=>quizNamePlace(q.record))){
 if(round.complete||round.results[round.index]||!normalizeName(value))return null;
 const expected=round.questions[round.index].feature.properties.adcode,correct=aliases(place).has(normalizeName(value));
 if(!correct&&!places.some(p=>String(p.code)!==String(place.code)&&aliases(p).has(normalizeName(value)))&&spellingCandidate(value,[place])){const count=round.spellingWarnings||0;if(count<2){round.spellingWarnings=count+1;return{status:'spelling',warnings:count+1};}}
 const result={expected,chosen:correct?expected:null,status:correct?'correct':'incorrect',typed:String(value).trim()};round.results.push(result);return result;
}
