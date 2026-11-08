// Native forms share one display policy; quiz aliases retain every source form.
export const regionalNameKey=value=>String(value||'').normalize('NFC').trim().replace(/\s+/gu,' ').toLowerCase();
export function regionalNameRows(record,shownNames=[record.en,record.local]){
 const shown=new Set(shownNames.map(regionalNameKey).filter(Boolean)),rows=new Map();
 const candidates=(record.regionalNames||[]).filter(name=>regionalNameKey(name.text));
 const languageOf=name=>name.code||name.lang||name.language;
 const multiple=new Set(candidates.map(languageOf)).size>1;
 for(const name of candidates){
  const text=regionalNameKey(name.text);if(!multiple&&shown.has(text))continue;
  const key=languageOf(name)+'\0'+text;
  if(!rows.has(key))rows.set(key,{...name,languages:[name.language]});
 }
 return [...rows.values()];
}
// Language labels are plain text. Source references remain in the coverage data.
export function renderRegionalNames(container,record,{collapseAfter=3,labelFirst=false,shownNames,document:doc=document}={}){
 container.replaceChildren();const names=regionalNameRows(record,shownNames),other=record.otherLanguages||[],count=names.length+other.length;if(!count)return;
 let body=container;
 if(count>collapseAfter){const details=doc.createElement('details'),summary=doc.createElement('summary');details.className='regional-name-details';summary.textContent='Regional languages ('+(names.reduce((total,name)=>total+name.languages.length,0)+other.length)+')';details.append(summary);body=doc.createElement('div');body.className='regional-name-list';details.append(body);container.append(details);}
 for(const name of names){
  const row=doc.createElement('p'),text=doc.createElement('bdi'),label=doc.createElement('span');row.className='regional-name-row';text.lang=name.lang;text.dir=name.dir||'auto';text.textContent=name.text;label.textContent=name.language+(name.romanized?' · romanized':'');label.lang='en';label.className='name-secondary';row.append(...(labelFirst?[label,doc.createTextNode(' '),text]:[text,doc.createTextNode(' '),label]));body.append(row);
 }
 if(other.length){const paragraph=doc.createElement('p'),title=doc.createElement('span');paragraph.className='regional-language-coverage';title.textContent='Other regional languages: ';paragraph.append(title);other.forEach((language,i)=>{if(i)paragraph.append(doc.createTextNode(', '));const label=doc.createElement('span');label.textContent=language.language;label.lang='en';paragraph.append(label);});body.append(paragraph);}
}
