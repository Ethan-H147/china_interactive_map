import {OTHER_LAND,createHostLines} from './historic-borders.mjs';
import {CHEVRON,DISPUTED,TERRITORY,holderLines} from './elections.mjs';
import {getMapScene} from './map-scene.mjs';
// A historical snapshot of a country's first level, year by year, drawn by the shared historic
// borders (historic-borders.mjs) over the present-day map. A dock picks the year; picking a
// unit shows what it was, and the host selects the present-day place it now covers. The
// country passes a config (us-history.mjs) for its names and texts.

const UNORGANIZED='#f3eee2';
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const longDate=iso=>{const [y,m,d]=iso.split('-').map(Number);return d+' '+MONTHS[m-1]+' '+y;};
const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const count=(n,one,many)=>n+' '+(n===1?one:many);

export function createHistoricView(map,{country,base,config,borders:engine,fill,fillLayer=country+'-first-fill',selectionLayer=country+'-first-selection-fill',scene=getMapScene(map),onChange=()=>{},onPlace=()=>{}}){
 let active=false,year,dock,applied=false,original,focus=null,selectedRecord=null,epoch=0;
 try{year=+localStorage.getItem(config.store)||null;}catch{}
 const hostLines=createHostLines(map,{country,scene,own:id=>engine.layers.has(id)});
 const years=()=>Object.keys(engine.data.years).map(Number);
 const snapshot=()=>engine.data.years[year];
 const current=()=>engine.data.configs[snapshot().config];

 // What a unit was: a state, a territory, land held jointly or by another country.
 function kind(unit){
  if(unit.type==='Disputed'||unit.sovereign==='Contested')return 'disputed';
  if(unit.type==='Foreign'||unit.sovereign!=='US')return 'foreign';
  return unit.type==='State'||unit.type==='District of Columbia'?'state':unit.type==='Territory'?'territory':'unorganized';
 }
 const COLORS={state:fill,territory:TERRITORY,unorganized:UNORGANIZED,disputed:DISPUTED,foreign:OTHER_LAND},colorOf=unit=>COLORS[kind(unit)];
 const KEYS=[['state','State'],['territory','Territory'],['unorganized','Unorganized territory'],['disputed','Disputed'],['foreign','Another country']];
 // The host record a unit opens: its present-day state where the unit is one, otherwise the
 // present-day place that was clicked.
 const unitPlace=unit=>unit&&kind(unit)==='state'?unit.state:null;
 function currentUnit(){
  if(!active||!engine.data)return null;
  if(focus?.face!=null)return engine.unit(current(),focus.face);
  const i=selectedRecord?current().partOf[selectedRecord]:undefined;return i>=0?current().units[i]:null;
 }

 function apply(){
  if(!active||!engine.data||!map.getLayer(fillLayer))return;
  if(!applied)original=map.getPaintProperty(fillLayer,'fill-color');
  map.setPaintProperty(fillLayer,'fill-color',OTHER_LAND);
  if(map.getLayer(selectionLayer))map.setPaintProperty(selectionLayer,'fill-opacity',0);
  engine.draw(current(),colorOf,fillLayer);engine.outline(current(),currentUnit());
  hostLines({borders:true,selection:true});applied=true;
 }
 function restore(){
  if(!applied)return;applied=false;engine.remove();hostLines();
  if(map.getLayer(fillLayer))map.setPaintProperty(fillLayer,'fill-color',original);
  if(map.getLayer(selectionLayer))map.setPaintProperty(selectionLayer,'fill-opacity',1);
 }

 function buildDock(){
  dock=el('section','election-dock history-dock');dock.id=country+'-history-dock';dock.hidden=true;dock.setAttribute('aria-label',config.label);
  dock.innerHTML='<div class="election-head"><div class="election-year"><strong></strong><span></span></div><div class="election-tally history-tally"><div class="history-counts"></div><div class="election-needed"></div></div></div><div class="election-legend"></div><div class="election-timeline"><div class="election-strip" role="listbox" aria-label="Year"></div><div class="election-steps"><button type="button" class="election-step" data-step="-1" aria-label="Previous year">'+CHEVRON+'</button><button type="button" class="election-step" data-step="1" aria-label="Next year">'+CHEVRON+'</button></div></div>';
  document.getElementById('map-shell').append(dock);
  for(const button of dock.querySelectorAll('.election-step'))button.onclick=()=>step(+button.dataset.step);
  dock.querySelector('.election-strip').onkeydown=event=>{const keys={ArrowLeft:-1,ArrowRight:1,Home:-Infinity,End:Infinity};if(!(event.key in keys))return;event.preventDefault();const all=years(),i=all.indexOf(year),next=keys[event.key]===-Infinity?0:keys[event.key]===Infinity?all.length-1:Math.max(0,Math.min(all.length-1,i+keys[event.key]));setYear(all[next],true);};
  // Years whose map differs from the year before are marked.
  const strip=dock.querySelector('.election-strip');let previous;
  for(const y of years()){
   const tick=el('button','election-tick');tick.type='button';tick.setAttribute('role','option');tick.dataset.year=y;tick.tabIndex=-1;
   const changed=engine.data.years[y].config!==previous;previous=engine.data.years[y].config;
   tick.style.setProperty('--party',changed?'#587694':'#b8c3d1');tick.setAttribute('aria-label',String(y));
   tick.append(el('span','election-tick-year',String(y)));if(y%20===0)tick.dataset.mark=y;
   tick.onclick=()=>setYear(y,true);strip.append(tick);
  }
 }
 function renderDock(focusTick=false){
  if(!dock)buildDock();
  const c=current(),kinds=c.units.map(kind),states=kinds.filter(k=>k==='state').length-c.units.filter(u=>u.type==='District of Columbia').length,territories=kinds.filter(k=>k==='territory').length;
  dock.querySelector('.election-year strong').textContent=year;dock.querySelector('.election-year span').textContent=longDate(snapshot().date);
  dock.querySelector('.history-counts').textContent=count(states,'state','states')+(territories?', '+count(territories,'territory','territories'):'');
  const changes=changesIn(year);dock.querySelector('.election-needed').textContent=changes.length?count(changes.length,'change','changes')+' this year':'No boundary changes this year';
  const legend=dock.querySelector('.election-legend');legend.replaceChildren();
  for(const [key,label] of KEYS)if(kinds.includes(key)){const row=el('span','election-key'),swatch=el('i','election-swatch');swatch.style.background=COLORS[key];row.append(swatch,el('span',undefined,label));legend.append(row);}
  for(const tick of dock.querySelectorAll('.election-tick')){const selected=+tick.dataset.year===year;tick.setAttribute('aria-selected',String(selected));tick.tabIndex=selected?0:-1;if(selected){tick.scrollIntoView?.({block:'nearest',inline:'center',behavior:focusTick?'smooth':'auto'});if(focusTick)tick.focus({preventScroll:true});}}
  const all=years();dock.querySelector('[data-step="-1"]').disabled=year===all[0];dock.querySelector('[data-step="1"]').disabled=year===all.at(-1);
 }
 function step(delta){const all=years(),i=all.indexOf(year);setYear(all[Math.max(0,Math.min(all.length-1,i+delta))],true);}
 function setYear(next,focusTick=false){
  if(!engine.data||next===year)return;year=next;try{localStorage.setItem(config.store,String(year));}catch{}
  apply();
  // The picked place may belong to another state this year; the host follows it.
  if(focus?.face!=null){const place=unitPlace(engine.unit(current(),focus.face));if(place&&place!==focus.place){focus.place=place;onPlace(place);}}
  renderDock(focusTick);onChange();
 }

 // Boundary changes during a year: the source's dated changes and the changes of holder.
 function changesIn(y){
  // The source's first date only sets out the 1783 boundaries.
  const seen=new Set(),list=[],first=engine.data.versions.reduce((a,b)=>a.start<b.start?a:b).start;
  for(const v of engine.data.versions)if(+v.start.slice(0,4)===y&&v.start>first){const key=v.start+v.change;if(seen.has(key))continue;seen.add(key);list.push({date:v.start,name:v.name,text:v.change,citation:v.citation});}
  for(const event of config.events||[])if(+event.date.slice(0,4)===y)list.push(event);
  return list.sort((a,b)=>a.date.localeCompare(b.date));
 }
 function renderSummary(anchor){
  if(!anchor)return;anchor.replaceChildren();anchor.hidden=!active||!engine.data;if(anchor.hidden)return;
  anchor.append(el('h3',undefined,config.title(year)));
  const changes=changesIn(year);
  if(!changes.length)anchor.append(el('p','country-note','No state or territory boundary changed this year.'));
  else{const list=el('ol','history-changes');for(const change of changes){const item=el('li');item.append(el('strong',undefined,(change.when||longDate(change.date))+(change.name?', '+change.name:'')),el('span',undefined,change.text));list.append(item);}anchor.append(list);}
  anchor.append(sourceLink());
 }
 function sourceLink(){const a=el('a','election-source','Borders: '+config.sourceName);a.href=config.source;a.target='_blank';a.rel='noopener';return a;}
 function renderState(anchor,record){
  if(!anchor)return;anchor.replaceChildren();
  // The host's selection moved away from the place picked; or the host has picked the
  // present-day place under a click on a unit without a state of its own.
  if(focus&&focus.place!=null&&focus.place!==record?.id)focus=null;
  if(focus&&focus.place==null)focus.place=record?.id;
  selectedRecord=record?.level===1?record.id:null;if(applied)engine.outline(current(),currentUnit());
  anchor.hidden=!active||!engine.data||!record||record.level!==1;if(anchor.hidden)return;
  const unit=currentUnit();
  anchor.append(el('h3',undefined,unit?unit.name:config.outside));
  if(unit){
   const version=unit.version&&engine.data.versions.find(v=>v.id===unit.version);
   anchor.append(el('p','election-unit',config.kindLabel(unit,kind(unit))));
   const facts=el('dl','election-facts');
   // When the state or territory began, if after the source's first date, and when this boundary did.
   const first=engine.data.versions.reduce((a,b)=>a.start<b.start?a:b).start,since=version&&engine.data.versions.filter(v=>v.key===version.key).reduce((a,b)=>a.start<b.start?a:b).start;
   if(since>first)facts.append(el('dt',undefined,'Since'),el('dd',undefined,longDate(since)));
   if(version)facts.append(el('dt',undefined,'Boundary'),el('dd',undefined,longDate(version.start)+' to '+(version.end>=engine.data.source.lastDate?'present':longDate(version.end))));
   if(facts.childElementCount)anchor.append(facts);
   const note=config.describe(unit,kind(unit));if(note)anchor.append(el('p','country-note',note));
   if(version?.change)anchor.append(el('p','history-change',version.change+' '+version.citation));
  }
  anchor.append(sourceLink());
 }

 // A map click: the host record to select (null: the present-day place under the point) and
 // the unit's bounds.
 function pick(point){
  focus=null;if(!active||!engine.data)return null;
  const face=engine.pick(point);if(face==null)return null;
  const unit=engine.unit(current(),face);focus={face,place:unitPlace(unit)};
  return {place:focus.place,bounds:unit?.bounds};
 }
 function unitLabels(){
  if(!active||!engine.data)return null;
  const shown=currentUnit();
  return current().units.map(unit=>{const [[w,s],[e,n]]=unit.bounds;return {id:'history-'+unit.key,en:unit.name,center:unit.label,lines:holderLines(unit),priority:Math.min(1,(e-w)*(n-s)/400),selected:unit===shown};});
 }
 function hoverAt(point){
  if(!active||!engine.data)return undefined;
  const face=engine.pick(point),unit=face!=null&&engine.unit(current(),face);
  return unit?{id:'history-'+unit.key,en:unit.name,kind:config.kindLabel(unit,kind(unit))}:null;
 }
 const insets=()=>dispatchEvent(new Event('atlas-map-insets'));
 return {
  get active(){return active;},
  async enter(){
   active=true;const token=++epoch;await engine.load();if(!active||token!==epoch)return;
   if(!(year in engine.data.years))year=config.defaultYear;
   apply();renderDock();dock.hidden=false;onChange();insets();
  },
  leave(){if(!active)return;active=false;epoch++;focus=null;restore();if(dock){dock.hidden=true;insets();}},
  apply,renderSummary,renderState,pick,unitLabels,hoverAt,
  dispose(){this.leave();dock?.remove();dock=null;}
 };
}
