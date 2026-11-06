// China's historical snapshots for the shared historic view (historic-view.mjs), from the
// Han through the Republic of China, built by scripts/build-china-history.mjs.
import {createHistoricBorders,packShapes,shapeAt} from './historic-borders.mjs';
import {createHistoricView} from './historic-view.mjs';
import {hideMapViewPicker,clearMapViewPicker} from './map-view-picker.mjs';
import {createRegionalCapitals} from './regional-capitals.mjs';
import {placeLines,settlementDotVisible,settlementFeatures,settlementDotLayers} from './settlement-layer.mjs';
import {setLayerVisible} from './adaptive-lines.mjs';
const PERIODS={
 2:{year:'2 CE',name:'Han dynasty',state:'Han dynasty'},
 250:{year:'250 CE',name:'Three Kingdoms',state:'Three Kingdoms'},
 742:{year:'742',name:'Tang dynasty',state:'Tang dynasty'},
 1100:{year:'1100',name:'Song dynasty',state:'Song dynasty'},
 1430:{year:'1430',name:'Ming dynasty',state:'Ming dynasty'},
 1820:{year:'1820',name:'Qing dynasty',state:'Qing dynasty'},
 1949:{year:'1949',name:'Republic of China'}
};
const CLIOPATRIA=['Cliopatria (Seshat)','https://github.com/Seshat-Global-History-Databank/cliopatria'];

const QING_YEAR=1820,ROC_YEAR=1949;
const circuitYear=year=>year===742||year===1100;
const ROC_AREA_FILL='#e9dfc9';
const replacesLand=year=>year===QING_YEAR||year===ROC_YEAR;
const ROC_SOURCE=['Christian Henriot / ENP-China, CC0','https://www.virtualshanghai.net/Data/Tables?ID=198'];
const QING_SOURCE=['Stanford University (Grave Reform in Modern China), CC BY 3.0','https://purl.stanford.edu/wd799pc4692'];
const sourceFor=year=>year===ROC_YEAR?ROC_SOURCE:year===QING_YEAR?QING_SOURCE:CLIOPATRIA;

export const chinaHistory={
 label:'Historical snapshot',store:'atlas-china-history-year',file:'history/borders.bin',defaultYear:742,periods:true,standalone:true,labelTicks:true,
 yearText:year=>PERIODS[year].year,dateText:year=>PERIODS[year].name,
 sourceName:year=>sourceFor(year)[0],source:year=>sourceFor(year)[1],
 title:year=>PERIODS[year].name+', '+PERIODS[year].year,
 coverage:year=>year===ROC_YEAR?'Nominal 1947–1949 divisions with historical claims from a later reference map. Municipality dots mark city locations.':year===QING_YEAR?'Historical provinces and frontier regions. The Nerchinsk treaty frontier is shown as disputed.':circuitYear(year)?'Select a city or circuit. Faded edges show approximate circuit extents.':'Approximate extents, drawn along present-day county lines.',
 counts:(units,{points}={})=>{
  if(points?.circuits){
   const districts=points.circuits.filter(c=>c.kind==='Capital district').length;
   return (points.circuits.length-districts)+' circuits'+(districts?', '+districts+' capital district':'');
  }
  const provinces=units.filter(u=>u.type==='Province'||u.type==='ROC province').length;return provinces?provinces+' provinces':units.length+(units.length===1?' polity':' polities');},
 kind:unit=>unit.type.startsWith('ROC ')?unit.type:unit.type==='Qing claim'?'claim':unit.type==='Province'?'province':unit.type==='Frontier region'?'frontier':unit.type==='Disputed frontier'?'disputed':unit.chinese?'state':unit.type==='Nomadic people'?'territory':unit.type==='Colony'?'foreign':'colony',
 keys:[['ROC province','ROC province','#efdfbd'],['ROC claim','Historical claim',ROC_AREA_FILL],['ROC area','Area or special administrative region',ROC_AREA_FILL],['ROC reference','Other land','#d7d7d3'],['province','Qing province','#ecd6a6'],['frontier','Qing frontier region','#eee2c2'],['disputed','Disputed frontier','#d9bfa9'],['claim','Qing claim','#f4ead2'],['state',year=>PERIODS[year].state,'#ecd6a6'],['colony','Other states','#e0e8da'],['territory','Nomadic peoples','#e4def0'],['foreign','Colonies','#f0dcd6']],
 unrecorded:year=>year===ROC_YEAR?null:year===QING_YEAR?'Other land':'No state recorded',
 kindLabel:unit=>unit.kind||unit.type,
 describe:unit=>unit.note,
 labelLines:unit=>[unit.name,unit.zh]
};

