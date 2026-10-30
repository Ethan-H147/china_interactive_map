// Medals for difficulty-level quizzes, separate for each mode: the highest level with a perfect
// full round (all correct, no hints or shown answers) in that mode earns that level's medal.
// Each medal is a struck disc on a ribbon: bronze to platinum are metal, and the diamond
// medal's face is a brilliant-cut stone. Gradient IDs are unique per drawing.
const metals={Bronze:['#f6c793','#c27b3c','#7b431a'],Silver:['#ffffff','#c8cfd5','#79838b'],Gold:['#fff3b0','#e8b232','#946508'],Platinum:['#fdfbff','#c4bddc','#5e5684']};
const ribbons={Bronze:['#3b67a8','#c4473d'],Silver:['#3b67a8','#c4473d'],Gold:['#3b67a8','#c4473d'],Platinum:['#3b67a8','#c4473d'],Diamond:['#7ccbe6','#e9f8fe']};
let drawn=0;
const cx=24,cy=30.5,R=14.5,point=(r,a)=>[(cx+r*Math.cos(a)).toFixed(2),(cy+r*Math.sin(a)).toFixed(2)].join(',');
const star=(x,y,s)=>`M${x} ${y-s}Q${x+s*.18} ${y-s*.18} ${x+s} ${y}Q${x+s*.18} ${y+s*.18} ${x} ${y+s}Q${x-s*.18} ${y+s*.18} ${x-s} ${y}Q${x-s*.18} ${y-s*.18} ${x} ${y-s}Z`;
function ribbon(name){const [a,b]=ribbons[name];return `<path d="M12 1.5h9l6.5 18h-9z" fill="${a}"/><path d="M15.4 1.5h2.2l6.5 18h-2.2z" fill="${b}" opacity=".85"/><path d="M36 1.5h-9l-6.5 18h9z" fill="${b}"/><path d="M32.6 1.5h-2.2l-6.5 18h2.2z" fill="${a}" opacity=".85"/><path d="M19 17.5h10l-1 3h-8z" fill="#000" opacity=".18"/>`;}
function metalDisc(name,id){
 const [light,mid,dark]=metals[name];
 return `<defs><linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient><radialGradient id="${id}f" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${light}"/><stop offset=".6" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></radialGradient></defs>`
 +`<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${id}r)" stroke="${dark}" stroke-width=".8"/><circle cx="${cx}" cy="${cy}" r="${R-2.6}" fill="url(#${id}f)" stroke="${dark}" stroke-opacity=".55" stroke-width=".7"/>`
 +`<circle cx="${cx}" cy="${cy}" r="${R-4.3}" fill="none" stroke="${light}" stroke-opacity=".7" stroke-width=".6" stroke-dasharray="1 1.2"/>`+`<path d="M${point(R-1.3,Math.PI*1.05)}A${R-1.3} ${R-1.3} 0 0 1 ${point(R-1.3,Math.PI*1.6)}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.2" stroke-linecap="round"/>`;
}
function metal(name,id){
 const [light,mid,dark]=metals[name],emblem=Array.from({length:10},(_,i)=>point(i%2?3.2:7,-Math.PI/2+i*Math.PI/5)).join(' ');
 return ribbon(name)+metalDisc(name,id)+`<polygon points="${emblem}" fill="${mid}" stroke="${dark}" stroke-width=".6" stroke-linejoin="round"/><polygon points="${emblem}" fill="${light}" opacity=".45" transform="translate(-.5 -.5)"/>`;
}
// A round brilliant seen face-on: an octagonal table, star facets and kite facets, each shaded
// by its angle to light from the upper left, inside a faceted girdle.
function diamondDisc(id){
 const sides=8,stone=R-2,table=5.6,inner=stone-1.8,face=[],shade=(a,base)=>{const light=(Math.cos(a-Math.PI*1.25)+1)/2;return ['#3f97c8','#62b4dd','#93d2ef','#c9ecfa','#ffffff'][Math.max(0,Math.min(4,Math.round(light*3.4+base-.6)))];};
 for(let k=0;k<sides;k++){
  const a=k*2*Math.PI/sides-Math.PI/sides,b=a+2*Math.PI/sides,m=(a+b)/2;
  face.push([[point(table,a),point(table,b),point(inner,m)],shade(m,1)]);
  face.push([[point(table,a),point(inner,a),point(inner,m)],shade(a+.2,k%2?0:1)]);
  face.push([[point(table,b),point(inner,m),point(inner,b)],shade(b-.2,k%2?1:0)]);
 }
 const tablePoints=Array.from({length:sides},(_,k)=>point(table,k*2*Math.PI/sides-Math.PI/sides)).join(' '),girdle=Array.from({length:24},(_,k)=>{const a=k*Math.PI/12,b=a+Math.PI/12;return `<path d="M${point(stone,a)}A${stone} ${stone} 0 0 1 ${point(stone,b)}L${point(inner,b)}A${inner} ${inner} 0 0 0 ${point(inner,a)}Z" fill="${k%2?'#8fcfec':'#e3f6fd'}"/>`;}).join('');
 return `<defs><radialGradient id="${id}t" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#c3eaf9"/><stop offset="1" stop-color="#6fbde2"/></radialGradient><linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#c5ced6"/><stop offset="1" stop-color="#6d7a86"/></linearGradient></defs>`
  +`<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${id}b)" stroke="#5d6873" stroke-width=".8"/><circle cx="${cx}" cy="${cy}" r="${stone}" fill="#3a8fbf"/>${girdle}`
  +face.map(([points,fill])=>`<polygon points="${points.join(' ')}" fill="${fill}" stroke="#3d8fbd" stroke-width=".3" stroke-linejoin="round"/>`).join('')
  +`<polygon points="${tablePoints}" fill="url(#${id}t)" stroke="#3d8fbd" stroke-width=".35"/><circle cx="${cx}" cy="${cy}" r="${stone}" fill="none" stroke="#2f7fae" stroke-width=".6"/>`;
}
// Glints that pop up on the stone at irregular moments: each spot has its own cycle length, so the
// pattern rarely repeats. With reduced motion only the first three show, still.
const sparkles=[[16.5,24.5,3.2,4.7,-.4],[31.5,37,2.1,3.1,-2.3],[33,23,1.4,5.9,-1.1],[18.6,37.4,1.8,4.3,-3.4],[27.8,26.2,1.2,3.7,-.9],[24,40.6,1.5,6.7,-5.2],[14.6,31,1.3,5.3,-4.1]]
 .map(([x,y,s,d,w],k)=>`<path class="medal-sparkle${k>2?' extra':''}" style="--d:${d}s;--w:${w}s" d="${star(x,y,s)}" fill="#fff"/>`).join('');
