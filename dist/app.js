const $=id=>document.getElementById(id);
const english={110000:'Beijing',120000:'Tianjin',130000:'Hebei',140000:'Shanxi',150000:'Inner Mongolia',210000:'Liaoning',220000:'Jilin',230000:'Heilongjiang',310000:'Shanghai',320000:'Jiangsu',330000:'Zhejiang',340000:'Anhui',350000:'Fujian',360000:'Jiangxi',370000:'Shandong',410000:'Henan',420000:'Hubei',430000:'Hunan',440000:'Guangdong',450000:'Guangxi',460000:'Hainan',500000:'Chongqing',510000:'Sichuan',520000:'Guizhou',530000:'Yunnan',540000:'Tibet',610000:'Shaanxi',620000:'Gansu',630000:'Qinghai',640000:'Ningxia',650000:'Xinjiang',710000:'Taiwan',810000:'Hong Kong',820000:'Macao'};
const reducedMotion={get matches(){return window.AtlasSettings.prefersReducedMotion();}};
let atlasStarting=true,restoringView=false;
let zoomLock;
const initialCountry=window.AtlasEntry?.initial;
const lowMemory=!!window.AtlasEntry?.lowMemory;
let chinaCountyScope;
const initialBackground=window.AtlasEntry?.countries[initialCountry]?.background||'#f4f0e7';
const registry=window.AtlasCountries;
const initialPreview=registry.countries[initialCountry]?.map||null;
const map=new maplibregl.Map({container:'map',...(lowMemory?{maxTileCacheSize:12,maxTileCacheZoomLevels:2,pixelRatio:Math.min(devicePixelRatio||1,2)}:{}),style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':initialBackground}}],transition:{duration:0,delay:0}},center:initialPreview?.center||[105,36],zoom:initialPreview?.zoom||(initialPreview?2:3),minZoom:.5,maxZoom:16,renderWorldCopies:!!registry.countries[initialCountry]?.worldCopies,dragRotate:false,pitchWithRotate:false,touchPitch:false,maxPitch:0,attributionControl:false,canvasContextAttributes:window.AtlasPerformance.contextOptions(),fadeDuration:0});
window.AtlasGlobeRendererController=window.AtlasGlobeRenderer.attachGlobeRenderer(map);
window.AtlasPerformanceController=window.AtlasPerformance.attach(map,{refreshLabels:updateLabels});
const mapScene=window.AtlasMapScene.createMapScene(map);
map.touchZoomRotate.disableRotation();map.keyboard.disableRotation();
window.AtlasRegionColorController=window.AtlasRegionColors.createRegionColors(map,{changed:()=>saveViewSoon(),getLevel:()=>currentAtlas()?.getMode?.()||($('mode-province').getAttribute('aria-pressed')==='true'?1:2)});
// Motion previews download after the first view is usable; until then camera
// movement renders the full map directly.
let finishStartup;const startupFinished=new Promise(resolve=>finishStartup=resolve);
const motionRenderer=window.AtlasMotion.createMotionRenderer(map,initialCountry,{startAfter:startupFinished});
map.addControl(new maplibregl.AttributionControl({compact:true,customAttribution:'Country silhouettes: Natural Earth · IBGE · IGN · IGM / IDE Uruguay | World land: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (public domain) | Malaysia: <a href="https://github.com/dosm-malaysia/data-open/tree/main/datasets/geodata">DOSM</a> | Singapore: <a href="https://data.gov.sg/datasets/d_29f066d67df3eae91df8a42f443863c8/view">SLA</a> (Singapore Open Data Licence) | Boundaries: <a href="https://datav.aliyun.com/portal/school/atlas/area_selector" target="_blank" rel="noopener">DataV</a> · <a href="https://data.gov.tw/dataset/7442" target="_blank" rel="noopener">NLSC</a> · <a href="https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov" target="_blank" rel="noopener">AreaCity</a> · <a href="https://portal.csdi.gov.hk/csdi-webpage/metadata/landsd_rcd_1637221775627_85634/html" target="_blank" rel="noopener">© HK SAR Government</a> · <a href="https://webmap.gis.gov.mo/MapGIS/index.html" target="_blank" rel="noopener">Macao Government</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>'}));
window.AtlasMapSources.setupMapSources(map);

const styleReady=new Promise(resolve=>map.once('load',resolve));
const labels=[];
const countryLabels=window.AtlasLabels.createCountryLabels(map,{allows:country=>window.AtlasDev.allows(country)});
let labelFrame;
const sourceFor=r=>r.feature.properties.parentCity?'city-districts':r.feature.properties.level==='province'?'provinces':isPrefectureLevel(r.feature.properties)?'prefectures':'others';
function setRegionState(region,state){if(region.feature.geometry){const source=sourceFor(region);for(const id of [source,source+'-selection-edges'])window.AtlasMotion.setFeatureState(map,{source:id,id:region.feature.properties.adcode},state);}}
function layerVisible(id,visible){window.AtlasLines.setLayerVisible(map,id,visible);if(map.getLayer(id+'-repaired'))window.AtlasLines.setLayerVisible(map,id+'-repaired',visible);}
function syncCountryFills(){
  for(const id of ['province-fill','province-fragment-fill'])layerVisible(id,atlasMode==='china'&&chinaReady&&!countrySwitching);
  layerVisible('china-context',atlasMode!=='china'||!chinaReady||countrySwitching);
}
function syncLayers(){
  syncDistrictLayers();
  const ids=['prefecture-fill','prefecture-fragment-fill','prefecture-lines','prefecture-selection','other-fill','other-lines','other-selection','province-selection','province-lines'];
  if(atlasMode!=='china'||countrySwitching){for(const id of ids)layerVisible(id,false);return;}
  if(chinaFirstQuiz?.active){for(const id of ids)layerVisible(id,id==='province-lines');return;}
  if(quiz.active){for(const id of ['other-fill','other-lines','other-selection','province-selection'])layerVisible(id,false);for(const id of ['prefecture-fill','prefecture-fragment-fill','prefecture-lines','prefecture-selection','province-lines'])layerVisible(id,true);return;}
  const pref=$('prefecture-layer').checked,other=$('other-layer').checked,prov=$('province-layer').checked;
  for(const id of ['prefecture-fill','prefecture-fragment-fill','prefecture-lines','prefecture-selection'])layerVisible(id,pref);
  for(const id of ['other-fill','other-lines','other-selection'])layerVisible(id,other);
  layerVisible('province-lines',prov);
  layerVisible('province-selection',true);
}
const fillColors=['#efe2c8','#eee6d5','#f2e9d6','#e9ddc3','#f4e6d0','#e9e0ca'];
const provinceLayers=new Map(),detailLayers=new Map(),regionIndex=[];
let regionNames={},regionPopulation,provincePopulation,xinjiangAdministration,explorer;
// Prefectures with county-level divisions, shared by public and developer views.
let districtCities=new Set();
function districtScope(){const p=selected?.layer.feature.properties;return p?.parentCity||(districtCities.has(p?.adcode)?p.adcode:null);}
function districtsVisible(){return atlasMode==='china'&&!quiz.active&&!!districtScope()&&$('other-layer').checked&&$('map-shell').dataset.level==='prefecture';}
function syncDistrictLayers(){
  const scope=districtsVisible()?districtScope():null;
  if(chinaCountyScope)chinaCountyScope.ensure(scope).catch(error=>console.warn('China county area',error));
  const visible=districtsVisible()&&chinaCountyScope?.loaded===scope,filter=['==',['get','parentCity'],districtScope()||0];
  for(const id of ['city-district-fill','city-district-lines','city-district-selection'])if(map.getLayer(id)){map.setFilter(id,filter);layerVisible(id,visible);}
}
let provinceFeatures=[],manifest,selected=null,allReady=false,cameraBusy=false,activeCode=null,finishNavigation=null,hovered=null;
let chinaFirstQuiz;
const quiz={active:false,round:null,pool:[],saved:null,highlighted:[],reviewLayer:null};
let failedCountry=null,recoveringCountry=false,chinaReady=false,chinaLoading,countrySwitching=false,countryEpoch=0,requestedCountry,countryPreparation,countryLoadFailed=false;
// Keep all county search records; load boundary geometry for the selected area.
let chinaCounties=false,chinaCountiesLoading=null,chinaArticles;
function loadChinaCounties(){
 return chinaCountiesLoading??=(async()=>{
  const [regions,names]=await Promise.all([json('data/china-counties-regions.json'),json('data/china-county-names.json')]);
  Object.assign(regionNames,names.regions);Object.assign(chinaArticles.regions,names.articles);
  // The five-city districts leave the index; the counties (the five cities' refined ones among them) take their place.
  const selectedCode=selected?.layer.feature.properties.parentCity?selected.layer.feature.properties.adcode:null;
  for(let i=regionIndex.length-1;i>=0;i--)if(regionIndex[i].layer.feature.properties.parentCity){regionByCode.delete(regionIndex[i].layer.feature.properties.adcode);regionIndex.splice(i,1);}
  for(const code of districtCities){const list=detailLayers.get(code);if(list)detailLayers.set(code,list.filter(l=>!l.feature.properties.parentCity));}
  districtCities=new Set(regions.districts.map(f=>f.properties.parentCity));
  for(const f of regions.districts){const code=f.properties.parentCity;if(!detailLayers.has(code))detailLayers.set(code,[]);detailLayers.get(code).push(bindRegion(f,f.properties.provinceCode));}
  if(selectedCode&&regionByCode.get(selectedCode))selected.layer=regionByCode.get(selectedCode);
  comparison.register('china',{regions:[...provinceLayers.values(),...regionByCode.values()].filter((l,i,a)=>a.findIndex(x=>x.feature.properties.adcode===l.feature.properties.adcode)===i),name:englishName,kind,provincePopulation,regionPopulation});
  chinaCounties=true;syncLayers();
 })().catch(error=>{chinaCountiesLoading=null;throw error;});
}
let comparison,southAmerica;
// Each country's own adapter, created in init; the regional groups and South America hold portals per country.
const atlases={};
// Portals are added after China's first view; a country switch requested before then waits for them.
let atlasesReady=false,finishAtlases;const atlasesSetup=new Promise(resolve=>finishAtlases=resolve);
let normalProvinceColors,atlasMode='china',southernAfrica,europe,capitalDisplay,waterDisplay,satelliteDisplay,namingQuiz,placeTools;
const regionByCode=new Map();
const homeBounds=[[73,17.3],[135.5,54]];
const overview=window.AtlasLabels.createHoverOverview(map,{blocked:()=>cameraBusy||countrySwitching||!allReady||quiz.active,resolve:(point,id)=>{if(atlasMode!=='china')return currentAtlas()?.hoverAt?.(point,id);const region=id?regionByCode.get(Number(id)):pickedRegion(point);if(!region)return;const p=region.feature.properties;return {en:englishName(p),local:p.name,kind:kind(p)};}});
function clearHover(hideOverview=true){if(hovered){setRegionState(hovered,{hover:false});hovered=null;}if(hideOverview)overview.clear();map.getCanvas().style.cursor='';}
map.on('movestart',clearHover);
const shortName=n=>n.replace(/壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|特別行政區|省|市/g,'');
const provinceTypes={110000:'Municipality',120000:'Municipality',310000:'Municipality',500000:'Municipality',150000:'Autonomous Region',450000:'Zhuang Autonomous Region',540000:'Autonomous Region',640000:'Hui Autonomous Region',650000:'Uyghur Autonomous Region',810000:'Special Administrative Region',820000:'Special Administrative Region'};
function englishName(p){return p.level==='province'?english[p.adcode]:regionNames[p.adcode]?.en||p.name;}
function bilingualName(p){return englishName(p)+' · '+p.name;}
function renderRegionFlag(p){
  const flags={710000:['roc','Republic of China'],810000:['hk','Hong Kong'],820000:['mo','Macau']};
  const [asset,name]=flags[p.provinceCode||p.adcode]||['prc','People’s Republic of China'],flag=$('selection-flag');
  flag.src='vendor/flag-'+asset+'.svg';
  flag.alt='Flag of '+(/China$/.test(name)?'the ':'')+name;
  flag.title=name;
}
function renderRegionNames(p){
  const name=englishName(p);
  $('selection-name').textContent=name;$('selection-name').classList.toggle('long-name',name.length>28);
  $('selection-chinese').textContent=p.name;
  $('selection-chinese').lang=[710000,810000,820000].includes(p.provinceCode||p.adcode)?'zh-Hant':'zh-Hans';
  const container=$('selection-regional'),names=regionNames[p.adcode]?.regional||[];
  container.replaceChildren();container.hidden=!names.length;
  for(const n of names){
    const row=document.createElement('div');row.className='regional-name';
    const caption=document.createElement('span');caption.className='name-caption';caption.textContent=n.language;
    const text=document.createElement('p');text.className='regional-text';text.lang=n.lang;text.dir=n.dir;text.dataset.vertical=String(n.vertical);text.textContent=n.text;
    row.append(caption,text);container.append(row);
  }
}
function renderPopulation(p){
  const panel=$('population'),provinceRecord=p.level==='province'?provincePopulation.china[p.adcode]:null,record=provinceRecord||regionPopulation.regions[p.adcode];
  $('population-breakdown').hidden=!!provinceRecord;$('population-boundaries').hidden=!!provinceRecord;
  $('population-scope').textContent=provinceRecord?.measure||'Entire administrative region';
  $('population-source').textContent=provinceRecord?.sourceLabel||'Wikipedia: population data';
  panel.hidden=!record;
  if(!record)return;
  const format=value=>value===null?'Not reported':value.toLocaleString('en-US');
  $('population-total').textContent=format(record.total);
  $('population-towns').textContent=provinceRecord?'':format(record.towns);
  $('population-core').textContent=provinceRecord?'':format(record.urbanCore);
  const dates={'2020-11-01':'1 November 2020','2020年底':'End of 2020','2020第四季度':'Fourth quarter of 2020'};
  $('population-date').textContent=provinceRecord?.dateLabel||dates[record.date]||record.date;
  $('population-source').href=provinceRecord?.sourceUrl||regionPopulation.source.revisionUrl;
  $('population-source').title=provinceRecord?.sourceLabel||'Wikipedia: '+record.name;
  $('population-quality').hidden=!record.inconsistent;
}
function isPrefectureLevel(p){return window.AtlasChinaLevels.isPrefectureLevel(p);}
function kind(p){
  if(p.adminType)return p.adminType;
  if(p.adcode===710000)return 'Region';
  if(p.level==='province')return provinceTypes[p.adcode]||'Province';
  if(p.level==='district')return 'District';
  if(String(p.adcode).slice(2,4)==='90'){
    if(p.name.endsWith('市'))return 'Directly administered county-level city';
    if(p.name.endsWith('自治县'))return 'Directly administered autonomous county';
    if(p.name.endsWith('林区'))return 'Directly administered forestry district';
    return 'Directly administered county';
  }
  if(p.name.endsWith('自治州'))return 'Autonomous Prefecture';
  if(p.name.endsWith('地区'))return 'Prefecture';
  if(p.name.endsWith('盟'))return 'League';
  return 'Prefecture-level City';
}
function syncMapActivity(){
  const busy=countrySwitching||cameraBusy;
  $('map-shell').setAttribute('aria-busy',String(atlasStarting||busy));
  $('moving-indicator').hidden=atlasStarting||!busy;
  $('map-activity-label').textContent=countrySwitching?'Loading '+window.AtlasEntry.countries[requestedCountry].en+' map':'Map moving';
}
const quizOverlayInstances=new Map();
function activeCountryQuiz(){const atlas=currentAtlas();return atlas?.countyQuiz?.active?atlas.countyQuiz:atlas?.quiz;}
function mountCountryQuiz(){
 if(!allReady||countrySwitching||!archipelagoHost)return;
 const atlas=currentAtlas();if(atlas?.ready&&registry.countries[atlasMode].quiz?.overlay&&!atlas.quiz){const overlay=window.AtlasQuizOverlay.attachQuizOverlay(map,archipelagoHost,atlasMode,atlas);if(overlay)quizOverlayInstances.set(atlasMode,overlay);}
 if(atlas?.ready&&registry.countries[atlasMode].quiz?.counties&&!atlas.countyQuiz){const county=window.AtlasUsCountyQuiz.attachUsCountyQuiz(map,archipelagoHost,atlas);if(county)quizOverlayInstances.set(atlasMode,county);}
 for(const [country,overlay]of quizOverlayInstances)overlay.setCountryActive(country===atlasMode);
}
function controls(){
  syncMapActivity();mountCountryQuiz();
  const koreaLoading=atlasMode!=='china'&&!currentAtlas()?.ready;
  document.querySelectorAll('[data-nav]').forEach(el=>el.disabled=atlasStarting||countrySwitching||(cameraBusy&&el.matches('input[type="checkbox"],input[type="range"]'))||!allReady||koreaLoading||(quiz.active&&!['home','zoom-in','zoom-out','fit-map'].includes(el.id)));
  document.querySelectorAll('[data-quiz-nav]').forEach(el=>el.disabled=cameraBusy||!allReady);
  for(const id of ['tab-explore','tab-layers'])$(id).disabled=quiz.active;
  if(allReady&&!quiz.active)$('quiz-start').disabled=!chinaReady||cameraBusy||!quizPool().length||($('quiz-type').value==='name'&&!$('quiz-scope').value);
}
function setMode(mode,automatic=false){if(automatic&&$('mode-lock')?.getAttribute?.('aria-pressed')==='true')mode=$('mode-province').getAttribute('aria-pressed')==='true'?'province':'prefecture';$('map-shell').dataset.level=mode;$('mode-province').setAttribute('aria-pressed',String(mode==='province'));$('mode-prefecture').setAttribute('aria-pressed',String(mode==='prefecture'));$('map-hint').textContent=mode==='province'?'Select a province':'Select a subdivision';}
const interactionNames=['dragPan','scrollZoom','doubleClickZoom','touchZoomRotate','boxZoom','keyboard'];
let enabledInteractions=[];
function lockCamera(){
  cameraBusy=true;controls();
  enabledInteractions=interactionNames.filter(name=>map[name]?.isEnabled());

  countryLabels.clear();labels.forEach(label=>label.remove());labels.length=0;currentAtlas()?.pauseLabels();
  clearHover();
}
function unlockCamera(){cameraBusy=false;enabledInteractions.forEach(name=>map[name].enable());enabledInteractions=[];controls();updateLabels();}
function navigationOptions(options={}){const top=options.paddingTopLeft||options.padding||[28,65],bottom=options.paddingBottomRight||options.padding||[55,65];return{padding:{left:top[0],top:top[1],right:bottom[0],bottom:Math.max(bottom[1],window.AtlasSheet?.navigationInset()||0)},maxZoom:options.maxZoom?options.maxZoom-1:11,retainPadding:false};}
let navigationEpoch=0,navigationCleanup,previewStart;
function cancelNavigation(){navigationEpoch++;navigationCleanup?.(false);navigationCleanup=null;finishNavigation=null;map.stop();}
async function navigateBounds(bounds,options={},animate=true){
 if(zoomLock&&!zoomLock.allows({manual:options.manual,initial:atlasStarting,restoring:restoringView})){updateLabels();saveViewSoon();return true;}
 cancelNavigation();const epoch=navigationEpoch,cameraOptions=navigationOptions(options);
 if(!animate||reducedMotion.matches||atlasStarting||restoringView){await motionRenderer.end();const target=options.camera||window.AtlasCameraFit.cameraForBounds(map,bounds,cameraOptions);if(target)map.jumpTo(target);unlockCamera();return !!target;}
 lockCamera();
 if(!previewStart)previewStart=motionRenderer.begin().catch(error=>console.warn('Motion preview:',error.message)).finally(()=>previewStart=null);
 await previewStart;if(epoch!==navigationEpoch)return false;
 const target=options.camera||window.AtlasCameraFit.cameraForBounds(map,bounds,cameraOptions);if(!target){unlockCamera();return false;}
 const point=map.project(target.center),size=map.getContainer();
 const distance=Math.hypot(point.x-size.clientWidth/2,point.y-size.clientHeight/2)/Math.max(1,Math.min(size.clientWidth,size.clientHeight));
 const zoomDelta=Math.abs(target.zoom-map.getZoom());const far=distance>1.15||zoomDelta>2;
 return new Promise(resolve=>{
  let timer;const cleanup=value=>{map.off('moveend',finish);clearTimeout(timer);resolve(value);};
  const finish=async()=>{if(epoch!==navigationEpoch)return;cleanup(true);navigationCleanup=null;finishNavigation=null;await motionRenderer.end();if(epoch===navigationEpoch){unlockCamera();saveViewSoon();}};
  navigationCleanup=cleanup;finishNavigation=finish;map.once('moveend',finish);
  // A throttled background tab can stall the flight. Land on the target so the
  // camera never stays over the previous country while the new one is active.
  timer=setTimeout(()=>{if(epoch!==navigationEpoch)return;map.jumpTo(target);},1600);
  const duration=far?Math.min(1000,650+distance*50):Math.min(460,220+distance*140+zoomDelta*65);
  const movement={...target,retainPadding:false,duration:Number.isFinite(options.maxDuration)?Math.min(duration,Math.max(120,options.maxDuration)):duration,easing:t=>1-Math.pow(1-t,3)};
  if(far)map.flyTo({...movement,curve:1.3});else map.easeTo(movement);
 });
}
for(const type of ['mousedown','touchstart','wheel','keydown'])map.getCanvas().addEventListener(type,()=>{if(!cameraBusy)return;cancelNavigation();const epoch=navigationEpoch;Promise.resolve(motionRenderer.end()).then(()=>{if(epoch===navigationEpoch)unlockCamera();});},{passive:true});
function fitHome(animate=false,camera={}){return navigateBounds(homeBounds,{paddingTopLeft:[28,65],paddingBottomRight:[55,65],manual:camera.manual===true},animate);}
zoomLock=window.AtlasZoomLock.createZoomLock($('zoom-lock'),{onLock(){cancelNavigation();const epoch=navigationEpoch;Promise.resolve(motionRenderer.end()).then(()=>{if(epoch===navigationEpoch)unlockCamera();});}});
fitHome();

function showPanel(panel){if(quiz.active&&panel!=='quiz')return;for(const name of ['explore','layers','quiz']){$(name+'-panel').hidden=name!==panel;$('tab-'+name).setAttribute('aria-pressed',String(name===panel));}}
function clearSelection(){window.AtlasDev?.resetSequence();if(selected){setRegionState(selected.layer,{selected:false});selected=null;}}
function clearSearch(){$('search').value='';$('search-results').hidden=true;$('search-results').replaceChildren();}
function reset(camera={}){clearSelection();activeCode=null;$('province').value='';$('welcome').hidden=true;$('selection').hidden=true;$('tab-explore').hidden=true;$('breadcrumb-region').hidden=true;$('map-shell').dataset.selected='false';clearSearch();showPanel('layers');setMode('province',true);syncLayers();return fitHome(true,camera);}
function setStory(code){const s=stories[code]||Object.values(stories).find(s=>s.subdivisionCodes.includes(code));$('story').hidden=!s;$('story-title').textContent=s?.place||'';$('story-text').textContent=s?.text||'';if(s)$('story-source').href=s.source;else $('story-source').removeAttribute('href');}
function renderChildren(code){
  const children=detailLayers.get(code)||[];$('subdivisions').hidden=!children.length;$('subdivisions').open=false;window.AtlasCountryPage.setSubdivisionHeading($('subdivisions-title'),code===650000?'Administrative divisions':'Subdivisions',children.length);$('region-list').replaceChildren();
  const groups=code===710000?[['Special municipalities',children.filter(l=>l.feature.properties.adminType==='Special Municipality')],['Cities',children.filter(l=>l.feature.properties.adminType==='City')],['Counties',children.filter(l=>l.feature.properties.adminType==='County')]]:code===650000?[['Prefecture-level areas',children.filter(layer=>isPrefectureLevel(layer.feature.properties))],['Directly administered county-level cities',children.filter(layer=>!isPrefectureLevel(layer.feature.properties))]]:[['',children]];
  for(const [title,layers] of groups){
    if(title){const heading=document.createElement('h4');heading.textContent=`${title} (${layers.length})`;$('region-list').append(heading);}
    for(const layer of layers){const b=document.createElement('button');b.type='button';b.dataset.nav='';const en=document.createElement('span');en.textContent=englishName(layer.feature.properties);const zh=document.createElement('small');zh.lang='zh';zh.textContent=layer.feature.properties.name+(layer.feature.geometry?'':' · Boundary unavailable');b.append(en,zh);b.onclick=()=>selectRegion(layer,code);$('region-list').append(b);}
  }
}
function renderDivisionNote(layer){
  const p=layer.feature.properties,note=$('division-note');note.replaceChildren();note.hidden=true;
  const data=xinjiangAdministration;
  function paragraph(text){const el=document.createElement('p');el.textContent=text;note.append(el);return el;}
  function source(label,url){const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener';note.append(a);}
  if(p.adcode===650000){
    paragraph('Xinjiang’s prefecture-level areas and XPCC (Bingtuan) cities follow different administrative arrangements. XPCC cities are county-level cities directly under Xinjiang; their governments share administration with XPCC divisions (师市合一).');
    source('XPCC administration',data.sources.xpcc);
    paragraph('Ili also administers Tacheng and Altay. Their territories are shown separately on this map.');
    source('Ili’s administrative structure',data.sources.ili);
    paragraph(`Boundary coverage: ${Object.keys(data.mappedCities).length} of ${Object.keys(data.mappedCities).length+data.missingCities.length} directly administered cities are mapped. The dataset omits:`);
    const list=document.createElement('ul');
    for(const city of data.missingCities){const li=document.createElement('li'),a=document.createElement('a');a.textContent=`${city.en} · ${city.zh} (${city.announcementYear})`;a.href=city.source;a.target='_blank';a.rel='noopener';li.append(a);list.append(li);}note.append(list);
  }else if(data.missingCities.some(c=>c.adcode===p.adcode)){
    const city=data.missingCities.find(c=>c.adcode===p.adcode);
    paragraph('Caohu is a county-level city administered directly by Xinjiang. It was established on 17 April 2026, with its government in Caohu Town.');
    paragraph('Its boundary is unavailable in the checked datasets. This entry has no mapped outline.');
    source('Establishment announcement',city.source);
  }else if(data.mappedCities[p.adcode]){
    const city=data.mappedCities[p.adcode];
    paragraph(`XPCC ${city.division} Division · 新疆生产建设兵团第${{1:'一',2:'二',3:'三',4:'四',5:'五',6:'六',7:'七',8:'八',9:'九',10:'十',13:'十三',14:'十四'}[parseInt(city.division)]}师`);
    paragraph(city.note||'A county-level city administered directly by Xinjiang, with its city government and XPCC division sharing administration (师市合一).');
    source('Administrative details',data.sources[city.sourceKey||'xpcc']);
    if(p.adcode===659002)source('Sub-prefectural rank',data.sources.rank);
    source('XPCC division',data.sources.divisions);
    const count=layer.feature.geometry.parts;
    if(count>1)paragraph(`This boundary snapshot contains ${count} separate areas. A city’s boundary does not represent every farm managed by its XPCC division.`);
  }else if(p.adcode===654000){
    paragraph('Ili Kazakh Autonomous Prefecture administers Tacheng and Altay as well as its directly administered counties and cities. This polygon shows the directly administered area; Tacheng and Altay have separate polygons.');
    source('Ili’s administrative structure',data.sources.ili);
  }else if(data.iliPrefectures.includes(p.adcode)){
    paragraph(`${englishName(p)} is administered by Ili Kazakh Autonomous Prefecture (伊犁哈萨克自治州). It has a separate polygon in the boundary dataset.`);
    source('Ili’s administrative structure',data.sources.ili);
  }
  note.hidden=!note.childElementCount;
}
function selectRegion(layer,parentCode,shouldFit=true,camera={}){
  if(!allReady||quiz.active)return Promise.resolve(false);
  clearSelection();clearSearch();
  const p=layer.feature.properties,isProvince=p.level==='province',code=isProvince?p.adcode:p.provinceCode||parentCode;
  activeCode=code;selected={layer};
  if(!isProvince){const id=isPrefectureLevel(p)?'prefecture-layer':'other-layer';$(id).checked=true;syncLayers();}
  setRegionState(layer,{selected:true});clearHover();
  $('province').value=String(code);$('welcome').hidden=true;$('selection').hidden=false;$('tab-explore').hidden=false;showPanel('explore');
  $('selection-kind').textContent=kind(p).toUpperCase();renderRegionFlag(p);renderRegionNames(p);renderPopulation(p);window.AtlasStatistics.renderStatistics($('selection-meta'),'china:'+p.adcode);renderDivisionNote(layer);explorer.render(p.adcode);
  const path=[];
  if(!isProvince){const province=provinceLayers.get(code);path.push({label:english[code],select:()=>selectRegion(province,code)});if(p.parentCity){const parent=regionByCode.get(p.parentCity);path.push({label:englishName(parent.feature.properties),select:()=>selectRegion(parent,code)});}}
  path.push({label:bilingualName(p)});window.AtlasCountryPage.setMapBreadcrumb(path);$('map-shell').dataset.selected='true';
  $('compare-place').hidden=!comparison?.eligible(p);
  placeTools?.show(p.adcode);setStory(p.adcode);renderChildren(p.adcode);setMode('prefecture',true);syncLayers();refreshStatus();
  document.querySelector('.sidebar-scroll').scrollTop=0;
  if(shouldFit&&layer.feature.geometry)return navigateBounds(layer.getBounds(),{paddingTopLeft:[35,70],paddingBottomRight:[55,65],maxZoom:regionZoom(p),manual:camera.manual===true});
  updateLabels();return Promise.resolve(true);
}
function waitForCountrySources(ids,signal){
 if(!ids.length)return Promise.resolve(!signal.aborted);
 return new Promise((resolve,reject)=>{
  let timer;
  const cleanup=()=>{clearTimeout(timer);map.off('sourcedata',check);map.off('error',failed);signal.removeEventListener('abort',aborted);};
  const finish=error=>{cleanup();error?reject(error):resolve(!signal.aborted);};
  const check=()=>{if(ids.every(id=>map.getSource(id)&&map.isSourceLoaded(id)))finish();};
  const failed=event=>{if(ids.includes(event.sourceId))finish(Error('Country boundary source failed'));};
  const aborted=()=>finish();
  map.on('sourcedata',check);map.on('error',failed);signal.addEventListener('abort',aborted,{once:true});
  // Slow devices can take longer to index a large country. Waiting is only for a smooth
  // first flight, so after 15 s the switch continues while indexing finishes; only a
  // source error fails it.
  timer=setTimeout(()=>finish(),15000);
  if(signal.aborted)aborted();else check();
 });
}
// Faded country shapes: the open country's in its colour; another country's territory that
// the open country draws as its own claim is hidden.
// A country whose own lines draw its frontiers while open (countries.js: ownFrontier) hides its
// frontiers in the shared layer meanwhile, so each edge is drawn once. Where two claims overlap
// (China's and India's), a frontier inside the land the open country claims is hidden too, and a
// claim line that is not the line of actual control (claimants) shows only on its claimants' maps.
const unclaimed=open=>['all',['!=',['coalesce',['get','claimedBy'],''],open],['any',['!',['has','claimants']],['in',open||'-',['get','claimants']]]];
function syncFrontiers(open){if(map.getLayer('atlas-frontiers'))map.setFilter('atlas-frontiers',registry.countries[open]?.ownFrontier?['all',['!',['in',' '+open+' ',['concat',' ',['get','countries'],' ']]],unclaimed(open)]:unclaimed(open));}
// China's displayed land in the neighbour band (world-land.mjs) sits beneath its simplified portal on
// other maps; on China's own map it would show through a selected or hovered province's fill.
const neighbourLandFilter=open=>['all',...(open==='china'?[['!=',['get','country'],'china']]:registry.countries[open]?.snapshot?.replaces?.length?[['!',['in',['get','country'],['literal',registry.countries[open].snapshot.replaces]]]]:[]),['!',['in',['get','country'],['literal',registry.ids.filter(id=>id!=='china'&&(window.AtlasDev?.allows(id)??registry.countries[id].release!=='developer')&&registry.countries[id].portal&&map.getLayer(registry.countries[id].portal.layer))]]]];
const activeNeighbourLandFilter=open=>['!',['in',['get','country'],['literal',[open,...(registry.countries[open]?.snapshot?.replaces||[])]]]];
function syncPortals(open){window.AtlasGlobeOverviewController?.setCountry(open);if(map.getLayer('world-land'))map.setFilter('world-land',['!',['in',['get','country'],['literal',registry.ids.filter(id=>(window.AtlasDev?.allows(id)??registry.countries[id].release!=='developer')&&(id===open||registry.countries[open]?.snapshot?.replaces?.includes(id)||registry.countries[id].portal&&map.getLayer(registry.countries[id].portal.layer)))]]]);if(map.getLayer('china-neighbour-land'))map.setFilter('china-neighbour-land',neighbourLandFilter(open));for(const country of registry.ids){const portal=registry.countries[country].portal;if(portal&&map.getLayer(portal.layer)){map.setPaintProperty(portal.layer,'fill-color',country===open?portal.fill:'#d7d7d3');map.setFilter(portal.layer,unclaimed(open));}if(map.getLayer(country+'-international'))map.setFilter(country+'-international',unclaimed(open));if(map.getLayer(country+'-neighbours'))map.setFilter(country+'-neighbours',activeNeighbourLandFilter(open));}}
function atlasFor(country){return atlases[country]||{'southern-africa':southernAfrica,europe,'south-america':southAmerica}[registry.countries[country]?.adapter]?.portals[country]||null;}
function currentAtlas(){return atlasFor(atlasMode);}
const countryMemory=window.AtlasCountryLoader.createCountryResidency({limit:lowMemory?1:3,async dispose(id){
 await motionRenderer.end();motionRenderer.unloadCountry(id);
 if(id==='china')await unloadChina();else{const atlas=atlasFor(id);if(!atlas?.unload)throw Error('Missing country cleanup: '+id);await atlas.unload();}
 window.AtlasRegionColorController.releaseCountry(id);
 window.AtlasStatistics.releaseStatistics(id,countryMemory.snapshot().countries.map(r=>r.id).filter(country=>country!==id));
 comparison?.unregister(id);
}});
window.AtlasCountryMemory={snapshot:countryMemory.snapshot};
async function unloadChina(){
 await chinaCountiesLoading?.catch(()=>{});await chinaCountyScope?.dispose();chinaCountyScope=null;
 waterDisplay?.dispose();waterDisplay=null;explorer?.dispose();explorer=null;
 const owns=id=>/^(provinces?|prefectures?|others?|city-districts?)(-|$)/.test(id);
 for(const layer of [...map.getStyle().layers].reverse())if(owns(layer.source||''))map.removeLayer(layer.id);
 for(const id of Object.keys(map.getStyle().sources))if(owns(id))map.removeSource(id);
 chinaLoading=chinaCountiesLoading=null;chinaReady=chinaCounties=false;
 namingQuiz?.release();quiz.pool=[];quiz.round=quiz.saved=quiz.reviewLayer=null;quiz.highlighted=[];
 provinceLayers.clear();detailLayers.clear();regionByCode.clear();regionIndex.length=0;provinceFeatures=[];districtCities.clear();
 regionNames={};regionPopulation=chinaArticles=xinjiangAdministration=undefined;manifest=null;
 $('province').replaceChildren(new Option('All China',''));$('search-results').replaceChildren();$('region-list').replaceChildren();
}

// focus: an overseas territory to open directly ({region, bounds}); the camera goes to it
// instead of the country's home view.
async function changeAtlas(next,animate=true,flight=false,focus=null){
 if(window.AtlasDev&&!window.AtlasDev.allows(next))return false;
 if(!allReady||quiz.active||!window.AtlasEntry.countries[next])return false;
 if(!atlasesReady){await atlasesSetup;if(quiz.active)return false;}
 let targetAtlas=atlasFor(next);
 if(!countrySwitching&&!countryLoadFailed&&next===atlasMode&&(next==='china'?chinaReady:targetAtlas?.ready))return true;
 if(countrySwitching&&next===requestedCountry)return false;
 const previous=atlasMode,epoch=++countryEpoch;countryPreparation?.abort();const preparation=new AbortController();countryPreparation=preparation;requestedCountry=next;saveView();countrySwitching=true;countryLoadFailed=false;controls();cancelNavigation();
 // Acknowledge the destination immediately while keeping the camera still during preparation.
 window.AtlasEntry.remember(next);window.AtlasTheme.applyAtlasTheme(map,next);map.setRenderWorldCopies?.(!!registry.countries[next].worldCopies);
 document.documentElement.dataset.switching='true';
 $('status').hidden=true;

 try{
  const collection={europe,'southern-africa':southernAfrica}[registry.countries[next]?.adapter];
  if(collection)await collection.ensure(next);
  else if(portalLoader&&portalLoader.status(next)!=='unloaded')await portalLoader.ensure(next);
  if(epoch!==countryEpoch)return false;
  targetAtlas=atlasFor(next);if(next!=='china'&&!targetAtlas)throw Error('Country outline unavailable');
  await motionRenderer.end();if(epoch!==countryEpoch)return false;
  currentAtlas()?.leave();clearHover();clearSelection();clearSearch();activeCode=null;atlasMode=next;mapScene.setSnapshot(registry.countries[next].snapshot?next:null,{replaceContexts:registry.countries[next].snapshot?.replaces||[]});
  labels.forEach(label=>label.remove());labels.length=0;
  $('china-sidebar').hidden=next!=='china';if($('mode-third'))$('mode-third').hidden=true;$('mode-province').hidden=false;$('mode-prefecture').hidden=false;$('breadcrumb-region').hidden=true;$('map-shell').dataset.selected='false';
  for(const f of provinceFeatures)setRegionState(provinceLayers.get(f.properties.adcode),{inactive:next!=='china'});
  syncCountryFills();syncLayers();updateLabels();for(const [country,atlas] of Object.entries(atlases))atlas.context?.(next===country);
  syncPortals(next);syncFrontiers(next);
  const bounds=focus?[focus.bounds.slice(0,2),focus.bounds.slice(2)]:targetAtlas?.bounds||registry.countries[next].home.bounds||homeBounds;
  await countryMemory.ensure(next,async()=>{if(next==='mongolia'&&!provincePopulation)provincePopulation=await json('data/province-population.json');await (next==='china'?loadChina():targetAtlas.warm());await motionRenderer.loadCountry(next);});
  window.AtlasRegionColorController?.setCountry(next);
  if(epoch!==countryEpoch)return false;
  // Source registration precedes worker indexing. Finish both before the first flight.
  const pendingSources=Object.keys(map.getStyle().sources).filter(id=>!id.endsWith('-motion')&&(next==='china'?/^(provinces?|prefectures?|others?|city-districts?)(-|$)/.test(id):id.startsWith(next+'-')||id.startsWith('south-'+next+'-')));
  if(!await waitForCountrySources(pendingSources,preparation.signal)||epoch!==countryEpoch)return false;
  await (flight&&!zoomLock?.locked&&!reducedMotion.matches?southAmerica.fly(bounds):navigateBounds(bounds,{paddingTopLeft:[35,76],paddingBottomRight:[55,55],maxZoom:focus?14:registry.countries[next].home.maxZoom||8},animate));
  if(epoch!==countryEpoch)return false;
  await motionRenderer.end();if(epoch!==countryEpoch)return false;
  countrySwitching=false;syncCountryFills();syncLayers();delete document.documentElement.dataset.switching;
  if(targetAtlas){await targetAtlas.enter(false);if(focus)await targetAtlas.restore?.(focus.region);}
  else{$('province').value='';$('selection').hidden=true;$('tab-explore').hidden=true;showPanel('layers');$('home').textContent='China';$('mode-province').textContent='Provinces';$('mode-prefecture').textContent='Subdivisions';setMode('province',true);}
  if(epoch!==countryEpoch)return false;
  if(countryPreparation===preparation)countryPreparation=null;failedCountry=null;countryMemory.activate(next);unlockCamera();controls();refreshStatus();updateLabels();saveViewSoon();return true;
 }catch(error){
  if(epoch!==countryEpoch)return false;
  if(countryPreparation===preparation)countryPreparation=null;countryLoadFailed=true;countrySwitching=false;delete document.documentElement.dataset.switching;unlockCamera();console.warn('Country switch:',error);
  // Return to the country the visitor was on, so the page stays whole, and offer a retry.
  if(previous&&previous!==next&&!recoveringCountry){recoveringCountry=true;try{await changeAtlas(previous,false);}finally{recoveringCountry=false;}}
  failedCountry=next;showLoadFailure();return false;
 }
}
function regionZoom(p){return p.parentCity?14:[810000,820000].includes(p.provinceCode||p.adcode)?p.level==='province'?14:17:p.level==='province'?8:10;}
// Regions carry properties, bounds and part counts; MapLibre holds the geometry.
function bindRegion(region,parentCode){
  const feature={type:'Feature',properties:region.properties,geometry:region.geometry};
  // The region index focuses Taiwan views on its nearby islands.
  const box=region.focus||region.bounds,bounds=box?new maplibregl.LngLatBounds([box[0],box[1]],[box[2],box[3]]):new maplibregl.LngLatBounds();
  const p=feature.properties;
  const layer={feature,getBounds:()=>bounds};
  regionIndex.push({layer,parentCode,name:p.name,english:englishName(p),regional:(regionNames[p.adcode]?.regional||[]).map(n=>n.text).join(' '),type:kind(p)});regionByCode.set(p.adcode,layer);return layer;
}
function addLabel(p,text,small){if(window.AtlasPerformanceController.labelsSuppressed)return;const xy=p.centroid||p.center;if(!xy)return;const div=document.createElement('div');div.className='province-label';div.textContent=text;if(small){const el=document.createElement('small');el.textContent=small;div.append(el);}labels.push(new maplibregl.Marker({element:div,anchor:'center'}).setLngLat(xy).addTo(map));}
function pauseMapLabels(){
 countryLabels.clear();labels.forEach(label=>label.remove());labels.length=0;currentAtlas()?.pauseLabels();
}
function updateLabels(){
 if(labelFrame!==undefined)return;
 labelFrame=requestAnimationFrame(()=>{labelFrame=undefined;renderLabels();});
}
function renderLabels(){
  capitalDisplay?.sync();
  waterDisplay?.sync();
  satelliteDisplay?.sync();
  if(map.isMoving()){pauseMapLabels();return;}
  if(cameraBusy||countrySwitching)return;
  countryLabels.sync(atlasMode);
  if(atlasMode!=='china'){labels.forEach(label=>label.remove());labels.length=0;currentAtlas()?.updateLabels();return;}
  labels.forEach(label=>label.remove());labels.length=0;
  if(chinaFirstQuiz?.active){chinaFirstQuiz.labels();return;}
  if(quiz.active&&quiz.type==='name'){for(const place of namingQuiz?.labels()||[]){const p=regionByCode.get(place.code)?.feature.properties;if(p)addLabel(p,place.zh);}return;}
  if(quiz.active){if(quiz.type==='identify'&&!quiz.round?.results?.[quiz.round.index])return;const layer=quiz.reviewLayer;if(layer){const p=layer.feature.properties;addLabel(p,englishName(p),p.name);}return;}
  if(!$('label-layer').checked||!provinceFeatures)return;
  const candidates=[];
  if(activeCode&&map.getZoom()>=4){for(const layer of detailLayers.get(districtsVisible()?districtScope():activeCode)||[]){const p=layer.feature.properties;if((isPrefectureLevel(p)&&$('prefecture-layer').checked)||(!isPrefectureLevel(p)&&$('other-layer').checked))candidates.push(p);}}
  if(!candidates.length)candidates.push(...provinceFeatures.map(f=>f.properties));
  const selectedP=selected?.layer.feature.properties;if(selectedP&&!candidates.includes(selectedP))candidates.unshift(selectedP);
  labels.push(...window.AtlasLabels.render(map,candidates.filter(p=>p.centroid||p.center).map(p=>({id:p.adcode,center:p.centroid||p.center,en:englishName(p),district:Number(p.provinceCode)===310000&&p.name.endsWith('区'),local:p.level==='province'?shortName(p.name):p.name,selected:p===selectedP})),'province-label'));

}
// A country that failed to load keeps its message and Retry button until it loads.
function showLoadFailure(){const status=$('status'),retry=document.createElement('button');retry.type='button';retry.className='status-retry';retry.textContent='Retry';retry.onclick=()=>{const country=failedCountry;failedCountry=null;refreshStatus();changeAtlas(country);};status.replaceChildren((window.AtlasEntry.countries[failedCountry]?.en||'The country')+' could not load. ',retry);status.hidden=false;}
function refreshStatus(){if(failedCountry&&allReady){showLoadFailure();return;}$('status').hidden=allReady;$('status').textContent=allReady?'':'Loading boundaries…';}
function renderSearch(){
  const query=$('search').value.trim().toLowerCase();const results=$('search-results');results.replaceChildren();results.hidden=!query;if(!query)return;
  const normalize=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  const rank=r=>window.AtlasSearchRanking.searchRank(query,[r.english,r.name,String(r.layer.feature.properties.adcode),...(r.layer.feature.properties.searchAliases||'').split(/[;,|]/)]);
  const matches=regionIndex.filter(r=>(r.name+' '+(r.layer.feature.properties.searchAliases||'')+' '+r.english+' '+r.regional+' '+r.layer.feature.properties.adcode).toLowerCase().includes(query)||normalize(r.english).includes(normalize(query))).sort((a,b)=>rank(a)-rank(b)).slice(0,12);
  if(!matches.length){const p=document.createElement('p');p.textContent='No matches. Try an English province name or a Chinese place name.';results.append(p);return;}
  for(const r of matches){const b=document.createElement('button');b.type='button';b.className='search-result';b.dataset.nav='';const strong=document.createElement('strong');strong.textContent=r.english+' · '+r.name;const small=document.createElement('small');small.textContent=r.type+(r.layer.feature.properties.level==='province'?'':' · '+english[r.parentCode])+(r.layer.feature.geometry?'':' · Boundary unavailable');b.append(strong,small);b.onclick=()=>selectRegion(r.layer,r.parentCode);results.append(b);}
}
for(const [code,s] of Object.entries(stories)){const b=document.createElement('button');b.className='discovery-card';b.type='button';b.dataset.nav='';b.disabled=true;const mark=document.createElement('span');mark.className='region-mark';mark.lang='zh';mark.setAttribute('aria-hidden','true');mark.textContent=s.mark;const content=document.createElement('span');const strong=document.createElement('strong');strong.textContent=s.name;const small=document.createElement('small');small.textContent=s.place;content.append(strong,small);b.append(mark,content);b.onclick=()=>selectRegion(provinceLayers.get(Number(code)),Number(code));$('discovery-cards').append(b);}
async function json(url){
  const bytes=await window.AtlasGeoPack.fetchBytes(window.AtlasGeoPack.compactUrl(url));
  if(!url.endsWith('.gz')&&!url.endsWith('.bin'))return JSON.parse(new TextDecoder().decode(bytes));
  return window.AtlasGeoPack.decodeData(bytes);
}
// Source geometry retains full detail; rendering tiles omit subpixel detail.
const sourceOptions={type:'geojson',tolerance:.375,maxzoom:18,buffer:128};
// Simplifying neighboring fill triangles independently opens long diagonal gaps.
const fillSourceOptions={tolerance:0};
function addSource(id,data,options={}){map.addSource(id,{...sourceOptions,...options,data,promoteId:'adcode'});}
const feature=geometry=>({type:'Feature',properties:{},geometry});
function addFill(id,source,baseColor,baseOpacity){
  map.addLayer({id,type:'fill',source,metadata:{atlas:{...(source==='provinces'||source==='provinces-fragments'?{satellite:{fill:'province'}}:{}),...(source.startsWith('city-district')?{motion:'live'}:{})}},layout:{visibility:atlasMode==='china'&&!countrySwitching?'visible':'none'},paint:fillPaint(baseColor,baseOpacity)});
}
function fillPaint(baseColor,baseOpacity){return {'fill-color':['case',['boolean',['feature-state','quizCorrect'],false],'#548165',['boolean',['feature-state','quizWrong'],false],'#b44737',['boolean',['feature-state','quizTarget'],false],'#d4ad55',['boolean',['feature-state','selected'],false],'#ca6a45',['boolean',['feature-state','hover'],false],'#d6a34f',baseColor],'fill-opacity':['case',['boolean',['feature-state','quizTarget'],false],.9,['boolean',['feature-state','quizCorrect'],false],.65,['boolean',['feature-state','quizWrong'],false],.55,['boolean',['feature-state','selected'],false],.3,['boolean',['feature-state','hover'],false],.35,baseOpacity],'fill-antialias':false};}
let legacyProvinceStyling=window.AtlasSettings.getSettings().legacyStyling;
function provinceColor(){return ['case',['boolean',['feature-state','quizActive'],false],'#e9e5dc',['boolean',['feature-state','inactive'],false],'#d7d7d3',legacyProvinceStyling?normalProvinceColors:fillColors[0]];}
function updateProvinceStyling(){
  const next=window.AtlasSettings.getSettings().legacyStyling;if(next===legacyProvinceStyling)return;legacyProvinceStyling=next;
  for(const base of ['province-fill','province-fragment-fill'])for(const id of [base,base+'-motion'])if(map.getLayer(id))map.setPaintProperty(id,'fill-color',fillPaint(provinceColor(),1)['fill-color']);
  window.AtlasRegionColorController.sync();
}
function satelliteAppearance(visible,opacity){$('map-shell').dataset.satellite=String(visible&&opacity>=.5);}
function addLine(id,source,color,width,opacity=1,dash,role='border'){const paint={'line-color':color,'line-width':width,'line-opacity':opacity};if(dash)paint['line-dasharray']=dash;map.addLayer({id,metadata:{atlas:{role,...(role==='selection'?{visibleStates:window.AtlasMapScene.selectionStates}:{}),...(source.startsWith('city-district')?{motion:'live'}:{})}},type:'line',source,layout:{'line-cap':'round','line-join':'round'},paint});}
function addSelection(id,source){
 const color=['case',['boolean',['feature-state','quizTarget'],false],'#926b16',['boolean',['feature-state','quizCorrect'],false],'#38684a','#a43829'];
 const opacity=['case',['any',['boolean',['feature-state','selected'],false],['boolean',['feature-state','quizTarget'],false],['boolean',['feature-state','quizCorrect'],false],['boolean',['feature-state','quizWrong'],false]],1,0];
 if(source!=='city-districts'){
  addLine(id,source,color,1.7,opacity,undefined,'selection');
  addLine(id+'-repaired',source+'-selection-edges',color,1.7,window.AtlasLines.adaptiveOpacity(opacity),undefined,'selection');
 }else addLine(id,source+'-selection-edges',color,1.7,window.AtlasLines.adaptiveOpacity(opacity),undefined,'selection');
}
function pickedRegion(point){
  if(quiz.active&&quiz.type==='name')return;
  if(quiz.active){const hit=window.AtlasMotion.queryRegions(map,point,{layers:['prefecture-fill','prefecture-fragment-fill']})[0];return hit&&quiz.round.eligible.has(hit.properties.adcode)?regionByCode.get(hit.properties.adcode):undefined;}
  const layers=['province-fill'];if($('map-shell').dataset.level==='prefecture'){if($('prefecture-layer').checked)layers.unshift('prefecture-fill');if($('other-layer').checked)layers.unshift('other-fill');}
  if(districtsVisible())layers.unshift('city-district-fill');
  const aliases={'province-fill':'province-fragment-fill','prefecture-fill':'prefecture-fragment-fill'};
  const hits=window.AtlasMotion.queryRegions(map,point,{layers:layers.flatMap(id=>aliases[id]?[id,aliases[id]]:[id])});
  for(const id of layers){const hit=hits.find(f=>f.layer.id===id||f.layer.id===aliases[id]);if(hit)return regionByCode.get(hit.properties.adcode);}
}
// The country under a point. An overseas territory also gives its region and bounds, so a
// click on it from another country opens it directly. The open country's own land wins.
function countryAt(point){
 const countries=Object.fromEntries(registry.ids.flatMap(id=>registry.countries[id].hitLayers.map(layer=>[layer,id])));
 const hits=window.AtlasMotion.queryRegions(map,point,{layers:Object.keys(countries)}).map(f=>({country:countries[f.layer.id],region:f.properties.region,bounds:f.properties.bounds}));
 if(mapScene.overview&&map.getLayer('globe-overview-land'))for(const f of map.queryRenderedFeatures(point,{layers:['globe-overview-land']})){const id=f.properties.country;if(id&&registry.countries[id]&&window.AtlasDev.allows(id))hits.push({country:id,region:f.properties.region,bounds:f.properties.bounds});}
 // On phones the shared land layer is the hit target until a country is opened.
 if(lowMemory&&map.getLayer('world-land'))for(const f of map.queryRenderedFeatures(point,{layers:['world-land']})){const id=f.properties.country;if(id&&registry.countries[id]&&window.AtlasDev.allows(id))hits.push({country:id,region:f.properties.region,bounds:f.properties.bounds});}
 for(const id of ['south-america-fill','south-america-portal-fill'])if(map.getLayer(id))for(const f of map.queryRenderedFeatures(point,{layers:[id]}))hits.push({country:f.properties.country});
 return hits.find(h=>h.country===atlasMode)||hits.find(h=>h.country&&h.region)||hits.find(h=>h.country);
}
map.on('click',event=>{
 if(!allReady)return;
 const hit=countryAt(event.point);
 if(!quiz.active&&hit&&(hit.country!==atlasMode||countrySwitching)){changeAtlas(hit.country,true,false,hit.region?{region:hit.region,bounds:typeof hit.bounds==='string'?JSON.parse(hit.bounds):hit.bounds}:null);return;}
 if(countrySwitching||atlasMode!=='china')return;
 const region=pickedRegion(event.point);if(region){if(quiz.active)answerQuiz(region.feature.properties.adcode);else selectRegion(region,region.feature.properties.provinceCode||region.feature.properties.adcode);}
});
window.AtlasPointer.onMapHover(map,event=>{
  if(atlasMode!=='china'||cameraBusy||!allReady||map.isMoving())return;
  const region=pickedRegion(event.point);if(hovered!==region){clearHover(false);hovered=region;if(region)setRegionState(region,{hover:true});}
  if(!region)return;map.getCanvas().style.cursor='pointer';
  if(quiz.active)return;
});
map.getCanvas().addEventListener('mouseleave',clearHover);
async function loadChina(){
 if(chinaReady)return;if(chinaLoading)return chinaLoading;
 chinaLoading=(async()=>{
  // Index exact sources once on every device; county geometry loads by selected area.
  const [china,m,names,administration,population,districtNames,articles,landmarks,provincePop]=await Promise.all([(window.AtlasEntry.takeEarly('chinaRegions')||fetch('data/china-regions.json')).then(r=>{if(!r.ok)throw new Error(`China regions: ${r.status}`);return r.json();}),json('data/manifest.json'),json('data/region-names.json'),json('data/xinjiang-administration.json'),json('data/region-population.json'),json('data/city-district-names.json'),json('data/region-articles.json'),json('data/landmarks.json'),json('data/province-population.json'),styleReady]);manifest=m;regionNames={...names.regions,...districtNames.regions};chinaArticles=articles;xinjiangAdministration=administration;regionPopulation=population;provincePopulation=provincePop;explorer=window.AtlasExplore.createExplorer(articles,landmarks);
  $('retrieved').textContent=new Date(m.retrieved).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  provinceFeatures=china.provinces;
  const chinaSource=async(id,options)=>{
   addSource(id,window.AtlasChinaMobile.emptyCollection(),options);
   // Index one exact source at a time, without a decoded country-wide pack.
   if(!id.startsWith('city-district'))await window.AtlasChinaMobile.setSourceData(map,id,window.AtlasChinaMobile.mobileChinaUrl(id));
  };
  // The two repaired fills use unsimplified triangles. Other regions use
  // subpixel tile simplification, retaining every original source coordinate.
  await chinaSource('provinces');await chinaSource('prefectures');await chinaSource('others');
  await chinaSource('provinces-fragments',fillSourceOptions);await chinaSource('prefectures-fragments',fillSourceOptions);
  // Simplify line tiles within 0.65 screen pixels and fade subpixel islands.
  // The stored geometry and selectable polygons retain full detail. Outlines skip
  // segments drawn by the international border layer or already drawn once.
  for(const name of china.boundaries)await chinaSource(name+'-boundaries',window.AtlasLines.lineSourceOptions);
  for(const name of ['provinces','prefectures','others'])await chinaSource(name+'-selection-edges',window.AtlasLines.lineSourceOptions);
  const colors=['match',['get','adcode']];for(const f of provinceFeatures)colors.push(f.properties.adcode,fillColors[Number(f.properties.adcode)/10000%fillColors.length|0]);colors.push(fillColors[0]);normalProvinceColors=colors;
  addFill('province-fill','provinces',provinceColor(),1);addFill('province-fragment-fill','provinces-fragments',provinceColor(),1);addFill('prefecture-fill','prefectures','#d6b974',.025);addFill('prefecture-fragment-fill','prefectures-fragments','#d6b974',.025);addFill('other-fill','others','#dbc886',.1);
  addLine('prefecture-lines','prefecture-boundaries','#b39a77',.7,window.AtlasLines.adaptiveOpacity(.85));addLine('other-lines','other-boundaries','#9f874e',.7,window.AtlasLines.adaptiveOpacity(.85),[3,3]);
  addSelection('province-selection','provinces');addSelection('prefecture-selection','prefectures');addSelection('other-selection','others');
  addLine('province-lines','province-boundaries','#987343',['interpolate',['linear'],['zoom'],3,.65,8,1.2],window.AtlasLines.adaptiveOpacity(.95));
  await chinaSource('city-districts');
  await chinaSource('city-district-boundaries',window.AtlasLines.lineSourceOptions);
  await chinaSource('city-districts-selection-edges',window.AtlasLines.lineSourceOptions);
  addFill('city-district-fill','city-districts','#dbc886',.02);
  addLine('city-district-lines','city-district-boundaries','#9f874e',.75,window.AtlasLines.adaptiveOpacity(.9));
  addSelection('city-district-selection','city-districts');
  for(const f of provinceFeatures){const code=f.properties.adcode;provinceLayers.set(code,bindRegion(f,code));}
  for(const f of china.subdivisions){const code=f.properties.provinceCode;if(!detailLayers.has(code))detailLayers.set(code,[]);detailLayers.get(code).push(bindRegion(f,code));}
  districtCities=new Set(china.districts.map(f=>f.properties.parentCity));
  for(const f of china.districts){const code=f.properties.parentCity;if(!detailLayers.has(code))detailLayers.set(code,[]);detailLayers.get(code).push(bindRegion(f,f.properties.provinceCode));}
  for(const city of administration.missingCities){regionNames[city.adcode]={en:city.en,zh:city.zh,source:city.source,regional:[]};detailLayers.get(650000).push(bindRegion({type:'Feature',properties:{adcode:city.adcode,name:city.zh,provinceCode:650000,level:'city',boundaryAvailable:false},geometry:null},650000));}
  for(const f of [...provinceFeatures].sort((a,b)=>english[a.properties.adcode].localeCompare(english[b.properties.adcode]))){const p=f.properties,o=document.createElement('option');o.value=p.adcode;o.textContent=english[p.adcode]+' · '+p.name;$('province').append(o);}
  syncLayers();
  await motionRenderer.prepare();
  namingQuiz??=window.AtlasNameQuiz.createNameQuiz({mark:(code,correct)=>{const layer=regionByCode.get(code);if(layer){setRegionState(layer,{quizCorrect:$('quiz-keep-colors').checked&&correct,quizWrong:$('quiz-keep-colors').checked&&!correct});if(!quiz.highlighted.includes(layer))quiz.highlighted.push(layer);}},labels:updateLabels,controls,clear:clearQuizHighlights,limit:codes=>{quiz.pool=codes.map(code=>regionByCode.get(code));syncQuizStyle();},exit:configureQuiz,view:code=>viewQuizAnswer(regionByCode.get(code)),focusInput:()=>namingQuiz.focus()});
  placeTools??=window.AtlasPlaceTools.createPlaceTools({get:code=>{const layer=regionByCode.get(Number(code))||regionByCode.get(code);return layer?{name:bilingualName(layer.feature.properties)}:null;},select:code=>{const layer=regionByCode.get(Number(code))||regionByCode.get(code);if(layer)selectRegion(layer,layer.feature.properties.provinceCode||layer.feature.properties.adcode);},controls,shareUrl:()=>{const url=new URL(location.href);url.hash=window.AtlasView.hashFor(captureView());return url;}});
  waterDisplay=window.AtlasWater.createWaterDisplay(map,{mode:()=>atlasMode,quiz:()=>quiz.active,load:()=>json('data/major-water.bin')});
  for(const id of ['water-layer'])if($(id).checked)$(id).dispatchEvent(new Event('change'));
  comparison.register('china',{regions:[...provinceLayers.values(),...regionByCode.values()].filter((l,i,a)=>a.findIndex(x=>x.feature.properties.adcode===l.feature.properties.adcode)===i),name:englishName,kind,provincePopulation,regionPopulation});
  $('compare-open').onclick=()=>comparison.open();$('compare-place').onclick=()=>comparison.open(selected?.layer.feature.properties.adcode);
  chinaCountyScope=window.AtlasChinaMobile.createCountyScope(map,{changed:()=>{syncDistrictLayers();updateLabels();}});
  chinaReady=true;initQuiz();syncLayers();
  await loadChinaCounties();
  for(const f of provinceFeatures)setRegionState(provinceLayers.get(f.properties.adcode),{inactive:atlasMode!=='china'});
  syncCountryFills();syncLayers();
 })().catch(error=>{chinaLoading=null;throw error;});return chinaLoading;
}
async function init(){try{
 await styleReady;
 // Request every first-view file at once; awaiting each before asking for the next serialised them.
 const early=promise=>{promise.catch(()=>{});return promise;};
 const worldLand=early(import('./world-land.mjs')),compare=early(import('./compare.mjs')),population=early(json('data/province-population.json'));
 const capitals=early(fetch('data/capitals.json').then(r=>{if(!r.ok)throw new Error('Capital locations could not load');return r.json();}));
 // Southern Africa's outlines are requested after China's first view unless another country opens first.
 if(window.AtlasEntry.current!=='china')preloadLater();
 await (await worldLand).addWorldLand(map);
 comparison=(await compare).createComparison();
 provincePopulation=await population;
 // Outline files are decoded in MapLibre's workers (geo-pack.mjs addWorkerSource); their preloads start at once.
 const workerSource=(id,url,options)=>window.AtlasGeoPack.addWorkerSource(map,id,url,{...sourceOptions,...options,promoteId:'adcode'});
 await workerSource('china-context','data/china-context.bin',{tolerance:0});
 map.addLayer({id:'china-context',metadata:{atlas:{role:'context',contextCountry:'china'}},type:'fill',source:'china-context',paint:{'fill-color':'#d7d7d3','fill-antialias':false}});
 if(initialCountry==='china'){await countryMemory.ensure('china',loadChina);countryMemory.activate('china');}
 allReady=true;
  await workerSource('shared-context-borders','data/shared-context-borders.bin',window.AtlasLines.internationalLineSourceOptions);
  window.AtlasLines.addInternationalBorder(map,'shared-context-borders','shared-context-borders');
  // Every public country's frontiers, whichever country is open (scripts/build-atlas-frontiers.mjs).
  await workerSource('atlas-frontiers','data/atlas-frontiers.bin',window.AtlasLines.internationalLineSourceOptions);
  window.AtlasLines.addInternationalBorder(map,'atlas-frontiers','atlas-frontiers');syncFrontiers(atlasMode);
  satelliteDisplay=window.AtlasSatellite.createSatelliteDisplay(map,{mode:()=>atlasMode,quiz:()=>quiz.active,onVisible:satelliteAppearance,placeControls(){const panel=$(registry.countries[atlasMode]?.panel||'layers-panel')?.querySelector('.layers');const block=$('satellite-controls');if(panel&&block.parentElement!==panel)panel.append(block);}});
  satelliteDisplay.sync();if($('satellite-layer').checked)$('satellite-layer').dispatchEvent(new Event('change'));
  // The portals around China draw its neighbours' land, so its first view waits for them.
  await addPortals();
  if(window.AtlasEntry.current==='china'){await showFirstView();preloadLater();await addRegions(capitals);}
  else{preloadLater();await addRegions(capitals);await showFirstView();}
  // South America's detailed shapes and borders load once the first view is ready, so those
  // countries never sit as coarse previews before someone opens one.
  if(!lowMemory){
   southAmerica.warmContext().catch(e=>console.warn(e));
   europe.ensure().then(()=>{europe.syncDeveloper();southAmerica.syncDeveloper();syncPortals(atlasMode);}).catch(e=>console.warn(e));
  }
}catch(e){console.error(e);$('map-loading').hidden=true;$('status').textContent='Map could not load';$('load-error').hidden=false;finishAtlases();}}
// Startup preloads in index.html cover China's first view; southern Africa's outline files are
// listed there too and requested here, after that view or straight away.
let preloadedLater=false;
function preloadLater(){
 if(preloadedLater)return;preloadedLater=true;if(lowMemory)return;
 for(const href of JSON.parse($('later-preloads').textContent)){const link=document.createElement('link');link.rel='preload';link.as='fetch';link.crossOrigin='anonymous';link.href=href;document.head.append(link);}
}
async function showFirstView(){
 syncGlobe(false);
 const requestedCountry=window.AtlasEntry.current;
 controls();if(requestedCountry&&requestedCountry!=='china')await changeAtlas(requestedCountry,false);else if(!window.AtlasView.fromHash(location.hash))await followPlaceLink();
 if(!map.loaded())await new Promise(resolve=>map.once('idle',resolve));
 // Region colour data is awaited only when a colour metric is chosen; with none it arrives in the background.
 const colors=window.AtlasRegionColorController?.setCountry(atlasMode);if(window.AtlasRegionColorController?.getMetric()!=='none')await colors;
 setupViewControls();await restoreView();syncGlobe();
 atlasStarting=false;window.AtlasEntry.ready();finishStartup();controls();refreshStatus();updateLabels();
 $('map-loading').hidden=true;
 storeForRepeatVisits();
}
// sw.js keeps this deploy's files on the device and serves them from the next visit on; it is
// handed the files this visit loaded.
function storeForRepeatVisits(){
 if(!('serviceWorker' in navigator))return;
 navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(registration=>registration.active?.postMessage({store:[...new Set(performance.getEntriesByType('resource').map(e=>e.name).filter(url=>url.startsWith(location.origin)))]})).catch(()=>{});
}
let archipelagoHost,portalLoader;
async function addPortals(){
  archipelagoHost={async stopCamera(){cancelNavigation();await motionRenderer.end();unlockCamera();},setQuizActive(value){quiz.active=value;quiz.type=value?'regional':undefined;window.AtlasRegionColorController?.suspend(value);$('map-shell').dataset.quiz=String(value);satelliteDisplay?.sync();controls();},isBusy:()=>quiz.active||countrySwitching,isMoving:()=>cameraBusy,controls,fit:(bounds,maxZoom,camera={})=>navigateBounds(bounds,{paddingTopLeft:camera.paddingTopLeft||[35,76],paddingBottomRight:camera.paddingBottomRight||[55,55],maxZoom:maxZoom+1,manual:camera.manual===true,maxDuration:camera.maxDuration}),syncAppearance:()=>satelliteDisplay?.sync()};
  // Adapters by name (countries.js gives each country's); loaded independently from the registry.
  const adapters={korea:(_id,map)=>window.AtlasKorea.addKoreaPortal(map,{comparison,isBusy:()=>quiz.active||countrySwitching,isMoving:()=>cameraBusy,controls,fit:(bounds,maxZoom,camera={})=>navigateBounds(bounds,{paddingTopLeft:[35,76],paddingBottomRight:[55,55],maxZoom:maxZoom+1,manual:camera.manual===true}),switchAtlas:changeAtlas,returnToChina:()=>changeAtlas('china')}),
  mongolia:(_id,map)=>window.AtlasMongolia.addMongoliaPortal(map,{isBusy:()=>quiz.active||countrySwitching,isMoving:()=>cameraBusy,controls,fit:(bounds,maxZoom,camera={})=>navigateBounds(bounds,{paddingTopLeft:[35,76],paddingBottomRight:[55,55],maxZoom:maxZoom+1,manual:camera.manual===true}),switchAtlas:changeAtlas,returnToChina:()=>changeAtlas('china'),population:p=>provincePopulation.mongolia[p.iso]||provincePopulation.mongolia[provincePopulation.mongoliaAliases[(p.en||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'')]]}),
  japan:(_id,map)=>window.AtlasJapan.addJapanPortal(map,{comparison,isBusy:()=>quiz.active||countrySwitching,isMoving:()=>cameraBusy,controls,fit:(bounds,maxZoom,camera={})=>navigateBounds(bounds,{paddingTopLeft:[35,76],paddingBottomRight:[55,55],maxZoom,manual:camera.manual===true}),switchAtlas:changeAtlas}),
  archipelago:(id,map)=>window.AtlasArchipelago.addArchipelagoPortal(map,archipelagoHost,id),'southeast-asia':(id,map)=>window.AtlasSoutheastAsia.addCountryPortal(map,archipelagoHost,id),russia:(_id,map)=>window.AtlasRussia.addRussiaPortal(map,archipelagoHost)};
  portalLoader=window.AtlasCountryLoader.createCountryLoader(async id=>{
    const resources=window.AtlasCountryLoader.createMapResources(map);
    try{const atlas=await adapters[registry.countries[id].adapter](id,resources.map);resources.commit();atlases[id]=atlas;return atlas;}
    catch(error){resources.dispose();document.getElementById(id+'-sidebar')?.remove();throw error;}
  });
  const ids=registry.ids.filter(id=>adapters[registry.countries[id].adapter]);
  const results=await portalLoader.ensureAll(ids);
  results.forEach((result,i)=>{if(result.status==='rejected')console.warn(ids[i]+' outline could not load',result.reason);});
}
// Southern Africa, Europe, capitals and South America, after China's first view. Capitals follow
// the portals: their legend lives in the Korea panel.
async function addRegions(capitals){
  // Each step stands alone: one that fails to load leaves the others, and every country switch, working.
  const step=async(name,run)=>{try{await run();}catch(error){console.warn(name+' could not load',error);}};
  await step('Southern Africa',async()=>{southernAfrica=await window.AtlasSouthernAfrica.addSouthernAfrica(map,archipelagoHost);});
  // Europe's previews are large (the UK's carries 20 m coasts and its overseas territories), so
  // they load after the first view unless Europe is the first view.
  europe=window.AtlasEurope.createEurope(map,archipelagoHost);if(europe.handles(window.AtlasEntry.current))await step('Europe',()=>europe.ensure(window.AtlasEntry.current));
  await step('Capitals',async()=>{capitalDisplay=window.AtlasCapitals.createCapitalDisplay(map,{mode:()=>atlasMode,quiz:()=>quiz.active},await capitals);});
  southAmerica=window.AtlasSouthAmerica.createSouthAmerica(map,{syncAppearance:()=>satelliteDisplay?.sync(),country:()=>atlasMode,isBusy:()=>quiz.active||countrySwitching,switchAtlas:changeAtlas,fit:(bounds,maxZoom,camera={})=>navigateBounds(bounds,{manual:camera.manual===true})});
  window.AtlasDev.mount({eligible:()=>atlasMode==='china'&&!quiz.active&&!countrySwitching&&selected?.layer.feature.properties.adcode===310105});
  window.addEventListener('atlas-developer-change',async()=>{southAmerica.syncDeveloper();southernAfrica?.syncDeveloper();if(!lowMemory)await europe.ensure();europe.syncDeveloper();syncPortals(atlasMode);for(const atlas of Object.values(atlases))atlas.syncDeveloper?.();if(!window.AtlasDev.allows(atlasMode))await changeAtlas(registry.fallback,false);});
  atlasesReady=true;finishAtlases();
}
let viewSaveTimer,viewControlsReady=false;
function captureView(){const center=map.getCenter();return {v:1,country:atlasMode,center:[+center.lng.toFixed(6),+center.lat.toFixed(6)],zoom:+map.getZoom().toFixed(4),selection:atlasMode==='china'?selected?.layer.feature.properties.adcode:currentAtlas()?.getSelection(),scope:currentAtlas()?.getScope?.(),mode:currentAtlas()?.getMode?.()||($('mode-province').getAttribute('aria-pressed')==='true'?1:2),locked:$('mode-lock').getAttribute('aria-pressed')==='true',language:currentAtlas()?.getLanguage?.()||window.AtlasLabels.getLanguage(),colorBy:window.AtlasRegionColorController?.getMetric()||'none',layers:Object.fromEntries(window.AtlasView.controls.filter(id=>$(id)).map(id=>[id,id==='satellite-opacity'?$(id).value:$(id).checked]))};}
function saveView(force=false){if(!viewControlsReady||atlasStarting||restoringView||quiz.active||(!force&&cameraBusy)||countrySwitching)return;const view=captureView();try{window.AtlasView.write(view,localStorage);}catch{}if(location.hash.includes('/view='))history.replaceState(null,'',location.pathname+location.search+window.AtlasView.hashFor(view));}
function saveViewSoon(){clearTimeout(viewSaveTimer);viewSaveTimer=setTimeout(saveView,180);}
function readSavedView(){try{return window.AtlasView.read(atlasMode,localStorage);}catch{return null;}}
async function restoreView(){
 const shared=window.AtlasView.fromHash(location.hash);
 const saved=shared||(!location.hash.includes('/place=')&&!location.hash.startsWith('#place=')?readSavedView():null);
 if(!saved||saved.country!==atlasMode)return;
 restoringView=true;
 try{
  await window.AtlasRegionColorController?.setCountry(atlasMode,saved.colorBy);
  if(currentAtlas()?.setLanguage)currentAtlas().setLanguage(saved.language);else window.AtlasLabels.setLanguage(saved.language);
  if(atlasMode==='china'){if(saved.selection&&!regionByCode.has(Number(saved.selection))&&!regionByCode.has(saved.selection))await loadChinaCounties();const layer=regionByCode.get(Number(saved.selection))||regionByCode.get(saved.selection);if(layer)await selectRegion(layer,layer.feature.properties.provinceCode||layer.feature.properties.adcode,false);}
  else await currentAtlas().restore(saved.selection,saved.scope);
  for(const [id,value] of Object.entries(saved.layers)){const el=$(id);if(!el)continue;if(id==='satellite-opacity'){el.value=value;el.dispatchEvent(new Event('input'));}else{el.checked=value;el.dispatchEvent(new Event('change'));}}
  $('mode-lock').setAttribute('aria-pressed',String(saved.locked));
  if(atlasMode==='china'){setMode(saved.mode===1?'province':'prefecture');syncLayers();}else currentAtlas().setMode(saved.mode,false,true);
  if(saved.camera!==false)map.jumpTo({center:saved.center,zoom:saved.zoom});updateLabels();
 }finally{restoringView=false;}
}
function setupViewControls(){
 for(const sidebar of document.querySelectorAll('.sidebar:not(.startup-sidebar)')){
  const target=sidebar.querySelector('[id$="layers-panel"]');if(!target)continue;
  const section=document.createElement('section');section.className='view-preferences';
  const label=document.createElement('label');label.textContent='Map label language';
  const regional=atlasFor(sidebar.id.replace(/-sidebar$/,'')),singapore=sidebar.id==='singapore-sidebar',select=document.createElement('select');if(regional?.labelLanguages)select.dataset.regionalLanguage='';else if(singapore)select.dataset.singaporeLanguage='';else select.dataset.labelLanguage='';select.setAttribute('aria-label','Map label language');
  for(const [value,text] of regional?.labelLanguages|| (singapore?[['zh','Chinese'],['ms','Malay'],['en','English'],['ta','Tamil']]:[['both','Bilingual'],['en','English'],['local','Local language']]))select.append(new Option(text,value));
  if(regional?.labelLanguages)select.value=regional.getLanguage();else if(singapore)select.value=atlases.singapore.getLanguage();
  select.onchange=()=>{if(regional?.labelLanguages)regional.setLanguage(select.value);else if(singapore)atlases.singapore.setLanguage(select.value);else window.AtlasLabels.setLanguage(select.value);updateLabels();saveViewSoon();};label.append(select);label.hidden=regional?.labelLanguages?.length===1;
  const share=document.createElement('button');share.className='quiet-button';share.textContent='Copy map view link';
  const status=document.createElement('p');status.setAttribute('role','status');status.className='quiz-note';
  const sharedLink=document.createElement('a');sharedLink.textContent='Open shared view';sharedLink.hidden=true;
  const fallback=document.createElement('input');fallback.readOnly=true;fallback.hidden=true;fallback.setAttribute('aria-label','Map view link');
  share.onclick=async()=>{const url=new URL(location.href);url.hash=window.AtlasView.hashFor(captureView());sharedLink.href=url.href;sharedLink.hidden=false;try{await navigator.clipboard.writeText(url.href);status.textContent='Map view link copied.';}catch{fallback.value=url.href;fallback.hidden=false;fallback.select();status.textContent='Copy this link to share the same map view.';}};
  section.append(label,share,status,sharedLink,fallback);target.append(section);
 }
 window.AtlasLabels.setLanguage(window.AtlasLabels.getLanguage());viewControlsReady=true;document.addEventListener('change',saveViewSoon);document.addEventListener('input',saveViewSoon);document.addEventListener('click',saveViewSoon);map.on('moveend',saveViewSoon);window.addEventListener('pagehide',()=>saveView(true));
}
async function followPlaceLink(){
 const routeCountry=window.AtlasEntry.fromHash(location.hash);if(routeCountry&&!window.AtlasDev.allows(routeCountry)){window.AtlasEntry.remember(atlasMode,{preservePlace:false});return;}
  const shared=window.AtlasView.fromHash(location.hash);
  if(shared&&allReady){await atlasesSetup;if(shared.country!==atlasMode)await changeAtlas(shared.country,false);await restoreView();return;}
  const country=window.AtlasEntry.fromHash(location.hash);
  if(country&&!location.hash.includes('place=')){
    if(!allReady)return;if(country!==atlasMode)await atlasesSetup;
    if(cameraBusy){map.once('idle',followPlaceLink);return;}
    if(country===atlasMode)window.AtlasEntry.remember(country);else await changeAtlas(country);return;
  }
  if(allReady&&routeCountry==='china'&&atlasMode!=='china'){if(!await changeAtlas('china',false))return;}
  const code=placeTools?.linkCode();
  if(!allReady||!code)return;
  if(atlasMode!=='china'||!chinaReady){if(!await changeAtlas('china',false))return;}
  if(!regionByCode.has(Number(code))&&!regionByCode.has(code))await loadChinaCounties();
  const layer=regionByCode.get(Number(code))||regionByCode.get(code);if(!layer)return;
  if(cameraBusy){map.once('idle',followPlaceLink);return;}
  if(quiz.active){configureQuiz();map.once('idle',followPlaceLink);return;}
  if(atlasMode!=='china')await changeAtlas('china',false);
  await selectRegion(layer,layer.feature.properties.provinceCode||layer.feature.properties.adcode);
}
window.addEventListener('hashchange',followPlaceLink);
$('province').addEventListener('change',e=>{const code=Number(e.target.value);code?selectRegion(provinceLayers.get(code),code):reset();});
for(const id of ['province-layer','prefecture-layer','other-layer'])$(id).addEventListener('change',()=>{
  if(cameraBusy)return;clearHover();syncLayers();
  if(selected&&selected.layer.feature.properties.level!=='province'){
    const checkbox=isPrefectureLevel(selected.layer.feature.properties)?'prefecture-layer':'other-layer';if(!$(checkbox).checked)selectRegion(provinceLayers.get(activeCode),activeCode,false);
  }
  updateLabels();refreshStatus();
});
$('label-layer').addEventListener('change',updateLabels);map.on('movestart',pauseMapLabels);map.on('moveend',updateLabels);
$('mode-province').onclick=()=>{if(atlasMode!=='china')return currentAtlas().setMode(1);if(!countrySwitching){clearHover();setMode('province');syncLayers();updateLabels();}};
$('mode-prefecture').onclick=()=>{if(atlasMode!=='china')return currentAtlas().setMode(2);if(!countrySwitching){clearHover();setMode('prefecture');$('prefecture-layer').checked=true;syncLayers();refreshStatus();}};
$('mode-lock').onclick=()=>{const locked=$('mode-lock').getAttribute('aria-pressed')!=='true';$('mode-lock').setAttribute('aria-pressed',String(locked));$('mode-lock').title=locked?'Unlock selection level':'Lock selection level';currentAtlas()?.setLevelLocked?.(locked);};
$('tab-explore').onclick=()=>showPanel('explore');$('tab-layers').onclick=()=>showPanel('layers');$('tab-quiz').onclick=()=>{showPanel('quiz');updateQuizSetup();};
$('search').addEventListener('input',renderSearch);$('search').addEventListener('keydown',e=>{if(e.key==='Escape')clearSearch();if(e.key==='Enter')$('search-results').querySelector('button')?.click();});
function randomPlace(){
  if(!allReady)return;
  const places=regionIndex.filter(r=>r.layer.feature.geometry&&isPrefectureLevel(r.layer.feature.properties)&&r.layer!==selected?.layer);
  if(!places.length)return;
  const {layer}=places[Math.floor(Math.random()*places.length)];
  return selectRegion(layer,layer.feature.properties.provinceCode);
}
$('surprise').onclick=()=>atlasMode!=='china'?currentAtlas().random():randomPlace();
$('home').onclick=()=>atlasMode!=='china'?currentAtlas().home():quiz.active?configureQuiz():reset();$('selection-reset').onclick=reset;$('fit-map').onclick=viewParent;
function zoomBy(amount){
 if(!allReady||countrySwitching)return;
 const zoom=Math.max(map.getMinZoom(),Math.min(map.getMaxZoom(),map.getZoom()+amount));
 if(zoom===map.getZoom())return;
 return navigateBounds(homeBounds,{camera:{center:map.getCenter(),zoom},padding:[0,0],manual:true});
}
function viewParent(){
  if(!allReady)return;
  const camera={manual:true};
  if(atlasMode!=='china')return activeCountryQuiz()?.active?activeCountryQuiz().fit():currentAtlas().viewParent(camera);
  if(chinaFirstQuiz?.active)return chinaFirstQuiz.fit();
  if(quiz.active)return fitQuizScope(true,camera);
  if(!selected)return reset(camera);
  const p=selected.layer.feature.properties;
  if(p.level==='province')return reset(camera);
  const parent=p.parentCity?regionByCode.get(p.parentCity):provinceLayers.get(p.provinceCode||activeCode);
  return parent?selectRegion(parent,parent.feature.properties.adcode,true,camera):reset(camera);
}
$('zoom-in').onclick=()=>zoomBy(1);$('zoom-out').onclick=()=>zoomBy(-1);
// The map projection is part of the saved account/device settings.
const globeKey='boundary-atlas-globe-v1';try{if(window.AtlasSettings.getSettings().projection==='globe')$('globe-view').setAttribute('aria-pressed','true');}catch{}
function syncGlobe(refit=true){const button=$('globe-view'),type=button.getAttribute('aria-pressed')==='true'?'globe':'mercator',changed=map.getProjection?.()?.type!==type;if(changed){map.setProjection({type});updateLabels();}globeFloor();if(changed&&refit&&!atlasStarting&&!countrySwitching&&!quiz.active&&!(atlasMode==='china'?selected:currentAtlas()?.getSelection()))navigateBounds(currentAtlas()?.bounds||homeBounds,{paddingTopLeft:[35,76],paddingBottomRight:[55,55],maxZoom:registry.countries[atlasMode]?.home.maxZoom||8,manual:true},false);}
// The globe's smallest size nearly fills the map (about 95% of its shorter side, calibrated by eye: MapLibre draws it
// smaller than the 512·2^zoom/π px diameter suggests); the flat map keeps zoom 0.5.
function globeFloor(){const globe=map.getProjection?.()?.type==='globe',c=map.getContainer();map.setMinZoom(globe?Math.max(.5,Math.log2(1.33*Math.min(c.clientWidth,c.clientHeight)*Math.PI/512)):.5);}
map.on('resize',globeFloor);
$('globe-view').onclick=()=>{const on=$('globe-view').getAttribute('aria-pressed')!=='true';$('globe-view').setAttribute('aria-pressed',String(on));try{localStorage.setItem(globeKey,String(on));}catch{}if(window.AtlasSettings.getSettings().projection!==(on?'globe':'mercator'))window.AtlasSettings.setSettings({projection:on?'globe':'mercator'});syncGlobe();};$('retry').onclick=()=>location.reload();
window.AtlasSettings.mountSettings({refreshLabels:updateLabels,refreshStyling:updateProvinceStyling,getProjection:()=>$('globe-view').getAttribute('aria-pressed')==='true'?'globe':'mercator',setProjection:value=>{if(($('globe-view').getAttribute('aria-pressed')==='true')!==(value==='globe'))$('globe-view').click();}});
window.AtlasPerformanceController.mountSettings();
window.AtlasInputController=window.AtlasInput.attach(map,{canInteract:()=>!atlasStarting&&!countrySwitching,beforeInput:event=>{if(cameraBusy){cancelNavigation();const epoch=navigationEpoch;Promise.resolve(motionRenderer.end()).then(()=>{if(epoch===navigationEpoch)unlockCamera();});}window.AtlasPerformanceController.prepareInput(event);}});
window.AtlasInputController.mountSettings();
$('about-open').onclick=()=>$('about').showModal();$('about-close').onclick=()=>$('about').close();$('about').addEventListener('click',e=>{if(e.target!==$('about'))return;const r=$('about').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('about').close();});
let prefectureAttempt,prefectureTick;
const prefectureTimer=document.createElement('span');prefectureTimer.className='quiz-timer';$('quiz-score').after(prefectureTimer);
function refreshPrefectureTimer(){prefectureTimer.textContent=window.AtlasQuizRecordsCore.quizTime(prefectureAttempt?.timer.elapsed||0);}
window.AtlasQuizRecords.quizRecords.subscribe(()=>{if(allReady&&atlasMode==='china'&&!quiz.active)updateQuizSetup();});
function quizPool(settings={scope:$('quiz-scope').value,includeTaiwan:$('quiz-taiwan').checked}){return AtlasQuiz.candidates([...regionByCode.values()],settings);}
function initQuiz(){
  $('quiz-scope').replaceChildren($('quiz-scope').options[0]);
  for(const f of [...provinceFeatures].sort((a,b)=>englishName(a.properties).localeCompare(englishName(b.properties)))){
    const p=f.properties;if(!quizPool({scope:String(p.adcode),includeTaiwan:true}).length)continue;
    const option=document.createElement('option');option.value=p.adcode;option.textContent=bilingualName(p);$('quiz-scope').append(option);
  }
  updateQuizSetup();
}
function updateQuizSetup(){
  if(!allReady)return;
  const naming=$('quiz-type').value==='name',identifying=$('quiz-type').value==='identify';
  $('quiz-scope').options[0].disabled=naming;$('quiz-scope').options[0].textContent=naming?'Choose a province':'All China';
  $('quiz-title').textContent=naming?'Name every prefecture':identifying?'Name the highlighted prefecture':'Prefectures quiz';
  $('quiz-description').textContent=naming?'Choose a province and type every prefecture name. Chinese and English names are accepted.':identifying?'Type the English or Chinese name of the highlighted prefecture.':'Click the named place on the map.';
  $('quiz-length').hidden=naming;$('quiz-length-label').hidden=naming;
  const scope=$('quiz-scope').value,pool=quizPool(),requested=$('quiz-length').value;
  const count=requested==='all'?pool.length:Math.min(Number(requested),pool.length);
  $('quiz-taiwan-option').hidden=naming||!!scope;
  $('quiz-scope-note').textContent=scope==='710000'?'Taiwan uses its 22 city and county divisions.':'Municipal districts and directly administered county-level divisions are excluded.';
  $('quiz-count').textContent=naming?(scope?`${pool.length} places to name`:'Choose a province to begin.'):`${pool.length} places available · ${count} questions`;
  const draft=naming&&scope?namingQuiz?.draft(scope):null;
  $('quiz-start').textContent=draft?'Start new round':'Start quiz';
  $('quiz-resume').hidden=!draft;$('quiz-resume').textContent=draft?`Resume · ${draft.found.length} already named`:'Resume saved round';
  $('quiz-best').textContent=naming&&scope?namingQuiz?.best(scope)||'':'';$('quiz-best').hidden=!$('quiz-best').textContent;
  controls();
}
function quizScopeLabel(){return quiz.settings.scope?bilingualName(provinceLayers.get(Number(quiz.settings.scope)).feature.properties):'All China · Taiwan '+(quiz.settings.includeTaiwan?'included':'excluded');}
function scrollToQuizMap(){if(matchMedia('(max-width:760px)').matches)window.scrollTo({top:0,behavior:'instant'});}
function fitQuizScope(animate=true,camera={}){
  const layer=provinceLayers.get(Number(quiz.settings.scope));
  return layer?navigateBounds(layer.getBounds(),{paddingTopLeft:[30,75],paddingBottomRight:[45,100],maxZoom:regionZoom(layer.feature.properties),manual:camera.manual===true},animate):fitHome(animate,camera);
}
function clearQuizHighlights(preserveCorrect=false){
  const correct=new Set(preserveCorrect?(quiz.round?.results||[]).filter(r=>r.status==='correct').map(r=>r.expected):[]);
  const incorrect=new Set(preserveCorrect?(quiz.round?.results||[]).filter(r=>r.status==='incorrect').map(r=>quiz.type==='identify'?r.expected:r.chosen):[]);
  const retained=[];
  for(const layer of new Set(quiz.highlighted)){
    const keep=correct.has(layer.feature.properties.adcode);
    setRegionState(layer,{quizCorrect:keep,quizWrong:!keep&&incorrect.has(layer.feature.properties.adcode),quizTarget:false});if(keep||incorrect.has(layer.feature.properties.adcode))retained.push(layer);
  }
  quiz.highlighted=retained;quiz.reviewLayer=null;clearHover();updateLabels();
}
function syncQuizStyle(){
  window.AtlasRegionColorController?.suspend(quiz.active);
  // Keep the same paint expression while feature states change during quiz navigation.
  for(const layer of provinceLayers.values())window.AtlasMotion.setFeatureState(map,{source:'provinces',id:layer.feature.properties.adcode},{quizActive:quiz.active});
  const paint=fillPaint(quiz.active?'#e6cda1':'#d6b974',quiz.active ? .65 : .025);
  for(const [property,value] of Object.entries(paint))for(const id of ['prefecture-fill','prefecture-fragment-fill'])map.setPaintProperty(id,property,value);
  const filter=quiz.active?['in',['to-string',['get','adcode']],['literal',quiz.pool.map(l=>String(l.feature.properties.adcode))]]:null;
  for(const id of ['prefecture-fill','prefecture-fragment-fill','prefecture-selection','prefecture-selection-repaired'])map.setFilter(id,filter);
  syncLayers();
  $('map-shell').dataset.quiz=String(quiz.active);$('quiz-map-prompt').hidden=!quiz.active||quiz.type==='name';$('name-map-prompt').hidden=!quiz.active||quiz.type!=='name';$('quiz-crosshair').hidden=true;
  $('home').textContent=quiz.active?'End quiz':'China';
  $('fit-map').title=quiz.active?'Fit quiz scope':'View parent division';$('fit-map').setAttribute('aria-label',$('fit-map').title);
  map.getCanvas().setAttribute('aria-label',quiz.active?(quiz.type==='name'?'Quiz map. Type prefecture names in the answer field. Correct places turn green.':'Quiz map. Pan with arrow keys and zoom with plus or minus. Press Enter to select the area under the crosshair.'):'Map');
}
async function startQuiz(resume=false){
  clearTimeout(legacyQuizFlash);
  if(cameraBusy||!allReady)return;
  const settings={scope:$('quiz-scope').value,includeTaiwan:$('quiz-taiwan').checked},pool=quizPool(settings);if(!pool.length)return;
  if($('quiz-type').value==='name'&&!settings.scope)return;
  namingQuiz?.pause();
  if(!quiz.active)quiz.saved={selected:selected?.layer,activeCode,mode:$('map-shell').dataset.level};
  clearQuizHighlights();clearSelection();clearSearch();
  quiz.settings=settings;quiz.pool=pool;quiz.type=$('quiz-type').value;quiz.round=quiz.type==='name'?{eligible:new Set(pool.map(l=>l.feature.properties.adcode))}:AtlasQuiz.createRound(pool,$('quiz-length').value);quiz.active=true;
  if(quiz.type!=='name')prefectureAttempt=window.AtlasQuizRecords.quizRecords.begin({country:'china',level:2,mode:quiz.type,scope:settings.scope||'',scopeLabel:settings.scope?quizScopeLabel():'',poolHash:window.AtlasQuizRecordsCore.quizPoolHash(pool.map(l=>l.feature.properties.adcode)),total:quiz.round.questions.length,fullRound:quiz.round.questions.length===pool.length});
  activeCode=Number(settings.scope)||null;$('map-shell').dataset.selected='true';setMode('prefecture');syncQuizStyle();
  $('breadcrumb-region').hidden=false;$('breadcrumb-region').textContent=quizScopeLabel();showPanel('quiz');
  $('quiz-setup').hidden=true;$('quiz-round').hidden=quiz.type==='name';$('quiz-results').hidden=true;$('quiz-naming').hidden=quiz.type!=='name';
  if(quiz.type==='name'){$('map-hint').textContent='Type prefecture names';namingQuiz.start(pool.map(l=>({code:l.feature.properties.adcode,en:englishName(l.feature.properties),zh:l.feature.properties.name,aliases:(l.feature.properties.searchAliases||'').split(/[;,|]/).filter(Boolean)})),settings.scope,quizScopeLabel(),resume);}else renderQuizQuestion();
  updateLabels();controls();if(quiz.type!=='name')scrollToQuizMap();await fitQuizScope();if(quiz.type==='name')namingQuiz.focus();else if(quiz.active){prefectureAttempt?.timer.start();refreshPrefectureTimer();clearInterval(prefectureTick);prefectureTick=setInterval(refreshPrefectureTimer,250);}
}
function renderQuizQuestion(){
  const round=quiz.round,p=round.questions[round.index].feature.properties,result=round.results[round.index],score=AtlasQuiz.score(round);
  $('quiz-progress-text').textContent=`Question ${round.index+1} / ${round.questions.length}`;
  $('quiz-score').textContent=`${score.correct} correct`;
  $('quiz-progress-bar').style.width=(score.answered/score.total*100)+'%';
  const identifying=quiz.type==='identify';$('quiz-question').textContent=identifying&&!result?'Name the highlighted prefecture':englishName(p);$('quiz-question-chinese').textContent=identifying&&!result?'':p.name;
  $('quiz-identify-form').hidden=!identifying||!!result;if(identifying&&!result){const target=regionByCode.get(p.adcode);setRegionState(target,{quizTarget:true});if(!quiz.highlighted.includes(target))quiz.highlighted.push(target);$('quiz-identify-answer').value='';}
  $('quiz-question-chinese').lang=p.provinceCode===710000?'zh-Hant':'zh-Hans';
  $('quiz-map-chinese').lang=$('quiz-question-chinese').lang;
  $('quiz-map-progress').textContent=`${round.index+1} / ${round.questions.length}`;
  $('quiz-map-name').textContent=$('quiz-question').textContent;$('quiz-map-chinese').textContent=$('quiz-question-chinese').textContent;
  $('quiz-feedback').hidden=!result;$('quiz-reveal').hidden=!!result;$('quiz-view').hidden=!result;$('quiz-next').hidden=!result;
  $('quiz-next').textContent=round.index+1===round.questions.length?'See results':'Next question';
  $('quiz-map-next').hidden=!result;$('quiz-map-reveal').hidden=!!result;$('quiz-map-feedback').hidden=!result;
  $('quiz-map-next').textContent=round.index+1===round.questions.length?'Results':'Next';
  $('map-hint').textContent=result?(identifying&&result.status==='incorrect'?'Highlighted answer shown in red':'Correct area shown in green'):identifying?'Name the highlighted prefecture':'Click the named place';
  if(result){
    $('quiz-feedback').dataset.status=result.status;
    $('quiz-feedback-title').textContent={correct:'Correct',incorrect:'Incorrect',skipped:'Answer shown'}[result.status];
    $('quiz-map-feedback').textContent=$('quiz-feedback-title').textContent;
    $('quiz-feedback-detail').textContent=result.status==='incorrect'?(quiz.type==='identify'?'Correct answer: '+bilingualName(p):'You selected '+bilingualName(regionByCode.get(result.chosen).feature.properties)+'.'):bilingualName(provinceLayers.get(p.provinceCode).feature.properties);
  }
  controls();
  if(!result)$(quiz.type==='identify'?'quiz-identify-answer':'quiz-question').focus({preventScroll:true});
}
let legacyQuizFlash;
function answerQuiz(code=null,typed=null){
  if(chinaFirstQuiz?.active)return;
  if(!quiz.active||quiz.type==='name'||quiz.type==='identify'&&code!==null||cameraBusy||!allReady)return;
  const place=quiz.type==='identify'?quiz.round.questions[quiz.round.index].feature.properties:null;
  const result=typed===null?AtlasQuiz.answer(quiz.round,code):window.AtlasQuizModes.answerSpecified(quiz.round,typed,{code:place.adcode,en:englishName(place),zh:place.name,aliases:(place.searchAliases||'').split(/[;,|]/).filter(Boolean)},quiz.pool.map(layer=>{const p=layer.feature.properties;return{code:p.adcode,en:englishName(p),zh:p.name,aliases:(p.searchAliases||'').split(/[;,|]/).filter(Boolean)};}));if(!result)return;
  if(result.status==='spelling'){$('quiz-feedback').hidden=false;$('quiz-feedback').dataset.status='spelling';$('quiz-feedback-title').textContent='Close spelling';$('quiz-feedback-detail').textContent='Try again ('+result.warnings+'/2).';$('quiz-map-feedback').hidden=false;$('quiz-map-feedback').textContent='Close spelling. Try again ('+result.warnings+'/2).';$('quiz-identify-answer').focus({preventScroll:true});return;}
  if(quiz.round.results.length===quiz.round.questions.length){const score=AtlasQuiz.score(quiz.round);prefectureAttempt?.finish({correct:score.correct,hints:0,reveals:score.skipped,completed:true});clearInterval(prefectureTick);refreshPrefectureTimer();}
  clearHover();const target=regionByCode.get(result.expected);setRegionState(target,{quizCorrect:quiz.type!=='identify'||result.status!=='incorrect',quizWrong:quiz.type==='identify'&&result.status==='incorrect',quizTarget:false});quiz.highlighted.push(target);quiz.reviewLayer=target;
  if(result.status==='incorrect'&&result.chosen!==null){const wrong=regionByCode.get(result.chosen);setRegionState(wrong,{quizWrong:true});quiz.highlighted.push(wrong);}
  renderQuizQuestion();updateLabels();clearTimeout(legacyQuizFlash);if(!$('quiz-keep-colors').checked)legacyQuizFlash=setTimeout(()=>{if(quiz.active&&quiz.type!=='name'&&!chinaFirstQuiz?.active)clearQuizHighlights();},1000);$(matchMedia('(max-width:760px)').matches?'quiz-map-next':'quiz-next').focus({preventScroll:true});
}
async function nextQuizQuestion(){
  if(!quiz.active||cameraBusy||!AtlasQuiz.advance(quiz.round))return;
  clearTimeout(legacyQuizFlash);clearQuizHighlights($('quiz-keep-colors').checked);
  if(quiz.round.complete){renderQuizResults();return;}
  renderQuizQuestion();await fitQuizScope();
}
function viewQuizAnswer(layer=quiz.round.questions[quiz.round.index]){
  if(cameraBusy||!quiz.active)return;
  scrollToQuizMap();
  return navigateBounds(layer.getBounds(),{paddingTopLeft:[35,75],paddingBottomRight:[55,100],maxZoom:regionZoom(layer.feature.properties)});
}
function renderQuizResults(){
  const score=AtlasQuiz.score(quiz.round);$('quiz-round').hidden=true;$('quiz-results').hidden=false;$('quiz-map-prompt').hidden=true;
  $('quiz-result-score').textContent=`${score.correct} / ${score.total}`;
  $('quiz-result-detail').textContent=`${score.correct} correct · ${score.incorrect} incorrect · ${score.skipped} answers shown · ${window.AtlasQuizRecordsCore.quizTime(prefectureAttempt?.timer.elapsed||0)}`;
  const review=$('quiz-review');review.replaceChildren();const missed=quiz.round.results.filter(r=>r.status!=='correct');
  if(missed.length){const heading=document.createElement('h3');heading.textContent='Review missed places';review.append(heading);}
  for(const result of missed){const layer=regionByCode.get(result.expected),button=document.createElement('button');button.type='button';button.dataset.quizNav='';
    const name=document.createElement('span');name.textContent=englishName(layer.feature.properties);const chinese=document.createElement('small');chinese.textContent=layer.feature.properties.name;button.append(name,chinese);
    button.onclick=()=>{if(cameraBusy)return;clearQuizHighlights(true);setRegionState(layer,{quizCorrect:true});quiz.highlighted.push(layer);quiz.reviewLayer=layer;updateLabels();viewQuizAnswer(layer);};review.append(button);
  }
  $('map-hint').textContent='Review a place or start another quiz';controls();$('quiz-results-title').focus({preventScroll:true});if(matchMedia('(max-width:760px)').matches)$('quiz-results').scrollIntoView({block:'start',behavior:'instant'});
}
function configureQuiz(){
  clearTimeout(legacyQuizFlash);
  if(chinaFirstQuiz?.active)return chinaFirstQuiz.end();
  if(cameraBusy||!allReady)return;
  if(quiz.active){prefectureAttempt?.timer.stop();clearInterval(prefectureTick);namingQuiz?.pause();clearQuizHighlights();quiz.active=false;syncQuizStyle();const saved=quiz.saved;quiz.round=null;
    if(saved?.selected)selectRegion(saved.selected,saved.selected.feature.properties.provinceCode||saved.selected.feature.properties.adcode,false);
    else{activeCode=null;$('province').value='';$('breadcrumb-region').hidden=true;$('map-shell').dataset.selected='false';setMode(saved?.mode||'province');}
  }
  $('quiz-naming').hidden=true;$('quiz-setup').hidden=false;$('quiz-round').hidden=true;$('quiz-results').hidden=true;showPanel('quiz');updateQuizSetup();updateLabels();controls();
}
for(const id of ['quiz-type','quiz-scope','quiz-taiwan','quiz-length'])$(id).addEventListener('change',updateQuizSetup);
$('quiz-start').onclick=()=>startQuiz();$('quiz-resume').onclick=()=>startQuiz(true);$('quiz-again').onclick=()=>startQuiz();$('quiz-reveal').onclick=()=>answerQuiz();$('quiz-next').onclick=nextQuizQuestion;
$('quiz-view').onclick=()=>viewQuizAnswer();$('quiz-configure').onclick=configureQuiz;
$('quiz-map-reveal').onclick=()=>answerQuiz();$('quiz-map-next').onclick=nextQuizQuestion;
$('quiz-identify-form').onsubmit=event=>{event.preventDefault();if(!event.isComposing)answerQuiz(null,$('quiz-identify-answer').value);};
map.getCanvas().addEventListener('keydown',event=>{if(event.key==='Enter'&&quiz.active&&!chinaFirstQuiz?.active&&quiz.type!=='regional'&&!cameraBusy){event.preventDefault();const region=pickedRegion([map.getContainer().clientWidth/2,map.getContainer().clientHeight/2]);if(region)answerQuiz(region.feature.properties.adcode);}});
map.getCanvas().addEventListener('focus',()=>{if(!chinaFirstQuiz?.active)$('quiz-crosshair').hidden=!quiz.active||quiz.type==='name'||quiz.type==='identify'||quiz.type==='regional';});map.getCanvas().addEventListener('blur',()=>{$('quiz-crosshair').hidden=true;});
let previousSize;
new ResizeObserver(()=>{const size=$('map').getBoundingClientRect();if(previousSize&&previousSize.width===size.width&&previousSize.height===size.height)return;previousSize={width:size.width,height:size.height};map.resize();updateLabels();}).observe($('map'));
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'navigate_to_province',description:'Select a province, show its details, and zoom to its boundary. Returns when movement finishes.',inputSchema:{type:'object',properties:{adcode:{type:'integer',enum:Object.keys(english).map(Number)}},required:['adcode'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||!Number.isInteger(input.adcode)||!Object.hasOwn(english,input.adcode)||!allReady)throw new Error('A loaded province administrative code is required.');if(quiz.active)throw new Error("End the quiz before navigating to a region.");if(cameraBusy)throw new Error('The map is moving. Wait until the current navigation completes.');if(atlasMode!=='china')await changeAtlas('china',false);await selectRegion(provinceLayers.get(input.adcode),input.adcode);return{adcode:input.adcode,name:english[input.adcode]};}})).catch(()=>{});}catch{}}
showPanel('layers');controls();init();

