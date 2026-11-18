import {nameParts} from './inline-typography.mjs';

function answerIcon(status, doc) {
 const icon=doc.createElement('span');
 icon.className='quiz-answer-icon';
 icon.textContent={correct:'✓',chosen:'×',shown:'●'}[status];
 icon.setAttribute('aria-hidden','true');
 return icon;
}

export function quizResultCounts(score, doc=document) {
 const counts=doc.createElement('span');
 counts.className='quiz-result-counts';
 for(const [status,count,label] of [['correct',score.correct,'correct'],['chosen',score.incorrect,'incorrect'],['shown',score.skipped,'answers shown']]){
  const item=doc.createElement('span'),value=doc.createElement('span'),description=doc.createElement('span');
  item.className='quiz-answer-row';item.dataset.answer=status;item.title=count+' '+label;
  value.textContent=String(count);description.className='sr-only';description.textContent=' '+label+' ';
  item.append(answerIcon(status,doc),value,description);counts.append(item);
 }
 return counts;
}

// Answer results share the same icon, name and detail layout.
export function quizAnswerRow(record,{correct=true,shown=false,document:doc=document}={}){
 const row=doc.createElement('div'),text=doc.createElement('span'),label=doc.createElement('span'),name=doc.createElement('span');
 row.className='quiz-answer-row';row.dataset.answer=shown?'shown':correct?'correct':'chosen';
 label.className='sr-only';label.textContent=shown?'Answer shown: ':correct?'Correct: ':'Your answer: ';
 nameParts(name,record?.en,record?.answerDetail||(record?.local!==record?.en?record?.local:''));
 text.append(label,name);row.append(answerIcon(row.dataset.answer,doc),text);return row;
}
