import {loadCompressed} from './korea-data.mjs';
import {createHistoricBorders,createHostLines,packShapes,shapeAt,OTHER_LAND} from './historic-borders.mjs';
import {getMapScene} from './map-scene.mjs';
// National elections as a first-level map view, shared by every country with an Elections view.
// Present-day shapes are drawn for every year; a unit is shaded by its winner, and by the
// winner's margin where a vote was counted. Each country passes a config (us-elections.mjs,
// korea-elections.mjs) with one dataset per switchable electorate. The tally follows the data:
// electoral votes where an election has electors, otherwise each candidate's share of the vote.

const ALTERNATES=['#8462b0','#5f9e96','#b5577a','#9b6a43','#c47a2c','#7a9a3c'];
const PAPER='#f7f5f0',NOT_VOTING='#c9c5bb',NO_VOTES='#e6e3dc';
export const TERRITORY='#ece3cf',DISPUTED='#d8c6a2';
export const MARGIN_STEPS=[[5,.42,'Under 5'],[10,.6,'5–10'],[20,.8,'10–20'],[Infinity,1,'20+']];
const NO_POPULAR_SHADE=.7;

const mix=(hex,amount)=>{const a=parseInt(hex.slice(1),16),b=parseInt(PAPER.slice(1),16),c=i=>Math.round(((a>>i)&255)*amount+((b>>i)&255)*(1-amount));return '#'+[16,8,0].map(i=>c(i).toString(16).padStart(2,'0')).join('');};
const hue=h=>{const f=n=>{const k=(n+h/30)%12,v=.52-.32*.48*Math.max(-1,Math.min(k-3,9-k,1));return Math.round(v*255).toString(16).padStart(2,'0');};return '#'+f(0)+f(8)+f(4);};
const numberFormat=new Intl.NumberFormat('en-US'),fmt=n=>Number.isFinite(n)?numberFormat.format(n):'–';
// Near-unanimous figures keep their second decimal, so 99.99% does not round to 100%.
const pct=(n,d)=>Number.isFinite(n)?n.toFixed(d??(Number.isInteger(n)?0:n>=99&&n<100?2:1))+'%':'–';
// Official vote shares as published, to two decimals.
const sharePct=n=>pct(n,Number.isInteger(n)?0:2);
const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const surname=name=>name.replace(/,? (Jr|Sr|II|III)\.?$/,'').split(' ').pop();
const rank=(a,b)=>((b.electoral||0)-(a.electoral||0))||((b.popular||0)-(a.popular||0))||((b.percent||0)-(a.percent||0));
const share=(result,name)=>result.shares?.[name]??(result.votes?.[name]!=null&&result.total?result.votes[name]/result.total*100:null);
// One left-pointing chevron; the next button mirrors it in CSS.
export const CHEVRON='<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
// A foreign holder's name for a label's second line, unless the place's name already says it.
const HOLDER=/Spain|Spanish|France|French|Mexico|Russia|Britain|British|Hawai/;
export const holderLines=unit=>unit.type==='Foreign'&&unit.sovereign!=='Contested'&&!HOLDER.test(unit.name)?[unit.name,unit.sovereign]:[unit.name];

export function candidateColors(election,{partyColors=[],candidateColors:fixedByYear={}}={}){
 const colors=new Map(),used=new Set(),fixed=fixedByYear[election.year]||{};let alternate=0;
 for(const c of [...election.candidates].sort(rank)){
  // Candidates beyond the alternates (1789 had twelve) receive evenly spaced muted hues.
  const next=()=>alternate<ALTERNATES.length?ALTERNATES[alternate++]:hue((alternate++*47)%360);
  let color=c.color||fixed[c.name]||partyColors.find(([pattern])=>pattern.test(c.party||''))?.[1]||next();
  while(used.has(color))color=next();
  used.add(color);colors.set(c.name,color);
 }
 return colors;
}

export function stateShade(result,color){
 if(!Number.isFinite(result.margin)||!result.total&&!result.shares)return mix(color,NO_POPULAR_SHADE);
 return mix(color,MARGIN_STEPS.find(([max])=>result.margin<max)[1]);
}