// Share the province quiz UI while keeping China's existing prefecture quiz.
const chinaQuizTab=$('tab-quiz'),openPrefectureQuiz=chinaQuizTab.onclick;let chinaQuizLevel='prefectures';
const chinaQuizRecords=()=>provinceFeatures.map(f=>{const p=f.properties,b=provinceLayers.get(p.adcode).getBounds();return{id:String(p.adcode),level:1,en:englishName(p),local:p.name,localLang:'zh',aliases:[shortName(p.name),...(p.searchAliases||'').split(/[;,|]/).filter(Boolean)],bounds:[[b.getWest(),b.getSouth()],[b.getEast(),b.getNorth()]],center:p.centroid||p.center};});
chinaFirstQuiz=window.AtlasFirstLevelQuiz.createFirstLevelQuiz(map,{isBusy:()=>quiz.active||countrySwitching,isMoving:()=>cameraBusy,stopCamera:()=>cancelNavigation(),controls,fit:(bounds,maxZoom,camera={})=>navigateBounds(bounds,{paddingTopLeft:[35,76],paddingBottomRight:[55,55],maxZoom,manual:camera.manual===true}),setQuizActive(value){quiz.active=value;quiz.type=value?'province':undefined;window.AtlasRegionColorController?.suspend(value);for(const layer of provinceLayers.values())setRegionState(layer,{quizActive:value});$('map-shell').dataset.quiz=String(value);satelliteDisplay?.sync();syncLayers();controls();}},
 {country:'china',idProperty:'adcode',sidebar:$('china-sidebar'),prefix:'cn',tab:chinaQuizTab,attachTab:false,returnPanelId:'layers-panel',ready:()=>allReady&&chinaReady,records:chinaQuizRecords,
 fitScope:()=>fitHome(true,{manual:true}),
 fillLayers:()=>['province-fill','province-fragment-fill','province-fill-motion','province-fragment-fill-motion'].filter(id=>map.getLayer(id)),lineLayer:'province-lines',mark:(r,state)=>setRegionState(provinceLayers.get(Number(r.id)),state),
 pick:point=>{const f=map.queryRenderedFeatures(point,{layers:['province-fill','province-fragment-fill'].filter(id=>map.getLayer(id))})[0];return f&&String(f.properties.adcode);},
 capture:()=>({selected:selected?.layer,activeCode,mode:$('map-shell').dataset.level}),
 begin:async()=>{clearQuizHighlights();clearSelection();clearSearch();activeCode=null;$('province').value='';$('breadcrumb-region').hidden=true;setMode('province');},
 hideLabels:()=>{labels.forEach(label=>label.remove());labels.length=0;},review:()=>{},
 restore:async saved=>{if(saved.selected)selectRegion(saved.selected,saved.selected.feature.properties.provinceCode||saved.selected.feature.properties.adcode,false);else{activeCode=saved.activeCode;setMode(saved.mode||'province');syncLayers();}showPanel('layers');updateLabels();},onOpen:()=>{chinaQuizLevel='provinces';$('cn-quiz-level').value='provinces';$('quiz-panel').hidden=true;}});
