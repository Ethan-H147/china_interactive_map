import {searchRank} from './search-ranking.mjs';
import {loadStatistics,formatMoney} from './statistics.mjs';
import {japanPopulation,japanLocalStatistics} from './japan-local-facts.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n;};
const normalize=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
export const comparisonLevel=p=>p.level==='province'?'province':p.level==='taiwan-region'||p.level==='city'&&String(p.adcode).slice(2,4)!=='90'?'prefecture':null;
export const matchesComparisonLevel=(p,level)=>comparisonLevel(p)===level||level==='prefecture'&&p.level==='province'&&[110000,120000,310000,500000].includes(p.adcode);
export function chinaComparisonProfile({regions,name,kind,provincePopulation,regionPopulation}){
 return {title:'China',levels:[['province','Provinces & provincial-level regions'],['prefecture','Prefectures, municipalities & Taiwan divisions']],
  records:regions.map(l=>l.feature.properties).filter(comparisonLevel).map(p=>({...p,id:String(p.adcode),en:name(p),local:p.name,kind:kind(p)})),
  level:comparisonLevel,matches:matchesComparisonLevel,key:p=>'china:'+p.adcode,
  population:p=>{const r=p.level==='province'?provincePopulation.china[p.adcode]:regionPopulation.regions[p.adcode];return r?{...r,sourceUrl:r.sourceUrl||regionPopulation.source.revisionUrl,measure:r.measure||'Entire administrative region · 2020 boundaries'}:null;}};
}
export function japanComparisonProfile(records,facts){
 const index=new Map(records.map(p=>[p.id,p]));
 return {title:'Japan',levels:[['1','Prefectures'],['2','Municipalities · cities, towns, villages & special wards'],['3','Designated-city wards']],
  records:records.map(p=>({...p,local:p.ja,parentName:index.get(p.parent)?.en,scopeName:p.level===3?index.get(p.prefecture)?.en:''})),level:p=>String(p.level),key:p=>'japan:'+p.id,
  population:p=>japanPopulation(facts,p.id,p.kind),metric:(p,key,data)=>p.level>1?japanLocalStatistics(facts,p.id).regions['japan:'+p.id]?.[key]:data.regions['japan:'+p.id]?.[key],sources:{'japan-census':facts.source}};
}
export function koreaComparisonProfile(records){
 const index=new Map(records.map(p=>[p.id,p]));
 return {title:'Korea',levels:[['1','Provinces & special cities'],['2','Cities, counties & districts']],records:records.map(p=>({...p,local:p.ko,kind:p.type,parentName:index.get(p.parent)?.en,scopeName:p.country==='KR'?'South Korea':'North Korea'})),level:p=>String(p.level),key:p=>'korea:'+p.id,population:()=>null};
}
export function createComparison(initial){
 const profiles=new Map();let profile,country,data,revision=0;
 const dialog=el('dialog');dialog.id='region-comparison';dialog.setAttribute('aria-labelledby','comparison-title');
 const head=el('div');head.className='comparison-head';const title=el('h2','Compare regions');title.id='comparison-title';const close=el('button','Close');close.type='button';close.onclick=()=>dialog.close();head.append(title,close);
 dialog.addEventListener('close',()=>revision++);
 const note=el('p','Latest available figures in the atlas. Dates and population definitions can differ; missing figures are not zero.');note.className='comparison-note';
 const levelLabel=el('label','Compare '),level=el('select');level.setAttribute('aria-label','Comparison level');levelLabel.append(level);
 const picks=el('div');picks.className='comparison-pickers';const slots=[0,1].map(i=>{const box=el('div'),label=el('label',i?'Second region':'First region'),search=el('input'),select=el('select');search.type='search';search.placeholder='Search names or administrative codes';search.setAttribute('aria-label',`Search ${i?'second':'first'} region`);select.id=`comparison-region-${i}`;label.htmlFor=select.id;box.append(label,search,select);picks.append(box);return {search,select};});
 const output=el('div');output.className='comparison-output';output.setAttribute('aria-live','polite');dialog.append(head,note,levelLabel,picks,output);document.body.append(dialog);
 const matches=(p,value)=>profile.matches?profile.matches(p,value):profile.level(p)===value;
 const chosen=()=>slots.map(s=>profile.records.find(p=>p.id===s.select.value));
 const searchNames=p=>[p.en,p.local,p.id,p.parentName,p.scopeName].filter(Boolean);
 function options(i,preferred,preserve=true){const {search,select}=slots[i],q=normalize(search.value.trim()),other=slots[1-i].select.value,old=preferred!=null?String(preferred):(preserve?select.value:'');select.replaceChildren();for(const p of profile.records.filter(p=>matches(p,level.value)&&p.id!==other&&(!q||normalize(searchNames(p).join(' ')).includes(q))).sort((a,b)=>searchRank(q,searchNames(a))-searchRank(q,searchNames(b))||a.en.localeCompare(b.en))){const o=el('option',p.en+' · '+p.local+(p.parentName?' · '+p.parentName:'')+(p.scopeName?' · '+p.scopeName:''));o.value=p.id;select.append(o);}if([...select.options].some(o=>o.value===old))select.value=old;}
 const source=(cell,url,label='Source')=>{if(!url)return;const a=el('a',label);a.href=url;a.target='_blank';a.rel='noopener';cell.append(a);};
 const population=(p,cell)=>{const r=profile.population(p);if(r?.total==null){cell.append(el('span','Not available'));return;}cell.append(el('strong',r.total.toLocaleString('en-US')),el('small',r.dateLabel||r.date),el('small',r.measure||'Entire administrative region'));source(cell,r.sourceUrl);if(r.inconsistent)cell.append(el('small','Source figures contain inconsistencies.'));};
 async function render(){const ticket=++revision,current=profile;output.replaceChildren(el('p','Loading comparison…'));try{data=await loadStatistics();if(ticket!==revision||current!==profile)return;const pair=chosen();if(pair.some(p=>!p)){output.replaceChildren(el('p','No matching regions. Clear the search to choose another.'));return;}
  const sources={...data.sources,...profile.sources},metric=(p,key)=>profile.metric?profile.metric(p,key,data):data.regions[profile.key(p)]?.[key];
  const table=el('table'),caption=el('caption',pair.map(p=>p.en).join(' compared with '));table.append(caption);const thead=el('thead'),h=el('tr');h.append(el('th','Measure'));for(const p of pair){const th=el('th');th.scope='col';th.append(el('strong',p.en),el('small',p.local),el('small',p.kind),el('small',[p.parentName,p.scopeName].filter(Boolean).join(' · ')));h.append(th);}thead.append(h);table.append(thead);const body=el('tbody');
  for(const [key,label] of [['population','Population'],['area','Area'],['gdp','GDP'],['gdpPerCapita','GDP per capita']]){const row=el('tr'),heading=el('th',label);heading.scope='row';row.append(heading);for(const p of pair){const cell=el('td');if(key==='population')population(p,cell);else{const m=metric(p,key);if(!m)cell.append(el('span','Not available'));else{cell.append(el('strong',key==='area'?(m.method==='mapped'?'≈ ':'')+m.value.toLocaleString('en-US',{maximumFractionDigits:2})+' km²':formatMoney(m.value,m.currency,key==='gdpPerCapita')));if(key!=='area')cell.append(el('span',m.usd!=null?'≈ '+formatMoney(m.usd,'USD',key==='gdpPerCapita'):'USD conversion unavailable'));cell.append(el('small',m.year?String(m.year):'Date not specified'));if(m.method==='mapped')cell.append(el('small','Estimated from mapped boundaries'));source(cell,sources[m.source]?.url);if(m.note)cell.append(el('small',m.note));if(m.exchangeSource)source(cell,sources[m.exchangeSource]?.url,'USD conversion source');}}row.append(cell);}body.append(row);}table.append(body);output.replaceChildren(table);
  for(const p of pair){const n=data.regions[profile.key(p)]?.note||p.note;if(n)output.append(el('p',p.en+': '+n));}
  output.append(el('p','GDP is nominal, not adjusted for purchasing power. Values from different years are not a same-year ranking.'));
 }catch{if(ticket!==revision)return;const retry=el('button','Retry');retry.onclick=render;output.replaceChildren(el('p','Comparison data could not load.'),retry);}}
 function reset(code,second){slots.forEach(s=>{s.search.value='';s.select.replaceChildren();});options(0,code);options(1,second);render();}
 level.onchange=()=>{const keep=chosen().map(p=>p&&matches(p,level.value)?p.id:undefined);reset(...keep);};slots.forEach((s,i)=>{s.search.oninput=()=>{options(i,undefined,false);options(1-i);render();};s.select.onchange=()=>{options(1-i);render();};});
 const api={register(key,value){const record=value.records?value:chinaComparisonProfile(value);profiles.set(key,{...record,records:record.records.map(p=>({...p,id:String(p.id)}))});},open(code,key='china'){const next=profiles.get(key);if(!next)return false;if(country!==key||profile!==next){revision++;country=key;profile=next;title.textContent='Compare '+profile.title;level.replaceChildren();for(const [v,t]of profile.levels){const o=el('option',t);o.value=v;level.append(o);}slots.forEach(s=>s.select.replaceChildren());}const p=profile.records.find(p=>p.id===String(code));if(p){if(!matches(p,level.value))level.value=profile.level(p);reset(p.id);}else if(!slots[0].select.options.length)reset();else render();if(!dialog.open)dialog.showModal();return true;},eligible:p=>!!comparisonLevel(p)};
 if(initial)api.register('china',initial);return api;
}
