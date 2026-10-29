// Medals for the US Miscellaneous quizzes, one design per topic, each on its own ribbon; a topic's
// medal is earned in a mode by a perfect full round. Gradient and clip IDs are unique per drawing.
let drawn=0;
const ribbon=(a,b,stripe)=>`<path d="M12 1.5h9l6.5 18h-9z" fill="${a}"/><path d="M15.4 1.5h2.2l6.5 18h-2.2z" fill="${stripe||b}" opacity=".9"/><path d="M36 1.5h-9l-6.5 18h9z" fill="${b}"/><path d="M32.6 1.5h-2.2l-6.5 18h2.2z" fill="${stripe||a}" opacity=".9"/><path d="M19 17.5h10l-1 3h-8z" fill="#000" opacity=".18"/>`;
const grad=(id,stops,x2=1,y2=1)=>`<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o,c])=>`<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const gold=id=>grad(id,[[0,'#fff1a6'],[.5,'#e6b131'],[1,'#94650a']]);
const shine=d=>`<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.1" stroke-linecap="round"/>`;
const leaves=()=>{let out='';for(let i=0;i<9;i++)for(const t of [Math.PI*(.18+i*.08),Math.PI*(.82-i*.08)]){const x=(24+10.2*Math.cos(t)).toFixed(2),y=(31+10.2*Math.sin(t)).toFixed(2);out+=`<ellipse cx="${x}" cy="${y}" rx="1.5" ry=".7" transform="rotate(${(t*180/Math.PI+90).toFixed(1)} ${x} ${y})" fill="#7a8a3a" stroke="#4a5520" stroke-width=".3"/>`;}return out;};
const designs={
 // College towns: a collegiate crest shield with an open book and a mortarboard.
 'misc-college-towns':id=>`<defs>${grad(id+'m',[[0,'#c23a40'],[1,'#6a1420']])}${gold(id+'g')}</defs>${ribbon('#9e2530','#e2b23a')}
  <path d="M12.5 18.5H35.5V30.5C35.5 38.5 29.5 43.5 24 45.5C18.5 43.5 12.5 38.5 12.5 30.5Z" fill="url(#${id}g)" stroke="#7a560c" stroke-width=".7"/>
  <path d="M14.5 20.5H33.5V30.5C33.5 37.3 28.6 41.6 24 43.3C19.4 41.6 14.5 37.3 14.5 30.5Z" fill="url(#${id}m)"/>
  <path d="M16.5 33.2Q20.3 31.4 24 33.2Q27.7 31.4 31.5 33.2V39.2Q27.7 37.4 24 39.2Q20.3 37.4 16.5 39.2Z" fill="#fff7e4" stroke="#5a1019" stroke-width=".5"/><path d="M24 33.2V39.2" stroke="#5a1019" stroke-width=".5"/>
  <path d="M18.5 34.6Q20.6 33.8 22.5 34.6M18.5 36.2Q20.6 35.4 22.5 36.2M25.5 34.6Q27.4 33.8 29.5 34.6M25.5 36.2Q27.4 35.4 29.5 36.2" stroke="#b9a37a" stroke-width=".45" fill="none"/>
  <path d="M24 22.6L31.6 25.7L24 28.8L16.4 25.7Z" fill="#1d2640"/><path d="M19.8 27.2V29.3Q24 31.3 28.2 29.3V27.2L24 28.8Z" fill="#141b30"/>
  <path d="M24 25.7L30.4 26.6V30.4" stroke="#f0c24b" stroke-width=".7" fill="none"/><circle cx="30.4" cy="30.8" r=".9" fill="#f0c24b"/>
  ${shine('M15.8 22.5Q15.6 30 17.5 34')}`,
 // Civil War battlefields: a bronze campaign medal, crossed sabres in a laurel wreath, blue and grey ribbon.
 'misc-civil-war':id=>`<defs><radialGradient id="${id}b" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#f0c48e"/><stop offset=".6" stop-color="#b47a3e"/><stop offset="1" stop-color="#6b4220"/></radialGradient></defs>${ribbon('#2f4f86','#8a9098')}
  <circle cx="24" cy="31" r="14.5" fill="url(#${id}b)" stroke="#5c3818" stroke-width=".8"/><circle cx="24" cy="31" r="12" fill="none" stroke="#5c3818" stroke-opacity=".5" stroke-width=".6"/>
  ${leaves()}
  <path d="M17 38L30.5 23.5M31 38L17.5 23.5" stroke="#e9e3d6" stroke-width="1.3" stroke-linecap="round"/><path d="M17 38L30.5 23.5M31 38L17.5 23.5" stroke="#5c3818" stroke-width=".35" stroke-linecap="round"/>
  <path d="M15.6 36.6l2.8 2.8M32.4 36.6l-2.8 2.8" stroke="#3a2410" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M24 26.4l1.2 2.5 2.7.3-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.3z" fill="#f4d9a4" stroke="#5c3818" stroke-width=".4"/>
  ${shine('M13.2 28A11 11 0 0 1 18.5 20.2')}`,
 // National parks: an arrowhead badge with a snow-capped peak, a pine and a lake.
 'misc-national-parks':id=>`<defs>${grad(id+'s',[[0,'#d9ecf2'],[1,'#a9cfd9']],0,1)}${grad(id+'r',[[0,'#8a6236'],[1,'#4a2f17']])}<clipPath id="${id}c"><path d="M24 17.6C29.4 21 33.4 26 32.8 31.4C32.1 37.4 27.6 41.6 24 43.5C20.4 41.6 15.9 37.4 15.2 31.4C14.6 26 18.6 21 24 17.6Z"/></clipPath></defs>${ribbon('#2e6b3c','#c9a66b')}
  <path d="M24 15C30.5 19 35.5 25 34.8 31.5C34 38.5 28.5 43.5 24 45.8C19.5 43.5 14 38.5 13.2 31.5C12.5 25 17.5 19 24 15Z" fill="url(#${id}r)" stroke="#3a240f" stroke-width=".7"/>
  <g clip-path="url(#${id}c)"><rect x="10" y="15" width="28" height="32" fill="url(#${id}s)"/>
   <path d="M13 36L21.5 24.5L26 30L28.5 27L36 36Z" fill="#6f7f86"/><path d="M19.4 27.3L21.5 24.5L23.7 27.4L22.4 26.7L21.5 27.9L20.6 26.8Z" fill="#fff"/>
   <path d="M10 35.5Q18 33.2 24 35.2T38 34.6V47H10Z" fill="#3f7a3a"/><path d="M14 39.8Q22 38.4 30 40.2V47H14Z" fill="#5aa0c8" opacity=".85"/>
   <path d="M29.5 26.5L33 35.5H26Z" fill="#1f4d26"/><path d="M29.5 23.8L32.2 31H26.8Z" fill="#2a6331"/><rect x="29" y="35.3" width="1" height="1.8" fill="#4a2f17"/></g>
  <path d="M24 17.6C29.4 21 33.4 26 32.8 31.4C32.1 37.4 27.6 41.6 24 43.5C20.4 41.6 15.9 37.4 15.2 31.4C14.6 26 18.6 21 24 17.6Z" fill="none" stroke="#e6c88e" stroke-width=".6"/>`,
 // Sports towns: a classic two-handled cup on a stepped plinth, on a red, white and navy ribbon.
 'misc-sports-towns':id=>`<defs>${grad(id+'g',[[0,'#fff3b8'],[.35,'#f2c444'],[.7,'#c8901c'],[1,'#8a5d08']],1,0)}${grad(id+'w',[[0,'#4a3322'],[1,'#22160d']],0,1)}</defs>${ribbon('#c4473d','#24386b','#fff')}
  <path d="M16.4 22.4C12.2 21.9 11.6 28.6 17.6 29.6" fill="none" stroke="#8a5d08" stroke-width="2.2" stroke-linecap="round"/><path d="M16.4 22.4C12.2 21.9 11.6 28.6 17.6 29.6" fill="none" stroke="#f2c444" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M31.6 22.4C35.8 21.9 36.4 28.6 30.4 29.6" fill="none" stroke="#8a5d08" stroke-width="2.2" stroke-linecap="round"/><path d="M31.6 22.4C35.8 21.9 36.4 28.6 30.4 29.6" fill="none" stroke="#f2c444" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M15.2 20.6H32.8C32.8 27.4 29.4 31.6 25.4 32.6V35.2C25.4 36.2 26.6 36.8 27.6 37.2H20.4C21.4 36.8 22.6 36.2 22.6 35.2V32.6C18.6 31.6 15.2 27.4 15.2 20.6Z" fill="url(#${id}g)" stroke="#7a520a" stroke-width=".6" stroke-linejoin="round"/>
  <ellipse cx="24" cy="20.6" rx="8.8" ry="1.1" fill="#fff6c8" stroke="#7a520a" stroke-width=".5"/>
  <path d="M19.2 37.2H28.8V38.8H19.2Z" fill="url(#${id}g)" stroke="#7a520a" stroke-width=".5"/>
  <path d="M17.6 38.8H30.4L31.2 44.6H16.8Z" fill="url(#${id}w)" stroke="#170e07" stroke-width=".5"/><rect x="20.4" y="40.4" width="7.2" height="2.4" rx=".4" fill="url(#${id}g)" stroke="#7a520a" stroke-width=".35"/>
  <path d="M24 23.2l1.05 2.13 2.35.34-1.7 1.66.4 2.34-2.1-1.1-2.1 1.1.4-2.34-1.7-1.66 2.35-.34z" fill="#fff8d6" stroke="#9a6c10" stroke-width=".4"/>
  <path d="M17.4 22.6C17.6 26.6 19.2 29.2 21.4 30.4" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".9" stroke-linecap="round"/>`,
 // Revolutionary battlefields: the Liberty Bell as it hangs: dark timber yoke, olive-bronze patina,
 // two inscription bands, a flared lip and its long crack. Continental blue and buff ribbon.
 'misc-revolution':id=>`<defs>${grad(id+'b',[[0,'#3c4333'],[.3,'#7d8466'],[.5,'#5d6450'],[.8,'#3a4031'],[1,'#262b20']],1,0)}${grad(id+'y',[[0,'#3d2c20'],[1,'#1e150e']],0,1)}</defs>${ribbon('#27406e','#d8bf8c')}
  <path d="M10.8 17.4H37.2V22.6H33.2V21.2H14.8V22.6H10.8Z" fill="url(#${id}y)" stroke="#120c07" stroke-width=".5" stroke-linejoin="round"/>
  <path d="M12.4 18.8Q18 18.3 23 19M25.5 18.9Q31 18.4 35.8 19.2M13 20.3Q17 20 20.6 20.4" stroke="#5a4433" stroke-width=".35" fill="none"/>
  <rect x="13.4" y="16.6" width="1.4" height="1" fill="#2a2f27"/><rect x="33.2" y="16.6" width="1.4" height="1" fill="#2a2f27"/><rect x="18.6" y="16.6" width="1.4" height="1" fill="#2a2f27"/><rect x="28" y="16.6" width="1.4" height="1" fill="#2a2f27"/>
  <path d="M20.6 17.6L22.6 22.4M27.4 17.6L25.4 22.4" stroke="#2e342b" stroke-width=".8" stroke-linecap="round"/><rect x="22.4" y="21.2" width="3.2" height="2.8" rx=".5" fill="#363c33" stroke="#1d211a" stroke-width=".4"/>
  <path d="M17.8 26.4C18 24.5 20.7 23.6 24 23.6C27.3 23.6 30 24.5 30.2 26.4C30.4 31 30.6 35 33.1 38.9C33.9 40 34.4 41.1 34.2 42C30.8 42.7 27.4 43 24 43C20.6 43 17.2 42.7 13.8 42C13.6 41.1 14.1 40 14.9 38.9C17.4 35 17.6 31 17.8 26.4Z" fill="url(#${id}b)" stroke="#1d211a" stroke-width=".6" stroke-linejoin="round"/>
  <path d="M17.9 27.6Q24 28.4 30.1 27.6M17.95 31.2Q24 32 30.05 31.2" stroke="#1d211a" stroke-width=".4" fill="none" opacity=".75"/>
  <path d="M18.6 29.4Q24 30.1 29.4 29.4" stroke="#a7ad8c" stroke-width=".7" stroke-dasharray=".7 .45" fill="none" opacity=".55"/>
  <path d="M14.6 39.8Q24 41.3 33.4 39.8M14.1 41.1Q24 42.5 33.9 41.1" stroke="#1d211a" stroke-width=".4" fill="none" opacity=".7"/>
  <circle cx="22.7" cy="32.4" r=".45" fill="#1d211a"/><path d="M22.7 32.6C22.4 34.4 23.1 35.6 22.8 37.2C22.6 38.6 23.4 39.6 23.2 40.8L23.5 42.9" stroke="#11140f" stroke-width=".6" fill="none" stroke-linecap="round"/>
  <path d="M19.2 26.2C18.6 30.5 18.3 34.5 16.6 38.6" fill="none" stroke="#c9cfae" stroke-opacity=".55" stroke-width=".9" stroke-linecap="round"/>`,
 // Presidential birthplaces: a gilded log cabin with a star in the gable.
 'misc-presidents':id=>`<defs>${gold(id+'g')}</defs>${ribbon('#b8323a','#24386b','#fff')}
  <path d="M12.6 31.2L24 19.6L35.4 31.2H33.4V44.4H14.6V31.2Z" fill="url(#${id}g)" stroke="#7a560c" stroke-width=".7" stroke-linejoin="round"/>
  <path d="M14.6 33.4H33.4M14.6 35.8H33.4M14.6 38.2H33.4M14.6 40.6H33.4M14.6 43H33.4" stroke="#8a6210" stroke-width=".55" opacity=".75"/>
  <path d="M10.8 31.6L24 18.2L37.2 31.6" fill="none" stroke="#7a3a14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="21.2" y="36.4" width="5.6" height="8" rx=".5" fill="#5b3b1c" stroke="#3a240f" stroke-width=".5"/><circle cx="25.6" cy="40.6" r=".45" fill="#f0c24b"/>
  <rect x="16.2" y="35.6" width="3.4" height="3" fill="#2c3f70" stroke="#3a240f" stroke-width=".4"/><rect x="28.4" y="35.6" width="3.4" height="3" fill="#2c3f70" stroke="#3a240f" stroke-width=".4"/>
  <path d="M24 23.4l1.05 2.13 2.35.34-1.7 1.66.4 2.34-2.1-1.1-2.1 1.1.4-2.34-1.7-1.66 2.35-.34z" fill="#fff" stroke="#7a560c" stroke-width=".4"/>
  ${shine('M16.4 31Q16.2 37 16.8 42.4')}`
};
export const usMiscMedalIds=Object.keys(designs);
export function usMiscMedalMarkup(id){const design=designs[id];return design?`<svg class="quiz-medal" viewBox="0 0 48 48" aria-hidden="true">${design('us-misc-medal-'+(++drawn))}</svg>`:'';}
