import {quizInsetShapes} from './quiz-inset-shapes.mjs';
// Quiz-only SVG views share the round's IDs and state; they add no map contexts or geometry workers.
export function createQuizInsets(ids,prompt,choose){
 if(!ids?.length)return;
 const shell=document.getElementById('map-shell'),root=document.createElement('div'),items=new Map();
 root.className='quiz-insets';root.setAttribute('role','group');root.setAttribute('aria-label','Inset maps');
 for(const [index,id] of ids.entries()){
  const shape=quizInsetShapes[id];if(!shape)throw Error('Missing quiz inset: '+id);
  const box=document.createElement('div'),button=document.createElement('button'),caption=document.createElement('span');
  box.className='quiz-inset';box.tabIndex=-1;box.dataset.place=id;button.type='button';button.setAttribute('aria-label','Select state in inset '+(index+1));
  button.innerHTML='<svg viewBox="'+shape.viewBox+'" aria-hidden="true" focusable="false"><path d="'+shape.path+'" fill-rule="evenodd"/></svg>';
  caption.className='quiz-inset-name';caption.setAttribute('aria-hidden','true');button.append(caption);button.onclick=()=>choose(id);box.append(button);root.append(box);items.set(id,{box,button,caption,index});
 }
 shell.append(root);
 const position=()=>{const phone=matchMedia('(max-width:760px)').matches;root.style.bottom=phone&&!prompt.hidden?(shell.getBoundingClientRect().bottom-prompt.getBoundingClientRect().top+12)+'px':'';};
 const observer=new ResizeObserver(position);observer.observe(prompt);observer.observe(shell);position();
 return{
  has:id=>items.has(id),
  update({records,solved,review,wrong,missed,canAnswer}){
   for(const [id,{box,button,caption,index}] of items){const correct=solved.has(id)||review?.id===id,bad=!correct&&(wrong===id||missed?.has(id)),record=records.find(r=>r.id===id),known=correct||bad;
    box.dataset.status=correct?'correct':bad?'incorrect':'unanswered';box.dataset.review=String(review?.id===id);button.disabled=!canAnswer;
    caption.textContent=known?record.en:'';button.setAttribute('aria-label',known?record.en+(correct?' · correct':' · incorrect'):'Select state in inset '+(index+1));
   }
   position();
  },
  focus(id){items.get(id)?.box.focus({preventScroll:true});},
  remove(){observer.disconnect();root.remove();}
 };
}
