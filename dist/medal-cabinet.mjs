// The medal cabinet (Collection → Medals): every medal earned, on one shelf per country, in a
// display case whose wood, lining and ornament upgrade as medal points add up. Points per mode:
// Bronze 1, Silver 2, Gold 4, Platinum 7, Diamond 10; a Miscellaneous topic medal is 5.
import {chinaMiscQuizzes} from './china-misc-definitions.mjs';
import {usMiscQuizzes} from './us-misc-definitions.mjs';
import {usSportsQuizForScope} from './us-sports-definitions.mjs';
import {medalMarkup,highestMedal,perfectLevels} from './quiz-medals.mjs';
import {usMiscMedalIds,usMiscMedalMarkup} from './us-misc-medals.mjs';
import {chinaMiscMedalIds,chinaMiscMedalMarkup} from './china-misc-medals.mjs';
import {footballMedalCountries,footballMedalMarkup,footballMedalName} from './football-medals.mjs';
export const cabinetModes=['find','name','identify'];
export const medalPoints={Bronze:1,Silver:2,Gold:4,Platinum:7,Diamond:10,topic:5};
const rank=['Bronze','Silver','Gold','Platinum','Diamond'];
export const cabinetTiers=[
 {id:'pine',name:'Pine',points:0,wood:['#d9a86a','#c08a4c','#a87236'],trim:'#8a5a2a',lining:['#3d5a45','#2c4433']},
 {id:'walnut',name:'Walnut',points:50,wood:['#8a5a36','#6b4226','#4e2e18'],trim:'#c9a24a',lining:['#24365e','#18264a'],corner:'#c9a24a'},
 {id:'mahogany',name:'Mahogany',points:150,wood:['#93402a','#74301d','#561f12'],trim:'#e2b84c',lining:['#6e1f2c','#4f141f'],corner:'#e8bf4f',crest:'laurel'},
 {id:'ebony',name:'Ebony & gold',points:300,wood:['#3d2c24','#2a1d17','#17100c'],trim:'#f0c95a',lining:['#1d4a3c','#12332a'],corner:'#e8bf4f',crest:'star'},
 {id:'marble',name:'Gilded marble',points:600,wood:['#f6f2ea','#e6dfd2','#cfc6b6'],trim:'#d9a93a',lining:['#3b2a5e','#281c44'],corner:'#e8bf4f',crest:'crown',stone:true}
];
const topicSets={'united-states':[usMiscQuizzes,usMiscMedalIds,usMiscMedalMarkup],china:[chinaMiscQuizzes,chinaMiscMedalIds,chinaMiscMedalMarkup]};
// Every medal a country offers, in shelf order: its city levels, its Miscellaneous topics, then football.
export function cabinetCatalog(definitions){
 const shelves=[];
 for(const definition of Object.values(definitions).filter(d=>d.quiz&&!d.snapshot).sort((a,b)=>a.en.localeCompare(b.en))){
  const id=definition.id,quiz=definition.quiz,slots=[];
  if(quiz.cities)slots.push({id:'cities',label:quiz.cities.plural,kind:'levels',levels:quiz.cities.levels.map(l=>({...l}))});
  const topics=topicSets[id];if(topics){const [quizzes,ids,markup]=topics;for(const q of quizzes)if(ids.includes(q.id))slots.push({id:q.id,label:q.label,kind:'topic',markup:()=>markup(q.id)});}
  const soccer=id==='united-states'?usSportsQuizForScope('misc-soccer'):quiz.football;
  if(soccer&&footballMedalCountries.includes(id))slots.push({id:'football',label:id==='united-states'?'Soccer clubs':'Football clubs',kind:'levels',levels:soccer.levels.map((l,i)=>({...l,medal:footballMedalName(i)})),markup:material=>footballMedalMarkup(id,material)});
  if(slots.length)shelves.push({country:id,label:definition.en,slots});
 }
 return shelves;
}
// Medals earned per mode for each slot (a material name, 'topic', or null), with points and tier.
export function cabinetState(catalog,bests){
 let points=0;
 const shelves=catalog.map(shelf=>{
  const slots=shelf.slots.map(slot=>{
   const modes=cabinetModes.map(mode=>slot.kind==='topic'?(perfectLevels(bests,shelf.country,3,mode).has(slot.id)?'topic':null):highestMedal(bests,shelf.country,3,slot.levels,mode)?.medal||null);
   for(const m of modes)if(m)points+=medalPoints[m];
   const best=slot.kind==='topic'?(modes.some(Boolean)?'topic':null):modes.filter(Boolean).sort((a,b)=>rank.indexOf(b)-rank.indexOf(a))[0]||null;
   const top=slot.kind==='topic'?'topic':slot.levels.at(-1).medal;
   return {...slot,modes,best,complete:modes.every(m=>m===top)};
  });
  return {...shelf,slots,earned:slots.some(s=>s.best),complete:slots.every(s=>s.complete)};
 });
 const tier=[...cabinetTiers].reverse().find(t=>points>=t.points),next=cabinetTiers[cabinetTiers.indexOf(tier)+1]||null;
 return {shelves,points,tier,next};
}
const pipColors={Bronze:'#c27b3c',Silver:'#c8cfd5',Gold:'#e8b232',Platinum:'#c4bddc',Diamond:'#8fd3f0',topic:'#e8b232'};
const wood=t=>t.stone
 ?`radial-gradient(120% 60% at 20% 30%,#ffffff80,transparent 60%),repeating-linear-gradient(115deg,transparent 0 22px,#b9ad9a33 22px 23px,transparent 23px 47px,#a0937d26 47px 48px),linear-gradient(135deg,${t.wood.join(',')})`
 :`repeating-linear-gradient(178deg,transparent 0 2px,#00000014 2px 3px,transparent 3px 7px,#ffffff12 7px 8px,transparent 8px 13px),repeating-linear-gradient(181deg,transparent 0 11px,#0000001f 11px 12.5px,transparent 12.5px 29px),radial-gradient(40% 18% at 30% 50%,#00000018,transparent),linear-gradient(180deg,${t.wood.join(',')})`;