export function createElectionView(map,{country,base,config,fill,selected:selectedFill,fillLayer=country+'-first-fill',selectionLayer=country+'-first-selection-fill',lineLayer=country+'-first-lines',scene=getMapScene(map),historicBorders,dataset:initialDataset,onDataset=()=>{},onChange=()=>{},onPlace=()=>{}}){
 const datasets=config.datasets,cache=new Map(),store=id=>config.store+(datasets.length>1?':'+id:''),historic=config.historic;
 let dataset=datasets.find(d=>d.id===initialDataset)||datasets[0],data,year,active=false,colors=new Map(),dock,applied=false,original=fill,epoch=0;
 // Borders: present-day units, or (where the config has historic data) the units in force on
 // election day, drawn by the shared historic borders (historic-borders.mjs). focus is the unit
 // picked on the map; the host keeps its own selection.
 const engine=historic?historicBorders||createHistoricBorders(map,{country,base,file:historic.file,lineLayer}):null;
 let borders='present',focus=null,selectedRecord=null;
 try{if(historic&&localStorage.getItem(config.store+':borders')==='historic')borders='historic';}catch{}
 const election=()=>data?.elections.find(e=>e.year===year);
 const candidate=name=>election()?.candidates.find(c=>c.name===name);
 const shortName=c=>c?.short||(config.shortName||surname)(c?.name||'');
 const unitCount=n=>n+' '+(n===1?config.units[0]:config.units[1]);
 function load(d){
  if(!cache.has(d.id))cache.set(d.id,loadCompressed(base+d.file).catch(error=>{cache.delete(d.id);throw error;}));
  return cache.get(d.id);
 }
 async function use(d){
  const token=++epoch,loaded=await load(d);if(token!==epoch)return false;
  dataset=d;data=loaded;let saved;try{saved=+localStorage.getItem(store(d.id));}catch{}
  year=data.elections.some(e=>e.year===saved)?saved:data.elections.some(e=>e.year===year)?year:data.elections.at(-1).year;
  colors=candidateColors(election(),config);return true;
 }
 const showingHistory=()=>borders==='historic'&&!!engine?.data;
 const historyConfig=()=>engine.data.configs[engine.data.elections[year].config];
 const historyUnit=face=>engine.unit(historyConfig(),face);

 const shade=result=>stateShade(result,colors.get(result.winner)||ALTERNATES[0]);
 function expression(){
  const e=election(),entries=[];
  for(const [id,result] of Object.entries(e.states))entries.push(id,shade(result));
  for(const id of e.notVoting||[])entries.push(id,NOT_VOTING);
  return entries.length?['match',['get','id'],...entries,NO_VOTES]:NO_VOTES;
 }
 // A historic unit's colour: its state's result, or what kind of place it was. Land held by
 // another country, and independent republics, read as that country's land.
 function unitKind(unit){
  const e=election();
  if(unit.state&&e.states[unit.state])return 'result';
  if(unit.state&&e.notVoting?.includes(unit.state))return 'not-voting';
  if(unit.type==='Disputed'||unit.sovereign==='Contested')return 'disputed';
  if(unit.type==='Foreign'||unit.sovereign!=='US')return 'foreign';
  return unit.type==='State'||unit.type==='District of Columbia'?'no-votes':'territory';
 }
 const KIND_COLORS={'not-voting':NOT_VOTING,disputed:DISPUTED,foreign:OTHER_LAND,'no-votes':NO_VOTES,territory:TERRITORY};
 const unitColor=unit=>{const kind=unitKind(unit);return kind==='result'?shade(election().states[unit.state]):KIND_COLORS[kind];};
 // The host record a historic unit opens: its state where it voted or was a state, otherwise
 // whatever present-day place was clicked.
 function unitPlace(unit){
  const kind=unit&&unitKind(unit);
  return kind==='result'||kind==='not-voting'||kind==='no-votes'?unit.state:null;
 }

 const unitLayers=[country+'-election-units-fill',country+'-election-units-lines',country+'-election-units-selected'],unitSource=country+'-election-units';
 const hostLines=createHostLines(map,{country,scene,own:id=>unitLayers.includes(id)||!!engine?.layers.has(id)});
 const insertBefore=()=>{const layers=map.getStyle().layers;return layers[layers.findIndex(l=>l.id===fillLayer)+1]?.id;};
 const linePaint=()=>map.getLayer(lineLayer)?Object.fromEntries(['line-color','line-width','line-opacity'].map(p=>[p,map.getPaintProperty(lineLayer,p)]).filter(([,v])=>v!==undefined)):{'line-color':'#587694','line-width':1};
 function selectionPaint(){
  const host=map.getStyle().layers.find(l=>l.type==='line'&&l.id.startsWith(country+'-')&&l.metadata?.atlas?.role==='selection'&&!unitLayers.includes(l.id));
  const color=host&&map.getPaintProperty(host.id,'line-color'),width=host&&map.getPaintProperty(host.id,'line-width');
  return {'line-color':typeof color==='string'?color:'#b73945','line-width':width??1.8};
 }

 // Units that voted on their own but are not drawn on the present-day map (Gwangju, now within
 // Jeonnam–Gwangju) come with the dataset as `units`: their fill and outline, directly above
 // the first-level fill.
 const removeUnits=()=>{for(const id of unitLayers)if(map.getLayer(id))map.removeLayer(id);if(map.getSource(unitSource))map.removeSource(unitSource);};
 function drawUnits(paint){
  if(!data.units){removeUnits();return;}
  if(map.getSource(unitSource)?.atlasUnits!==data.units){removeUnits();map.addSource(unitSource,{type:'geojson',data:data.units});map.getSource(unitSource).atlasUnits=data.units;
   const before=insertBefore();
   map.addLayer({id:unitLayers[0],type:'fill',source:unitSource,filter:['!',['has','outline']],paint:{'fill-color':paint}},before);
   map.addLayer({id:unitLayers[1],type:'line',source:unitSource,filter:['has','outline'],layout:{'line-join':'round','line-cap':'round'},paint:linePaint()},before);
   map.addLayer({id:unitLayers[2],type:'line',source:unitSource,filter:['==',['get','id'],''],layout:{'line-join':'round','line-cap':'round'},paint:selectionPaint()},before);
  }else map.setPaintProperty(unitLayers[0],'fill-color',paint);
 }
 // The historic unit shown for the current selection: the face picked on the map, or the unit
 // holding most of the selected present-day place.
 function currentUnit(){
  if(!showingHistory())return null;
  if(focus?.face!=null)return historyUnit(focus.face);
  const c=historyConfig(),i=selectedRecord?c.partOf[selectedRecord]:undefined;return i>=0?c.units[i]:null;
 }
 // Outlines drawn by the view: the historic unit shown, or the overlay unit picked (or, with its
 // container selected, the overlays inside it, which complete the container's outline).
 function outline(){
  if(showingHistory())engine.outline(historyConfig(),currentUnit());
  if(data?.units&&map.getLayer(unitLayers[2])){const e=election(),ids=focus?.unit?[focus.unit]:selectedRecord?Object.entries(e.states).filter(([,s])=>s.within===selectedRecord).map(([id])=>id):[];map.setFilter(unitLayers[2],['all',['has','outline'],['in',['get','id'],['literal',ids]]]);}
  hostLines({borders:showingHistory(),selection:showingHistory()||!!focus?.unit});
 }
 function apply(){
  if(!active||!data||!map.getLayer(fillLayer))return;
  if(!applied)original??=map.getPaintProperty(fillLayer,'fill-color');
  const paint=expression(),past=showingHistory();map.setPaintProperty(fillLayer,'fill-color',past?OTHER_LAND:paint);drawUnits(paint);
  if(past)engine.draw(historyConfig(),unitColor,fillLayer);else engine?.remove();
  if(map.getLayer(selectionLayer)){map.setPaintProperty(selectionLayer,'fill-color',paint);map.setPaintProperty(selectionLayer,'fill-opacity',past?0:1);}
  outline();applied=true;
 }
 function restore(){
  if(!applied)return;applied=false;removeUnits();engine?.remove();hostLines();
  if(map.getLayer(fillLayer))map.setPaintProperty(fillLayer,'fill-color',original);
  if(map.getLayer(selectionLayer))map.setPaintProperty(selectionLayer,'fill-color',selectedFill);
  if(!fill)original=undefined;
 }
 // A map click while the view draws units of its own. Returns the host record to select (null:
 // the host picks the present-day place under the point) and the unit's bounds.
 function pick(point){
  focus=null;if(!active||!data)return null;
  if(showingHistory()){
   const face=engine.pick(point);if(face==null)return null;
   const unit=historyUnit(face);focus={face,place:unitPlace(unit)};
   return {place:focus.place,bounds:unit?.bounds};
  }
  if(data.units&&map.getLayer(unitLayers[0])){
   const hit=shapeAt(map,unitShapes(),point),within=hit&&election().states[hit.properties.id]?.within;if(!within)return null;
   focus={unit:hit.properties.id,place:within};return {place:within,bounds:unitBounds(focus.unit)};
  }
  return null;
 }
 let unitIndex=null;
 const unitShapes=()=>(unitIndex?.units===data.units?unitIndex:unitIndex={units:data.units,shapes:packShapes(data.units.features)}).shapes;
 function unitBounds(id){
  let w=180,s=90,e=-180,n=-90;const visit=c=>{if(typeof c[0]!=='number')return c.forEach(visit);w=Math.min(w,c[0]);e=Math.max(e,c[0]);s=Math.min(s,c[1]);n=Math.max(n,c[1]);};
  for(const f of data.units.features)if(f.properties.id===id&&!f.properties.outline)visit(f.geometry.coordinates);
  return [[w,s],[e,n]];
 }
 // After a year change the picked face may belong to another state; the host follows it.
 function followFocus(){
  if(focus?.face==null)return;
  const place=unitPlace(historyUnit(focus.face));
  if(place&&place!==focus.place){focus.place=place;onPlace(place);}
 }
 async function setBorders(value){
  if(!historic||value===borders)return;borders=value;focus=null;try{localStorage.setItem(config.store+':borders',value);}catch{}
  if(value==='historic'&&!engine.data){renderDock();try{await engine.load();}catch(error){console.warn('Historic borders:',error.message);borders='present';}if(!active)return;}
  apply();renderDock();onChange();
 }

 function buildDock(){
  dock=el('section','election-dock');dock.id='election-dock';dock.hidden=true;dock.setAttribute('aria-label',config.label);
  const switcher=datasets.length>1?'<div class="election-switch" role="group" aria-label="Electorate">'+datasets.map(d=>'<button type="button" data-dataset="'+d.id+'">'+d.label+'</button>').join('')+'</div>':historic?'<div class="election-switch" role="group" aria-label="Borders"><button type="button" data-borders="present">Current borders</button><button type="button" data-borders="historic">Historic borders</button></div>':'';
  dock.innerHTML='<div class="election-head"><div class="election-year"><strong></strong><span></span></div><div class="election-tally"><div class="election-names"></div><div class="election-bar" role="img"></div><div class="election-needed"></div></div></div><div class="election-legend"></div><div class="election-timeline">'+switcher+'<div class="election-strip" role="listbox" aria-label="Election year"></div><div class="election-steps"><button type="button" class="election-step" data-step="-1" aria-label="Previous election">'+CHEVRON+'</button><button type="button" class="election-step" data-step="1" aria-label="Next election">'+CHEVRON+'</button></div></div>';
  dock.querySelector('.election-timeline').classList.toggle('has-switch',!!switcher);
  document.getElementById('map-shell').append(dock);
  for(const button of dock.querySelectorAll('.election-step'))button.onclick=()=>step(+button.dataset.step);
  for(const button of dock.querySelectorAll('[data-dataset]'))button.onclick=()=>setDataset(button.dataset.dataset);
  for(const button of dock.querySelectorAll('[data-borders]'))button.onclick=()=>setBorders(button.dataset.borders);
  dock.querySelector('.election-strip').onkeydown=event=>{const keys={ArrowLeft:-1,ArrowRight:1,Home:-Infinity,End:Infinity};if(!(event.key in keys))return;event.preventDefault();const years=data.elections.map(e=>e.year),i=years.indexOf(year),next=keys[event.key]===-Infinity?0:keys[event.key]===Infinity?years.length-1:Math.max(0,Math.min(years.length-1,i+keys[event.key]));setYear(years[next],true);};
 }
 function buildStrip(){
  const strip=dock.querySelector('.election-strip');if(strip.dataset.dataset===dataset.id)return;strip.dataset.dataset=dataset.id;strip.replaceChildren();
  for(const e of data.elections){
   const tick=el('button','election-tick');tick.type='button';tick.setAttribute('role','option');tick.dataset.year=e.year;tick.tabIndex=-1;
   const winner=[...e.candidates].sort(rank)[0];tick.style.setProperty('--party',candidateColors(e,config).get(winner.name));
   tick.setAttribute('aria-label',e.year+', '+winner.name);tick.title=e.year+': '+winner.name;
   tick.append(el('span','election-tick-year',String(e.year)));if((config.mark||(y=>y%40===0))(e.year))tick.dataset.mark=e.year;
   tick.onclick=()=>setYear(e.year,true);strip.append(tick);
  }
 }
 function step(delta){const years=data.elections.map(e=>e.year),i=years.indexOf(year);setYear(years[Math.max(0,Math.min(years.length-1,i+delta))],true);}
 function renderTally(e){
  const electoral=!!e.electors,value=c=>electoral?c.electoral:c.percent,text=c=>electoral?String(c.electoral):sharePct(c.percent);
  const ranked=[...e.candidates].filter(c=>value(c)>0).sort(rank),winner=ranked[0],runner=ranked[1];
  const names=dock.querySelector('.election-names');names.replaceChildren();
  for(const [c,side] of [[winner,'winner'],[runner,'runner']]){if(!c)continue;const span=el('span','election-name '+side);span.style.setProperty('--party',colors.get(c.name));const label=el('span',undefined,shortName(c)),count=el('b',undefined,text(c));if(side==='winner')span.append(label,count);else span.append(count,label);names.append(span);}
  const total=electoral?(e.electors||ranked.reduce((s,c)=>s+c.electoral,0))*(e.dualVote?2:1):100,bar=dock.querySelector('.election-bar');bar.replaceChildren();
  const order=runner?[winner,...ranked.slice(2),runner]:[winner];
  for(const c of order){const part=el('span');part.style.width=(value(c)/total*100)+'%';part.style.background=colors.get(c.name);part.title=c.name+': '+text(c);if(c===runner)part.style.marginLeft='auto';bar.append(part);}
  const needed=dock.querySelector('.election-needed');
  if(electoral){
   const marker=el('i');marker.style.left=(e.needed/total*100)+'%';bar.append(marker);
   bar.setAttribute('aria-label',order.map(c=>c.name+' '+c.electoral).join(', ')+'. '+e.needed+' needed to win.');
   needed.textContent=e.dualVote?e.needed+' electors of '+e.electors+' to win; each cast two votes':e.needed+' to win';
  }else{
   bar.setAttribute('aria-label',order.map(c=>c.name+' '+sharePct(c.percent)).join(', ')+'.');
   needed.textContent=Number.isFinite(e.turnout)?'Turnout '+pct(e.turnout):'';
  }
 }
 function renderLegend(e){
  const legend=dock.querySelector('.election-legend');legend.replaceChildren();
  const carried=new Set(Object.values(e.states).map(s=>s.winner));
  for(const c of e.candidates.filter(c=>carried.has(c.name))){
   const row=el('span','election-key');
   // National figures shown in every unit have no regional margin to grade.
   if(e.uniform){const swatch=el('i','election-swatch');swatch.style.background=colors.get(c.name);row.append(swatch);}
   else{const ramp=el('span','election-ramp');for(const [,amount] of MARGIN_STEPS){const swatch=el('i');swatch.style.background=mix(colors.get(c.name),amount);ramp.append(swatch);}row.append(ramp);}
   row.append(el('span',undefined,shortName(c)));legend.append(row);
  }
  if(!e.uniform){
   const scale=el('span','election-key election-scale');scale.append(el('span',undefined,'Margin (pts)'));
   for(const [,amount,label] of MARGIN_STEPS){const stepKey=el('span','election-scale-step'),swatch=el('i');swatch.style.background=mix('#5f5b52',amount);stepKey.append(swatch,el('small',undefined,label));scale.append(stepKey);}
   legend.append(scale);
  }
  const kinds=showingHistory()?new Set(historyConfig().units.map(unitKind)):new Set();
  for(const [shown,color,label] of [[e.notVoting?.length,NOT_VOTING,'Did not vote'],[kinds.has('territory'),TERRITORY,'Territory'],[kinds.has('disputed'),DISPUTED,'Disputed']])if(shown){const row=el('span','election-key');const swatch=el('i','election-swatch');swatch.style.background=color;row.append(swatch,el('span',undefined,label));legend.append(row);}
 }
 function renderDock(focus=false){
  const e=election();if(!dock)buildDock();buildStrip();
  for(const button of dock.querySelectorAll('[data-dataset]'))button.setAttribute('aria-pressed',String(button.dataset.dataset===dataset.id));
  for(const button of dock.querySelectorAll('[data-borders]'))button.setAttribute('aria-pressed',String(button.dataset.borders===borders));
  dock.querySelector('.election-year strong').textContent=e.year;dock.querySelector('.election-year span').textContent=e.date||'';
  renderTally(e);renderLegend(e);
  for(const tick of dock.querySelectorAll('.election-tick')){const current=+tick.dataset.year===e.year;tick.setAttribute('aria-selected',String(current));tick.tabIndex=current?0:-1;if(current){tick.scrollIntoView?.({block:'nearest',inline:'center',behavior:focus?'smooth':'auto'});if(focus)tick.focus({preventScroll:true});}}
  const years=data.elections.map(x=>x.year);dock.querySelector('[data-step="-1"]').disabled=e.year===years[0];dock.querySelector('[data-step="1"]').disabled=e.year===years.at(-1);
 }
 function setYear(next,focus=false){
  if(!data||next===year)return;year=next;try{localStorage.setItem(store(dataset.id),String(year));}catch{}
  colors=candidateColors(election(),config);apply();followFocus();renderDock(focus);onChange();
 }
 async function setDataset(id){
  const next=datasets.find(d=>d.id===id);if(!next||next===dataset&&data)return;
  if(!active){dataset=next;data=null;return;}
  if(!await use(next)||!active)return;
  focus=null;apply();renderDock();onDataset(dataset.id);onChange();
 }

 function renderSummary(anchor){
  if(!anchor)return;anchor.replaceChildren();anchor.hidden=!active||!data;if(anchor.hidden)return;
  const e=election(),electoral=!!e.electors;
  anchor.append(el('h3',undefined,e.title||e.year+' presidential election'));
  if(e.note)anchor.append(el('p','country-note',e.note));
  const won=new Map();for(const s of Object.values(e.states))if(s.winner&&!s.partOf)won.set(s.winner,(won.get(s.winner)||0)+1);
  const table=el('table','election-table');table.innerHTML='<thead><tr><th scope="col">Candidate</th>'+(electoral?'<th scope="col">Electoral</th><th scope="col">Popular</th>':e.uniform?'<th scope="col">Vote</th>':'<th scope="col">Won</th><th scope="col">Votes</th>')+'</tr></thead>';
  const body=el('tbody');
  for(const c of [...e.candidates].sort(rank)){
   const row=el('tr'),who=el('th');who.scope='row';who.style.setProperty('--party',colors.get(c.name));
   who.append(el('span','election-candidate',c.name),el('small',undefined,[c.party,(c.runningMates||[]).map(r=>r.name).join(', ')].filter(Boolean).join(' / ')));
   row.append(who);
   if(electoral){const ev=el('td');ev.append(el('b',undefined,String(c.electoral||0)));if(won.get(c.name))ev.append(el('small',undefined,unitCount(won.get(c.name))));row.append(ev);}
   else if(!e.uniform)row.append(el('td',undefined,won.get(c.name)?String(won.get(c.name)):'–'));
   const pop=el('td');pop.append(el('b',undefined,sharePct(c.percent)));if(c.popular)pop.append(el('small',undefined,fmt(c.popular)));
   row.append(pop);body.append(row);
  }
  table.append(body);anchor.append(table);
  const facts=el('dl','election-facts');
  for(const [term,value] of [['Election day',e.date],['Electors',e.electors&&e.electors+(e.needed?' ('+e.needed+' to win)':'')],['Seats',e.seats&&fmt(e.seats)],['Registered voters',e.registered&&fmt(e.registered)],['Turnout',Number.isFinite(e.turnout)?pct(e.turnout):null]])if(value){facts.append(el('dt',undefined,term),el('dd',undefined,value));}
  anchor.append(facts);
  anchor.append(sourceLink(e));
 }
 function sourceLink(e){const a=el('a','election-source','Results source: '+(e.sourceName||data.sourceName||'Wikipedia'));a.href=e.source;a.target='_blank';a.rel='noopener';return a;}

 function renderState(anchor,record){
  if(!anchor)return;anchor.replaceChildren();
  // The host's selection moved away from the place picked on the map; or, for a historic unit
  // without a state of its own, the host has picked the present-day place under the click.
  if(focus&&focus.place!=null&&focus.place!==record?.id)focus=null;
  if(focus&&focus.place==null)focus.place=record?.id;
  selectedRecord=record?.level===1?record.id:null;if(active&&data&&applied)outline();
  anchor.hidden=!active||!data||!record||record.level!==1||config.covers&&!config.covers(record,dataset.id);if(anchor.hidden)return;
  const e=election(),result=e.states[focus?.unit||record.id];
  anchor.append(el('h3',undefined,e.title||e.year+' presidential election'));
  if(showingHistory()){renderUnit(anchor,e,record);anchor.append(sourceLink(e),bordersLink());return;}
  if(!result){
   const notVoting=e.notVoting?.includes(record.id);
   anchor.append(el('p','country-note',notVoting?'Did not take part in this election.':config.missing?.(record,e,data)||'No result recorded.'));
   if(notVoting&&e.note)anchor.append(el('p','country-note',e.note));
   return;
  }
  // A unit that voted under another name (South Jeolla within Jeonnam–Gwangju) is named.
  if(result.name&&result.name!==record.en)anchor.append(el('p','election-unit',result.name));
  renderResult(anchor,e,result);anchor.append(sourceLink(e));
 }
 // The historic unit covering the selection on election day, named where it is not the
 // selected present-day place.
 function renderUnit(anchor,e,record){
  const unit=currentUnit();
  if(!unit){anchor.append(el('p','country-note',historic.outside||'Outside the country at the time.'));return;}
  if(unit.name!==record.en)anchor.append(el('p','election-unit',unit.name));
  const kind=unitKind(unit);
  if(kind==='result')return renderResult(anchor,e,e.states[unit.state]);
  anchor.append(el('p','country-note',kind==='not-voting'?'Did not take part in this election.':unit.note||historic.describe?.(unit,kind,e,data)||'No electoral votes.'));
  if(kind==='not-voting'&&e.note)anchor.append(el('p','country-note',e.note));
 }
 function bordersLink(){const a=el('a','election-source','Borders: '+historic.sourceName);a.href=historic.source;a.target='_blank';a.rel='noopener';return a;}
 function renderResult(anchor,e,result){
  const winner=candidate(result.winner),headline=el('p','election-state-winner');headline.style.setProperty('--party',colors.get(result.winner));
  headline.append(el('strong',undefined,result.winner),el('span',undefined,winner?.party||''));anchor.append(headline);
  const electors=result.electors||{},cast=Object.values(electors).reduce((a,b)=>a+b,0),hasElectors=!!e.electors;
  const facts=el('dl','election-facts');
  const electoralText=result.electoral==null?null:e.dualVote?result.electoral+' electors, '+cast+' votes':String(result.electoral);
  for(const [term,value] of [['Electoral votes',electoralText],['Margin',Number.isFinite(result.margin)&&(result.total||result.shares)?result.margin.toFixed(1)+' points':null],['Total votes',result.total?fmt(result.total):null],['Turnout',Number.isFinite(result.turnout)?pct(result.turnout):null]])if(value)facts.append(el('dt',undefined,term),el('dd',undefined,value));
  anchor.append(facts);
  const votes=result.votes||{},names=[...new Set([...Object.keys(votes),...Object.keys(result.shares||{}),...Object.keys(electors)])].filter(n=>n!=='other').sort((a,b)=>(electors[b]||0)-(electors[a]||0)||(share(result,b)??0)-(share(result,a)??0));
  const table=el('table','election-table');table.innerHTML='<thead><tr><th scope="col">Candidate</th><th scope="col">Votes</th>'+(hasElectors?'<th scope="col">Electors</th>':'')+'</tr></thead>';const body=el('tbody');
  for(const name of [...names,...(votes.other?['other']:[])]){
   const row=el('tr'),who=el('th');who.scope='row';if(name!=='other')who.style.setProperty('--party',colors.get(name)||'#b9b4aa');
   who.append(el('span','election-candidate',name==='other'?'Others':name));if(name!=='other'&&candidate(name)?.party)who.append(el('small',undefined,candidate(name).party));
   const cell=el('td'),value=share(result,name);if(value!=null){cell.append(el('b',undefined,pct(value)));if(votes[name]!=null)cell.append(el('small',undefined,fmt(votes[name])));}else cell.textContent='–';
   row.append(who,cell);if(hasElectors)row.append(el('td',undefined,electors[name]?String(electors[name]):'–'));body.append(row);
  }
  table.append(body);anchor.append(table);
  if(hasElectors&&!result.total)anchor.append(el('p','country-note','No statewide popular vote is recorded; electors were chosen by the legislature or the vote is unrecorded.'));
  if(result.districts?.length){
   const details=el('details','election-districts');details.append(el('summary',undefined,'District results'));
   const list=el('table','election-table');list.innerHTML='<thead><tr><th scope="col">District</th><th scope="col">Electors</th></tr></thead>';const rows=el('tbody');
   for(const d of result.districts){const won=Object.entries(d.electors).sort((a,b)=>b[1]-a[1]);const row=el('tr');row.append(el('th',undefined,d.district),el('td',undefined,won.length?won.map(([n,v])=>surname(n)+' '+v).join(', '):'–'));rows.append(row);}
   list.append(rows);details.append(list);anchor.append(details);
  }
  if(result.note)anchor.append(el('p','country-note',result.note));
 }

 // The page refits the map around the dock when it appears or leaves (app.js, electionInset).
 const insets=()=>dispatchEvent(new Event('atlas-map-insets'));
 function labelLines(record){const result=election()?.states[record.id];return result?.electoral?[record.en,String(result.electoral)]:null;}
 // Map labels for historic units, which replace the present-day first-level labels.
 function unitLabels(){
  if(!active||!data||!showingHistory())return null;
  const e=election(),shown=currentUnit();
  return historyConfig().units.map(unit=>{const result=unit.state&&e.states[unit.state],[[w,s],[east,n]]=unit.bounds;return {id:'election-'+unit.key,en:unit.name,center:unit.label,lines:result?.electoral?[unit.name,String(result.electoral)]:holderLines(unit),...(result?.electoral?{className:'korea-marker election-label'}:{}),priority:Math.min(1,(east-w)*(n-s)/400),selected:unit===shown};});
 }
 function hoverAt(point){
  if(!active||!showingHistory())return undefined;
  const face=engine.pick(point),unit=face!=null&&historyUnit(face);
  return unit?{id:'election-'+unit.key,en:unit.name,kind:unit.type}:null;
 }

 return {
  get active(){return active;},get dataset(){return dataset.id;},
  async enter(){
   active=true;if(!await use(dataset)||!active)return;
   if(borders==='historic'&&engine&&!engine.data){try{await engine.load();}catch(error){console.warn('Historic borders:',error.message);borders='present';}if(!active)return;}
   window.AtlasRegionColorController?.suspend(true);apply();renderDock();dock.hidden=false;onChange();insets();},
  leave(){if(!active)return;active=false;epoch++;focus=null;restore();if(dock){dock.hidden=true;insets();}if(document.getElementById('map-shell')?.dataset.quiz!=='true')window.AtlasRegionColorController?.suspend(false);},
  get borders(){return borders;},
  apply,renderSummary,renderState,labelLines,unitLabels,hoverAt,pick,setDataset,setBorders,
  dispose(){this.leave();dock?.remove();dock=null;if(!historicBorders)engine?.dispose();}
 };
}
