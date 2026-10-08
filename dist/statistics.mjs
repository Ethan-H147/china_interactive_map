import {prepareCountryDetails,insertInfoCard} from './country-page.mjs';
const pending=new Map();
export function loadStatistics(key=''){
 const country=key.split(':')[0],bundle=['indonesia','philippines','argentina','brazil','uruguay','malaysia','singapore'].includes(country)?country:'base';
 const url=bundle==='base'?'data/region-statistics.json':['malaysia','singapore'].includes(bundle)?'data/southeast-asia/'+bundle+'-statistics.json':['argentina','brazil','uruguay'].includes(bundle)?'data/south-america/'+bundle+'-statistics.json':'data/archipelago/'+bundle+'-statistics.json';
 if(!pending.has(bundle))pending.set(bundle,fetch(url).then(r=>{if(!r.ok)throw Error('Statistics unavailable');return r.json();}).catch(e=>{pending.delete(bundle);throw e;}));
 return pending.get(bundle);
}
export function formatMoney(value,currency,perCapita=false){
 const scale=perCapita?1:value>=1e12?1e12:value>=1e9?1e9:value>=1e6?1e6:1;
 return currency+' '+new Intl.NumberFormat('en-US',{maximumFractionDigits:scale===1?0:2}).format(value/scale)+(scale===1e12?' trillion':scale===1e9?' billion':scale===1e6?' million':'');
}
const element=(tag,text,className)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;};
function link(source,label){const a=element('a',label||source.title);a.href=source.url;a.target='_blank';a.rel='noopener';return a;}
export function clearStatistics(anchor){
 if(!anchor?.parentElement)return;const parent=anchor.parentElement,panel=parent.querySelector(':scope > .region-statistics');
 if(panel){panel.dataset.region='';panel.hidden=true;}
 const population=parent.querySelector(':scope > .archipelago-population');if(population)population.hidden=true;
}
function renderPopulation(panel,record,data,onRelatedPlace){
 const metric=record.population;panel.replaceChildren();panel.hidden=!metric;if(!metric)return;
 panel.append(element('h3',metric.label||'Population'),element('p',metric.displayValue||new Intl.NumberFormat('en-US').format(metric.value),'population-total'));
 panel.append(element('p',metric.periodLabel||metric.year+(metric.method==='projection'?' midyear projection':metric.method==='estimate'?' midyear estimate':' census'),'population-scope'));
 if(metric.scopeNote)panel.append(element('p',metric.scopeNote,'population-note'));
 if(metric.relatedPlace&&onRelatedPlace){const button=element('button',metric.relatedPlace.label,'quiet-button');button.type='button';button.onclick=()=>onRelatedPlace(metric.relatedPlace.id);panel.append(button);}
 if(metric.coverageNote)panel.append(element('p',metric.coverageNote,'population-note'));
 const meta=element('p',null,'population-period');
 if(metric.date){const full=metric.date.length===7?metric.date+'-01':metric.date;meta.append(document.createTextNode(new Intl.DateTimeFormat('en-GB',{...(metric.date.length===10?{day:'numeric'}:{}),month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(full+'T00:00:00Z'))+' · '));}
 meta.append(link(data.sources[metric.source],'Source'));panel.append(meta);
}
export async function renderStatistics(anchor,key,provided,{onRelatedPlace}={}){
 if(!anchor?.parentElement)return;
 let population;
 if(/^(indonesia|philippines|argentina|brazil|uruguay|malaysia|singapore):/.test(key)){
  population=anchor.parentElement.querySelector(':scope > .archipelago-population');
  if(!population){population=element('section',null,'population archipelago-population');population.setAttribute('aria-label','Population');insertInfoCard(anchor,population);}
  population.hidden=true;
 }
 const insertionPoint=prepareCountryDetails(anchor);
 let panel=anchor.parentElement.querySelector(':scope > .region-statistics');
 if(!panel)panel=element('section',null,'region-statistics');
 panel.setAttribute('aria-label',key.startsWith('singapore:')?'Area':'Area and economy');
 insertInfoCard(anchor,panel,insertionPoint);
 panel.hidden=false;panel.dataset.region=key;panel.replaceChildren(element('p','Loading statistics…','statistics-note'));
 try{
  const data=provided||await loadStatistics(key);if(panel.dataset.region!==key)return;
  const record=data.regions[key];panel.replaceChildren();
  if(!record){panel.append(element('p','Statistics have not been verified for this division.','statistics-note'));return;}
  if(population)renderPopulation(population,record,data,onRelatedPlace);
  const area=element('section',null,'statistics-area'),economy=element('section',null,'statistics-economy');
  area.append(element('h3','Area'));economy.append(element('h3','Economy'));panel.append(area);if(!key.startsWith('singapore:'))panel.append(economy);
  const areaValues=element('dl',null,'statistics-values'),economyValues=element('dl',null,'statistics-values');area.append(areaValues);
  const argentina=key.startsWith('argentina:');
  const detailedMetrics=[['area','Area'],...(key.startsWith('singapore:')?[]:record.exports?[['exports','Goods exports']]:record.realGdp?[['realGdp','Real GDP'],...(record.realGdpPerCapita?[['realGdpPerCapita','Real GDP per capita']]:[])]:[['gdp','GDP'],['gdpPerCapita','GDP per capita']]),...(record.realGva?[['realGva','Real gross value added'],...(!record.gdpPerCapita?[['realGvaPerCapita','Real GVA per capita']]:[])]:[])];
  const metrics=argentina?[['area','Area'],...(record.gdp?[['gdp','GDP'],['gdpPerCapita','GDP per capita']]:[['realGva','Economic output'],['realGvaPerCapita','Output per capita']])]:detailedMetrics;
  if(argentina&&!record.gdp)economy.append(element('p','GDP has not yet been verified for this province. These figures show inflation-adjusted economic output.','statistics-note'));
  economy.append(economyValues);
  for(const [field,label] of metrics){
   const dl=field==='area'?areaValues:economyValues,metric=record[field],perCapita=/PerCapita$/.test(field),dt=element('dt',field==='area'?(metric?.label||(metric?.method==='mapped'?'Mapped area ≈':'Total area')):argentina?label:(metric?.label||label)),dd=element('dd');dl.append(dt,dd);
   if(!metric){dd.append(element('span','Not available','statistics-missing'));continue;}
   dd.append(element('strong',field==='area'?new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(metric.value)+' km²':formatMoney(metric.value,metric.currency,perCapita)));
   if(field!=='area'&&metric.currency!=='USD')dd.append(element('span',metric.priceBasis==='constant'?(argentina?'Adjusted for inflation · '+metric.baseYear+' peso values':'Inflation-adjusted · constant '+metric.baseYear+' '+metric.currency):metric.usd?'≈ '+formatMoney(metric.usd,'USD',perCapita):'USD conversion unavailable','statistics-usd'));
   if(field!=='area'&&metric.priceBasis==='constant'&&metric.usd>0&&metric.usdBaseYear===metric.baseYear)dd.append(element('span','≈ '+formatMoney(metric.usd,'USD',perCapita)+' · '+metric.usdBaseYear+' dollars','statistics-usd'));
   const meta=element('small');meta.append(document.createTextNode((metric.period||metric.year||'Date not specified')+(metric.status?' · '+metric.status:'')+(metric.method==='calculated'?' · calculated':'')+' · '),link(data.sources[metric.source],'Source'));dd.append(meta);
  }
  const notes=element('details',null,'statistics-details');notes.append(element('summary',argentina?'About these figures & sources':'Dates, sources & definitions'));
  if(argentina)notes.append(element('p','PBG is Argentina’s term for regional GDP. GDP per capita divides the economy’s output by its population; it is not a person’s salary. ARS means Argentine pesos. Inflation-adjusted economic output uses gross value added (GVA), a related measure with different tax treatment. Its 2004 reference prices remove inflation; the data year is shown beside the figure.'));
  if(record.note)notes.append(element('p',record.note));
  for(const [field,label] of [['population','Population'],...detailedMetrics]){const m=record[field];if(!m)continue;const p=element('p',(m.label||label)+': ');if(argentina&&field!=='population'&&!metrics.some(([visible])=>visible===field))p.append(document.createTextNode(formatMoney(m.value,m.currency,/PerCapita$/.test(field))+' ('+m.year+'). '));p.append(link(data.sources[m.source]));if(m.note)p.append(document.createTextNode('. '+m.note));if(m.populationSource)p.append(document.createTextNode(' Population denominator: '+new Intl.NumberFormat('en-US').format(m.populationValue)+' ('+m.populationYear+'). '),link(data.sources[m.populationSource],'Population source'));if(m.exchangeSource){p.append(document.createTextNode(' USD uses '+(m.exchangeYear||m.year)+' average '+(m.priceBasis==='constant'?'base-year ':'')+'conversion: 1 USD = '+new Intl.NumberFormat('en-US',{maximumFractionDigits:5}).format(m.exchangeRate)+' '+m.currency+'. '),link(data.sources[m.exchangeSource],'Conversion source'));}notes.append(p);}
  notes.append(element('p',key.startsWith('singapore:')?'Resident counts include citizens and permanent residents. URA planning extents include inland water and are not physical land-area measurements.': 'Latest verified annual figures found in the listed sources. Years and boundary definitions may differ. Unqualified GDP is nominal; separately labeled real GDP or constant-price output is inflation-adjusted. USD estimates for real GDP retain the displayed reference-year prices. Missing figures are not zero.'));
  notes.append(link({url:'data/statistics-methodology.html',title:'Coverage & methodology'}));panel.append(notes);
 }catch{
  if(panel.dataset.region!==key)return;
  panel.replaceChildren(element('p','Statistics could not load.','statistics-note'));
  const retry=element('button','Retry','quiet-button');retry.type='button';retry.onclick=()=>renderStatistics(anchor,key,provided);panel.append(retry);
 }
}