const corner=c=>`<svg viewBox="0 0 30 30" aria-hidden="true"><path d="M2 2H28L22 8H8V22L2 28Z" fill="${c}" stroke="#6b4a12" stroke-width="1"/><circle cx="7" cy="7" r="2" fill="#fff5c8" stroke="#6b4a12" stroke-width=".8"/></svg>`;
// Each ornament stands on a base cut from the case's own material, resting on the top rail.
function crest(t){
 const g='cabinet-crest-'+t.id,trim=t.trim,ink='#5a3d0c',fill=`<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.wood[0]}"/><stop offset=".55" stop-color="${t.wood[1]}"/><stop offset="1" stop-color="${t.wood[2]}"/></linearGradient></defs>`;
 const svg=body=>`<svg viewBox="0 0 160 62" aria-hidden="true">${fill}${body}</svg>`;
 if(t.crest==='laurel'){
  const leaves=side=>Array.from({length:7},(_,i)=>{const a=-.5+i*.38,x=(80+side*15*Math.cos(a)).toFixed(1),y=(38-15*Math.sin(a)).toFixed(1);return `<ellipse cx="${x}" cy="${y}" rx="4.4" ry="1.9" transform="rotate(${(side*(90-a*57.3)).toFixed(0)} ${x} ${y})"/>`;}).join('');
  return svg(`<path d="M4 58C22 58 30 50 36 42C46 28 62 20 80 20C98 20 114 28 124 42C130 50 138 58 156 58Z" fill="url(#${g})" stroke="#2a0d06" stroke-width="1"/><path d="M30 52C50 40 62 34 80 33C98 34 110 40 130 52M44 54C58 46 68 42 80 41C92 42 102 46 116 54" fill="none" stroke="#00000022" stroke-width=".8"/><path d="M10 56C26 55 32 48 38 41C48 28 63 23 80 23C97 23 112 28 122 41C128 48 134 55 150 56" fill="none" stroke="${trim}" stroke-width="1.6"/><path d="M4 58Q2 50 9 50Q14 51 12 55Q10 57 8 55M156 58Q158 50 151 50Q146 51 148 55Q150 57 152 55" fill="none" stroke="${trim}" stroke-width="1.6" stroke-linecap="round"/><g fill="${trim}" stroke="${ink}" stroke-width=".6" transform="matrix(1 0 0 -1 0 74)">${leaves(-1)}${leaves(1)}</g><circle cx="80" cy="38" r="9" fill="${trim}" stroke="${ink}" stroke-width=".9"/><circle cx="80" cy="38" r="5.6" fill="none" stroke="${ink}" stroke-width=".7"/><path d="M76.6 35.6Q77.4 34.4 78.8 34.8" stroke="#fff6" stroke-width="1" fill="none"/>`);
 }
 if(t.crest==='star'){
  const star=Array.from({length:10},(_,i)=>{const r=i%2?6.5:15,a=-Math.PI/2+i*Math.PI/5;return (80+r*Math.cos(a)).toFixed(1)+','+(29+r*Math.sin(a)).toFixed(1);}).join(' ');
  return svg(`<path d="M26 62V52H40V44H120V52H134V62Z" fill="url(#${g})" stroke="#000" stroke-width="1"/><path d="M40 46H120M26 54H134" stroke="${trim}" stroke-width="1.4"/><polygon points="${star}" fill="${trim}" stroke="${ink}" stroke-width="1" stroke-linejoin="round"/><path d="M80 18V40M70 29H90" stroke="#fff5" stroke-width=".8"/>`);
 }
 if(t.crest==='crown')return svg(`<path d="M22 62V54Q22 50 26 50H134Q138 50 138 54V62Z" fill="url(#${g})" stroke="#9b8f7c" stroke-width="1"/><path d="M26 53H134" stroke="${trim}" stroke-width="1.6"/><path d="M58 50L54 24L66 36L80 16L94 36L106 24L102 50Z" fill="${trim}" stroke="${ink}" stroke-width="1"/><rect x="56" y="45" width="48" height="6" rx="1.5" fill="${trim}" stroke="${ink}"/><circle cx="80" cy="48" r="2" fill="#b0283a"/><circle cx="68" cy="48" r="1.5" fill="#2a5aa8"/><circle cx="92" cy="48" r="1.5" fill="#2a5aa8"/>${[[54,24],[80,16],[106,24]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.8" fill="#fff4c6" stroke="${ink}"/>`).join('')}`);
 return '';
}
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const modeNames={find:'Find on map',name:'Name every place',identify:'Name highlighted place'};
function slotMarkup(slot){
 if(!slot.best)return null;
 if(slot.kind==='topic')return slot.markup();
 return slot.markup?slot.markup(slot.best):medalMarkup(slot.best);
}
export function mountMedalCabinet(container,{snapshot,definitions}){
 const catalog=cabinetCatalog(definitions);let owner='',signature='';
 container.className='medal-cabinet';
 container.innerHTML=`<div class="medal-cabinet-heading"><h3>Medal cabinet</h3><div class="medal-cabinet-progress"><span data-cabinet-points></span><span class="medal-cabinet-bar" data-cabinet-bar><i></i></span></div></div><div class="medal-case" data-cabinet-case><div class="medal-case-crest" data-cabinet-crest></div><div class="medal-case-frame"><div class="medal-case-glass"><div class="medal-case-lining" data-cabinet-shelves></div></div><div class="medal-case-plaque" data-cabinet-owner hidden></div></div></div>`;
 const $=s=>container.querySelector(s);
 function refresh(){
  const state=cabinetState(catalog,snapshot().bests||[]),{tier,next,points}=state,key=JSON.stringify([owner,tier.id,state.shelves.map(s=>s.slots.map(t=>t.modes))]);
  $('[data-cabinet-points]').textContent=next?`${points} / ${next.points} points to ${next.name}`:`${points} points`;
  const bar=$('[data-cabinet-bar]');bar.hidden=!next;if(next)bar.firstChild.style.width=((points-tier.points)/(next.points-tier.points)*100).toFixed(1)+'%';
  if(key===signature)return;signature=key;
  const box=$('[data-cabinet-case]');box.dataset.tier=tier.id;box.style.setProperty('--case-wood',wood(tier));box.style.setProperty('--case-trim',tier.trim);box.style.setProperty('--case-lining',tier.lining[0]);box.style.setProperty('--case-lining-deep',tier.lining[1]);
  box.classList.toggle('has-crest',!!tier.crest);$('[data-cabinet-crest]').innerHTML=crest(tier);
  for(const old of box.querySelectorAll('.medal-case-corner'))old.remove();
  if(tier.corner)for(const place of ['tl','tr','bl','br']){const c=make('span',undefined,'medal-case-corner '+place);c.innerHTML=corner(tier.corner);box.querySelector('.medal-case-frame').append(c);}
  const plaque=$('[data-cabinet-owner]');plaque.textContent=owner;plaque.hidden=!owner;
  const shelves=state.shelves.filter(s=>s.earned),host=$('[data-cabinet-shelves]');
  host.replaceChildren(...shelves.map(shelf=>{
   const row=make('section',undefined,'medal-shelf'),label=make('div',shelf.label,'medal-shelf-plaque'),slots=make('div',undefined,'medal-shelf-slots');row.dataset.cabinetCountry=shelf.country;
   if(shelf.complete){label.classList.add('complete');label.prepend(make('b','★'));}
   for(const slot of shelf.slots){
    const figure=make('figure',undefined,'medal-slot'),markup=slotMarkup(slot),caption=make('figcaption',slot.label);figure.dataset.cabinetSlot=slot.id;
    if(markup){figure.insertAdjacentHTML('afterbegin',markup);const pips=make('span',undefined,'medal-slot-modes');slot.modes.forEach((m,i)=>{const pip=make('i');if(m)pip.style.background=pipColors[m];pips.append(pip);});figure.append(pips);
     figure.title=slot.label+' · '+slot.modes.map((m,i)=>modeNames[cabinetModes[i]]+': '+(m==='topic'?'earned':m||'—')).join(' · ');}
    else{figure.classList.add('empty');figure.append(make('span',undefined,'medal-slot-hollow'));figure.title=slot.label+' · not earned yet';}
    figure.append(caption);slots.append(figure);
   }
   row.append(label,slots);return row;
  }));
  if(!shelves.length)host.append(make('p','Perfect full rounds earn medals.','medal-cabinet-empty'));
 }
 return {refresh,setOwner(name){if(owner===(name||''))return false;owner=name||'';return true;}};
}