function chinaQuizLevelPicker(parent,value,id){const label=document.createElement('label');label.className='field-label quiz-level-choice';label.textContent='Quiz subdivisions';label.htmlFor=id;const select=document.createElement('select');select.id=id;select.innerHTML='<option value="provinces">Provinces &amp; territories</option><option value="prefectures">Prefectures</option>';select.value=value;select.onchange=()=>{chinaQuizLevel=select.value;openChinaQuiz();};label.append(select);parent.prepend(label);}
function openChinaQuiz(){if(chinaFirstQuiz.active)return;if(chinaQuizLevel==='provinces'){chinaFirstQuiz.open();return;}$('cn-quiz-panel').hidden=true;$('china-quiz-level').value='prefectures';chinaQuizTab.setAttribute('aria-controls','quiz-panel');openPrefectureQuiz();}
chinaQuizLevelPicker($('quiz-setup'),'prefectures','china-quiz-level');chinaQuizLevelPicker($('cn-quiz-panel').querySelector('[data-q=setup]'),'provinces','cn-quiz-level');chinaQuizTab.onclick=openChinaQuiz;

let accountQuizNavigation=0;
globalThis.addEventListener('atlas-quiz-open',async event=>{
 const intent=event.detail,country=intent?.country;if(!registry.countries[country]?.quiz)return;const epoch=++accountQuizNavigation;
 await startupFinished;if(epoch!==accountQuizNavigation)return;
 if(quiz.active){if(chinaFirstQuiz?.active)await chinaFirstQuiz.end();else if(activeCountryQuiz()?.active)await activeCountryQuiz().end();else{cancelNavigation();configureQuiz();}}
 if(epoch!==accountQuizNavigation||quiz.active)return;
 if(!await changeAtlas(country,true)||epoch!==accountQuizNavigation)return;mountCountryQuiz();
 if(country==='china'){chinaQuizLevel=intent.level===2?'prefectures':'provinces';openChinaQuiz();if(intent.level===2){$('quiz-type').value=intent.mode||'name';$('quiz-scope').value=intent.scope||'';updateQuizSetup();}else chinaFirstQuiz.open(intent);}
 else if(registry.countries[country].quiz.counties&&intent.level===2)await currentAtlas()?.countyQuiz?.open(intent);
 else currentAtlas()?.quiz?.open(intent);
 window.AtlasSheet?.expand?.();
});
