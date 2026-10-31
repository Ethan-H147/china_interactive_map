// One chosen measure follows the user between prefectures. Province statistics
// keep their independently dated total and do not change that preference.
const storageKey='boundary-atlas-china-population-measure';
const measures=['total','towns','urbanCore'];
let preferred='total',current,container,animations=[];
try{const saved=localStorage.getItem(storageKey);if(measures.includes(saved))preferred=saved;}catch{}
const reduced=()=>globalThis.AtlasSettings?.prefersReducedMotion()||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function cancel(){for(const animation of animations)animation.cancel();animations=[];}
function render(animate=false){
 const buttons=[...container.querySelectorAll('[data-population-measure]')],parts=buttons.flatMap(b=>[...b.children]);
 const before=animate&&!reduced()?new Map(parts.filter(p=>p.getClientRects().length).map(p=>[p,p.getBoundingClientRect()])):null;
 cancel();
 const {record,province,scope}=current,active=province?'total':preferred;
 container.dataset.measure=active;
 for(const button of buttons){const key=button.dataset.populationMeasure,value=record[key],primary=key===active;
  button.hidden=province&&key!=='total';button.disabled=province;button.classList.toggle('is-primary',primary);button.setAttribute('aria-pressed',String(primary));
  button.querySelector('.population-metric-value').textContent=Number.isFinite(value)?value.toLocaleString('en-US'):'Not reported';
  if(key==='total')button.querySelector('.population-metric-label').textContent=scope||'Entire administrative region';
 }
 const primary=buttons.find(b=>b.dataset.populationMeasure===active),others=buttons.filter(b=>b!==primary).sort((a,b)=>(record[b.dataset.populationMeasure]??-Infinity)-(record[a.dataset.populationMeasure]??-Infinity)),focus=document.activeElement;
 container.append(primary,container.querySelector('.population-period'),...others);
 if(buttons.includes(focus)&&!focus.disabled)focus.focus({preventScroll:true});
 if(!before)return;
 for(const part of parts){const from=before.get(part),to=part.getBoundingClientRect();if(!from||!to.height)continue;
  animations.push(part.animate([{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.height/to.height})`},{transform:'none'}],{duration:280,easing:'cubic-bezier(.22,1,.36,1)'}));
 }
}
export function renderPopulationMetrics(record,{province=false,scope}={}){
 if(!container){container=document.getElementById('population-metrics');container.addEventListener('click',event=>{const button=event.target.closest('[data-population-measure]');if(!button||button.disabled)return;const next=button.dataset.populationMeasure;if(next===preferred)return;preferred=next;try{localStorage.setItem(storageKey,preferred);}catch{}render(true);});
  globalThis.addEventListener('atlas-settings-change',()=>{if(reduced())cancel();});globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{if(reduced())cancel();});
 }
 current={record,province,scope};render();
}