function diamond(id){return ribbon('Diamond')+diamondDisc(id)+sparkles;}
// The disc alone (no ribbon or emblem) and the diamond's sparkles, for medal sets with their own emblems.
export function medalDisc(name,id){return name==='Diamond'?diamondDisc(id):metalDisc(name,id);}
export const diamondSparkles=sparkles;
export function medalMarkup(name){const id='quiz-medal-'+(++drawn);return `<svg class="quiz-medal" viewBox="0 0 48 48" aria-hidden="true">${name==='Diamond'?diamond(id):metal(name,id)}</svg>`;}
export function perfectLevels(bests,country,level,mode){return new Set(bests.filter(a=>a.country===country&&a.level===level&&a.mode===mode&&a.fullRound&&a.fastestMs!==null&&a.fastestMs!==undefined).map(a=>a.scope));}
export function highestMedal(bests,country,level,levels,mode){const done=perfectLevels(bests,country,level,mode);return [...levels].reverse().find(l=>done.has(l.id))||null;}
// Not yet earned: one generic grey medal with a question mark, for every medal set.
export function lockedMedalMarkup(){return `<svg class="quiz-medal quiz-medal-locked" viewBox="0 0 48 48" aria-hidden="true"><path d="M12 1.5h9l6.5 18h-9z" fill="#d6d6d2"/><path d="M36 1.5h-9l-6.5 18h9z" fill="#c4c4bf"/><circle cx="24" cy="30.5" r="14.5" fill="#ececea" stroke="#b3b3ae" stroke-width="1"/><circle cx="24" cy="30.5" r="11.6" fill="none" stroke="#c9c9c4" stroke-width=".8" stroke-dasharray="1 1.2"/><path d="M20.4 27.2C20.4 24.9 22 23.6 24.1 23.6C26.2 23.6 27.8 24.9 27.8 26.9C27.8 29.6 24.4 29.9 24.4 32.6" fill="none" stroke="#9c9c97" stroke-width="2.2" stroke-linecap="round"/><circle cx="24.4" cy="36.6" r="1.4" fill="#9c9c97"/></svg>`;}
