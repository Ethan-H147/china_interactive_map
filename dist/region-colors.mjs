import {countryColorData,colorMetrics,colorLabels,colorLayerProfile} from './region-color-data.mjs';
export const shadePalette=['#e3eee9','#b4d8cd','#7bb9b1','#448d99','#285675'];
export const missingColor='#d6d5cf';
export function metricScale(data,key){
 const candidates=data.records.map(r=>r.metrics[key]).filter(m=>m&&Number.isFinite(m.value)&&m.value>=0);
 const basis=m=>(m.priceBasis||'current')+':'+(m.baseYear||'');
 const groups=new Map();if(key.startsWith('gdp'))for(const m of candidates)groups.set(basis(m),(groups.get(basis(m))||0)+1);
 const chosen=[...groups].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0];
 const metric=r=>{const m=r.metrics[key];return m&&Number.isFinite(m.value)&&m.value>=0&&(!chosen||basis(m)===chosen)?m:undefined;};
 const metrics=data.records.map(metric).filter(Boolean),values=metrics.map(m=>m.value).sort((a,b)=>a-b);
 if(!values.length)return null;
 const thresholds=[...new Set([1,2,3,4,5].map(i=>values[Math.ceil(values.length*i/5)-1]))];
 const bins=thresholds.map((max,i)=>({max,min:i?thresholds[i-1]:values[0],color:shadePalette[thresholds.length===1?2:Math.round(i*4/(thresholds.length-1))],count:values.filter(v=>v<=max&&(!i||v>thresholds[i-1])).length}));
 const years=[...new Set(metrics.map(m=>m.year).filter(Boolean))].sort();
 return {key,bins,min:values[0],max:values.at(-1),count:values.length,total:data.records.length,years,unit:metrics[0].unit,baseYear:metrics[0].baseYear,estimated:metrics.some(m=>m.usdEstimate),constant:metrics.some(m=>m.priceBasis==='constant'),metric,color:value=>Number.isFinite(value)?bins.find(b=>value<=b.max)?.color||bins.at(-1).color:missingColor};
}
export function shadeExpression(data,scale,profile){
 const id=['to-string',['coalesce',['get','regionId'],['get',profile.id],'']],parent=['to-string',['coalesce',['get',profile.parent],'']];
 const match=(input,fallback)=>{const entries=data.records.flatMap(r=>[r.id,scale.color(scale.metric(r)?.value)]);return entries.length?['match',input,...entries,fallback]:fallback;};
 const ancestorEntries=Object.entries(data.ancestorParents||{}).flatMap(([id,root])=>[id,scale.color(scale.metric(data.records.find(r=>r.id===root)||{metrics:{}})?.value)]);
 const ancestor=ancestorEntries.length?['match',parent,...ancestorEntries,missingColor]:missingColor;
 return match(id,match(parent,ancestor));
}
export function metricNumber(value,key,compact=false){
 if(!Number.isFinite(value))return 'No data';
 return new Intl.NumberFormat('en-US',{...(compact?{notation:'compact',maximumFractionDigits:1}:{maximumFractionDigits:key==='populationDensity'?1:0})}).format(value);
}
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
const signature=value=>JSON.stringify(value);
function flatOpacity(base){
 if(!Array.isArray(base)||base[0]!=='case')return base;
 const result=[...base],fallback=base.at(-1);
 for(let i=1;i<result.length-1;i+=2)if(/"feature-state","(?:selected|hover)"/.test(signature(result[i])))result[i+1]=fallback;
 return result;
}
export function createRegionColors(map,host={}){
 let country,data,key='none',scale,epoch=0,scheduled=false,suspended=false,error=false;
 const cache=new Map(),styles=new Map(),preferences=new Map();
 const legend=el('section',undefined,'region-color-legend');legend.id='region-color-legend';legend.hidden=true;legend.setAttribute('aria-label','Map color legend');
 const title=el('strong'),period=el('span',undefined,'region-color-period'),ramp=el('div',undefined,'region-color-ramp'),limits=el('div',undefined,'region-color-limits'),hover=el('div',undefined,'region-color-value');
 const details=el('details',undefined,'region-color-details'),summary=el('summary','Scale & sources'),notes=el('div');details.append(summary,notes);legend.append(title,period,ramp,limits,hover,details);document.getElementById('map-shell').append(legend);
 function load(target){if(!cache.has(target))cache.set(target,fetch('data/region-colors/'+target+'.json').then(r=>{if(!r.ok)throw Error('Region color data unavailable');return r.json();}).catch(e=>{cache.delete(target);throw e;}));return cache.get(target);}
 function options(){
  const available=['none',...colorMetrics.filter(k=>metricScale(data||{records:[]},k))];
  if(!available.includes(key))key=key==='none'?'none':available.includes('population')?'population':'none';
  for(const select of document.querySelectorAll('[data-region-color]')){
   select.replaceChildren(...available.map(k=>{const o=el('option',k.startsWith('gdp')&&metricScale(data,k)?.constant?'Real '+colorLabels[k]:colorLabels[k]);o.value=k;return o;}));select.value=key;select.disabled=!data;
   select.closest('.region-color-control').hidden=suspended;
  }
 }
 function drawLegend(){
  legend.hidden=suspended||key==='none'||!scale;
  if(legend.hidden)return;
  title.textContent=(scale.constant?'Real ':'')+colorLabels[key];
  period.textContent=[scale.estimated?'≈ USD':scale.unit,scale.years.length===1?scale.years[0]:scale.years.length?scale.years[0]+'–'+scale.years.at(-1):null,scale.constant?'constant '+scale.baseYear+' prices':null].filter(Boolean).join(' · ');
  ramp.replaceChildren();for(let i=0;i<scale.bins.length;i++){const bin=scale.bins[i],swatch=el('span');swatch.style.background=bin.color;swatch.title=(i?'>'+metricNumber(bin.min,key):metricNumber(bin.min,key))+' – '+metricNumber(bin.max,key)+' · '+bin.count+' regions';ramp.append(swatch);}
  limits.replaceChildren(el('span',metricNumber(scale.min,key,true)),el('span',metricNumber(scale.max,key,true)));
  hover.replaceChildren();notes.replaceChildren(el('p',data.level+'. Up to five groups based on the current country’s value distribution; tied values stay together. Each country has its own scale.'));
  const coverage=el('p'),chip=el('span',undefined,'region-color-missing');coverage.append(chip,document.createTextNode('No data · '+scale.count+'/'+scale.total+' regions covered'));notes.append(coverage);
  if(scale.years.length>1)notes.append(el('p','Latest available figures use different years. Check the date beside each value.'));
  if(scale.constant)notes.append(el('p','Inflation-adjusted GDP in '+scale.baseYear+' prices; dollar estimates retain that reference year.'));
  const urls=new Map();for(const r of data.records){const m=scale.metric(r);if(!m)continue;for(const url of [m.sourceUrl,m.areaSourceUrl,m.exchangeSourceUrl].filter(Boolean))urls.set(url,true);}
  for(const url of urls.keys()){const a=el('a',new URL(url,location.href).hostname);a.href=url;a.target='_blank';a.rel='noopener';notes.append(a);}
 }
 function sync(){
  scheduled=false;const layers=map.getStyle()?.layers||[],enabled=!suspended&&key!=='none'&&scale;
  const present=new Set(layers.map(l=>l.id));for(const id of styles.keys())if(!present.has(id))styles.delete(id);
  for(const layer of layers){
   let entry=styles.get(layer.id);const ref=map.getLayer(layer.id);
   if(entry&&entry.ref!==ref){styles.delete(layer.id);entry=null;}
   const profile=enabled&&colorLayerProfile(layer,country);
   if(!entry&&!profile)continue;
   const current=map.getPaintProperty(layer.id,'fill-color')??'#000000',opacity=map.getPaintProperty(layer.id,'fill-opacity')??1;
   if(!entry){
    const original=styles.get(layer.id.replace(/-motion$/,''));
    entry={ref,color:original&&signature(current)===original.writtenColor?original.color:current,opacity:original&&signature(opacity)===original.writtenOpacity?original.opacity:opacity,writtenColor:signature(current),writtenOpacity:signature(opacity)};styles.set(layer.id,entry);
   }
   if(signature(current)!==entry.writtenColor)entry.color=current;
   if(signature(opacity)!==entry.writtenOpacity)entry.opacity=opacity;
   const color=profile?['case',['any',['boolean',['feature-state','quizActive'],false],['boolean',['feature-state','quizCorrect'],false],['boolean',['feature-state','quizWrong'],false]],entry.color,shadeExpression(data,scale,profile)]:entry.color;
   // Detailed fills keep their hit targets but cannot cover the regional scale.
   const alpha=profile?(profile.primary?flatOpacity(entry.opacity):['*',entry.opacity,.01]):entry.opacity;
   entry.writtenColor=signature(color);entry.writtenOpacity=signature(alpha);
   if(signature(current)!==entry.writtenColor)map.setPaintProperty(layer.id,'fill-color',color);
   if(signature(opacity)!==entry.writtenOpacity)map.setPaintProperty(layer.id,'fill-opacity',alpha);
   if(!profile)styles.delete(layer.id);
  }
  const regionalView=layers.some(layer=>colorLayerProfile(layer,country)?.primary&&layer.layout?.visibility!=='none');
  legend.hidden=!enabled||!regionalView;
  for(const select of document.querySelectorAll('[data-region-color]'))select.closest('.region-color-control').hidden=suspended||!regionalView;
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(sync);}}
 async function setCountry(target,preferred){
  const token=++epoch;country=target;data=null;scale=null;error=false;key=preferred??preferences.get(target)??key;options();drawLegend();sync();
  if(!countryColorData[target])return;
  try{const loaded=await load(target);if(token!==epoch)return;data=loaded;options();scale=metricScale(data,key);drawLegend();sync();}
  catch{if(token!==epoch)return;error=true;options();}
 }
 function setMetric(value){
  if(!['none',...colorMetrics].includes(value))value='none';key=value;options();preferences.set(country,key);scale=data&&metricScale(data,key);drawLegend();sync();host.changed?.();
 }
 document.addEventListener('change',event=>{if(event.target.matches('[data-region-color]'))setMetric(event.target.value);});
 map.on('styledata',schedule);
 map.on('mousemove',event=>{
  if(!scale||suspended||map.isMoving())return;
  const layers=(map.getStyle()?.layers||[]).filter(l=>colorLayerProfile(l,country)&&l.layout?.visibility!=='none').map(l=>l.id);
  const hit=layers.length?map.queryRenderedFeatures(event.point,{layers}).find(f=>{const p=f.properties,id=String(p.regionId||p[countryColorData[country].geography?.id||'id']);return data.records.some(r=>r.id===id||r.id===data.parents[id]||r.id===String(p.parent||p.provinceCode));}):null;
  if(!hit){hover.replaceChildren();return;}
  const p=hit.properties,id=String(p.regionId||p[countryColorData[country].geography?.id||'id']),root=data.records.find(r=>r.id===id||r.id===data.parents[id]||r.id===String(p.parent||p.provinceCode)),m=root&&scale.metric(root);
  hover.replaceChildren(el('span',root.name),el('strong',(m?.usdEstimate?'≈ ':'')+metricNumber(m?.value,key)+(m?key.startsWith('gdp')?' USD':key==='populationDensity'?' /km²':'':'')),el('small',m?.year?String(m.year):''));hover.title=m?.note||'';
 });
 map.on('movestart',()=>hover.replaceChildren());map.getCanvas().addEventListener('mouseleave',()=>hover.replaceChildren());
 return {setCountry,setMetric,getMetric:()=>key,sync,suspend(value){suspended=value;options();drawLegend();sync();},retry:()=>error&&setCountry(country,key)};
}
