// Medals for China's Miscellaneous quizzes, one design per topic, each on its own ribbon; a topic's
// medal is earned in a mode by a perfect full round. Gradient and clip IDs are unique per drawing.
let drawn=0;
const ribbon=(a,b,stripe)=>`<path d="M12 1.5h9l6.5 18h-9z" fill="${a}"/><path d="M15.4 1.5h2.2l6.5 18h-2.2z" fill="${stripe||b}" opacity=".9"/><path d="M36 1.5h-9l-6.5 18h9z" fill="${b}"/><path d="M32.6 1.5h-2.2l-6.5 18h2.2z" fill="${stripe||a}" opacity=".9"/><path d="M19 17.5h10l-1 3h-8z" fill="#000" opacity=".18"/>`;
const grad=(id,stops,x2=1,y2=1)=>`<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o,c])=>`<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const gold=id=>grad(id,[[0,'#fff1a6'],[.5,'#e6b131'],[1,'#94650a']]);
const bronze=id=>grad(id,[[0,'#d9b47a'],[.5,'#9c6f35'],[1,'#57391a']]);
const shine=d=>`<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1" stroke-linecap="round"/>`;
const designs={
 // Dynasty capitals: a gilded palace gate, two broad swept eaves over a short vermilion wall.
 'misc-dynasty-capitals':id=>`<defs>${gold(id+'g')}${grad(id+'r',[[0,'#d8453a'],[1,'#8e1f18']],0,1)}</defs>${ribbon('#b8282e','#e3b23c')}
  <path d="M18.4 19.4H29.6V21.8H18.4Z" fill="#2f6e5a" stroke="#7a520a" stroke-width=".4"/><path d="M17.2 18.4Q18.4 18.6 18.6 20.2M30.8 18.4Q29.6 18.6 29.4 20.2" stroke="#e6b131" stroke-width=".9" fill="none" stroke-linecap="round"/>
  <path d="M11.6 27.4Q15.4 26.2 17.8 21.6H30.2Q32.6 26.2 36.4 27.4Q34.2 28 32.6 27.2H15.4Q13.8 28 11.6 27.4Z" fill="url(#${id}g)" stroke="#7a520a" stroke-width=".5"/>
  <path d="M16.6 27.2H31.4V29.6H16.6Z" fill="url(#${id}r)"/><path d="M18.4 27.2V29.6M21.6 27.2V29.6M26.4 27.2V29.6M29.6 27.2V29.6" stroke="#f0c24b" stroke-width=".5"/>
  <path d="M8.4 35Q13.2 33.6 16 29.4H32Q34.8 33.6 39.6 35Q37.2 35.6 35.4 34.8H12.6Q10.8 35.6 8.4 35Z" fill="url(#${id}g)" stroke="#7a520a" stroke-width=".5"/>
  <path d="M14.8 34.8H33.2V44.6H14.8Z" fill="url(#${id}r)" stroke="#5e130e" stroke-width=".5"/>
  <path d="M21.8 44.6V40.4Q24 37.6 26.2 40.4V44.6Z" fill="#3a0d09"/><path d="M16.8 44.6V41.6Q18.2 40 19.6 41.6V44.6M28.4 44.6V41.6Q29.8 40 31.2 41.6V44.6" fill="#3a0d09"/>
  ${shine('M14 26.2Q16.8 24 18.6 22.4')}`,
 // Ancient battlefields: a bronze shield disc with crossed dagger-axes (ge) and a cloud-scroll rim.
 'misc-ancient-battles':id=>`<defs><radialGradient id="${id}b" cx=".4" cy=".32" r=".8"><stop offset="0" stop-color="#e2c08a"/><stop offset=".6" stop-color="#9c6f35"/><stop offset="1" stop-color="#4f3317"/></radialGradient></defs>${ribbon('#7a1d1a','#2a2622')}
  <circle cx="24" cy="31" r="14.5" fill="url(#${id}b)" stroke="#3e2810" stroke-width=".8"/>
  <circle cx="24" cy="31" r="11.8" fill="none" stroke="#3e2810" stroke-width=".7" stroke-dasharray="2.2 1.1" opacity=".7"/>
  <path d="M16.2 39.6L31.6 22.6M31.8 39.6L16.4 22.6" stroke="#5b3a14" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M29.8 22.4L33.6 21.2L32.4 25L30.6 24.6Z M18.2 22.4L14.4 21.2L15.6 25L17.4 24.6Z" fill="#cfd4d6" stroke="#4a4e50" stroke-width=".4"/>
  <circle cx="24" cy="31" r="2.6" fill="#7a4f1f" stroke="#3e2810" stroke-width=".5"/><circle cx="24" cy="31" r="1" fill="#e2c08a"/>
  ${shine('M13.4 27.8A11 11 0 0 1 18.8 20.4')}`,
 // Silk Road stops: an ancient round coin with a square hole and a camel, on silk-coloured ribbon.
 'misc-silk-road':id=>`<defs>${gold(id+'g')}</defs>${ribbon('#c8862e','#2f8f8a')}
  <circle cx="24" cy="31" r="14.5" fill="url(#${id}g)" stroke="#7a520a" stroke-width=".8"/>
  <circle cx="24" cy="31" r="12.2" fill="none" stroke="#7a520a" stroke-width=".6" opacity=".7"/>
  <rect x="21.2" y="22.6" width="5.6" height="5.6" fill="#fdfcf8" stroke="#7a520a" stroke-width=".7"/>
  <path d="M15.2 41.2L15.9 37.2Q15.5 35.6 16.7 34.8Q17.6 32.4 19.3 33.9Q20.2 31.9 21.9 33.6Q23.1 34.3 23.9 33.4L25.3 30.9Q25.9 30.1 26.8 30.5L27.6 31.3Q27.8 31.9 27.1 32.1L26.4 32.2Q25.7 35.5 24.3 36.6L24.6 41.2H23.5L23 37.6H22.4L22.2 41.2H21.2L21.1 37.6H18L17.5 41.2H16.5L16.9 37.7L16.3 41.2Z" fill="#6e4806"/>
  <path d="M28.6 39.4Q31 38.2 33 39.4" stroke="#7a520a" stroke-width=".5" fill="none"/>${shine('M13.6 27.4A11 11 0 0 1 18.6 20.6')}`,
 // Sacred mountains: a jade disc (bi) with ink peaks, clouds and a red sun.
 'misc-sacred-mountains':id=>`<defs><radialGradient id="${id}j" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#d7eedd"/><stop offset=".6" stop-color="#7fb796"/><stop offset="1" stop-color="#3b7558"/></radialGradient><clipPath id="${id}c"><circle cx="24" cy="31" r="11.6"/></clipPath></defs>${ribbon('#3f8a64','#eef3ea')}
  <circle cx="24" cy="31" r="14.5" fill="url(#${id}j)" stroke="#2c5a43" stroke-width=".8"/>
  <circle cx="24" cy="31" r="11.6" fill="#f3f0e4"/>
  <g clip-path="url(#${id}c)"><circle cx="29.4" cy="25.6" r="2" fill="#c7402f"/>
   <path d="M10 41L17 28.5L20.4 33L24 24.6L29 34L31.4 30.4L38 41Z" fill="#3d4a44"/><path d="M15 41L20.6 34.4L24.6 38.6L28.6 33.6L34 41Z" fill="#6b7a6f"/>
   <path d="M12.6 34.6Q15.4 33.4 18 34.6Q20.6 33.4 23.2 34.6M24 30.4Q26.4 29.4 28.6 30.4" stroke="#fff" stroke-width=".9" fill="none" stroke-linecap="round"/></g>
  <circle cx="24" cy="31" r="11.6" fill="none" stroke="#2c5a43" stroke-width=".5"/>${shine('M13.4 28A11 11 0 0 1 18.4 20.6')}`,
 // Great Wall passes: a crenellated stone badge with the wall climbing over a ridge to a watchtower.
 'misc-wall-passes':id=>`<defs>${grad(id+'s',[[0,'#d8cfbd'],[1,'#8f8574']])}${grad(id+'k',[[0,'#e9eef0'],[1,'#c4d4da']],0,1)}</defs>${ribbon('#7d6a55','#b8282e')}
  <path d="M12.6 19.8H15.6V21.8H18.6V19.8H21.6V21.8H26.4V19.8H29.4V21.8H32.4V19.8H35.4V38.4Q30.4 44.6 24 45.8Q17.6 44.6 12.6 38.4Z" fill="url(#${id}s)" stroke="#5a5040" stroke-width=".7"/>
  <path d="M15 24H33V37.4Q29 42.6 24 43.6Q19 42.6 15 37.4Z" fill="url(#${id}k)"/>
  <path d="M15 37.4Q19 31 23 33.4Q26.6 35.6 30 29.4L33 27V37.4Q29 42.6 24 43.6Q19 42.6 15 37.4Z" fill="#7d9a6a"/>
  <path d="M15 36.2Q19 30 23 32.4Q26.6 34.6 30 28.4L33 26" fill="none" stroke="#8a7a62" stroke-width="1.6"/>
  <path d="M15 36.2Q19 30 23 32.4Q26.6 34.6 30 28.4L33 26" fill="none" stroke="#5a5040" stroke-width=".4" stroke-dasharray=".8 .6"/>
  <path d="M27.4 30.6V26.4H26.8V25.4H32.2V26.4H31.6V29" fill="#9e9080" stroke="#5a5040" stroke-width=".45"/><path d="M26.6 25.4L29.5 23.6L32.4 25.4Z" fill="#7a3a24"/>
  ${shine('M14.2 22.6V37')}`,
 // Imperial tombs: a stone stele on its tortoise base, with a dragon-carved crown and inscription.
 'misc-imperial-tombs':id=>`<defs>${grad(id+'s',[[0,'#ebe6dc'],[.5,'#bdb5a6'],[1,'#7e7667']])}</defs>${ribbon('#2f5a46','#c9a43c')}
  <path d="M17.4 40.6V25.4Q17.4 19.6 24 19.4Q30.6 19.6 30.6 25.4V40.6Z" fill="url(#${id}s)" stroke="#5e584b" stroke-width=".7"/>
  <path d="M19.2 24.6Q20.4 21.4 24 21.2Q27.6 21.4 28.8 24.6Q26.6 23.4 24 24.6Q21.4 23.4 19.2 24.6Z" fill="#9a917f" stroke="#5e584b" stroke-width=".4"/>
  <rect x="21.2" y="26.4" width="5.6" height="12.4" fill="none" stroke="#5e584b" stroke-width=".5"/>
  <path d="M22.4 28H25.6M22.4 29.6H25.6M22.4 31.2H25.6M22.4 32.8H25.6M22.4 34.4H25.6M22.4 36H25.6M22.4 37.6H25.6" stroke="#5e584b" stroke-width=".55" stroke-dasharray=".8 .45"/>
  <path d="M13.4 45.4Q12.8 41.6 16.4 40.4H31.6Q35.2 41.6 34.6 45.4Z" fill="#8f8a6c" stroke="#4e4a38" stroke-width=".6"/>
  <path d="M15.6 42.6Q20 41.6 24 42.8Q28 41.6 32.4 42.6" stroke="#4e4a38" stroke-width=".45" fill="none"/><circle cx="34" cy="43.4" r="1.3" fill="#8f8a6c" stroke="#4e4a38" stroke-width=".5"/>
  ${shine('M18.6 26V39.6')}`,
 // Grottoes & ancient temples: a gilded pagoda of five tiers with upturned eaves, on its plinth.
 'misc-grottoes-temples':id=>`<defs>${gold(id+'g')}${grad(id+'w',[[0,'#c3473b'],[1,'#7e2018']],0,1)}</defs>${ribbon('#d48a1e','#7a1f2b')}
  <path d="M23.4 17.8H24.6V21H23.4Z" fill="#94650a"/>
  ${[[21,4.2,2.6],[25,5.4,3.2],[29.2,6.6,3.2],[33.6,7.8,3.2],[38.2,9,6.4]].map(([y,w,h])=>`<rect x="${24-w*.62}" y="${y}" width="${w*1.24}" height="${h}" fill="url(#${id}w)" stroke="#5e130e" stroke-width=".4"/><path d="M${24-w-1.6} ${y+.4}Q${24-w} ${y+1.2} ${24-w*.7} ${y}H${24+w*.7}Q${24+w} ${y+1.2} ${24+w+1.6} ${y+.4}L${24+w*.62} ${y-1.4}H${24-w*.62}Z" fill="url(#${id}g)" stroke="#7a520a" stroke-width=".45"/>`).join('')}
  <path d="M22.2 44.6V42Q24 40.4 25.8 42V44.6Z" fill="#3a0d09"/><rect x="13.8" y="44.4" width="20.4" height="1.6" rx=".4" fill="url(#${id}g)" stroke="#7a520a" stroke-width=".4"/>`,
 // Poets' birthplaces: an open folding fan hung from the ribbon, with a plum branch, verse and a seal.
 'misc-poet-birthplaces':id=>{const P=41.2,R=21.6,tip=a=>[(24+R*Math.sin(a*Math.PI/180)).toFixed(2),(P-R*Math.cos(a*Math.PI/180)).toFixed(2)];const [lx,ly]=tip(-45),[rx,ry]=tip(45);return `<defs>${grad(id+'p',[[0,'#fbf6e8'],[1,'#e8dcc0']],0,1)}</defs>${ribbon('#2c3e6e','#e9e1cc')}
  <path d="M24 ${P}L${lx} ${ly}A${R} ${R} 0 0 1 ${rx} ${ry}Z" fill="url(#${id}p)" stroke="#6b5a3c" stroke-width=".6" stroke-linejoin="round"/>
  ${[-36,-27,-18,-9,0,9,18,27,36].map(a=>{const [x,y]=tip(a);return `<path d="M24 ${P}L${x} ${y}" stroke="#c9b991" stroke-width=".35"/>`;}).join('')}
  <path d="M24 ${P}L18.3 35.5A8 8 0 0 1 29.7 35.5Z" fill="#5b3a1c" stroke="#3a240f" stroke-width=".5"/><circle cx="24" cy="${P}" r=".9" fill="#c9a43c"/>
  <g transform="translate(-.4 -4.6)"><path d="M13.6 31.4Q17.6 29.6 20.2 26.6Q21.4 25.2 22.6 25.4" stroke="#3a2a1c" stroke-width=".8" fill="none" stroke-linecap="round"/>
  <circle cx="17.6" cy="29.6" r="1.1" fill="#d24b5a"/><circle cx="20.4" cy="26.8" r="1" fill="#d24b5a"/><circle cx="15.4" cy="30.2" r=".8" fill="#e8798a"/><circle cx="21.8" cy="25.1" r=".7" fill="#e8798a"/></g>
  <path d="M27.2 22.2V29.6M29.2 22.8V29M31.2 23.8V28.4" stroke="#2b2620" stroke-width=".7" stroke-dasharray="1 .6"/>
  <circle cx="33.6" cy="28" r=".9" fill="#b8282e"/>`;}
};
export const chinaMiscMedalIds=Object.keys(designs);
export function chinaMiscMedalMarkup(id){const design=designs[id];return design?`<svg class="quiz-medal" viewBox="0 0 48 48" aria-hidden="true">${design('cn-misc-medal-'+(++drawn))}</svg>`:'';}
