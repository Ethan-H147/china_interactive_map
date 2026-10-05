let pending;
export function loadStatistics(){
 if(!pending)pending=fetch('data/region-statistics.json').then(r=>{if(!r.ok)throw Error('Statistics unavailable');return r.json();}).catch(e=>{pending=null;throw e;});
 return pending;
}
export function formatMoney(value,currency,perCapita=false){
 const scale=perCapita?1:value>=1e12?1e12:value>=1e9?1e9:value>=1e6?1e6:1;
 return currency+' '+new Intl.NumberFormat('en-US',{maximumFractionDigits:scale===1?0:2}).format(value/scale)+(scale===1e12?' trillion':scale===1e9?' billion':scale===1e6?' million':'');
}
const element=(tag,text,className)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;};
function link(source,label){const a=element('a',label||source.title);a.href=source.url;a.target='_blank';a.rel='noopener';return a;}
export async function renderStatistics(anchor,key){
 if(!anchor)return;
 let panel=anchor.parentElement.querySelector(':scope > .region-statistics');
 if(!panel){panel=element('section',null,'region-statistics');panel.setAttribute('aria-label','Area and economy');anchor.after(panel);}
 panel.dataset.region=key;panel.replaceChildren(element('h3','Area & economy'),element('p','Loading statistics…','statistics-note'));
 try{
  const data=await loadStatistics();if(panel.dataset.region!==key)return;
  const record=data.regions[key];panel.replaceChildren(element('h3','Area & economy'));
  if(!record){panel.append(element('p','Statistics have not been verified for this division.','statistics-note'));return;}
  const dl=element('dl',null,'statistics-values');panel.append(dl);
  for(const [field,label] of [['area','Area'],['gdp','GDP'],['gdpPerCapita','GDP per capita']]){
   const metric=record[field],dt=element('dt',field==='area'&&metric?.method==='mapped'?'Mapped area ≈':label),dd=element('dd');dl.append(dt,dd);
   if(!metric){dd.append(element('span','Not available','statistics-missing'));continue;}
   dd.append(element('strong',field==='area'?new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(metric.value)+' km²':formatMoney(metric.value,metric.currency,field==='gdpPerCapita')));
   if(field!=='area')dd.append(element('span',metric.usd?'≈ '+formatMoney(metric.usd,'USD',field==='gdpPerCapita'):'USD conversion unavailable','statistics-usd'));
   const meta=element('small');meta.append(document.createTextNode(metric.year?metric.year+' · ':field==='area'?'Date not specified · ':''),link(data.sources[metric.source],'Source'));dd.append(meta);
  }
  const notes=element('details',null,'statistics-details');notes.append(element('summary','Dates, sources & definitions'));
  if(record.note)notes.append(element('p',record.note));
  for(const [field,label] of [['area','Area'],['gdp','GDP'],['gdpPerCapita','GDP per capita']]){const m=record[field];if(!m)continue;const p=element('p',label+': ');p.append(link(data.sources[m.source]));if(m.note)p.append(document.createTextNode('. '+m.note));if(m.exchangeSource){p.append(document.createTextNode(' USD uses '+m.year+' average conversion: 1 USD = '+new Intl.NumberFormat('en-US',{maximumFractionDigits:5}).format(m.exchangeRate)+' '+m.currency+'. '),link(data.sources[m.exchangeSource],'Conversion source'));}notes.append(p);}
  notes.append(element('p','Latest verified annual figures found in the listed sources. Years and boundary definitions may differ; GDP is nominal, not purchasing-power-adjusted. Missing figures are not zero.'));
  notes.append(link({url:'data/statistics-methodology.html',title:'Coverage & methodology'}));panel.append(notes);
 }catch{
  if(panel.dataset.region!==key)return;
  panel.replaceChildren(element('h3','Area & economy'),element('p','Statistics could not load.','statistics-note'));
  const retry=element('button','Retry','quiet-button');retry.type='button';retry.onclick=()=>renderStatistics(anchor,key);panel.append(retry);
 }
}
