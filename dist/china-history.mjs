// China's historical snapshots for the shared historic view (historic-view.mjs), from the
// Han through the Republic of China, built by scripts/build-china-history.mjs.
import {createHistoricBorders} from './historic-borders.mjs';
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
const ROC_AREA_FILL='#efdfbd';
const replacesLand=year=>year===QING_YEAR||year===ROC_YEAR;
const ROC_SOURCE=['Christian Henriot / ENP-China, CC0','https://www.virtualshanghai.net/Data/Tables?ID=198'];
const QING_SOURCE=['Stanford University (Grave Reform in Modern China), CC BY 3.0','https://purl.stanford.edu/wd799pc4692'];
const sourceFor=year=>year===ROC_YEAR?ROC_SOURCE:year===QING_YEAR?QING_SOURCE:CLIOPATRIA;

export const chinaHistory={
 label:'Historical snapshot',store:'atlas-china-history-year',file:'history/borders.bin',defaultYear:742,periods:true,standalone:true,labelTicks:true,
 yearText:year=>PERIODS[year].year,dateText:year=>PERIODS[year].name,
 sourceName:year=>sourceFor(year)[0],source:year=>sourceFor(year)[1],
 title:year=>PERIODS[year].name+', '+PERIODS[year].year,
 coverage:year=>year===ROC_YEAR?'Nominal 1947–1949 divisions with historical claims from a later reference map. Municipality dots mark city locations.':year===QING_YEAR?'Historical provinces and frontier regions. The Nerchinsk treaty frontier is shown as disputed.':'Approximate extents, drawn along present-day county lines.',
 counts:units=>{const provinces=units.filter(u=>u.type==='Province'||u.type==='ROC province').length;return provinces?provinces+' provinces':units.length+(units.length===1?' polity':' polities');},
 kind:unit=>unit.type.startsWith('ROC ')?unit.type:unit.type==='Qing claim'?'claim':unit.type==='Province'?'province':unit.type==='Frontier region'?'frontier':unit.type==='Disputed frontier'?'disputed':unit.chinese?'state':unit.type==='Nomadic people'?'territory':unit.type==='Colony'?'foreign':'colony',
 keys:[['ROC province','ROC province','#e9dfc9'],['ROC claim','Historical claim',ROC_AREA_FILL],['ROC area','Area or special administrative region',ROC_AREA_FILL],['ROC reference','Other land','#d7d7d3'],['province','Qing province','#ecd6a6'],['frontier','Qing frontier region','#eee2c2'],['disputed','Disputed frontier','#d9bfa9'],['claim','Qing claim','#f4ead2'],['state',year=>PERIODS[year].state,'#ecd6a6'],['colony','Other states','#e0e8da'],['territory','Nomadic peoples','#e4def0'],['foreign','Colonies','#f0dcd6']],
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
 let shownYear,city,rocSearch,modernOptions,modernFlag,municipalityDots,municipalities=[],municipalityLayers=[];
 const citySource='china-history-roc-municipalities';
 const capitals=createRegionalCapitals(map,{country:'china-history-roc',line:'#92703f',onSelect:selectROC});
 const view=createHistoricView(map,{country:'china',base:'data/china/',config:chinaHistory,borders,fill:'#ecd6a6',fillLayer:'province-fragment-fill',hostFills:['province-fill','province-fragment-fill'],scene:host.scene,
  onError:()=>host.status('This snapshot could not load. Try again.'),
  onChange:()=>{
   const year=view.currentYear;
   if(view.active&&year!==shownYear){
    const qing=year===QING_YEAR;
    const republic=year===ROC_YEAR,previous=shownYear;
    const full=replacesLand(year);
    if(full||replacesLand(previous))host.scene.setSnapshot(full?'china-history':null,{keepWater:full,replaceContexts:full?['china']:[]});
    if(previous===ROC_YEAR)removeROCPoints();
    if(republic)installROCPoints(view.datedPoints());
    sidebar.dataset.history=republic?'roc':qing?'qing':'true';
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
 function installROCPoints({capitals:seats,municipalities:places}){
  municipalities=places;
  const flag=$('selection-flag');modernFlag=[flag.getAttribute('src'),flag.alt];
  flag.src='vendor/flag-roc.svg';flag.alt='Flag of the Republic of China';
  capitals.install(seats);
  const dots=municipalityDots=settlementFeatures(places);
  map.addSource(citySource,{type:'geojson',promoteId:'id',data:dots});
  const layers=settlementDotLayers(citySource,dots,'#92703f');
  municipalityLayers=layers.map(layer=>layer.id);
  for(const layer of layers){map.addLayer(layer);setLayerVisible(map,layer.id,true);}
  const records=[...view.datedOptions().map(u=>({id:u.id,en:u.name,local:u.zh,kind:u.kind,aliases:u.aliases})),...places];
  rocSearch=host.createSearch(records);
  const picker=$('province');modernOptions=[...picker.options];
  picker.replaceChildren(new Option('All Republic of China',''),...records.sort((a,b)=>a.en.localeCompare(b.en)).map(r=>new Option(r.en,r.id)));
 }
 function removeROCPoints(){
  capitals.dispose();for(const id of municipalityLayers)map.removeLayer(id);
  if(map.getSource(citySource))map.removeSource(citySource);
  municipalities=[];municipalityLayers=[];municipalityDots=null;rocSearch=null;city=null;
  if(modernOptions){$('province').replaceChildren(...modernOptions);modernOptions=null;}
  if(modernFlag){const flag=$('selection-flag');[flag.src,flag.alt]=modernFlag;modernFlag=null;}
 }
 function selectROC(id,fit=true){
  const picked=municipalities.find(p=>p.id===id);
  if(!picked){city=null;const bounds=view.selectDated(id);if(fit)fitUnit({bounds});return;}
  if(view.datedSelection)view.selectDated('');
  city=picked;showUnit();host.updateLabels();
  if(fit){const [x,y]=picked.center;host.fit([[x-.04,y-.04],[x+.04,y+.04]]);}
 }
 const refreshCapitals=()=>{if(shownYear===ROC_YEAR)host.updateLabels();};
 $('capital-layer').addEventListener('change',refreshCapitals);
 function showUnit(){
  view.renderState($('history-card'));
  if(!view.active)return;
  if(shownYear===ROC_YEAR)$('province').value=city?.id||view.datedSelection;
  const record=city?{kind:city.kind,unit:{name:city.en,zh:city.local}}:view.datedRecord;
  if(!record){$('selection').hidden=true;$('tab-explore').hidden=true;host.showPanel('layers');return;}
  const {unit}=record;host.clearSelection();
  if(city||unit.capital||unit.statusSource){
   const card=$('history-card');
   if(city)card.replaceChildren();
   if(unit.capital){const facts=document.createElement('dl');facts.className='election-facts';const label=document.createElement('dt'),value=document.createElement('dd');label.textContent='Reference seat';value.textContent=unit.capital;facts.append(label,value);card.prepend(facts);}
   if(city){const note=document.createElement('p');note.className='country-note';note.textContent=city.statusNote;card.append(note);}
   const source=city?.statusSource||unit.statusSource;
   if(source){const link=document.createElement('a');link.className='election-source';link.href=source;link.target='_blank';link.rel='noopener';link.textContent=city?.statusSourceLabel?.trim()||'Historical reference';card.append(link);}
   card.hidden=false;
  }
  $('selection-kind').textContent=record.kind.toUpperCase();$('selection-name').textContent=unit.name;$('selection-name').classList.toggle('long-name',unit.name.length>28);
  $('selection-chinese').textContent=unit.zh;$('selection-chinese').lang=replacesLand(shownYear)?'zh-Hant':'zh-Hans';
  $('welcome').hidden=true;$('selection').hidden=false;$('tab-explore').hidden=false;host.showPanel('explore');
 }
 const syncButton=()=>{const button=document.getElementById('historical-snapshot');if(button)button.textContent=view.active?'Present day':'Historical snapshot';};
 const fitUnit=hit=>{if(hit?.bounds)host.fit(hit.bounds);};
 // Leaves without moving the camera, as when the quiz opens or another country does.
 function leave(){if(!view.active)return;view.leave();if(replacesLand(shownYear))host.scene.setSnapshot(null);if(shownYear===ROC_YEAR)removeROCPoints();shownYear=null;host.syncLand();delete sidebar.dataset.history;clearMapViewPicker('china');view.renderSummary($('history-summary'));view.renderState($('history-card'));}
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
  get active(){return view.active;},get replacesLand(){return view.active&&replacesLand(shownYear);},get isRepublic(){return view.active&&shownYear===ROC_YEAR;},get selection(){return city?.id||view.datedSelection;},set,leave,search:query=>rocSearch?.(query),selectROC,
  coversLabel(center){return view.active&&replacesLand(shownYear)&&!!view.hoverAt(map.project(center));},
  // A click, or a present-day place found by search, selects the historical unit there.
  click(point){const place=municipalityLayers.length&&map.queryRenderedFeatures(point,{layers:municipalityLayers})[0]?.properties.id||capitals.pick(point);if(place){selectROC(place);return;}city=null;fitUnit(view.pick(point));},
  pickAt(lngLat){city=null;fitUnit(view.pick(map.project(lngLat)));},
  clear(){if(city){city=null;showUnit();host.updateLabels();}if(view.datedSelection)view.selectDated('');},
  hoverAt:point=>view.hoverAt(point),
  unitLabels(){
   const units=view.unitLabels()||[];if(shownYear!==ROC_YEAR)return units;
   capitals.sync($('capital-layer').checked);
   const mapLanguage=window.AtlasLabels.getLanguage(),language=mapLanguage==='local'?'zh-Hant':mapLanguage;
   const dots=municipalityDots.features.filter(f=>settlementDotVisible(f,map.getZoom(),city?.id));
   const towns=dots.map(f=>{const p=municipalities.find(r=>r.id===f.properties.id);return {...p,lines:placeLines(p,language),priority:city===p?1:.75,selected:city===p,className:'settlement-label',onClick:()=>selectROC(p.id)};});
   return [...units,...capitals.labels(language,map.getBounds(),view.datedSelection),...towns];
  },
  dispose(){leave();$('capital-layer').removeEventListener('change',refreshCapitals);view.dispose();borders.dispose();}
 };
}
