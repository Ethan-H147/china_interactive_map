import {addDockCollapse} from './dock-collapse.mjs';
import {OTHER_LAND,createHistoricBorders,createHostLines} from './historic-borders.mjs';
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

// The same timeline can drive in-place snapshots or link to a detailed snapshot page.
export function buildHistoryDock({id,label,entries,yearText,onSelect,onResize}){
 const dock=el('section','election-dock history-dock');dock.id=id;dock.hidden=true;dock.setAttribute('aria-label',label);
  dock.innerHTML='<div class="election-head"><div class="election-year"><strong></strong><span></span></div><div class="election-tally history-tally"><div class="history-counts"></div><div class="election-needed"></div></div></div><div class="election-legend"></div><div class="election-timeline"><div class="election-strip" role="listbox" aria-label="Year"></div><div class="election-steps"><button type="button" class="election-step" data-step="-1" aria-label="Previous year">'+CHEVRON+'</button><button type="button" class="election-step" data-step="1" aria-label="Next year">'+CHEVRON+'</button></div></div>';
 const strip=dock.querySelector('.election-strip'),ticks=[];
 let current;
 const select=entry=>{if(entry.href)location.hash=entry.href;else onSelect(entry.year);};
 const step=delta=>{const i=entries.findIndex(entry=>entry.year===current);select(entries[Math.max(0,Math.min(entries.length-1,i+delta))]);};
 for(const button of dock.querySelectorAll('.election-step'))button.onclick=()=>step(+button.dataset.step);
 strip.onkeydown=event=>{const delta={ArrowLeft:-1,ArrowRight:1,Home:-Infinity,End:Infinity}[event.key];if(delta===undefined)return;event.preventDefault();step(delta);};
 for(const entry of entries){
  const tick=el(entry.href?'a':'button','election-tick'+(entry.href?' history-link':''));
  if(entry.href)tick.href=entry.href;else{tick.type='button';tick.onclick=()=>select(entry);}
  tick.setAttribute('role','option');tick.dataset.year=entry.year;
  tick.style.setProperty('--party',entry.changed?'#587694':'#b8c3d1');
  const text=yearText(entry.year);
  tick.setAttribute('aria-label',entry.name?text+', '+entry.name:text);
  tick.append(el('span','election-tick-year',text));if(entry.mark)tick.dataset.mark=text;
  strip.append(tick);ticks.push(tick);
 }
 addDockCollapse(dock,{label:'historical controls',onResize});
 document.getElementById('map-shell').append(dock);
 return {dock,showYear(year,focus=false){
  current=year;
  for(const tick of ticks){
   const selected=+tick.dataset.year===year;tick.setAttribute('aria-selected',String(selected));tick.tabIndex=selected?0:-1;
   if(selected){tick.scrollIntoView?.({block:'nearest',inline:'center',behavior:focus?'smooth':'auto'});if(focus)tick.focus({preventScroll:true});}
  }
  dock.querySelector('[data-step="-1"]').disabled=year===entries[0].year;
  dock.querySelector('[data-step="1"]').disabled=year===entries.at(-1).year;
 }};
}

