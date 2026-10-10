export function renderPhoneCard(panel,metric){
 panel.replaceChildren();panel.hidden=!metric?.codes?.length;if(panel.hidden)return;
 const heading=document.createElement('h3');heading.textContent='Phone area code';
 const value=document.createElement('p');value.className='phone-code';value.textContent=metric.codes.join(' / ');
 const detail=document.createElement('p');detail.className='phone-code-detail';detail.textContent='Fixed line · '+metric.international.join(' / ');
 const source=document.createElement('a');source.textContent='Source';source.href=metric.source;source.target='_blank';source.rel='noopener';detail.append(document.createTextNode(' · '),source);
 panel.append(heading,value,detail);
 if(metric.note){const note=document.createElement('p');note.className='phone-code-detail';note.textContent=metric.note;panel.append(note);}
}
