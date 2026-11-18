import {splitMetadata} from './inline-typography.mjs';
import {prepareCountryDetails} from './country-page.mjs';
const element=(tag,text,className)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;};
const sourceLink=source=>{const a=element('a','Source');a.href=source.url;a.title=source.title;a.target='_blank';a.rel='noopener';return a;};
// A place may explain several geographic scopes without merging their figures.
export function renderPlaceOverview(anchor,record,index,onSelect){
 const links=[['Related census areas',record?.statisticalAreaIds],['Named places',record?.members],['Places at this location',record?.coincidentPlaceIds]].filter(([,ids])=>ids?.length);
 anchor.replaceChildren();anchor.hidden=!record?.overview&&!links.length;delete anchor.dataset.place;if(anchor.hidden)return;
 anchor.dataset.place=record.id;prepareCountryDetails(anchor);
 if(record.overview?.description)anchor.append(element('p',record.overview.description,'country-note'));
 for(const section of record.overview?.sections||[]){
  const card=element('section',null,'place-phone-card place-overview-card');card.setAttribute('aria-label',section.title);card.append(element('h3',section.title),element('p',section.description));
  const values=element('dl',null,'statistics-values');
  for(const metric of section.metrics){
   const value=element('dd'),number=new Intl.NumberFormat('en-US',{maximumFractionDigits:metric.type==='area'?2:0}).format(metric.value);
   value.dataset.metric=metric.type;value.append(element('strong',number+(metric.type==='area'?' km²':'')));
   const meta=element('small',(metric.periodLabel||metric.year)+' · ');meta.append(sourceLink(metric.source));splitMetadata(meta);value.append(meta);values.append(element('dt',metric.type==='area'?'Area':'Resident population'),value);
  }
  card.append(values);const about=sourceLink(section.source);about.textContent='About '+section.title;card.append(about);anchor.append(card);
 }
 for(const [title,ids] of links){
  const compact=ids.length>4,section=element(compact?'details':'section',null,'place-phone-card');
  section.append(element(compact?'summary':'h3',compact?title+' ('+ids.length+')':title));
  for(const id of ids){
   const place=index?.get(id);if(!place)continue;
   const button=element('button',place.en,'search-result');button.type='button';button.onclick=()=>onSelect(place);section.append(button);
  }
  anchor.append(section);
 }
}