export function createHistoricView(map,{country,base,config,borders:engine,fill,onError=()=>{},fillLayer=country+'-first-fill',hostFills=[fillLayer],selectionLayer=country+'-first-selection-fill',scene=getMapScene(map),onChange=()=>{},onPlace=()=>{}}){
 let request=0,active=false,year,dock,applied=false,original,focus=null,selectedRecord=null,epoch=0;
 try{year=+localStorage.getItem(config.store)||null;}catch{}
 const neighbour=config.neighbour;
 const context=neighbour&&createHistoricBorders(map,{country:neighbour.country,base:new URL('../'+neighbour.country+'/',new URL(base,document.baseURI)).href,file:'history/borders.bin',tag:'history-context',frontierLines:true,lineLayer:country+'-first-lines',scene});
 let contextUnit=null,contextFrame=null,contextRequest=0;
 const hostLines=createHostLines(map,{country,scene,own:id=>engine.layers.has(id)||context?.layers.has(id)});
 const years=()=>Object.keys(engine.data.years).map(Number);
 const snapshot=()=>engine.data.years[year];
 const current=()=>engine.data.configs[snapshot().config];

 // What a unit was: a state, a territory, land held jointly or by another country.
 function kind(unit){
  if(config.kind)return config.kind(unit);
  if(unit.name===neighbour?.name)return 'claims';
  if(unit.type==='Disputed'||unit.sovereign==='Contested')return 'disputed';
  if(unit.type==='Foreign'||unit.sovereign!=='US')return 'foreign';
  return unit.type==='State'||unit.type==='District of Columbia'?'state':unit.type==='Territory'?'territory':'unorganized';
 }
 // A config's own keys ([kind, label or label(year), colour]) replace the defaults.
 const COLORS=config.keys?Object.fromEntries(config.keys.map(([key,,color])=>[key,color])):{colony:'#e0e8da',claims:'#e9e3d8',state:fill,territory:TERRITORY,unorganized:UNORGANIZED,disputed:DISPUTED,foreign:OTHER_LAND},colorOf=unit=>COLORS[kind(unit)];
 const KEYS=config.keys||[['state',config.names?'Province':'State'],['colony','Colony'],['claims','Colonial claims'],['territory','Territory'],['unorganized','Unorganized territory'],['disputed','Disputed'],['foreign','Another country']];
 // A config of separate periods (periods: true) names each with yearText and dateText, and has no year-to-year changes.
 const yearText=y=>config.yearText?.(y)??String(y),ofYear=value=>typeof value==='function'?value(year):value;
 // The host record a unit opens: its present-day state where the unit is one, otherwise the
 // present-day place that was clicked.
 const unitPlace=unit=>unit&&kind(unit)==='state'?unit.state:null;
 function currentUnit(){
  if(!active||!engine.data||!snapshot())return null;
  if(config.standalone){
   const unit=focus?.face!=null?engine.unit(current(),focus.face):null;
   return unit?.selectionGroup?current().units.find(u=>u.id===unit.selectionGroup):unit;
  }
  if(focus?.face!=null)return engine.unit(current(),focus.face);
  const i=selectedRecord?current().partOf[selectedRecord]:undefined;return i>=0?current().units[i]:null;
 }

 function apply(){
  if(!active||!engine.data||!map.getLayer(fillLayer))return;
  // hostFills: every layer drawing the present-day first level; the snapshot draws above fillLayer.
  if(!applied)original=new Map(hostFills.filter(id=>map.getLayer(id)).map(id=>[id,map.getPaintProperty(id,'fill-color')]));
  for(const id of original.keys())map.setPaintProperty(id,'fill-color',OTHER_LAND);
  if(map.getLayer(selectionLayer))map.setPaintProperty(selectionLayer,'fill-opacity',0);
  engine.draw(current(),colorOf,fillLayer);engine.outline(current(),currentUnit(),{highlight:true});
  hostLines({borders:true,selection:true,international:!config.standalone});applied=true;
 }
 async function syncContext(){
  if(!context)return;
  const token=++contextRequest;
  if(year>neighbour.through){context.remove();contextUnit=null;return;}
  try{
   const data=await context.load();
   // The earliest Canadian frame supplies generalized context for earlier US dates.
   const dated=data.years[Math.max(year,Number(Object.keys(data.years)[0]))];
   const frame=data.configs[dated.config];
   if(!active||token!==contextRequest)return;
   contextFrame=frame;contextUnit=context.find(frame,neighbour.key)?.unit||null;
   context.draw(frame,()=>COLORS.claims,fillLayer,{visible:unit=>unit===contextUnit});
   onChange();
  }catch(error){if(active&&token===contextRequest)console.warn('Historical neighbour:',error.message);}
 }
 function restore(){
  contextRequest++;context?.remove();contextUnit=null;
  if(!applied)return;applied=false;engine.remove();hostLines();
  for(const [id,color] of original)if(map.getLayer(id))map.setPaintProperty(id,'fill-color',color);
  if(map.getLayer(selectionLayer))map.setPaintProperty(selectionLayer,'fill-opacity',1);
 }

 let timeline;
 function buildDock(){
  let previous;
  const entries=years().map(y=>{const next=engine.data.years[y].config,changed=next!==previous;previous=next;return {year:y,changed,mark:config.labelTicks||!config.periods&&y%20===0};});
  entries.push(...(config.links||[]).map(link=>({...link,mark:config.labelTicks})));
  timeline=buildHistoryDock({id:country+'-history-dock',label:config.label,entries,yearText,onSelect:next=>setYear(next,true),onResize:insets});
  dock=timeline.dock;
 }
 function renderDock(focusTick=false){
  if(!dock)buildDock();
  const c=current(),kinds=c.units.map(kind),states=kinds.filter(k=>k==='state').length-c.units.filter(u=>u.type==='District of Columbia').length,territories=kinds.filter(k=>k==='territory').length;
  dock.querySelector('.election-year strong').textContent=yearText(year);dock.querySelector('.election-year span').textContent=config.dateText?.(year)??longDate(snapshot().date);
  const provinceCount=count(states,...(config.names||['state','states']));
  const districts=c.units.filter(u=>u.type==='Territorial district').length;
  const colonies=c.units.filter(u=>u.type==='Colony').length;
  const territorial=c.units.filter(u=>u.type==='Territory').length;
  const summary=config.counts?config.counts(c.units,c):config.standalone
   ? [states&&provinceCount,territorial&&count(territorial,'territory','territories'),districts&&count(districts,'district','districts'),!states&&colonies&&count(colonies,'colony','colonies')].filter(Boolean).join(', ')
   : provinceCount+(territories?', '+count(territories,'territory','territories'):'');
  dock.querySelector('.history-counts').textContent=summary;
  const changes=changesIn(year);dock.querySelector('.election-needed').textContent=config.periods?'':changes.length?count(changes.length,'change','changes')+' this year':'No boundary changes this year';
  const legend=dock.querySelector('.election-legend');legend.replaceChildren();
  const key=(color,label)=>{const row=el('span','election-key'),swatch=el('i','election-swatch');swatch.style.background=color;row.append(swatch,el('span',undefined,label));legend.append(row);};
  for(const [kind,label] of KEYS)if(kinds.includes(kind)||kind==='claims'&&neighbour&&year<=neighbour.through)key(COLORS[kind],ofYear(label));
  // Land the source gives to no unit keeps the gray of other land.
  const unrecorded=ofYear(config.unrecorded);if(unrecorded&&c.face?.includes(-1))key(OTHER_LAND,unrecorded);
  timeline.showYear(year,focusTick);
 }
 async function setYear(next,focusTick=false){
  const token=++request;
  if(!engine.data||next===year)return;
  if(engine.prepare){try{await engine.prepare(engine.data.configs[engine.data.years[next].config]);}catch{onError();return;}if(token!==request||!active)return;}
  year=next;try{localStorage.setItem(config.store,String(year));}catch{}
  apply();
  if(config.standalone&&focus?.location){focus.face=engine.pickLocation(focus.location);engine.outline(current(),currentUnit(),{highlight:true});}
  // The picked place may belong to another state this year; the host follows it.
  if(!config.standalone&&focus?.face!=null){const place=unitPlace(engine.unit(current(),focus.face));if(place&&place!==focus.place){focus.place=place;onPlace(place);}}
  void syncContext();renderDock(focusTick);onChange();
 }

 // Boundary changes during a year: the source's dated changes and the changes of holder.
 function changesIn(y){
  // The source's first date only sets out the 1783 boundaries.
  if(config.periods)return [];
  if(config.standalone)return engine.data.events[y]||[];
  const seen=new Set(),list=[],first=engine.data.versions.reduce((a,b)=>a.start<b.start?a:b).start;
  for(const v of engine.data.versions)if(+v.start.slice(0,4)===y&&v.start>first){const key=v.start+v.change;if(seen.has(key))continue;seen.add(key);list.push({date:v.start,name:v.name,text:v.change,citation:v.citation});}
  for(const event of config.events||[])if(+event.date.slice(0,4)===y)list.push(event);
  return list.sort((a,b)=>a.date.localeCompare(b.date));
 }
 function renderSummary(anchor){
  if(!anchor)return;anchor.replaceChildren();anchor.hidden=!active||!engine.data;if(anchor.hidden)return;
  anchor.append(el('h3',undefined,config.title(year)));
  const changes=changesIn(year);
  if(!changes.length){if(!config.periods)anchor.append(el('p','country-note',config.noChanges||'No state or territory boundary changed this year.'));}
  else{const list=el('ol','history-changes');for(const change of changes){const item=el('li');item.append(el('strong',undefined,(change.when||longDate(change.date))+(change.name?', '+change.name:'')),el('span',undefined,change.text));list.append(item);}anchor.append(list);}
  if(neighbour&&year<=neighbour.through)anchor.append(el('p','country-note',neighbour.note));
  if(config.coverage)anchor.append(el('p','country-note',ofYear(config.coverage)));
  anchor.append(sourceLink());
 }
 function sourceLink(){const a=el('a','election-source','Borders: '+ofYear(config.sourceName));a.href=ofYear(config.source);a.target='_blank';a.rel='noopener';return a;}
 function renderState(anchor,record){
  if(!anchor)return;anchor.replaceChildren();
  // The host's selection moved away from the place picked; or the host has picked the
  // present-day place under a click on a unit without a state of its own.
  if(!config.standalone&&focus&&focus.place!=null&&focus.place!==record?.id)focus=null;
  if(!config.standalone&&focus&&focus.place==null)focus.place=record?.id;
  selectedRecord=record?.level===1?record.id:null;if(applied)engine.outline(current(),currentUnit(),{highlight:true});
  const unit=currentUnit();
  anchor.hidden=!active||!engine.data||(config.standalone?!unit:!record||record.level!==1);if(anchor.hidden)return;
  if(!config.standalone)anchor.append(el('h3',undefined,unit?unit.name:config.outside));
  const local=!config.standalone&&unit&&config.localName?.(unit);
  if(local){const names=el('p','korean-name');names.lang='ko';names.append(el('span',undefined,local[0]));if(local[1]){const hanja=el('span','hanja-name',' '+local[1]);hanja.lang='ko-Hani';names.append(hanja);}anchor.append(names);}
  if(unit){
   const version=unit.version&&engine.data.versions.find(v=>v.id===unit.version);
   if(!config.standalone)anchor.append(el('p','election-unit',config.kindLabel(unit,kind(unit))));
   const facts=el('dl','election-facts');
   // When the state or territory began, if after the source's first date, and when this boundary did.
   const first=config.standalone?engine.data.years[years()[0]].date:engine.data.versions.reduce((a,b)=>a.start<b.start?a:b).start,since=unit.since||(version&&engine.data.versions.filter(v=>v.key===version.key).reduce((a,b)=>a.start<b.start?a:b).start);
   if(since>first)facts.append(el('dt',undefined,'Since'),el('dd',undefined,longDate(since)));
   if(version)facts.append(el('dt',undefined,'Boundary'),el('dd',undefined,longDate(version.start)+' to '+(version.end>=engine.data.source.lastDate?'present':longDate(version.end))));
   if(facts.childElementCount)anchor.append(facts);
   const note=config.describe(unit,kind(unit));if(note)anchor.append(el('p','country-note',note));
   if(version?.change)anchor.append(el('p','history-change',version.change+' '+version.citation));
  }
  anchor.append(sourceLink());
 }

 function focusBounds(unit){
  if(!unit)return;
  return current().units.filter(part=>part.selectionGroup===unit.id).reduce(([[w,s],[e,n]],{bounds:[[x,y],[a,b]]})=>
   [[Math.min(w,x),Math.min(s,y)],[Math.max(e,a),Math.max(n,b)]],unit.bounds);
 }
 // A map click: the host record to select (null: the present-day place under the point) and
 // the unit's bounds.
 function pick(point){
  focus=null;if(!active||!engine.data||!snapshot())return null;
  const face=engine.pick(point);
  if(config.standalone){if(face!=null)focus={face,location:map.unproject(point)};engine.outline(current(),currentUnit(),{highlight:true});onChange();return {standalone:true,bounds:focusBounds(currentUnit())};}
  if(face==null)return null;
  const unit=engine.unit(current(),face);focus={face,place:unitPlace(unit)};
  return {place:focus.place,bounds:unit?.bounds};
 }
 function unitLabels(){
  if(!active||!engine.data||!snapshot()||!current().units)return null;
  const shown=currentUnit();
  const units=contextUnit?[...current().units.filter(unit=>unit.name!==neighbour.name),contextUnit]:current().units;
  return units.filter(unit=>!unit.selectionGroup).map(unit=>{const [[w,s],[e,n]]=unit.bounds;return {id:'history-'+unit.key,en:unit.name,center:unit.label,lines:config.labelLines?.(unit)??holderLines(unit),priority:Math.min(1,(e-w)*(n-s)/400),selected:unit===shown};});
 }
 function hoverAt(point){
  if(!active||!engine.data)return undefined;
  const face=engine.pick(point),unit=face!=null&&engine.unit(current(),face);
  return unit?{id:'history-'+unit.key,en:unit.name,kind:config.kindLabel(unit,kind(unit))}:contextUnit&&context.unit(contextFrame,context.pick(point))===contextUnit?{id:'history-'+contextUnit.key,en:contextUnit.name,kind:'Colonial claim'}:null;
 }
 const insets=()=>dispatchEvent(new Event('atlas-map-insets'));
 return {
  get active(){return active;},get currentYear(){return year;},
  async enter(initialYear){
   active=true;const token=++epoch;await engine.load();if(!active||token!==epoch)return;
   if(initialYear in engine.data.years)year=initialYear;
   else if(!(year in engine.data.years))year=config.defaultYear;
   if(engine.prepare)await engine.prepare(current());if(!active||token!==epoch)return;
   if(config.standalone)window.AtlasRegionColorController?.suspend(true);
   apply();renderDock();dock.hidden=false;onChange();insets();void syncContext();
  },
  leave(){if(!active)return;active=false;epoch++;request++;focus=null;restore();if(config.releaseOnLeave){engine.dispose();context?.dispose();contextFrame=null;}if(config.standalone&&document.getElementById('map-shell')?.dataset.quiz!=='true')window.AtlasRegionColorController?.suspend(false);if(dock){dock.hidden=true;insets();}},
  apply,renderSummary,renderState,pick,unitLabels,hoverAt,setYear,
  datedPoints(){return active&&engine.data&&snapshot()?current().points:undefined;},
  datedOptions(){return active&&engine.data&&snapshot()?current().units.filter(u=>!u.selectionGroup):[];},
  get datedRecord(){const unit=currentUnit();return unit&&{name:unit.name,kind:config.kindLabel(unit,kind(unit)),unit,period:config.dateText?.(year)};},
  get datedSelection(){return currentUnit()?.id||'';},
  selectDated(id){
   const found=id?engine.find(current(),id):null,unit=found?.unit;
   focus=unit?{face:found.face,location:{lng:unit.label[0],lat:unit.label[1]}}:null;
   engine.outline(current(),currentUnit(),{highlight:true});onChange();return focusBounds(currentUnit());
  },
  dispose(){this.leave();context?.dispose();dock?.remove();dock=null;}
 };
}
