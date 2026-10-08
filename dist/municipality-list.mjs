const normalize=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim().replace(/\s+/g,' ');
export function filterMunicipalities(records,query){
 const q=normalize(query);
 if(!q)return records;
 const rank=value=>value===q?0:value.startsWith(q)?1:value.split(' ').some(word=>word.startsWith(q))?2:value.includes(q)?3:Infinity;
 return records.map(record=>({record,rank:Math.min(...[record.en,...record.aliases||[]].map(value=>rank(normalize(value))))}))
  .filter(item=>Number.isFinite(item.rank)).sort((a,b)=>a.rank-b.rank||a.record.en.localeCompare(b.record.en,'es')).map(item=>item.record);
}
export function renderMunicipalityList(details,children,selected,onSelect){
 const heading=document.createElement('h3'),count=document.createElement('span');heading.textContent='Municipalities ';count.className='division-count';count.textContent=String(children.length);heading.append(count);
 const input=document.createElement('input');input.type='search';input.placeholder='Filter municipalities';input.setAttribute('aria-label',input.placeholder);input.className='arg-local-filter';
 const list=document.createElement('div');list.className='arg-local-list';list.setAttribute('aria-live','polite');let limit=20;
 const draw=()=>{
  list.replaceChildren();const matches=filterMunicipalities(children,input.value);
  for(const child of matches.slice(0,limit)){const button=document.createElement('button');button.type='button';button.className='search-result';button.textContent=child.en;button.setAttribute('aria-current',String(child.id===selected?.id));button.onclick=()=>onSelect(child);list.append(button);}
  if(!matches.length){const empty=document.createElement('p');empty.textContent='No matching municipalities.';list.append(empty);}
  if(matches.length>limit){const more=document.createElement('button');more.type='button';more.className='quiet-button';more.textContent='Show more ('+(matches.length-limit)+')';more.onclick=()=>{limit+=20;draw();};list.append(more);}
 };
 input.value='';input.oninput=()=>{limit=20;draw();};input.onkeydown=e=>{if(e.key==='Enter')list.querySelector('button')?.click();if(e.key==='Escape'){input.value='';limit=20;draw();}};draw();details.append(heading,input,list);
}
