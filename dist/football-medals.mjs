// Medals for the football (soccer) club quizzes: one emblem per country's league, struck on the
// gold, platinum or diamond disc of its difficulty level and hung from the country's ribbon.
// Gradient IDs are unique per drawing.
import {medalDisc,diamondSparkles} from './quiz-medals.mjs';
let drawn=0;
const materials=['Gold','Platinum','Diamond'];
// Emblem tones per material: light, mid and dark relief.
const tones={Gold:['#fff3b0','#e8b232','#7a520a'],Platinum:['#fdfbff','#c4bddc','#4a4370'],Diamond:['#ffffff','#e4f5fd','#1f6d9c']};
const ribbon=(a,b,stripe)=>`<path d="M12 1.5h9l6.5 18h-9z" fill="${a}"/><path d="M15.4 1.5h2.2l6.5 18h-2.2z" fill="${stripe||b}" opacity=".9"/><path d="M36 1.5h-9l-6.5 18h9z" fill="${b}"/><path d="M32.6 1.5h-2.2l-6.5 18h2.2z" fill="${stripe||a}" opacity=".9"/><path d="M19 17.5h10l-1 3h-8z" fill="#000" opacity=".18"/>`;
const at=(r,deg,x=24,y=30.5)=>[(x+r*Math.cos(deg*Math.PI/180)).toFixed(2),(y+r*Math.sin(deg*Math.PI/180)).toFixed(2)];
// A raised shape: metal fill with a dark edge and a light catch on its upper left.
const relief=(d,[light,,dark],id,w=.55)=>`<path d="${d}" fill="url(#${id}e)" stroke="${dark}" stroke-width="${w}" stroke-linejoin="round"/><path d="${d}" fill="${light}" opacity=".35" transform="translate(-.35 -.35)" clip-path="url(#${id}c)"/>`;
// A classic ball: a centre pentagon with seams out to five part-hidden patches at the edge.
function ball(x,y,r,[light,,dark],id){
 const patch=(px,py,s,rot)=>Array.from({length:5},(_,k)=>at(s,rot+72*k,px,py)).join(' '),p=Array.from({length:5},(_,k)=>at(r*.4,-90+72*k,x,y));
 return `<clipPath id="${id}b"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath><circle cx="${x}" cy="${y}" r="${r}" fill="${light}"/><g clip-path="url(#${id}b)" fill="${dark}">`
  +Array.from({length:5},(_,k)=>{const [px,py]=at(r*1.08,-54+72*k,x,y).map(Number);return `<polygon points="${patch(px,py,r*.36,-54+72*k)}"/>`;}).join('')
  +p.map((_,k)=>{const [a,b]=p[k],[c,d]=at(r*.86,-90+72*k,x,y);return `<path d="M${a} ${b}L${c} ${d}" stroke="${dark}" stroke-width=".45"/>`;}).join('')
  +`</g><polygon points="${p.join(' ')}" fill="${dark}"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${dark}" stroke-width=".55"/>`;
}
const leagues={
 // Premier League: a jewelled crown over a ball.
 'united-kingdom':{ribbon:['#20306f','#c8102e','#f4f4f4'],emblem:(t,id)=>{const crown='M17.4 28.2L16.4 22.8L18.6 25.4L20.2 21.6L22.2 25.2L24 20.6L25.8 25.2L27.8 21.6L29.4 25.4L31.6 22.8L30.6 28.2Z';
  return `<clipPath id="${id}c"><path d="${crown}"/></clipPath>`+relief(crown,t,id)+[[16.4,22.8],[20.2,21.6],[24,20.6],[27.8,21.6],[31.6,22.8]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".8" fill="${t[0]}" stroke="${t[2]}" stroke-width=".4"/>`).join('')
  +`<rect x="17" y="27.8" width="14" height="2.4" rx=".5" fill="url(#${id}e)" stroke="${t[2]}" stroke-width=".5"/><circle cx="24" cy="29" r=".75" fill="#c8102e"/><circle cx="20.4" cy="29" r=".55" fill="#20306f"/><circle cx="27.6" cy="29" r=".55" fill="#20306f"/>`+ball(24,35.6,4.4,t,id);}},
 // LaLiga: a blazing sun around a ball.
 spain:{ribbon:['#c60b1e','#ffc400'],emblem:(t,id)=>{const rays=Array.from({length:16},(_,k)=>{const a=k*22.5-90,o=k%2?8.2:10.4,[x1,y1]=at(5.2,a-8),[x2,y2]=at(o,a),[x3,y3]=at(5.2,a+8);return `M${x1} ${y1}Q${at(o*.72,a-5).join(' ')} ${x2} ${y2}Q${at(o*.72,a+5).join(' ')} ${x3} ${y3}Z`;}).join('');
  return `<clipPath id="${id}c"><path d="${rays}"/></clipPath>`+relief(rays,t,id,.45)+`<circle cx="24" cy="30.5" r="5.4" fill="url(#${id}e)" stroke="${t[2]}" stroke-width=".5"/>`+ball(24,30.5,4.3,t,id);}},
 // Bundesliga: a black heraldic eagle with red beak and talons.
 germany:{ribbon:['#1c1c1c','#dd0000','#ffce00'],emblem:(t,id)=>{const wing='M22.2 26.2C19.6 24.2 17 23.2 14.6 23.4L14.3 26.5L15.8 26L15.2 28.9L16.8 28.4L16.6 31.1L18.2 30.5L18.6 32.7L21.8 30.2Z',flip=`<path d="${wing}" transform="matrix(-1 0 0 1 48 0)"`,ink='#1f1c1a',edge=t[1];
  return `<path d="${wing}" fill="${ink}" stroke="${edge}" stroke-width=".5" stroke-linejoin="round"/>${flip} fill="${ink}" stroke="${edge}" stroke-width=".5" stroke-linejoin="round"/>`
  +`<path d="M22.4 33.2L20.6 38L22.2 37.4L22.8 38.8L24 37.6L25.2 38.8L25.8 37.4L27.4 38L25.6 33.2Z" fill="${ink}" stroke="${edge}" stroke-width=".5" stroke-linejoin="round"/>`
  +`<path d="M22 33.4L19.6 35.6M19.6 35.6L18.6 35.4M19.6 35.6L19.4 36.6M26 33.4L28.4 35.6M28.4 35.6L29.4 35.4M28.4 35.6L28.6 36.6" stroke="#d7261e" stroke-width=".7" stroke-linecap="round"/>`
  +`<path d="M24 24.4C26.6 24.4 26.8 28 26.2 31C25.8 33.2 25 34.2 24 34.2C23 34.2 22.2 33.2 21.8 31C21.2 28 21.4 24.4 24 24.4Z" fill="${ink}" stroke="${edge}" stroke-width=".5"/>`
  +`<circle cx="24" cy="23.2" r="2" fill="${ink}" stroke="${edge}" stroke-width=".5"/><path d="M22.3 22.7L20.4 23.4L22.4 24.1Z" fill="#d7261e"/><circle cx="23.3" cy="22.8" r=".38" fill="${t[0]}"/>`
  +`<path d="M15.2 24.4C17.4 24 19.6 24.8 21.4 26.4" stroke="${t[0]}" stroke-opacity=".5" stroke-width=".4" fill="none"/>`;}},
 // Ligue 1: the Gallic rooster, with a red comb and wattle.
 france:{ribbon:['#0055a4','#ef4135','#ffffff'],emblem:(t,id)=>{const body='M19.2 22.6C20.6 21.8 22 22.6 22.2 24.2C22.6 26.2 24 27.4 26 27.4C27.6 27.4 28.2 25.4 28.6 22.4C30.8 23.2 32.6 26 32.8 29.2C32.4 32 30.4 34 27.4 34.6C25.2 35.2 22.2 34.8 20.6 32.8C19.2 31 18.8 28.4 19.4 26.2L19 25.3L16.6 24.4L18.8 23.5Z';
  return `<clipPath id="${id}c"><path d="${body}"/></clipPath><path d="M18.9 22.9Q18.4 21 19.6 21.2Q19.8 19.9 20.9 20.6Q21.6 19.8 22.1 21.1Q22.8 21.8 22 22.7Z" fill="#e0342b" stroke="${t[2]}" stroke-width=".35"/>`+relief(body,t,id)
  +`<path d="M18.9 25.3Q18.3 27.2 19.7 26.7Z" fill="#e0342b"/><circle cx="20.5" cy="23.3" r=".45" fill="${t[2]}"/>`
  +`<path d="M28.6 22.4C31.6 21.4 34.4 24 34.6 27.6M29.4 25.2C31.6 25.8 33 28.4 32.6 31.4M23.8 29.4C25.8 28.2 28.4 28.8 29.6 30.9C27.4 31.8 25 31.4 23.8 29.4ZM25 30.4L28.4 30.6" stroke="${t[2]}" stroke-width=".5" fill="none" stroke-linecap="round"/>`
  +`<path d="M23.4 34.9L22.9 38.6L21.4 39.2M22.9 38.6L24.1 39.2M26.2 34.8L26.6 38.6L25.3 39.2M26.6 38.6L28 39" stroke="${t[2]}" stroke-width=".7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.4 39.6H30.2" stroke="${t[2]}" stroke-width=".6" stroke-linecap="round"/>`;}},
 // Serie A: the scudetto, a tricolour shield, under a star.
 italy:{ribbon:['#008c45','#cd212a','#f4f5f0'],emblem:(t,id)=>{const shield='M17.2 23.4H30.8V29.8C30.8 34.6 27.8 38 24 39.8C20.2 38 17.2 34.6 17.2 29.8Z',s=Array.from({length:10},(_,k)=>at(k%2?.7:1.7,-90+36*k,24,20.9)).join(' ');
  return `<clipPath id="${id}c"><path d="${shield}"/></clipPath><g clip-path="url(#${id}c)"><rect x="17" y="23" width="4.6" height="17" fill="#009246"/><rect x="21.6" y="23" width="4.8" height="17" fill="#f6f6f2"/><rect x="26.4" y="23" width="4.6" height="17" fill="#ce2b37"/></g>`
  +`<path d="${shield}" fill="none" stroke="url(#${id}e)" stroke-width="1.6"/><path d="${shield}" fill="none" stroke="${t[2]}" stroke-width=".4"/><polygon points="${s}" fill="url(#${id}e)" stroke="${t[2]}" stroke-width=".45" stroke-linejoin="round"/>`;}},
 // Eredivisie: a windmill on a dyke.
 netherlands:{ribbon:['#f36c21','#21468b','#ffffff'],emblem:(t,id)=>{const tower='M21.2 39.4L22.3 28.6H25.7L26.8 39.4Z';
  const sails=[45,135,225,315].map(a=>`<g transform="rotate(${a} 24 27.4)"><path d="M24 27.4V19.6" stroke="${t[2]}" stroke-width=".7"/><rect x="24.35" y="19.6" width="2.3" height="6.2" fill="url(#${id}e)" stroke="${t[2]}" stroke-width=".4"/><path d="M24.35 21.6H26.65M24.35 23.6H26.65M25.5 19.6V25.8" stroke="${t[2]}" stroke-width=".3"/></g>`).join('');
  return `<clipPath id="${id}c"><path d="${tower}"/></clipPath>`+relief(tower,t,id)+`<path d="M22 28.9Q24 25.6 26 28.9Z" fill="url(#${id}e)" stroke="${t[2]}" stroke-width=".45"/><path d="M23.1 39.4V36.4Q24 35.4 24.9 36.4V39.4Z" fill="${t[2]}"/><rect x="23.4" y="31.4" width="1.2" height="1.6" fill="${t[2]}"/>`
  +sails+`<circle cx="24" cy="27.4" r=".8" fill="${t[0]}" stroke="${t[2]}" stroke-width=".4"/><path d="M16.4 39.6Q24 38.4 31.6 39.6" stroke="${t[2]}" stroke-width=".7" fill="none" stroke-linecap="round"/>`;}},
 // Primeira Liga: a caravel under sails bearing the Cross of the Order of Christ.
 portugal:{ribbon:['#046a38','#da291c'],emblem:(t,id)=>{const hull='M15.4 31.4L17.4 32.6H31L33 31.2L31.4 35.6Q24 37 17.2 35.6Z';
  const sail=(x1,x2,top,bot)=>`M${x1} ${top}Q${(x1+x2)/2} ${top-.9} ${x2} ${top}L${x2-.4} ${bot}Q${(x1+x2)/2} ${bot+.9} ${x1+.4} ${bot}Z`,cross=(x,y,s)=>`<path d="M${x-s} ${y}H${x+s}M${x} ${y-s}V${y+s}" stroke="#c8102e" stroke-width="${s*.7}" stroke-linecap="square"/>`;
  return `<clipPath id="${id}c"><path d="${hull}"/></clipPath><path d="M21 32.6V20.8M27.6 32.6V22.6" stroke="${t[2]}" stroke-width=".7"/><path d="M21 20.8L23.4 21.5L21 22.2Z" fill="#c8102e"/>`
  +`<path d="${sail(17.4,24.6,22.8,30.8)}" fill="url(#${id}e)" stroke="${t[2]}" stroke-width=".45"/>${cross(21,26.8,2)}<path d="${sail(24.8,30.4,24.4,31)}" fill="url(#${id}e)" stroke="${t[2]}" stroke-width=".45"/>${cross(27.6,27.7,1.5)}`
  +relief(hull,t,id)+`<path d="M18 34.2H30.4" stroke="${t[2]}" stroke-width=".35"/><path d="M15.6 38.6q1.4 -1.1 2.8 0t2.8 0t2.8 0t2.8 0t2.8 0t2.8 0" stroke="${t[2]}" stroke-width=".6" fill="none" stroke-linecap="round"/>`;}},
 // Pro League: the Atomium, nine spheres joined along a cube standing on its corner.
 belgium:{ribbon:['#1c1c1c','#fdda24','#ef3340'],emblem:(t,id)=>{
  const tilt=Math.atan(Math.SQRT2),turn=.32,pts=[],edges=[];
  for(let v=0;v<8;v++){let [x,y,z]=[v&1,v>>1&1,v>>2&1].map(c=>c-.5);[x,y]=[x*Math.cos(Math.PI/4)-y*Math.sin(Math.PI/4),x*Math.sin(Math.PI/4)+y*Math.cos(Math.PI/4)];[y,z]=[y*Math.cos(tilt)-z*Math.sin(tilt),y*Math.sin(tilt)+z*Math.cos(tilt)];[x,y]=[x*Math.cos(turn)-y*Math.sin(turn),x*Math.sin(turn)+y*Math.cos(turn)];pts.push([24+x*9.4,30.5-z*9.4,y]);}
  for(let a=0;a<8;a++)for(const b of [1,2,4])if(!(a&b))edges.push([a,a|b]);
  const tube=([x1,y1],[x2,y2])=>`<path d="M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}" stroke="${t[2]}" stroke-width="1.5" stroke-linecap="round"/><path d="M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}" stroke="${t[1]}" stroke-width=".8" stroke-linecap="round"/>`,centre=[24,30.5,0];
  const sphere=([x,y])=>`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.9" fill="url(#${id}s)" stroke="${t[2]}" stroke-width=".45"/>`;
  return `<radialGradient id="${id}s" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="${t[0]}"/><stop offset=".55" stop-color="${t[1]}"/><stop offset="1" stop-color="${t[2]}"/></radialGradient>`
   +edges.map(([a,b])=>tube(pts[a],pts[b])).join('')+pts.map(p=>tube(p,centre)).join('')+[...pts,centre].sort((a,b)=>b[2]-a[2]).map(sphere).join('');}},
 // MLS: a stars-and-stripes shield.
 'united-states':{ribbon:['#002868','#bf0a30','#ffffff'],emblem:(t,id)=>{const shield='M17.4 22.6H30.6V29.8C30.6 34.6 27.6 37.8 24 39.6C20.4 37.8 17.4 34.6 17.4 29.8Z',star=(x,y,r)=>Array.from({length:10},(_,k)=>at(k%2?r*.42:r,-90+36*k,x,y)).join(' ');
  return `<clipPath id="${id}c"><path d="${shield}"/></clipPath><g clip-path="url(#${id}c)"><rect x="17" y="22" width="14" height="18" fill="url(#${id}e)"/>${[0,2,4,6].map(k=>`<rect x="${(17.4+k*13.2/7).toFixed(2)}" y="27" width="${(13.2/7).toFixed(2)}" height="13" fill="#bf0a30"/>`).join('')}<rect x="17" y="22" width="14" height="5" fill="#0a2a66"/></g>`
  +[20.6,24,27.4].map(x=>`<polygon points="${star(x,24.7,1.5)}" fill="${t[0]}"/>`).join('')+`<path d="${shield}" fill="none" stroke="url(#${id}e)" stroke-width="1.4"/><path d="${shield}" fill="none" stroke="${t[2]}" stroke-width=".4"/>`;}}
};
export const footballMedalCountries=Object.keys(leagues);
// level is the difficulty's index: 0 top league (Gold), 1 top two (Platinum), 2 all three (Diamond).
export function footballMedalName(level){return materials[Math.min(level,materials.length-1)];}
export function footballMedalMarkup(country,material){
 const league=leagues[country],id='football-medal-'+(++drawn),t=tones[material];if(!league)return '';
 const [a,b,stripe]=league.ribbon;
 return `<svg class="quiz-medal" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="${id}e" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="${t[0]}"/><stop offset=".55" stop-color="${t[1]}"/><stop offset="1" stop-color="${material==='Diamond'?'#a9d6ee':t[2]}"/></linearGradient></defs>`
  +ribbon(a,b,stripe)+medalDisc(material,id)+(material==='Diamond'?'<circle cx="24" cy="30.5" r="10.6" fill="#fff" opacity=".42"/>':'')+league.emblem(t,id)+(material==='Diamond'?diamondSparkles:'')+'</svg>';
}
