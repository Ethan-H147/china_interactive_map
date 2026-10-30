// Native forms and language-presence coverage share one compact, expandable UI.
// A language with no attested place-name spelling is listed separately.
export function renderRegionalNames(container,record,{collapseAfter=3,document:doc=document}={}){
 container.replaceChildren();const names=record.regionalNames||[],other=record.otherLanguages||[],count=names.length+other.length;if(!count)return;
 let body=container;
 if(count>collapseAfter){const details=doc.createElement('details'),summary=doc.createElement('summary');details.className='regional-name-details';summary.textContent='Regional languages ('+count+')';details.append(summary);body=doc.createElement('div');body.className='regional-name-list';details.append(body);container.append(details);}
 for(const name of names){
  const row=doc.createElement('p'),text=doc.createElement('bdi'),label=doc.createElement('a');row.className='regional-name-row';text.lang=name.lang;text.dir=name.dir||'auto';text.textContent=name.text;label.textContent=name.language+(name.romanized?' · romanized':'');label.href=name.source;label.target='_blank';label.rel='noopener';label.lang='en';label.title='Source for '+name.language+' name';label.className='name-secondary';row.append(text,doc.createTextNode(' '),label);body.append(row);
 }
 if(other.length){const paragraph=doc.createElement('p'),title=doc.createElement('span');paragraph.className='regional-language-coverage';title.textContent='Other regional languages: ';paragraph.append(title);other.forEach((language,i)=>{if(i)paragraph.append(doc.createTextNode(', '));const link=doc.createElement('a');link.textContent=language.language;link.href=language.sources[0];link.target='_blank';link.rel='noopener';link.title='Language presence; no verified state-name spelling in this dataset';paragraph.append(link);});body.append(paragraph);}
}
