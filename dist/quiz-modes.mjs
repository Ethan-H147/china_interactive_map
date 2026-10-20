import {aliases,normalizeName} from './name-quiz-engine.mjs';
export const quizNamePlace=record=>({code:record.id,en:record.en,zh:record.local||'',aliases:[...(record.aliases||[]),record.en.replace(/\s+(?:State|Province|Region)$/i,'')]});
export function answerSpecified(round,value,place=quizNamePlace(round.questions[round.index].record)){
 if(round.complete||round.results[round.index]||!normalizeName(value))return null;
 const expected=round.questions[round.index].feature.properties.adcode,correct=aliases(place).has(normalizeName(value));
 const result={expected,chosen:correct?expected:null,status:correct?'correct':'incorrect',typed:String(value).trim()};round.results.push(result);return result;
}