// The snapshot on China's map: the header button replaces the present-day map with a period, a
// click selects the historical unit there, and its card takes the selection heading's place.
// host: the map's own controls (app.js).
export function attachChinaHistory(map,host){
 const {$}=host,sidebar=$('china-sidebar');
 const borders=createHistoricBorders(map,{country:'china',base:'data/china/',file:chinaHistory.file,lineLayer:'province-lines',fillTolerance:0,selection:{paintFaces:true,fill:'#ca6a45',fillOpacity:.3,line:'#a43829'},scene:host.scene});
 let shownYear,city,circuit,circuitData,circuitShapes,placeSearch,modernOptions,modernFlag,municipalityDots,municipalities=[],municipalityLayers=[];
 const citySource='china-history-cities',circuitLayer='china-history-circuit-tint';
 const noCircuit=['==',['get','id'],''];
 const capitals=createRegionalCapitals(map,{country:'china-history-roc',line:'#92703f',onSelect:selectPlace});
 const view=createHistoricView(map,{country:'china',base:'data/china/',config:chinaHistory,borders,fill:'#ecd6a6',fillLayer:'province-fragment-fill',hostFills:['province-fill','province-fragment-fill'],scene:host.scene,
  onError:()=>host.status('This snapshot could not load. Try again.'),
  onChange:()=>{
   const year=view.currentYear;
   if(view.active&&year!==shownYear){
    const qing=year===QING_YEAR;
    const republic=year===ROC_YEAR,previous=shownYear;
    const full=replacesLand(year);
    if(full||replacesLand(previous))host.scene.setSnapshot(full?'china-history':null,{keepWater:full,replaceContexts:full?['china']:[]});
    if(municipalityDots)removePoints();
    if(republic||circuitYear(year))installPoints(view.datedPoints(),republic);
    sidebar.dataset.history=republic?'roc':qing?'qing':circuitData?'circuits':'true';
    shownYear=year;
    host.syncLand();
    history.replaceState(null,'','#china/history='+year);
    if(qing&&previous!==ROC_YEAR){
     const bounds=view.datedOptions().reduce(([[w,s],[e,n]],{bounds:[[x,y],[a,b]]})=>[[Math.min(w,x),Math.min(s,y)],[Math.max(e,a),Math.max(n,b)]],[[180,90],[-180,-90]]);
     host.fit(bounds);
    }
   }
   view.renderSummary($('history-summary'));showUnit();host.updateLabels();
  }});
 function installPoints(data,republic){
  if(!data)return;
  const {capitals:seats,municipalities:towns,protectorates=[]}=data;
  const replaced=new Set(protectorates.map(p=>p.replaces).filter(Boolean));
  const places=[...towns.filter(p=>!replaced.has(p.en)),...protectorates];
  municipalities=places;
  if(republic){
   const flag=$('selection-flag');modernFlag=[flag.getAttribute('src'),flag.alt];
   flag.src='vendor/flag-roc.svg';flag.alt='Flag of the Republic of China';
   capitals.install(seats);
  }else{
   circuitData=data;
   circuitShapes=packShapes(data.coverage.features.filter(f=>f.properties.step===5));
   map.addSource(circuitLayer,{type:'geojson',data:data.coverage,tolerance:0});
   map.addLayer({id:circuitLayer,type:'fill',source:circuitLayer,filter:noCircuit,
    metadata:{atlas:{role:'fill',preserveSelectionOpacity:true}},
    paint:{'fill-color':'#ae5b35','fill-opacity':['get','opacity'],'fill-antialias':false}});
  }
  const dots=municipalityDots=settlementFeatures(places);
  map.addSource(citySource,{type:'geojson',promoteId:'id',data:dots});
  const layers=settlementDotLayers(citySource,dots,'#92703f');
  municipalityLayers=layers.map(layer=>layer.id);
  for(const layer of layers){map.addLayer(layer);setLayerVisible(map,layer.id,true);}
  const units=view.datedOptions().map(u=>({id:u.id,en:u.name,local:u.zh,kind:u.kind,aliases:u.aliases}));
  const records=[...units,...(circuitData?.circuits||[]),...places];
  placeSearch=host.createSearch(records);
  if(!republic)return;
  const picker=$('province');modernOptions=[...picker.options];
  picker.replaceChildren(new Option('All Republic of China',''),...records.sort((a,b)=>a.en.localeCompare(b.en)).map(r=>new Option(r.en,r.id)));
 }
 function removePoints(){
  if(circuitData){
   map.removeLayer(circuitLayer);map.removeSource(circuitLayer);
   circuit=null;circuitData=null;circuitShapes=null;
  }
  capitals.dispose();for(const id of municipalityLayers)map.removeLayer(id);
  if(map.getSource(citySource))map.removeSource(citySource);
  municipalities=[];municipalityLayers=[];municipalityDots=null;placeSearch=null;city=null;
  if(modernOptions){$('province').replaceChildren(...modernOptions);modernOptions=null;}
  if(modernFlag){const flag=$('selection-flag');[flag.src,flag.alt]=modernFlag;modernFlag=null;}
 }
 function setCircuit(next){
  if(circuit===next)return;
  circuit=next;
  if(circuitData)map.setFilter(circuitLayer,next?['==',['get','id'],next.id]:noCircuit);
 }
 function pointAt(point){
  if(!municipalityDots)return;
  const hits=map.queryRenderedFeatures(point,{layers:municipalityLayers});
  const id=hits.find(f=>settlementDotVisible(f,map.getZoom(),city?.id))?.properties.id||capitals.pick(point);
  return id&&municipalities.find(p=>p.id===id);
 }
 function circuitAt(point){
  if(!circuitShapes)return;
  const shape=shapeAt(map,circuitShapes,point);
  return shape&&circuitData.circuits.find(c=>c.id===shape.properties.id);
 }
 function selectPlace(id,fit=true){
  const picked=municipalities.find(p=>p.id===id);
  const area=circuitData?.circuits.find(c=>c.id===id);
  setCircuit(area);
  city=picked;
  if(map.getLayer(citySource))map.setFilter(citySource,['==',['get','id'],picked?.id||'']);
  if(!picked&&!area){const bounds=view.selectDated(id);if(fit)fitUnit({bounds});return;}
  if(view.datedSelection)view.selectDated('');
  else{showUnit();host.updateLabels();}
  if(fit){
   if(area)fitUnit(area);
   else{const [x,y]=picked.center;host.fit([[x-.04,y-.04],[x+.04,y+.04]]);}
  }
 }
 function pickPolity(point,fit){
  if(city||circuit)selectPlace('',false);
  const hit=view.pick(point);
  if(fit)fitUnit(hit);
 }
 const refreshCapitals=()=>{if(shownYear===ROC_YEAR)host.updateLabels();};
 $('capital-layer').addEventListener('change',refreshCapitals);
 function showUnit(){
  view.renderState($('history-card'));
  if(!view.active)return;
  if(shownYear===ROC_YEAR)$('province').value=city?.id||view.datedSelection;
  const place=city||circuit;
  const record=place?{kind:place.kind,unit:{name:place.en,zh:place.local}}:view.datedRecord;
  if(!record){$('selection').hidden=true;$('tab-explore').hidden=true;host.showPanel('layers');return;}
  const {unit}=record;host.clearSelection();
  if(place||unit.capital||unit.statusSource){
   const card=$('history-card');
   if(place)card.replaceChildren();
   const fact=(title,text)=>{if(!text)return;const facts=document.createElement('dl');facts.className='election-facts';const label=document.createElement('dt'),value=document.createElement('dd');label.textContent=title;value.textContent=text;facts.append(label,value);card.append(facts);};
   if(unit.capital||circuit?.seat)fact('Reference seat',unit.capital||circuit.seat);
   if(city?.circuit)fact('Division',circuitData.circuits.find(c=>c.id===city.circuit)?.en);
   if(place){const note=document.createElement('p');note.className='country-note';note.textContent=place.statusNote;card.append(note);}
   const sourceLink=(source,title)=>{if(!source)return;const link=document.createElement('a');link.className='election-source';link.href=source;link.target='_blank';link.rel='noopener';link.textContent=title;card.append(link);};
   sourceLink(city?.statusSource||unit.statusSource||(place&&circuitData?.source),city?.statusSourceLabel?.trim()||(place&&circuitData?.attribution)||'Historical reference');
   sourceLink(city?.primary||circuit?.primary,'Historical geography reference');
   card.hidden=false;
  }
  $('selection-kind').textContent=record.kind.toUpperCase();$('selection-name').textContent=unit.name;$('selection-name').classList.toggle('long-name',unit.name.length>28);
  $('selection-chinese').textContent=unit.zh||'';$('selection-chinese').lang=replacesLand(shownYear)||place&&circuitData?'zh-Hant':'zh-Hans';
  $('welcome').hidden=true;$('selection').hidden=false;$('tab-explore').hidden=false;host.showPanel('explore');
 }
 const syncButton=()=>{const button=document.getElementById('historical-snapshot');if(button)button.textContent=view.active?'Present day':'Historical snapshot';};
 const fitUnit=hit=>{if(hit?.bounds)host.fit(hit.bounds);};
 // Leaves without moving the camera, as when the quiz opens or another country does.
 function leave(){if(!view.active)return;view.leave();if(replacesLand(shownYear))host.scene.setSnapshot(null);if(municipalityDots)removePoints();shownYear=null;host.syncLand();delete sidebar.dataset.history;clearMapViewPicker('china');view.renderSummary($('history-summary'));view.renderState($('history-card'));}
 function set(on,year){
  if(on===view.active)return on&&year?view.setYear(year):undefined;
  let entering;
  // Present-day pickers, layers, statistics and place tools leave with the present-day map (elections.css).
  if(on){host.reset();sidebar.dataset.history='true';hideMapViewPicker('china');
   entering=view.enter(year).then(()=>{if(view.active)map.once('idle',host.updateLabels);}).catch(()=>{if(view.active)host.status('Historical boundaries could not load.');});}
  else{leave();history.replaceState(null,'','#china');host.status(null);host.reset();}
  view.renderSummary($('history-summary'));view.renderState($('history-card'));syncButton();host.syncLayers();host.updateLabels();return entering;
 }
 return {
  get active(){return view.active;},get replacesLand(){return view.active&&replacesLand(shownYear);},get isRepublic(){return view.active&&shownYear===ROC_YEAR;},get hasHistoricalCities(){return !!municipalityDots;},get selection(){return city?.id||circuit?.id||view.datedSelection;},set,leave,search(query){const matches=placeSearch?.(query);return circuitData&&!matches?.length?undefined:matches;},selectPlace,
  coversLabel(center){return view.active&&replacesLand(shownYear)&&!!view.hoverAt(map.project(center));},
  // A click, or a present-day place found by search, selects the historical unit there.
  click(point){
   const place=pointAt(point)||circuitAt(point);
   if(place)selectPlace(place.id,!circuitData);
   else pickPolity(point,!circuitData);
  },
  pickAt(lngLat){const point=map.project(lngLat),area=circuitAt(point);if(area)selectPlace(area.id);else pickPolity(point,true);},
  clear(){if(city||circuit||view.datedSelection)selectPlace('',false);},
  hoverAt(point){return pointAt(point)||circuitAt(point)||view.hoverAt(point);},
  unitLabels(){
   const units=view.unitLabels()||[];if(!municipalityDots)return units;
   capitals.sync(shownYear===ROC_YEAR&&$('capital-layer').checked);
   const mapLanguage=window.AtlasLabels.getLanguage(),language=mapLanguage==='local'?'zh-Hant':mapLanguage;
   const dots=municipalityDots.features.filter(f=>settlementDotVisible(f,map.getZoom(),city?.id));
   const towns=dots.map(f=>{const p=municipalities.find(r=>r.id===f.properties.id);return {...p,lines:placeLines(p,language),priority:city===p?1:.75,selected:city===p,className:'settlement-label',onClick:()=>selectPlace(p.id,!circuitData)};});
   const circuits=(circuitData?.circuits||[]).filter(c=>map.getZoom()>=4.9||c===circuit).map(c=>({...c,lines:placeLines({...c,names:{'zh-Hant':c.local}},language),priority:c===circuit ? .95 : .5,selected:c===circuit,onClick:()=>selectPlace(c.id,false)}));
   return [...units,...capitals.labels(language,map.getBounds(),view.datedSelection),...circuits,...towns];
  },
  dispose(){leave();$('capital-layer').removeEventListener('change',refreshCapitals);view.dispose();borders.dispose();}
 };
}
