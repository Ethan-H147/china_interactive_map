// Telephone numbering has its own scope and must never inherit a state's statistics.
export function renderAreaCodeCard(anchor,record,data){
 anchor.replaceChildren();anchor.hidden=record?.thematic!=='area-codes';if(anchor.hidden)return;
 const heading=document.createElement('h3');heading.textContent=record.nonGeographic?'Service':'Telephone area';anchor.append(heading);
 const p=document.createElement('p');p.textContent=record.nonGeographic?record.service:record.parentName;anchor.append(p);
 if(record.nonGeographic){const note=document.createElement('p');note.className='country-note';note.textContent='No geographic area. This code identifies a service rather than a location.';anchor.append(note);}
 else if(record.overlays?.length){const p=document.createElement('p');p.textContent='Overlapping codes: '+record.overlays.join(', ');anchor.append(p);const note=document.createElement('small');note.textContent='Some overlays cover only part of the same area.';anchor.append(note);}
 if(record.note){const p=document.createElement('p');p.className='country-note';p.textContent=record.note;anchor.append(p);}
 const source=document.createElement('a');source.style.display='block';source.style.marginTop='12px';source.href=record.source;source.target='_blank';source.rel='noopener';source.textContent=(record.sourceLabel||'NANPA')+' · '+data.asOf;anchor.append(source);
}
