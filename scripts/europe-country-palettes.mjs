// Build-time country themes. Runtime map and interface colors are emitted
// together so a country cannot inherit another country's flag palette.
export const europeCountryPalettes={
 'bosnia-herzegovina':{accent:'#28539a',dark:'#193b76',secondary:'#af8825',background:'#f6f3e8',fill:'#f1e8c9',selected:'#e2ca7e',line:'#365c98',stripe:'linear-gradient(90deg,#244996 0 35%,#e8c347 35% 72%,#fffdf6 72%)'},
 croatia:{accent:'#a9323e',dark:'#81212d',secondary:'#354c89',background:'#f8f0f0',fill:'#f1dfe1',selected:'#e2afb7',line:'#a23b4a',stripe:'linear-gradient(90deg,#b63943 0 33.333%,#fffdf8 33.333% 66.667%,#344a89 66.667%)'},
 romania:{accent:'#28518a',dark:'#193b69',secondary:'#b58c22',background:'#f7f4e8',fill:'#f2e8c4',selected:'#e6cf80',line:'#34578e',stripe:'linear-gradient(90deg,#284b86 0 33.333%,#edc645 33.333% 66.667%,#b73642 66.667%)'},
 belarus:{accent:'#2d6c4b',dark:'#1c4e34',secondary:'#ad3545',background:'#f0f5ed',fill:'#e2ecda',selected:'#b9d3a6',line:'#35704c',stripe:'linear-gradient(90deg,#fffaf6 0 5%,#b53744 5% 68%,#36754f 68%)'},
 albania:{accent:'#a02d38',dark:'#76202a',secondary:'#28282c',background:'#f7efef',fill:'#efdcdf',selected:'#dba6ae',line:'#912f3b',stripe:'linear-gradient(90deg,#b6313c 0 42%,#26262a 42% 58%,#b6313c 58%)'},
 montenegro:{accent:'#a1333d',dark:'#78232b',secondary:'#b68a27',background:'#f8f2e9',fill:'#f2e4cc',selected:'#e4c184',line:'#9d3942',stripe:'linear-gradient(90deg,#d0a13b 0 7%,#b0363e 7% 93%,#d0a13b 93%)'},
 kosovo:{accent:'#315c9c',dark:'#234374',secondary:'#ae8734',background:'#eff3f8',fill:'#e0e9f4',selected:'#b8cde9',line:'#3a6099',stripe:'linear-gradient(90deg,#31579a 0 37%,#d3ac53 37% 63%,#31579a 63%)'},
 serbia:{accent:'#3c5187',dark:'#293b68',secondary:'#ad3d47',background:'#f2f1f7',fill:'#e5e4f1',selected:'#c2bfe0',line:'#46588b',stripe:'linear-gradient(90deg,#b33b46 0 33.333%,#3c5187 33.333% 66.667%,#fffdf8 66.667%)'},
 'north-macedonia':{accent:'#a13334',dark:'#7b2425',secondary:'#b08a21',background:'#f9f4e7',fill:'#f4e8bf',selected:'#e7ca70',line:'#a23c36',stripe:'linear-gradient(90deg,#b73a39 0 40%,#edc746 40% 60%,#b73a39 60%)'},
 bulgaria:{accent:'#28694f',dark:'#1b4e3a',secondary:'#b13e3c',background:'#eef5f0',fill:'#dfeee4',selected:'#aed3bb',line:'#347357',stripe:'linear-gradient(90deg,#fffdf8 0 33.333%,#357955 33.333% 66.667%,#b83f3e 66.667%)'},
 estonia:{accent:'#2d608c',dark:'#204667',secondary:'#292e34',background:'#f0f4f7',fill:'#e0eaf2',selected:'#b5cde0',line:'#335f82',stripe:'linear-gradient(90deg,#397bb3 0 33.333%,#272c32 33.333% 66.667%,#fffefd 66.667%)'},
 latvia:{accent:'#8f293b',dark:'#6c1c2b',secondary:'#a75d6a',background:'#f8f1f2',fill:'#f1dfe3',selected:'#dfb2bc',line:'#96364a',stripe:'linear-gradient(90deg,#9d3043 0 40%,#fffdf8 40% 60%,#9d3043 60%)'},
 lithuania:{accent:'#2a6848',dark:'#1d4d33',secondary:'#b68b26',background:'#f7f6eb',fill:'#f0e9cb',selected:'#cad9a1',line:'#387451',stripe:'linear-gradient(90deg,#dfb239 0 33.333%,#34774f 33.333% 66.667%,#b43e49 66.667%)'}
};
export function mix(a,b,amount){const rgb=h=>h.slice(1).match(/../g).map(n=>parseInt(n,16)),x=rgb(a),y=rgb(b);return '#'+x.map((v,i)=>Math.round(v*(1-amount)+y[i]*amount).toString(16).padStart(2,'0')).join('');}
export function themeVariables(p){return {'--red':p.accent,'--red-dark':p.dark,'--ink':mix(p.accent,'#222a2e',.76),'--muted':mix(p.accent,'#747a80',.78),'--gold':p.secondary,'--line':mix(p.accent,'#ffffff',.84),'--paper':mix(p.fill,'#ffffff',.94),'--map':p.background,'--surface-soft':mix(p.fill,'#ffffff',.45),'--accent-soft':mix(p.accent,'#ffffff',.87),'--title-accent':p.accent,'--header-stripe':p.stripe};}
