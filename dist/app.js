const $=id=>document.getElementById(id);
const english={110000:'Beijing',120000:'Tianjin',130000:'Hebei',140000:'Shanxi',150000:'Inner Mongolia',210000:'Liaoning',220000:'Jilin',230000:'Heilongjiang',310000:'Shanghai',320000:'Jiangsu',330000:'Zhejiang',340000:'Anhui',350000:'Fujian',360000:'Jiangxi',370000:'Shandong',410000:'Henan',420000:'Hubei',430000:'Hunan',440000:'Guangdong',450000:'Guangxi',460000:'Hainan',500000:'Chongqing',510000:'Sichuan',520000:'Guizhou',530000:'Yunnan',540000:'Tibet',610000:'Shaanxi',620000:'Gansu',630000:'Qinghai',640000:'Ningxia',650000:'Xinjiang',710000:'Taiwan',810000:'Hong Kong',820000:'Macao'};
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let atlasStarting=true,restoringView=false;
let zoomLock;
const initialCountry=window.AtlasEntry?.initial;
const initialBackground=window.AtlasEntry?.countries[initialCountry]?.background||'#f4f0e7';
const initialPreview=window.AtlasSouthAmerica.countries[initialCountry];
const map=new maplibregl.Map({container:'map',style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':initialBackground}}],transition:{duration:0,delay:0}},center:initialPreview?.center||[105,36],zoom:initialPreview?2:3,minZoom:.5,maxZoom:16,renderWorldCopies:false,dragRotate:false,pitchWithRotate:false,touchPitch:false,maxPitch:0,attributionControl:false,canvasContextAttributes:{antialias:true},fadeDuration:0});
map.touchZoomRotate.disableRotation();map.keyboard.disableRotation();
const motionRenderer=window.AtlasMotion.createMotionRenderer(map,initialCountry);
map.addControl(new maplibregl.AttributionControl({compact:false,customAttribution:'Boundaries: <a href="https://datav.aliyun.com/portal/school/atlas/area_selector" target="_blank" rel="noopener">DataV</a> · <a href="https://data.gov.tw/dataset/7442" target="_blank" rel="noopener">NLSC</a> · <a href="https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov" target="_blank" rel="noopener">AreaCity</a> · <a href="https://portal.csdi.gov.hk/csdi-webpage/metadata/landsd_rcd_1637221775627_85634/html" target="_blank" rel="noopener">© HK SAR Government</a> · <a href="https://webmap.gis.gov.mo/MapGIS/index.html" target="_blank" rel="noopener">Macao Government</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>'}));
const styleReady=new Promise(resolve=>map.once('load',resolve));
const labels=[];
let labelFrame;
const sourceFor=r=>r.feature.properties.parentCity?'city-districts':r.feature.properties.level==='province'?'provinces':isPrefectureLevel(r.feature.properties)?'prefectures':'others';
function setRegionState(region,state){if(region.feature.geometry){const source=sourceFor(region);for(const id of [source,source+'-selection-edges'])window.AtlasMotion.setFeatureState(map,{source:id,id:region.feature.properties.adcode},state);}}
function layerVisible(id,visible){window.AtlasLines.setLayerVisible(map,id,visible);}
function syncCountryFills(){
  for(const id of ['province-fill','province-fragment-fill'])layerVisible(id,atlasMode==='china'&&chinaReady&&!countrySwitching);
  layerVisible('china-context',atlasMode!=='china'||!chinaReady||countrySwitching);
}
function syncLayers(){
  syncDistrictLayers();
  const ids=['prefecture-fill','prefecture-fragment-fill','prefecture-lines','prefecture-selection','other-fill','other-lines','other-selection','province-selection','province-lines'];
  if(atlasMode!=='china'||countrySwitching){for(const id of ids)layerVisible(id,false);return;}
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
const districtCities=new Set([330100,320100,320500,440100,440300]);
function districtScope(){const p=selected?.layer.feature.properties;return p?.parentCity||(districtCities.has(p?.adcode)?p.adcode:null);}
function districtsVisible(){return atlasMode==='china'&&!quiz.active&&!!districtScope()&&$('other-layer').checked&&$('map-shell').dataset.level==='prefecture';}
function syncDistrictLayers(){
  const visible=districtsVisible(),filter=['==',['get','parentCity'],districtScope()||0];
  for(const id of ['city-district-fill','city-district-lines','city-district-selection'])if(map.getLayer(id)){map.setFilter(id,filter);layerVisible(id,visible);}
}
let provinceFeatures=[],manifest,selected=null,allReady=false,cameraBusy=false,activeCode=null,finishNavigation=null,hovered=null;
const quiz={active:false,round:null,pool:[],saved:null,highlighted:[],reviewLayer:null};
let chinaReady=false,chinaLoading,countrySwitching=false,countryEpoch=0,requestedCountry,countryPreparation,countryLoadFailed=false;
let comparison,southAmerica;
let normalProvinceColors,atlasMode='china',koreaAtlas,mongoliaAtlas,japanAtlas,philippinesAtlas,indonesiaAtlas,capitalDisplay,waterDisplay,satelliteDisplay,namingQuiz,placeTools;
const regionByCode=new Map();
const homeBounds=[[73,17.3],[135.5,54]];
const tooltip=document.createElement('div');tooltip.className='region-tooltip gpu-tooltip';tooltip.hidden=true;$('map-shell').append(tooltip);
function clearHover(){if(hovered){setRegionState(hovered,{hover:false});hovered=null;}tooltip.hidden=true;map.getCanvas().style.cursor='';}
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
function isPrefectureLevel(p){return p.level==='taiwan-region'||p.level==='city'&&String(p.adcode).slice(2,4)!=='90';}
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
function controls(){
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
  cameraBusy=true;$('map-shell').setAttribute('aria-busy','true');$('moving-indicator').hidden=false;controls();
  enabledInteractions=interactionNames.filter(name=>map[name]?.isEnabled());

  labels.forEach(label=>label.remove());labels.length=0;currentAtlas()?.pauseLabels();
  clearHover();
}
function unlockCamera(){cameraBusy=false;enabledInteractions.forEach(name=>map[name].enable());enabledInteractions=[];$('map-shell').setAttribute('aria-busy','false');$('moving-indicator').hidden=true;controls();updateLabels();}
function navigationOptions(options={}){const top=options.paddingTopLeft||options.padding||[28,65],bottom=options.paddingBottomRight||options.padding||[55,65];return{padding:{left:top[0],top:top[1],right:bottom[0],bottom:bottom[1]},maxZoom:options.maxZoom?options.maxZoom-1:11,retainPadding:false};}
let navigationEpoch=0,navigationCleanup,previewStart;
function cancelNavigation(){navigationEpoch++;navigationCleanup?.(false);navigationCleanup=null;finishNavigation=null;map.stop();}
async function navigateBounds(bounds,options={},animate=true){
 if(zoomLock&&!zoomLock.allows({manual:options.manual,initial:atlasStarting,restoring:restoringView})){updateLabels();saveViewSoon();return true;}
 cancelNavigation();const epoch=navigationEpoch,cameraOptions=navigationOptions(options);
 if(!animate||reducedMotion.matches||atlasStarting||restoringView){await motionRenderer.end();if(options.camera)map.jumpTo(options.camera);else map.fitBounds(bounds,{...cameraOptions,duration:0});unlockCamera();return true;}
 lockCamera();
 if(!previewStart)previewStart=motionRenderer.begin().catch(error=>console.warn('Motion preview:',error.message)).finally(()=>previewStart=null);
 await previewStart;if(epoch!==navigationEpoch)return false;
 const target=options.camera||map.cameraForBounds(bounds,cameraOptions);if(!target){unlockCamera();return false;}
 const point=map.project(target.center),size=map.getContainer();
 const distance=Math.hypot(point.x-size.clientWidth/2,point.y-size.clientHeight/2)/Math.max(1,Math.min(size.clientWidth,size.clientHeight));
 const zoomDelta=Math.abs(target.zoom-map.getZoom());const far=distance>1.15||zoomDelta>2;
 return new Promise(resolve=>{
  let timer;const cleanup=value=>{map.off('moveend',finish);clearTimeout(timer);resolve(value);};
  const finish=async()=>{if(epoch!==navigationEpoch)return;cleanup(true);navigationCleanup=null;finishNavigation=null;await motionRenderer.end();if(epoch===navigationEpoch){unlockCamera();saveViewSoon();}};
  navigationCleanup=cleanup;finishNavigation=finish;map.once('moveend',finish);
  timer=setTimeout(()=>{if(epoch!==navigationEpoch)return;map.stop();},1600);
  const movement={...target,retainPadding:false,duration:far?Math.min(1000,650+distance*50):Math.min(460,220+distance*140+zoomDelta*65),easing:t=>1-Math.pow(1-t,3)};
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
  const children=detailLayers.get(code)||[];$('subdivisions').hidden=!children.length;$('subdivisions').open=false;$('subdivisions-title').textContent=`${code===650000?'Administrative':'Mapped'} divisions (${children.length})`;$('region-list').replaceChildren();
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
    const count=layer.feature.geometry.type==='MultiPolygon'?layer.feature.geometry.coordinates.length:1;
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
  const coverage=manifest.coverage.find(c=>c.adcode===code);
  $('selection-meta').textContent=isProvince?(p.adcode===710000?'22 administrative divisions · 6 special municipalities, 3 cities, 13 counties':p.adcode===820000?'7 parishes · 4 other areas':coverage.unavailable?'Outer boundary only; internal divisions unavailable.':`${(detailLayers.get(code)||[]).filter(l=>l.feature.geometry).length} mapped subdivisions · ${coverage.levels.district?'district boundaries':'prefectures and direct divisions'}`):p.functionalArea?'Administered directly by Suzhou':p.boundaryAvailable===false?'Boundary unavailable':p.provinceCode===820000?'Macao government map area':`Administrative code ${p.officialCode||p.adcode}`;
  $('parent-context').hidden=isProvince;$('parent-region').hidden=isProvince;
  const parentLayer=p.parentCity?regionByCode.get(p.parentCity):provinceLayers.get(code),parent=parentLayer.feature.properties;
  $('parent-kind').textContent=kind(parent);
  $('parent-english').textContent=englishName(parent);$('parent-chinese').textContent=parent.name;$('parent-region').setAttribute('aria-label','View '+bilingualName(parent));$('parent-region').onclick=()=>selectRegion(parentLayer,code);
  $('breadcrumb-region').hidden=false;$('breadcrumb-region').textContent=isProvince?bilingualName(p):english[code]+' / '+(p.parentCity?englishName(parent)+' / ':'')+bilingualName(p);$('map-shell').dataset.selected='true';
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
  timer=setTimeout(()=>finish(Error('Country boundary sources timed out')),15000);
  if(signal.aborted)aborted();else check();
 });
}
function atlasFor(country){if(southAmerica?.portals[country])return southAmerica.portals[country];return country==='korea'?koreaAtlas:country==='mongolia'?mongoliaAtlas:country==='japan'?japanAtlas:country==='philippines'?philippinesAtlas:country==='indonesia'?indonesiaAtlas:null;}
function currentAtlas(){return atlasFor(atlasMode);}
async function changeAtlas(next,animate=true,flight=false){
 if(window.AtlasDev&&!window.AtlasDev.allows(next))return false;
 if(!allReady||quiz.active||!koreaAtlas||!mongoliaAtlas||!japanAtlas||!window.AtlasEntry.countries[next])return false;
 const targetAtlas=atlasFor(next);if(next!=='china'&&!targetAtlas)return false;
 if(!countrySwitching&&!countryLoadFailed&&next===atlasMode&&(next==='china'?chinaReady:targetAtlas.ready))return true;
 if(countrySwitching&&next===requestedCountry)return false;
 const epoch=++countryEpoch;countryPreparation?.abort();const preparation=new AbortController();countryPreparation=preparation;requestedCountry=next;saveView();countrySwitching=true;countryLoadFailed=false;controls();cancelNavigation();
 // Acknowledge the destination immediately while keeping the camera still during preparation.
 window.AtlasEntry.remember(next);window.AtlasTheme.applyAtlasTheme(map,next);
 document.documentElement.dataset.switching='true';
 $('status').hidden=false;$('status').textContent='Loading '+window.AtlasEntry.countries[next].en+' boundaries…';
 motionRenderer.loadCountry(next).catch(()=>{});
 try{
  await motionRenderer.end();if(epoch!==countryEpoch)return false;
  currentAtlas()?.leave();clearHover();clearSelection();clearSearch();activeCode=null;atlasMode=next;
  labels.forEach(label=>label.remove());labels.length=0;
  $('china-sidebar').hidden=next!=='china';$('breadcrumb-region').hidden=true;$('map-shell').dataset.selected='false';
  for(const f of provinceFeatures)setRegionState(provinceLayers.get(f.properties.adcode),{inactive:next!=='china'});
  syncCountryFills();syncLayers();updateLabels();koreaAtlas.context(next==='korea');mongoliaAtlas.context(next==='mongolia');japanAtlas.context(next==='japan');
  for(const [country,id,color] of [['china','china-context','#e9dfc9'],['korea','korea-portal-fill','#e7edf5'],['mongolia','mongolia-portal-fill','#d9e7ee'],['japan','japan-portal-fill','#fffdfd'],['philippines','philippines-portal-fill','#e7edf6'],['indonesia','indonesia-portal-fill','#fff5f3']])if(map.getLayer(id))map.setPaintProperty(id,'fill-color',country===next?color:'#d7d7d3');
  const bounds=targetAtlas?.bounds||(next==='china'?homeBounds:next==='korea'?[[124,33],[131.9,43.1]]:next==='japan'?[[122.8,24],[146.2,45.7]]:[[87.7,41.5],[120,52.2]]);
  southAmerica?.syncArrow();
  await (next==='china'?loadChina():targetAtlas.warm());
  if(epoch!==countryEpoch)return false;
  // Source registration precedes worker indexing. Finish both before the first flight.
  const pendingSources=Object.keys(map.getStyle().sources).filter(id=>!id.endsWith('-motion')&&(next==='china'?/^(provinces|prefectures|others|city-district)(-|$)/.test(id):id.startsWith(next+'-')||id.startsWith('south-'+next+'-')));
  if(!await waitForCountrySources(pendingSources,preparation.signal)||epoch!==countryEpoch)return false;
  await (flight&&!zoomLock?.locked&&!reducedMotion.matches?southAmerica.fly(bounds):navigateBounds(bounds,{paddingTopLeft:[35,76],paddingBottomRight:[55,55],maxZoom:next==='china'?12:next==='korea'?9:8},animate));
  if(epoch!==countryEpoch)return false;
  await motionRenderer.end();if(epoch!==countryEpoch)return false;
  countrySwitching=false;syncCountryFills();syncLayers();delete document.documentElement.dataset.switching;
  if(targetAtlas)await targetAtlas.enter(false);
  else{$('province').value='';$('selection').hidden=true;$('tab-explore').hidden=true;showPanel('layers');$('home').textContent='All China';$('mode-province').textContent='Provinces';$('mode-prefecture').textContent='Subdivisions';setMode('province',true);}
  if(epoch!==countryEpoch)return false;
  if(countryPreparation===preparation)countryPreparation=null;unlockCamera();controls();refreshStatus();updateLabels();southAmerica?.syncArrow();saveViewSoon();return true;
 }catch(error){
  if(epoch!==countryEpoch)return false;
  if(countryPreparation===preparation)countryPreparation=null;countryLoadFailed=true;countrySwitching=false;delete document.documentElement.dataset.switching;unlockCamera();$('status').hidden=false;$('status').textContent='Could not load boundaries. Click the country to retry.';console.warn('Country switch:',error);return false;
 }
}
function regionZoom(p){return p.parentCity?14:[810000,820000].includes(p.provinceCode||p.adcode)?p.level==='province'?14:17:p.level==='province'?8:10;}
function bindRegion(feature,parentCode){
  const bounds=new maplibregl.LngLatBounds();
  function extend(c){if(typeof c[0]==='number')bounds.extend(c);else c.forEach(extend);}if(feature.geometry)extend(feature.geometry.coordinates);
  // Keep the complete geometry, but focus Taiwan views on its nearby islands.
  const p=feature.properties;
  if(p.adcode===710000||p.provinceCode===710000){
    const nearby=new maplibregl.LngLatBounds();
    function focus(c){if(typeof c[0]==='number'){if(c[1]>20)nearby.extend(c);}else c.forEach(focus);}focus(feature.geometry.coordinates);
    if(!nearby.isEmpty()){bounds.setSouthWest(nearby.getSouthWest());bounds.setNorthEast(nearby.getNorthEast());}
  }
  const layer={feature,getBounds:()=>bounds};
  regionIndex.push({layer,parentCode,name:p.name,english:englishName(p),regional:(regionNames[p.adcode]?.regional||[]).map(n=>n.text).join(' '),type:kind(p)});regionByCode.set(p.adcode,layer);return layer;
}
function addLabel(p,text,small){const xy=p.centroid||p.center;if(!xy)return;const div=document.createElement('div');div.className='province-label';div.textContent=text;if(small){const el=document.createElement('small');el.textContent=small;div.append(el);}labels.push(new maplibregl.Marker({element:div,anchor:'center'}).setLngLat(xy).addTo(map));}
function updateLabels(){
 if(labelFrame!==undefined)return;
 labelFrame=requestAnimationFrame(()=>{labelFrame=undefined;renderLabels();});
}
function renderLabels(){
  capitalDisplay?.sync();
  waterDisplay?.sync();
  satelliteDisplay?.sync();
  if(cameraBusy||countrySwitching)return;
  if(atlasMode!=='china'){labels.forEach(label=>label.remove());labels.length=0;currentAtlas()?.updateLabels();return;}
  labels.forEach(label=>label.remove());labels.length=0;
  if(quiz.active&&quiz.type==='name'){for(const place of namingQuiz?.labels()||[]){const p=regionByCode.get(place.code)?.feature.properties;if(p)addLabel(p,place.zh);}return;}
  if(quiz.active){const layer=quiz.reviewLayer;if(layer){const p=layer.feature.properties;addLabel(p,englishName(p),p.name);}return;}
  if(!$('label-layer').checked||!provinceFeatures)return;
  const candidates=[];
  if(activeCode&&map.getZoom()>=4){for(const layer of detailLayers.get(districtsVisible()?districtScope():activeCode)||[]){const p=layer.feature.properties;if((isPrefectureLevel(p)&&$('prefecture-layer').checked)||(!isPrefectureLevel(p)&&$('other-layer').checked))candidates.push(p);}}
  if(!candidates.length)candidates.push(...provinceFeatures.map(f=>f.properties));
  const selectedP=selected?.layer.feature.properties;if(selectedP&&!candidates.includes(selectedP))candidates.unshift(selectedP);
  labels.push(...window.AtlasLabels.render(map,candidates.filter(p=>p.centroid||p.center).map(p=>({id:p.adcode,center:p.centroid||p.center,en:englishName(p),district:Number(p.provinceCode)===310000&&p.name.endsWith('区'),local:p.level==='province'?shortName(p.name):p.name,selected:p===selectedP})),'province-label'));

}
function refreshStatus(){$('status').hidden=allReady;$('status').textContent=allReady?'':'Loading boundaries…';}
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
  const r=await fetch(url);if(!r.ok)throw new Error(`${url}: ${r.status}`);
  if(!url.endsWith('.gz')&&!url.endsWith('.bin'))return r.json();
  return decodeJson(await r.arrayBuffer());
}
async function decodeJson(bytes){
  const signature=new Uint8Array(bytes,0,2);
  const text=signature[0]===31&&signature[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);
  return JSON.parse(text);
}
async function boundaryData(){
  const metadata=await json('data/display-boundaries.parts.json');
  const parts=await Promise.all(metadata.parts.map(async name=>{const r=await fetch('data/'+name);if(!r.ok)throw new Error(`${name}: ${r.status}`);return new Uint8Array(await r.arrayBuffer());}));
  const bytes=new Uint8Array(parts.reduce((sum,p)=>sum+p.length,0));let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  return decodeJson(bytes.buffer);
}
// Source geometry retains full detail; rendering tiles omit subpixel detail.
const sourceOptions={type:'geojson',tolerance:.375,maxzoom:18,buffer:128};
// Simplifying neighboring fill triangles independently opens long diagonal gaps.
const fillSourceOptions={tolerance:0};
function addSource(id,data,options={}){map.addSource(id,{...sourceOptions,...options,data,promoteId:'adcode'});}
const featureCollection=features=>({type:'FeatureCollection',features});
const feature=geometry=>({type:'Feature',properties:{},geometry});
function addFill(id,source,baseColor,baseOpacity){
  map.addLayer({id,type:'fill',source,layout:{visibility:atlasMode==='china'&&!countrySwitching?'visible':'none'},paint:fillPaint(baseColor,baseOpacity)});
}
function fillPaint(baseColor,baseOpacity){return {'fill-color':['case',['boolean',['feature-state','quizCorrect'],false],'#548165',['boolean',['feature-state','quizWrong'],false],'#b44737',['boolean',['feature-state','selected'],false],'#ca6a45',['boolean',['feature-state','hover'],false],'#d6a34f',baseColor],'fill-opacity':['case',['boolean',['feature-state','quizCorrect'],false],.65,['boolean',['feature-state','quizWrong'],false],.55,['boolean',['feature-state','selected'],false],.3,['boolean',['feature-state','hover'],false],.35,baseOpacity],'fill-antialias':false};}
function provinceColor(){return ['case',['boolean',['feature-state','quizActive'],false],'#e9e5dc',['boolean',['feature-state','inactive'],false],'#d7d7d3',normalProvinceColors];}
const satellitePaint=new Map();
function satelliteAppearance(visible,opacity){
  $('map-shell').dataset.satellite=String(visible&&opacity>=.5);
  for(const id of ['province-fill','province-fragment-fill'])if(map.getLayer(id))map.setPaintProperty(id,'fill-opacity',window.AtlasSatellite.provinceOpacity(visible,opacity));
  for(const country of ['korea','mongolia','japan'])for(const level of ['first','second']){const id=country+'-'+level+'-fill';if(!map.getLayer(id))continue;if(!satellitePaint.has(id))satellitePaint.set(id,map.getPaintProperty(id,'fill-opacity')??1);map.setPaintProperty(id,'fill-opacity',visible?['+',['*',satellitePaint.get(id),1-opacity],['*',opacity,['case',['boolean',['feature-state','selected'],false],.18,['boolean',['feature-state','hover'],false],.15,0]]]:satellitePaint.get(id));}
  const colors={'japan-first-lines':'#fff0bb','korea-first-lines':'#fff0bb','korea-second-lines':'#f5dfab','mongolia-first-lines':'#fff0bb','mongolia-second-lines':'#f5dfab','province-lines':'#fff0bb','prefecture-lines':'#f5dfab','other-lines':'#f5dfab','city-district-lines':'#f5dfab'};
  for(const [id,color] of Object.entries(colors)){
    if(!map.getLayer(id))continue;
    if(visible){if(!satellitePaint.has(id))satellitePaint.set(id,map.getPaintProperty(id,'line-color'));map.setPaintProperty(id,'line-color',window.AtlasSatellite.blendColor(satellitePaint.get(id),color,opacity));}
    else if(satellitePaint.has(id)){map.setPaintProperty(id,'line-color',satellitePaint.get(id));satellitePaint.delete(id);}
  }
}
function addLine(id,source,color,width,opacity=1,dash){const paint={'line-color':color,'line-width':width,'line-opacity':opacity};if(dash)paint['line-dasharray']=dash;map.addLayer({id,type:'line',source,layout:{'line-cap':'round','line-join':'round'},paint});}
function addSelection(id,source){addLine(id,source+'-selection-edges',['case',['boolean',['feature-state','quizCorrect'],false],'#38684a','#a43829'],1.7,window.AtlasLines.adaptiveOpacity(['case',['any',['boolean',['feature-state','selected'],false],['boolean',['feature-state','quizCorrect'],false],['boolean',['feature-state','quizWrong'],false]],1,0]));}
function pickedRegion(point){
  if(quiz.active&&quiz.type==='name')return;
  if(quiz.active){const hit=window.AtlasMotion.queryRegions(map,point,{layers:['prefecture-fill','prefecture-fragment-fill']})[0];return hit&&quiz.round.eligible.has(hit.properties.adcode)?regionByCode.get(hit.properties.adcode):undefined;}
  const layers=['province-fill'];if($('map-shell').dataset.level==='prefecture'){if($('prefecture-layer').checked)layers.unshift('prefecture-fill');if($('other-layer').checked)layers.unshift('other-fill');}
  if(districtsVisible())layers.unshift('city-district-fill');
  const aliases={'province-fill':'province-fragment-fill','prefecture-fill':'prefecture-fragment-fill'};
  const hits=window.AtlasMotion.queryRegions(map,point,{layers:layers.flatMap(id=>aliases[id]?[id,aliases[id]]:[id])});
  for(const id of layers){const hit=hits.find(f=>f.layer.id===id||f.layer.id===aliases[id]);if(hit)return regionByCode.get(hit.properties.adcode);}
}
function countryAt(point){
 if(map.getLayer('south-america-fill')){const hit=map.queryRenderedFeatures(point,{layers:['south-america-fill']})[0];if(hit)return hit.properties.country;}
 const countries={'philippines-first-fill':'philippines','philippines-portal-fill':'philippines','indonesia-first-fill':'indonesia','indonesia-portal-fill':'indonesia','japan-first-fill':'japan','japan-portal-fill':'japan','korea-first-fill':'korea','korea-portal-fill':'korea','mongolia-first-fill':'mongolia','mongolia-portal-fill':'mongolia','province-fill':'china','province-fragment-fill':'china','china-context':'china'};
 return window.AtlasMotion.queryRegions(map,point,{layers:Object.keys(countries)}).map(f=>countries[f.layer.id]).find(Boolean);
}
map.on('click',event=>{
 if(!allReady)return;
 const country=countryAt(event.point);
 if(!quiz.active&&country&&(country!==atlasMode||countrySwitching)){changeAtlas(country);return;}
 if(countrySwitching||atlasMode!=='china')return;
 const region=pickedRegion(event.point);if(region){if(quiz.active)answerQuiz(region.feature.properties.adcode);else selectRegion(region,region.feature.properties.provinceCode||region.feature.properties.adcode);}
});
map.on('mousemove',event=>{
  if(atlasMode!=='china'||cameraBusy||!allReady||map.isMoving())return;
  const region=pickedRegion(event.point);if(hovered!==region){clearHover();hovered=region;if(region)setRegionState(region,{hover:true});}
  if(!region)return;map.getCanvas().style.cursor='pointer';
  if(quiz.active)return;
  const p=region.feature.properties;tooltip.replaceChildren();const name=document.createElement('div');name.textContent=bilingualName(p);const small=document.createElement('small');small.textContent=kind(p);tooltip.append(name,small);tooltip.hidden=false;
  tooltip.style.left=Math.min(event.point.x+12,map.getContainer().clientWidth-tooltip.offsetWidth-10)+'px';tooltip.style.top=Math.max(8,event.point.y-tooltip.offsetHeight-12)+'px';
});
map.getCanvas().addEventListener('mouseleave',clearHover);
async function loadChina(){
 if(chinaReady)return;if(chinaLoading)return chinaLoading;
 chinaLoading=(async()=>{
  const [display,m,names,administration,population,districts,districtNames,articles,landmarks,provincePop,fillFragments]=await Promise.all([boundaryData(),json('data/manifest.json'),json('data/region-names.json'),json('data/xinjiang-administration.json'),json('data/region-population.json'),json('data/city-districts.bin'),json('data/city-district-names.json'),json('data/region-articles.json'),json('data/landmarks.json'),json('data/province-population.json'),json('data/fill-fragments.bin'),styleReady]);manifest=m;regionNames={...names.regions,...districtNames.regions};xinjiangAdministration=administration;regionPopulation=population;provincePopulation=provincePop;explorer=window.AtlasExplore.createExplorer(articles,landmarks);
  $('retrieved').textContent=new Date(m.retrieved).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  provinceFeatures=display.provinces.features;
  const prefFeatures=display.subdivisions.features.filter(f=>isPrefectureLevel(f.properties));
  const otherFeatures=display.subdivisions.features.filter(f=>!isPrefectureLevel(f.properties));
  const regularFills=features=>featureCollection(features.filter(f=>!fillFragments[f.properties.adcode]));
  const triangleFills=features=>featureCollection(features.filter(f=>fillFragments[f.properties.adcode]).flatMap(f=>fillFragments[f.properties.adcode].coordinates.map(coordinates=>({type:'Feature',properties:{adcode:f.properties.adcode},geometry:{type:'Polygon',coordinates}}))));
  // Only the two repaired fills need unsimplified triangles. Other regions use
  // subpixel tile simplification, retaining every original source coordinate.
  addSource('provinces',regularFills(provinceFeatures));addSource('prefectures',regularFills(prefFeatures));addSource('others',featureCollection(otherFeatures));
  addSource('provinces-fragments',triangleFills(provinceFeatures),fillSourceOptions);addSource('prefectures-fragments',triangleFills(prefFeatures),fillSourceOptions);
  // Simplify line tiles within 0.65 screen pixels and fade subpixel islands.
  // The stored geometry and selectable polygons retain full detail.
  for(const [name,geometry] of Object.entries(display.boundaries))addSource(name+'-boundaries',window.AtlasLines.lineData(geometry),window.AtlasLines.lineSourceOptions);
  for(const [name,collection] of [['provinces',display.provinces],['prefectures',featureCollection(prefFeatures)],['others',featureCollection(otherFeatures)]])addSource(name+'-selection-edges',window.AtlasLines.lineData(collection),window.AtlasLines.lineSourceOptions);
  const colors=['match',['get','adcode']];for(const f of provinceFeatures)colors.push(f.properties.adcode,fillColors[Number(f.properties.adcode)/10000%fillColors.length|0]);colors.push(fillColors[0]);normalProvinceColors=colors;
  addFill('province-fill','provinces',provinceColor(),1);addFill('province-fragment-fill','provinces-fragments',provinceColor(),1);addFill('prefecture-fill','prefectures','#d6b974',.025);addFill('prefecture-fragment-fill','prefectures-fragments','#d6b974',.025);addFill('other-fill','others','#dbc886',.1);
  addLine('prefecture-lines','prefecture-boundaries','#b39a77',.7,window.AtlasLines.adaptiveOpacity(.85));addLine('other-lines','other-boundaries','#9f874e',.7,window.AtlasLines.adaptiveOpacity(.85),[3,3]);
  addSelection('province-selection','provinces');addSelection('prefecture-selection','prefectures');addSelection('other-selection','others');
  addLine('province-lines','province-boundaries','#987343',['interpolate',['linear'],['zoom'],3,.65,8,1.2],window.AtlasLines.adaptiveOpacity(.95));
  addSource('city-districts',districts.regions);
  addSource('city-district-boundaries',window.AtlasLines.lineData(districts.boundaries),window.AtlasLines.lineSourceOptions);
  addSource('city-districts-selection-edges',window.AtlasLines.lineData(districts.regions),window.AtlasLines.lineSourceOptions);
  addFill('city-district-fill','city-districts','#dbc886',.02);
  addLine('city-district-lines','city-district-boundaries','#9f874e',.75,window.AtlasLines.adaptiveOpacity(.9));
  addSelection('city-district-selection','city-districts');
  for(const f of provinceFeatures){const code=f.properties.adcode;provinceLayers.set(code,bindRegion(f,code));}
  for(const f of display.subdivisions.features){const code=f.properties.provinceCode;if(!detailLayers.has(code))detailLayers.set(code,[]);detailLayers.get(code).push(bindRegion(f,code));}
  for(const f of districts.regions.features){const code=f.properties.parentCity;if(!detailLayers.has(code))detailLayers.set(code,[]);detailLayers.get(code).push(bindRegion(f,f.properties.provinceCode));}
  for(const city of administration.missingCities){regionNames[city.adcode]={en:city.en,zh:city.zh,source:city.source,regional:[]};detailLayers.get(650000).push(bindRegion({type:'Feature',properties:{adcode:city.adcode,name:city.zh,provinceCode:650000,level:'city',boundaryAvailable:false},geometry:null},650000));}
  for(const f of [...provinceFeatures].sort((a,b)=>english[a.properties.adcode].localeCompare(english[b.properties.adcode]))){const p=f.properties,o=document.createElement('option');o.value=p.adcode;o.textContent=english[p.adcode]+' · '+p.name;$('province').append(o);}
  syncLayers();
  await motionRenderer.prepare();
  namingQuiz=window.AtlasNameQuiz.createNameQuiz({mark:(code,correct)=>{const layer=regionByCode.get(code);if(layer){setRegionState(layer,{quizCorrect:correct,quizWrong:!correct});if(!quiz.highlighted.includes(layer))quiz.highlighted.push(layer);}},labels:updateLabels,controls,clear:clearQuizHighlights,limit:codes=>{quiz.pool=codes.map(code=>regionByCode.get(code));syncQuizStyle();},exit:configureQuiz,view:code=>viewQuizAnswer(regionByCode.get(code)),focusInput:()=>namingQuiz.focus()});
  placeTools=window.AtlasPlaceTools.createPlaceTools({get:code=>{const layer=regionByCode.get(Number(code))||regionByCode.get(code);return layer?{name:bilingualName(layer.feature.properties)}:null;},select:code=>{const layer=regionByCode.get(Number(code))||regionByCode.get(code);if(layer)selectRegion(layer,layer.feature.properties.provinceCode||layer.feature.properties.adcode);},controls,shareUrl:()=>{const url=new URL(location.href);url.hash=window.AtlasView.hashFor(captureView());return url;}});
  waterDisplay=window.AtlasWater.createWaterDisplay(map,{mode:()=>atlasMode,quiz:()=>quiz.active,load:()=>json('data/major-water.bin')});
  for(const id of ['water-layer'])if($(id).checked)$(id).dispatchEvent(new Event('change'));
  comparison.register('china',{regions:[...provinceLayers.values(),...regionByCode.values()].filter((l,i,a)=>a.findIndex(x=>x.feature.properties.adcode===l.feature.properties.adcode)===i),name:englishName,kind,provincePopulation,regionPopulation});
  $('compare-open').onclick=()=>comparison.open();$('compare-place').onclick=()=>comparison.open(selected?.layer.feature.properties.adcode);
  chinaReady=true;initQuiz();syncLayers();
  for(const f of provinceFeatures)setRegionState(provinceLayers.get(f.properties.adcode),{inactive:atlasMode!=='china'});
  syncCountryFills();syncLayers();
 })().catch(error=>{chinaLoading=null;throw error;});return chinaLoading;
}
async function init(){try{
 await styleReady;
 comparison=(await import('./compare.mjs')).createComparison();
 provincePopulation=await json('data/province-population.json');
 addSource('china-context',await json('data/china-context.bin'),{tolerance:0});
 map.addLayer({id:'china-context',type:'fill',source:'china-context',paint:{'fill-color':'#d7d7d3','fill-antialias':false}});
 if(initialCountry==='china')await loadChina();
 allReady=true;
  koreaAtlas=await window.AtlasKorea.addKoreaPortal(map,{comparison,isBusy:()=>quiz.active||countrySwitching,isMoving:()=>cameraBusy,controls,fit:(bounds,maxZoom,camera={})=>navigateBounds(bounds,{paddingTopLeft:[35,76],paddingBottomRight:[55,55],maxZoom:maxZoom+1,manual:camera.manual===true}),switchAtlas:changeAtlas,returnToChina:()=>changeAtlas('china')});
  mongoliaAtlas=await window.AtlasMongolia.addMongoliaPortal(map,{isBusy:()=>quiz.active||countrySwitching,isMoving:()=>cameraBusy,controls,fit:(bounds,maxZoom,camera={})=>navigateBounds(bounds,{paddingTopLeft:[35,76],paddingBottomRight:[55,55],maxZoom:maxZoom+1,manual:camera.manual===true}),switchAtlas:changeAtlas,returnToChina:()=>changeAtlas('china'),population:p=>provincePopulation.mongolia[p.iso]||provincePopulation.mongolia[provincePopulation.mongoliaAliases[(p.en||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'')]]});
  japanAtlas=await window.AtlasJapan.addJapanPortal(map,{comparison,isBusy:()=>quiz.active||countrySwitching,isMoving:()=>cameraBusy,controls,fit:(bounds,maxZoom,camera={})=>navigateBounds(bounds,{paddingTopLeft:[35,76],paddingBottomRight:[55,55],maxZoom,manual:camera.manual===true}),switchAtlas:changeAtlas});
  const archipelagoHost={isBusy:()=>quiz.active||countrySwitching,isMoving:()=>cameraBusy,controls,fit:(bounds,maxZoom,camera={})=>navigateBounds(bounds,{paddingTopLeft:[35,76],paddingBottomRight:[55,55],maxZoom:maxZoom+1,manual:camera.manual===true}),syncAppearance:()=>satelliteDisplay?.sync()};
  philippinesAtlas=await window.AtlasArchipelago.addArchipelagoPortal(map,archipelagoHost,'philippines');
  indonesiaAtlas=await window.AtlasArchipelago.addArchipelagoPortal(map,archipelagoHost,'indonesia');
  addSource('shared-context-borders',await json('data/shared-context-borders.bin'),window.AtlasLines.lineSourceOptions);
  map.addLayer({id:'shared-context-borders',type:'line',source:'shared-context-borders',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#aaa9a2','line-width':.9,'line-opacity':window.AtlasLines.adaptiveOpacity()}},map.getLayer('province-fill')?'province-fill':undefined);
  satelliteDisplay=window.AtlasSatellite.createSatelliteDisplay(map,{mode:()=>atlasMode,quiz:()=>quiz.active,onVisible:satelliteAppearance,placeControls(){const panel=$(atlasMode==='korea'?'k-layers-panel':atlasMode==='mongolia'?'m-layers-panel':atlasMode==='japan'?'j-layers-panel':atlasMode==='philippines'?'ph-layers-panel':atlasMode==='indonesia'?'id-layers-panel':'layers-panel')?.querySelector('.layers');const block=$('satellite-controls');if(panel&&block.parentElement!==panel)panel.append(block);}});
  satelliteDisplay.sync();if($('satellite-layer').checked)$('satellite-layer').dispatchEvent(new Event('change'));
  const capitalsResponse=await fetch('data/capitals.json');
  if(!capitalsResponse.ok)throw new Error('Capital locations could not load');
  capitalDisplay=window.AtlasCapitals.createCapitalDisplay(map,{mode:()=>atlasMode,quiz:()=>quiz.active},await capitalsResponse.json());


  southAmerica=window.AtlasSouthAmerica.createSouthAmerica(map,{country:()=>atlasMode,isBusy:()=>quiz.active||countrySwitching,switchAtlas:changeAtlas,fit:(bounds,maxZoom,camera={})=>navigateBounds(bounds,{manual:camera.manual===true})});
  window.AtlasDev.mount({eligible:()=>atlasMode==='china'&&!quiz.active&&!countrySwitching&&selected?.layer.feature.properties.adcode===310105});
  window.addEventListener('atlas-developer-change',async()=>{southAmerica.syncDeveloper();if(!window.AtlasDev.enabled&&window.AtlasSouthAmerica.countries[atlasMode])await changeAtlas('china',false);});
  const requestedCountry=window.AtlasEntry.current;
  controls();if(requestedCountry&&requestedCountry!=='china')await changeAtlas(requestedCountry,false);else if(!window.AtlasView.fromHash(location.hash))await followPlaceLink();
  if(!map.loaded())await new Promise(resolve=>map.once('idle',resolve));
  setupViewControls();await restoreView();
  atlasStarting=false;window.AtlasEntry.ready();controls();refreshStatus();updateLabels();
  $('map-loading').hidden=true;
  // Other countries retain only small clickable context silhouettes. Their
  // full datasets load when visited, never as a background startup download.

}catch(e){console.error(e);$('map-loading').hidden=true;$('status').textContent='Map could not load';$('load-error').hidden=false;}}
let viewSaveTimer,viewControlsReady=false;
function captureView(){const center=map.getCenter();return {v:1,country:atlasMode,center:[+center.lng.toFixed(6),+center.lat.toFixed(6)],zoom:+map.getZoom().toFixed(4),selection:atlasMode==='china'?selected?.layer.feature.properties.adcode:currentAtlas()?.getSelection(),scope:currentAtlas()?.getScope?.(),mode:$('mode-province').getAttribute('aria-pressed')==='true'?1:2,locked:$('mode-lock').getAttribute('aria-pressed')==='true',language:window.AtlasLabels.getLanguage(),layers:Object.fromEntries(window.AtlasView.controls.filter(id=>$(id)).map(id=>[id,id==='satellite-opacity'?$(id).value:$(id).checked]))};}
function saveView(force=false){if(!viewControlsReady||atlasStarting||restoringView||quiz.active||(!force&&cameraBusy)||countrySwitching)return;const view=captureView();try{window.AtlasView.write(view,localStorage);}catch{}if(location.hash.includes('/view='))history.replaceState(null,'',location.pathname+location.search+window.AtlasView.hashFor(view));}
function saveViewSoon(){clearTimeout(viewSaveTimer);viewSaveTimer=setTimeout(saveView,180);}
function readSavedView(){try{return window.AtlasView.read(atlasMode,localStorage);}catch{return null;}}
async function restoreView(){
 const shared=window.AtlasView.fromHash(location.hash);
 const saved=shared||(!location.hash.includes('/place=')&&!location.hash.startsWith('#place=')?readSavedView():null);
 if(!saved||saved.country!==atlasMode)return;
 restoringView=true;
 try{
  window.AtlasLabels.setLanguage(saved.language);
  if(atlasMode==='china'){const layer=regionByCode.get(Number(saved.selection))||regionByCode.get(saved.selection);if(layer)await selectRegion(layer,layer.feature.properties.provinceCode||layer.feature.properties.adcode,false);}
  else await currentAtlas().restore(saved.selection,saved.scope);
  for(const [id,value] of Object.entries(saved.layers)){const el=$(id);if(!el)continue;if(id==='satellite-opacity'){el.value=value;el.dispatchEvent(new Event('input'));}else{el.checked=value;el.dispatchEvent(new Event('change'));}}
  $('mode-lock').setAttribute('aria-pressed',String(saved.locked));
  if(atlasMode==='china'){setMode(saved.mode===1?'province':'prefecture');syncLayers();}else currentAtlas().setMode(saved.mode);
  map.jumpTo({center:saved.center,zoom:saved.zoom});updateLabels();
 }finally{restoringView=false;}
}
function setupViewControls(){
 for(const sidebar of document.querySelectorAll('.sidebar:not(.startup-sidebar)')){
  const target=sidebar.querySelector('[id$="layers-panel"]');if(!target)continue;
  const section=document.createElement('section');section.className='view-preferences';
  const label=document.createElement('label');label.textContent='Map label language';
  const select=document.createElement('select');select.dataset.labelLanguage='';select.setAttribute('aria-label','Map label language');
  for(const [value,text] of [['both','Bilingual'],['en','English'],['local','Local language']])select.append(new Option(text,value));
  select.onchange=()=>{window.AtlasLabels.setLanguage(select.value);updateLabels();saveViewSoon();};label.append(select);
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
  if(shared&&allReady&&koreaAtlas&&mongoliaAtlas){if(shared.country!==atlasMode)await changeAtlas(shared.country,false);await restoreView();return;}
  const country=window.AtlasEntry.fromHash(location.hash);
  if(country&&!location.hash.includes('place=')){
    if(!allReady||!koreaAtlas||!mongoliaAtlas||!japanAtlas)return;
    if(cameraBusy){map.once('idle',followPlaceLink);return;}
    if(country===atlasMode)window.AtlasEntry.remember(country);else await changeAtlas(country);return;
  }
  const code=placeTools?.linkCode(),layer=regionByCode.get(Number(code))||regionByCode.get(code);
  if(!allReady||!code||!layer)return;
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
$('label-layer').addEventListener('change',updateLabels);map.on('moveend',updateLabels);
$('mode-province').onclick=()=>{if(atlasMode!=='china')return currentAtlas().setMode(1);if(!countrySwitching){clearHover();setMode('province');syncLayers();updateLabels();}};
$('mode-prefecture').onclick=()=>{if(atlasMode!=='china')return currentAtlas().setMode(2);if(!countrySwitching){clearHover();setMode('prefecture');$('prefecture-layer').checked=true;syncLayers();refreshStatus();}};
$('mode-lock').onclick=()=>{const locked=$('mode-lock').getAttribute('aria-pressed')!=='true';$('mode-lock').setAttribute('aria-pressed',String(locked));$('mode-lock').title=locked?'Unlock selection level':'Lock selection level';};
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
  if(quiz.active)return fitQuizScope(true,camera);
  if(atlasMode!=='china')return currentAtlas().viewParent(camera);
  if(!selected)return reset(camera);
  const p=selected.layer.feature.properties;
  if(p.level==='province')return reset(camera);
  const parent=p.parentCity?regionByCode.get(p.parentCity):provinceLayers.get(p.provinceCode||activeCode);
  return parent?selectRegion(parent,parent.feature.properties.adcode,true,camera):reset(camera);
}
$('zoom-in').onclick=()=>zoomBy(1);$('zoom-out').onclick=()=>zoomBy(-1);$('retry').onclick=()=>location.reload();
$('about-open').onclick=()=>$('about').showModal();$('about-close').onclick=()=>$('about').close();$('about').addEventListener('click',e=>{if(e.target!==$('about'))return;const r=$('about').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('about').close();});
function quizPool(settings={scope:$('quiz-scope').value,includeTaiwan:$('quiz-taiwan').checked}){return AtlasQuiz.candidates([...regionByCode.values()],settings);}
function initQuiz(){
  for(const f of [...provinceFeatures].sort((a,b)=>englishName(a.properties).localeCompare(englishName(b.properties)))){
    const p=f.properties;if(!quizPool({scope:String(p.adcode),includeTaiwan:true}).length)continue;
    const option=document.createElement('option');option.value=p.adcode;option.textContent=bilingualName(p);$('quiz-scope').append(option);
  }
  updateQuizSetup();
}
function updateQuizSetup(){
  if(!allReady)return;
  const naming=$('quiz-type').value==='name';
  $('quiz-scope').options[0].disabled=naming;$('quiz-scope').options[0].textContent=naming?'Choose a province':'All China';
  $('quiz-title').textContent=naming?'Name every prefecture':'Find the prefecture';
  $('quiz-description').textContent=naming?'Choose a province and type every prefecture name. Chinese and English names are accepted.':'Click the named place on the map.';
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
  return layer?navigateBounds(layer.getBounds(),{paddingTopLeft:[30,75],paddingBottomRight:[45,100],maxZoom:regionZoom(layer.feature.properties),manual:camera.manual===true},animate):navigateBounds(homeBounds,{paddingTopLeft:[28,75],paddingBottomRight:[55,100],manual:camera.manual===true},animate);
}
function clearQuizHighlights(preserveCorrect=false){
  const correct=new Set(preserveCorrect?(quiz.round?.results||[]).filter(r=>r.status==='correct').map(r=>r.expected):[]);
  const retained=[];
  for(const layer of new Set(quiz.highlighted)){
    const keep=correct.has(layer.feature.properties.adcode);
    setRegionState(layer,{quizCorrect:keep,quizWrong:false});if(keep)retained.push(layer);
  }
  quiz.highlighted=retained;quiz.reviewLayer=null;clearHover();updateLabels();
}
function syncQuizStyle(){
  // Keep the same paint expression while feature states change during quiz navigation.
  for(const layer of provinceLayers.values())window.AtlasMotion.setFeatureState(map,{source:'provinces',id:layer.feature.properties.adcode},{quizActive:quiz.active});
  const paint=fillPaint(quiz.active?'#e6cda1':'#d6b974',quiz.active ? .65 : .025);
  for(const [property,value] of Object.entries(paint))for(const id of ['prefecture-fill','prefecture-fragment-fill'])map.setPaintProperty(id,property,value);
  const filter=quiz.active?['in',['to-string',['get','adcode']],['literal',quiz.pool.map(l=>String(l.feature.properties.adcode))]]:null;
  for(const id of ['prefecture-fill','prefecture-fragment-fill','prefecture-selection'])map.setFilter(id,filter);
  syncLayers();
  $('map-shell').dataset.quiz=String(quiz.active);$('quiz-map-prompt').hidden=!quiz.active||quiz.type==='name';$('name-map-prompt').hidden=!quiz.active||quiz.type!=='name';$('quiz-crosshair').hidden=true;
  $('home').textContent=quiz.active?'End quiz':'All China';
  $('fit-map').title=quiz.active?'Fit quiz scope':'View parent division';$('fit-map').setAttribute('aria-label',$('fit-map').title);
  map.getCanvas().setAttribute('aria-label',quiz.active?(quiz.type==='name'?'Quiz map. Type prefecture names in the answer field. Correct places turn green.':'Quiz map. Pan with arrow keys and zoom with plus or minus. Press Enter to select the area under the crosshair.'):'Map');
}
async function startQuiz(resume=false){
  if(cameraBusy||!allReady)return;
  const settings={scope:$('quiz-scope').value,includeTaiwan:$('quiz-taiwan').checked},pool=quizPool(settings);if(!pool.length)return;
  if($('quiz-type').value==='name'&&!settings.scope)return;
  namingQuiz?.pause();
  if(!quiz.active)quiz.saved={selected:selected?.layer,activeCode,mode:$('map-shell').dataset.level};
  clearQuizHighlights();clearSelection();clearSearch();
  quiz.settings=settings;quiz.pool=pool;quiz.type=$('quiz-type').value;quiz.round=quiz.type==='name'?{eligible:new Set(pool.map(l=>l.feature.properties.adcode))}:AtlasQuiz.createRound(pool,$('quiz-length').value);quiz.active=true;
  activeCode=Number(settings.scope)||null;$('map-shell').dataset.selected='true';setMode('prefecture');syncQuizStyle();
  $('breadcrumb-region').hidden=false;$('breadcrumb-region').textContent=quizScopeLabel();showPanel('quiz');
  $('quiz-setup').hidden=true;$('quiz-round').hidden=quiz.type==='name';$('quiz-results').hidden=true;$('quiz-naming').hidden=quiz.type!=='name';
  if(quiz.type==='name'){$('map-hint').textContent='Type prefecture names';namingQuiz.start(pool.map(l=>({code:l.feature.properties.adcode,en:englishName(l.feature.properties),zh:l.feature.properties.name,aliases:(l.feature.properties.searchAliases||'').split(/[;,|]/).filter(Boolean)})),settings.scope,quizScopeLabel(),resume);}else renderQuizQuestion();
  updateLabels();controls();if(quiz.type!=='name')scrollToQuizMap();await fitQuizScope();if(quiz.type==='name')namingQuiz.focus();
}
function renderQuizQuestion(){
  const round=quiz.round,p=round.questions[round.index].feature.properties,result=round.results[round.index],score=AtlasQuiz.score(round);
  $('quiz-progress-text').textContent=`Question ${round.index+1} / ${round.questions.length}`;
  $('quiz-score').textContent=`${score.correct} correct`;
  $('quiz-progress-bar').style.width=(score.answered/score.total*100)+'%';
  $('quiz-question').textContent=englishName(p);$('quiz-question-chinese').textContent=p.name;
  $('quiz-question-chinese').lang=p.provinceCode===710000?'zh-Hant':'zh-Hans';
  $('quiz-map-chinese').lang=$('quiz-question-chinese').lang;
  $('quiz-map-progress').textContent=`${round.index+1} / ${round.questions.length}`;
  $('quiz-map-name').textContent=englishName(p);$('quiz-map-chinese').textContent=p.name;
  $('quiz-feedback').hidden=!result;$('quiz-reveal').hidden=!!result;$('quiz-view').hidden=!result;$('quiz-next').hidden=!result;
  $('quiz-next').textContent=round.index+1===round.questions.length?'See results':'Next question';
  $('quiz-map-next').hidden=!result;$('quiz-map-reveal').hidden=!!result;$('quiz-map-feedback').hidden=!result;
  $('quiz-map-next').textContent=round.index+1===round.questions.length?'Results':'Next';
  $('map-hint').textContent=result?'Correct area shown in green':'Click the named place';
  if(result){
    $('quiz-feedback').dataset.status=result.status;
    $('quiz-feedback-title').textContent={correct:'Correct',incorrect:'Incorrect',skipped:'Answer shown'}[result.status];
    $('quiz-map-feedback').textContent=$('quiz-feedback-title').textContent;
    $('quiz-feedback-detail').textContent=result.status==='incorrect'?'You selected '+bilingualName(regionByCode.get(result.chosen).feature.properties)+'.':bilingualName(provinceLayers.get(p.provinceCode).feature.properties);
  }
  controls();
  if(!result)$('quiz-question').focus({preventScroll:true});
}
function answerQuiz(code=null){
  if(!quiz.active||quiz.type==='name'||cameraBusy||!allReady)return;
  const result=AtlasQuiz.answer(quiz.round,code);if(!result)return;
  clearHover();const target=regionByCode.get(result.expected);setRegionState(target,{quizCorrect:true});quiz.highlighted.push(target);quiz.reviewLayer=target;
  if(result.status==='incorrect'){const wrong=regionByCode.get(result.chosen);setRegionState(wrong,{quizWrong:true});quiz.highlighted.push(wrong);}
  renderQuizQuestion();updateLabels();$(matchMedia('(max-width:760px)').matches?'quiz-map-next':'quiz-next').focus({preventScroll:true});
}
async function nextQuizQuestion(){
  if(!quiz.active||cameraBusy||!AtlasQuiz.advance(quiz.round))return;
  clearQuizHighlights(true);
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
  $('quiz-result-detail').textContent=`${score.correct} correct · ${score.incorrect} incorrect · ${score.skipped} answers shown`;
  const review=$('quiz-review');review.replaceChildren();const missed=quiz.round.results.filter(r=>r.status!=='correct');
  if(missed.length){const heading=document.createElement('h3');heading.textContent='Review missed places';review.append(heading);}
  for(const result of missed){const layer=regionByCode.get(result.expected),button=document.createElement('button');button.type='button';button.dataset.quizNav='';
    const name=document.createElement('span');name.textContent=englishName(layer.feature.properties);const chinese=document.createElement('small');chinese.textContent=layer.feature.properties.name;button.append(name,chinese);
    button.onclick=()=>{if(cameraBusy)return;clearQuizHighlights(true);setRegionState(layer,{quizCorrect:true});quiz.highlighted.push(layer);quiz.reviewLayer=layer;updateLabels();viewQuizAnswer(layer);};review.append(button);
  }
  $('map-hint').textContent='Review a place or start another quiz';controls();$('quiz-results-title').focus({preventScroll:true});if(matchMedia('(max-width:760px)').matches)$('quiz-results').scrollIntoView({block:'start',behavior:'instant'});fitQuizScope();
}
function configureQuiz(){
  if(cameraBusy||!allReady)return;
  if(quiz.active){namingQuiz?.pause();clearQuizHighlights();quiz.active=false;syncQuizStyle();const saved=quiz.saved;quiz.round=null;
    if(saved?.selected)selectRegion(saved.selected,saved.selected.feature.properties.provinceCode||saved.selected.feature.properties.adcode,false);
    else{activeCode=null;$('province').value='';$('breadcrumb-region').hidden=true;$('map-shell').dataset.selected='false';setMode(saved?.mode||'province');fitHome(true);}
  }
  $('quiz-naming').hidden=true;$('quiz-setup').hidden=false;$('quiz-round').hidden=true;$('quiz-results').hidden=true;showPanel('quiz');updateQuizSetup();updateLabels();controls();
}
for(const id of ['quiz-type','quiz-scope','quiz-taiwan','quiz-length'])$(id).addEventListener('change',updateQuizSetup);
$('quiz-start').onclick=()=>startQuiz();$('quiz-resume').onclick=()=>startQuiz(true);$('quiz-again').onclick=()=>startQuiz();$('quiz-reveal').onclick=()=>answerQuiz();$('quiz-next').onclick=nextQuizQuestion;
$('quiz-view').onclick=()=>viewQuizAnswer();$('quiz-end').onclick=configureQuiz;$('quiz-configure').onclick=configureQuiz;
$('quiz-map-reveal').onclick=()=>answerQuiz();$('quiz-map-next').onclick=nextQuizQuestion;
map.getCanvas().addEventListener('keydown',event=>{if(event.key==='Enter'&&quiz.active&&!cameraBusy){event.preventDefault();const region=pickedRegion([map.getContainer().clientWidth/2,map.getContainer().clientHeight/2]);if(region)answerQuiz(region.feature.properties.adcode);}});
map.getCanvas().addEventListener('focus',()=>{$('quiz-crosshair').hidden=!quiz.active||quiz.type==='name';});map.getCanvas().addEventListener('blur',()=>{$('quiz-crosshair').hidden=true;});
let previousSize;
new ResizeObserver(()=>{const size=$('map').getBoundingClientRect();if(previousSize&&previousSize.width===size.width&&previousSize.height===size.height)return;previousSize={width:size.width,height:size.height};map.resize();updateLabels();}).observe($('map'));
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'navigate_to_province',description:'Select a province, show its details, and zoom to its boundary. Returns when movement finishes.',inputSchema:{type:'object',properties:{adcode:{type:'integer',enum:Object.keys(english).map(Number)}},required:['adcode'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||!Number.isInteger(input.adcode)||!provinceLayers.has(input.adcode)||!allReady)throw new Error('A loaded province administrative code is required.');if(quiz.active)throw new Error("End the quiz before navigating to a region.");if(cameraBusy)throw new Error('The map is moving. Wait until the current navigation completes.');if(atlasMode!=='china')await changeAtlas('china',false);await selectRegion(provinceLayers.get(input.adcode),input.adcode);return{adcode:input.adcode,name:english[input.adcode]};}})).catch(()=>{});}catch{}}
showPanel('layers');controls();init();
