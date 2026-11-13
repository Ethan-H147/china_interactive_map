import {nameParts} from './inline-typography.mjs';

// Answer results share the same icon, name and detail layout.
export function quizAnswerRow(record,{correct=true,shown=false,document:doc=document}={}){
 const row=doc.createElement('div'),icon=doc.createElement('span'),text=doc.createElement('span'),label=doc.createElement('span'),name=doc.createElement('span');
 row.className='quiz-answer-row';row.dataset.answer=shown?'shown':correct?'correct':'chosen';
 icon.className='quiz-answer-icon';icon.textContent=shown?'●':correct?'✓':'×';icon.setAttribute('aria-hidden','true');
 label.className='sr-only';label.textContent=shown?'Answer shown: ':correct?'Correct: ':'Your answer: ';
 nameParts(name,record?.en,record?.answerDetail||(record?.local!==record?.en?record?.local:''));
 text.append(label,name);row.append(icon,text);return row;
}
