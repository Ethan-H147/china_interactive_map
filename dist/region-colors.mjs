import {countryColorData,colorMetrics,colorLabels,colorLayerProfile} from './region-color-data.mjs';
export const shadePalette=['#e3eee9','#c7e2d8','#a5d2c8','#7bb9b1','#529ca4','#367b8d','#285675'];
export const missingColor='#d6d5cf';
export function comparisonRecords(data,level=1){return data.records.filter(r=>(r.level||1)===level||level===3&&r.level===2&&r.leaf);}
export function metricScale(data,key,level=1){
 const records=comparisonRecords(data,level),index=new Map(data.records.map(r=>[r.id,r])),units=new Map(records.map(r=>[r.id,r]));
 const resolve=(id,parent)=>{id=String(id);const seen=new Set();while(id&&!seen.has(id)){if(units.has(id))return units.get(id);seen.add(id);id=data.parents?.[id]||index.get(id)?.parent;}return parent&&!seen.has(String(parent))?resolve(String(parent)):undefined;};
 const candidates=records.map(r=>r.metrics[key]).filter(m=>m&&Number.isFinite(m.value)&&m.value>=0);
 const basis=m=>(m.priceBasis||'current')+':'+(m.baseYear||'');
 const groups=new Map();if(key.startsWith('gdp'))for(const m of candidates)groups.set(basis(m),(groups.get(basis(m))||0)+1);
 const chosen=[...groups].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0];
 const metric=r=>{const m=r.metrics[key];return m&&Number.isFinite(m.value)&&m.value>=0&&(!chosen||basis(m)===chosen)?m:undefined;};
 const metrics=records.map(metric).filter(Boolean),values=metrics.map(m=>m.value).sort((a,b)=>a-b);
 if(!values.length)return null;
 const thresholds=[...new Set(shadePalette.map((_,i)=>values[Math.ceil(values.length*(i+1)/shadePalette.length)-1]))];
 const bins=thresholds.map((max,i)=>({max,min:i?thresholds[i-1]:values[0],color:shadePalette[thresholds.length===1?Math.floor(shadePalette.length/2):Math.round(i*(shadePalette.length-1)/(thresholds.length-1))],count:values.filter(v=>v<=max&&(!i||v>thresholds[i-1])).length}));
 const years=[...new Set(metrics.map(m=>m.year).filter(Boolean))].sort();
 return {key,level,records,resolve,label:data.levels?.[level-1]||data.level,bins,min:values[0],max:values.at(-1),count:values.length,total:records.length,years,unit:metrics[0].unit,baseYear:metrics[0].baseYear,estimated:metrics.some(m=>m.usdEstimate),constant:metrics.some(m=>m.priceBasis==='constant'),metric,color:value=>Number.isFinite(value)?bins.find(b=>value<=b.max)?.color||bins.at(-1).color:missingColor};
}
export function shadeExpression(data,scale,profile){
 const id=['to-string',['coalesce',['get','regionId'],['get',profile.id],'']],parent=['to-string',['coalesce',['get',profile.parent],'']];
 const entries=data.records.flatMap(r=>{const unit=scale.resolve(r.id);return [r.id,scale.color(unit&&scale.metric(unit)?.value)];});
 const match=(input,fallback)=>entries.length?['match',input,...entries,fallback]:fallback;
 return match(id,match(parent,missingColor));
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
 let country,data,key='none',scale,epoch=0,scheduled=false,suspended=false,error=false,viewLevel=1;
 const cache=new Map(),styles=new Map(),preferences=new Map(),scales=new Map(),expressions=new Map();
 const legend=el('section',undefined,'region-color-legend');legend.id='region-color-legend';legend.hidden=true;legend.setAttribute('aria-label','Map color legend');
 const title=el('strong'),period=el('span',undefined,'region-color-period'),ramp=el('div',undefined,'region-color-ramp'),limits=el('div',undefined,'region-color-limits'),hover=el('div',undefined,'region-color-value');
 const details=el('details',undefined,'region-color-details'),summary=el('summary','Scale & sources'),notes=el('div');details.append(summary,notes);legend.append(title,period,ramp,limits,hover,details);document.getElementById('map-shell').append(legend);
 function load(target){if(!cache.has(target))cache.set(target,fetch('data/region-colors/'+target+'.json').then(r=>{if(!r.ok)throw Error('Region color data unavailable');return r.json();}).catch(e=>{cache.delete(target);throw e;}));return cache.get(target);}
 function options(){
  const available=['none',...colorMetrics.filter(k=>[1,2,3].some(level=>getScale(k,level)))];
  if(data&&!available.includes(key))key=key==='none'?'none':available.includes('population')?'population':'none';
  for(const select of document.querySelectorAll('[data-region-color]')){
   select.replaceChildren(...available.map(k=>{const o=el('option',k.startsWith('gdp')&&getScale(k,1)?.constant?'Real '+colorLabels[k]:colorLabels[k]);o.value=k;return o;}));select.value=key;select.disabled=!data;
   select.closest('.region-color-control').hidden=suspended;
  }
 }
 function getScale(metric,level){const id=metric+':'+level;if(!scales.has(id))scales.set(id,data?metricScale(data,metric,level):null);return scales.get(id);}
 function refreshScale(layers){
  const visibleLevels=new Set(layers.filter(l=>l.layout?.visibility!=='none').map(l=>colorLayerProfile(l,country)?.level).filter(Boolean));
  const requested=Math.max(1,Math.min(3,host.getLevel?.()||1)),wards=country==='japan'&&visibleLevels.has(3);
  const nextLevel=wards?3:requested;let next=null;
  for(let level=nextLevel;level>=1&&!next;level--)if(visibleLevels.has(level))next=getScale(key,level);
  if(next!==scale||nextLevel!==viewLevel){viewLevel=nextLevel;scale=next;expressions.clear();drawLegend();}
 }
 function drawLegend(){
  legend.hidden=suspended||key==='none'||!scale;
  if(legend.hidden)return;
  title.textContent=(scale.constant?'Real ':'')+colorLabels[key];
  period.textContent=[scale.label,scale.estimated?'≈ USD':scale.unit,scale.years.length===1?scale.years[0]:scale.years.length?scale.years[0]+'–'+scale.years.at(-1):null,scale.constant?'constant '+scale.baseYear+' prices':null].filter(Boolean).join(' · ');
  ramp.replaceChildren();for(let i=0;i<scale.bins.length;i++){const bin=scale.bins[i],swatch=el('span');swatch.style.background=bin.color;swatch.title=(i?'>'+metricNumber(bin.min,key):metricNumber(bin.min,key))+' – '+metricNumber(bin.max,key)+' · '+bin.count+' regions';ramp.append(swatch);}
  limits.replaceChildren(el('span',metricNumber(scale.min,key,true)),el('span',metricNumber(scale.max,key,true)));
  hover.replaceChildren();notes.replaceChildren(el('p',scale.label+'. Up to seven groups based on this level’s value distribution; tied values stay together. Each country and subdivision level has its own scale.'));
  if(scale.level<viewLevel&&!getScale(key,viewLevel))notes.append(el('p','This measure is available only at the '+scale.label.toLowerCase()+' level.'));
  const coverage=el('p'),chip=el('span',undefined,'region-color-missing');coverage.append(chip,document.createTextNode('No data · '+scale.count+'/'+scale.total+' regions covered'));notes.append(coverage);
  if(scale.years.length>1)notes.append(el('p','Latest available figures use different years. Check the date beside each value.'));
  if(scale.constant)notes.append(el('p','Inflation-adjusted GDP in '+scale.baseYear+' prices; dollar estimates retain that reference year.'));
  const urls=new Map();for(const r of scale.records){const m=scale.metric(r);if(!m)continue;for(const url of [m.sourceUrl,m.areaSourceUrl,m.exchangeSourceUrl].filter(Boolean))urls.set(url,true);}
  for(const url of urls.keys()){const a=el('a',new URL(url,location.href).hostname);a.href=url;a.target='_blank';a.rel='noopener';notes.append(a);}
 }
 function sync(){
  scheduled=false;const layers=map.getStyle()?.layers||[];refreshScale(layers);const enabled=!suspended&&key!=='none'&&scale;
  const primary=layers.find(l=>colorLayerProfile(l,country)?.primary&&!l.id.endsWith('-motion'));
  const primaryEntry=primary&&styles.get(primary.id),primaryCurrent=primary&&(map.getPaintProperty(primary.id,'fill-opacity')??1);
  const primaryOpacity=primaryEntry&&signature(primaryCurrent)===primaryEntry.writtenOpacity?primaryEntry.opacity:primaryCurrent;
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
   const expressionId=profile&&JSON.stringify([profile.id,profile.parent]);
   if(profile&&!expressions.has(expressionId))expressions.set(expressionId,shadeExpression(data,scale,profile));
   const color=profile?['case',['any',['boolean',['feature-state','quizActive'],false],['boolean',['feature-state','quizCorrect'],false],['boolean',['feature-state','quizWrong'],false]],entry.color,expressions.get(expressionId)]:entry.color;
   // A deeper unsupported layer retains hit targets; the actual comparison level stays visible.
   const alpha=profile?(profile.level>scale.level?['*',entry.opacity,.01]:flatOpacity(profile.inheritOpacity&&primaryOpacity!==undefined?primaryOpacity:entry.opacity)):entry.opacity;
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
  const token=++epoch;country=target;data=null;scale=null;scales.clear();expressions.clear();error=false;key=preferred??preferences.get(target)??key;options();drawLegend();sync();
  if(!countryColorData[target])return;
  try{const loaded=await load(target);if(token!==epoch)return;data=loaded;scales.clear();options();sync();}
  catch{if(token!==epoch)return;error=true;options();}
 }
 function setMetric(value){
  if(!['none',...colorMetrics].includes(value))value='none';key=value;options();preferences.set(country,key);sync();host.changed?.();
 }
 document.addEventListener('change',event=>{if(event.target?.matches?.('[data-region-color]'))setMetric(event.target.value);});
 // Level changes can leave all geometry visible and emit no MapLibre style event.
 if(typeof MutationObserver!=='undefined'){const levels=new MutationObserver(schedule);for(const id of ['mode-province','mode-prefecture','mode-third']){const button=document.getElementById(id);if(button)levels.observe(button,{attributes:true,attributeFilter:['aria-pressed']});}}
 map.on('styledata',schedule);
 map.on('mousemove',event=>{
  if(!scale||suspended||map.isMoving())return;
  const layers=(map.getStyle()?.layers||[]).filter(l=>colorLayerProfile(l,country)&&l.layout?.visibility!=='none').map(l=>l.id);
  const unit=f=>{const p=f.properties,profile=colorLayerProfile(f.layer,country);return profile&&scale.resolve(p.regionId??p[profile.id],p[profile.parent]);};
  const hit=layers.length?map.queryRenderedFeatures(event.point,{layers}).find(unit):null;
  if(!hit){hover.replaceChildren();return;}
  const root=unit(hit),m=root&&scale.metric(root);
  hover.replaceChildren(el('span',root.name),el('strong',(m?.usdEstimate?'≈ ':'')+metricNumber(m?.value,key)+(m?key.startsWith('gdp')?' USD':key==='populationDensity'?' /km²':'':'')),el('small',m?.year?String(m.year):''));hover.title=m?.note||'';
 });
 map.on('movestart',()=>hover.replaceChildren());map.getCanvas().addEventListener('mouseleave',()=>hover.replaceChildren());
 return {setCountry,setMetric,getMetric:()=>key,sync,suspend(value){suspended=value;options();drawLegend();sync();},retry:()=>error&&setCountry(country,key)};
}
