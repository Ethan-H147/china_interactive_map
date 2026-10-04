const $=id=>document.getElementById(id);
const english={110000:'Beijing',120000:'Tianjin',130000:'Hebei',140000:'Shanxi',150000:'Inner Mongolia',210000:'Liaoning',220000:'Jilin',230000:'Heilongjiang',310000:'Shanghai',320000:'Jiangsu',330000:'Zhejiang',340000:'Anhui',350000:'Fujian',360000:'Jiangxi',370000:'Shandong',410000:'Henan',420000:'Hubei',430000:'Hunan',440000:'Guangdong',450000:'Guangxi',460000:'Hainan',500000:'Chongqing',510000:'Sichuan',520000:'Guizhou',530000:'Yunnan',540000:'Tibet',610000:'Shaanxi',620000:'Gansu',630000:'Qinghai',640000:'Ningxia',650000:'Xinjiang',710000:'Taiwan',810000:'Hong Kong',820000:'Macao'};
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const map=new maplibregl.Map({container:'map',style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#f4f0e7'}}],transition:{duration:0,delay:0}},center:[105,36],zoom:3,minZoom:1,maxZoom:16,maxBounds:[[45,0],[165,68]],renderWorldCopies:false,dragRotate:false,pitchWithRotate:false,touchPitch:false,maxPitch:0,attributionControl:false,canvasContextAttributes:{antialias:true},fadeDuration:0});
map.touchZoomRotate.disableRotation();map.keyboard.disableRotation();
map.addControl(new maplibregl.AttributionControl({compact:false,customAttribution:'Boundaries: <a href="https://datav.aliyun.com/portal/school/atlas/area_selector" target="_blank" rel="noopener">DataV</a> · <a href="https://data.gov.tw/dataset/7442" target="_blank" rel="noopener">NLSC</a> · <a href="https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov" target="_blank" rel="noopener">AreaCity</a> · <a href="https://portal.csdi.gov.hk/csdi-webpage/metadata/landsd_rcd_1637221775627_85634/html" target="_blank" rel="noopener">© HK SAR Government</a> · <a href="https://webmap.gis.gov.mo/MapGIS/index.html" target="_blank" rel="noopener">Macao Government</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>'}));
const styleReady=new Promise(resolve=>map.once('load',resolve));
const labels=[];
const sourceFor=r=>r.feature.properties.parentCity?'city-districts':r.feature.properties.level==='province'?'provinces':isPrefectureLevel(r.feature.properties)?'prefectures':'others';
function setRegionState(region,state){if(region.feature.geometry){const source=sourceFor(region);for(const id of [source,source+'-selection-edges'])map.setFeatureState({source:id,id:region.feature.properties.adcode},state);}}
function layerVisible(id,visible){if(map.getLayer(id))map.setLayoutProperty(id,'visibility',visible?'visible':'none');}
const atlasHiddenPaint=new Map();
function atlasLayerVisible(id,visible){
  const layer=map.getLayer(id);if(!layer)return;
  const property=layer.type==='fill'?'fill-opacity':'line-opacity';
  if(visible){if(atlasHiddenPaint.has(id)){map.setPaintProperty(id,property,atlasHiddenPaint.get(id));atlasHiddenPaint.delete(id);}}
  else if(!atlasHiddenPaint.has(id)){atlasHiddenPaint.set(id,map.getPaintProperty(id,property));map.setPaintProperty(id,property,0);}
}
function syncLayers(){
  syncDistrictLayers();
  const ids=['prefecture-fill','prefecture-lines','prefecture-selection','other-fill','other-lines','other-selection','province-selection','province-lines'];
  for(const id of ids)atlasLayerVisible(id,atlasMode==='china');
  if(atlasMode!=='china')return;
  if(quiz.active){for(const id of ['other-fill','other-lines','other-selection','province-selection'])layerVisible(id,false);for(const id of ['prefecture-fill','prefecture-lines','prefecture-selection','province-lines'])layerVisible(id,true);return;}
  const pref=$('prefecture-layer').checked,other=$('other-layer').checked,prov=$('province-layer').checked;
  for(const id of ['prefecture-fill','prefecture-lines','prefecture-selection'])layerVisible(id,pref);
  for(const id of ['other-fill','other-lines','other-selection'])layerVisible(id,other);
  layerVisible('province-lines',prov);
  layerVisible('province-selection',true);
}
const fillColors=['#efe2c8','#eee6d5','#f2e9d6','#e9ddc3','#f4e6d0','#e9e0ca'];
const provinceLayers=new Map(),detailLayers=new Map(),regionIndex=[];
let regionNames={},regionPopulation,xinjiangAdministration,explorer;
const districtCities=new Set([330100,320100,320500,440100,440300]);
function districtScope(){const p=selected?.layer.feature.properties;return p?.parentCity||(districtCities.has(p?.adcode)?p.adcode:null);}
function districtsVisible(){return atlasMode==='china'&&!quiz.active&&!!districtScope()&&$('other-layer').checked&&$('map-shell').dataset.level==='prefecture';}
function syncDistrictLayers(){
  const visible=districtsVisible(),filter=['==',['get','parentCity'],districtScope()||0];
  for(const id of ['city-district-fill','city-district-lines','city-district-selection'])if(map.getLayer(id)){map.setFilter(id,filter);layerVisible(id,visible);}
}
let provinceFeatures,manifest,selected=null,allReady=false,cameraBusy=false,activeCode=null,finishNavigation=null,hovered=null;
const quiz={active:false,round:null,pool:[],saved:null,highlighted:[],reviewLayer:null};
let normalProvinceColors,atlasMode='china',koreaAtlas,capitalDisplay;
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
  const panel=$('population'),record=regionPopulation.regions[p.adcode];
  panel.hidden=!record;
  if(!record)return;
  const format=value=>value===null?'Not reported':value.toLocaleString('en-US');
  $('population-total').textContent=format(record.total);
  $('population-towns').textContent=format(record.towns);
  $('population-core').textContent=format(record.urbanCore);
  const dates={'2020-11-01':'1 November 2020','2020年底':'End of 2020','2020第四季度':'Fourth quarter of 2020'};
  $('population-date').textContent=dates[record.date]||record.date;
  $('population-source').href=regionPopulation.source.revisionUrl;
  $('population-source').title='Wikipedia: '+record.name;
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
  const koreaLoading=atlasMode==='korea'&&!koreaAtlas?.ready;
  document.querySelectorAll('[data-nav]').forEach(el=>el.disabled=cameraBusy||!allReady||koreaLoading||(quiz.active&&!['home','zoom-in','zoom-out','fit-map'].includes(el.id)));
  document.querySelectorAll('[data-quiz-nav]').forEach(el=>el.disabled=cameraBusy||!allReady);
  for(const id of ['tab-explore','tab-layers'])$(id).disabled=quiz.active;
  if(allReady&&!quiz.active)$('quiz-start').disabled=cameraBusy||!quizPool().length;
}
function setMode(mode){$('map-shell').dataset.level=mode;$('mode-province').setAttribute('aria-pressed',String(mode==='province'));$('mode-prefecture').setAttribute('aria-pressed',String(mode==='prefecture'));$('map-hint').textContent=mode==='province'?'Select a province':'Select a subdivision';}
const interactionNames=['dragPan','scrollZoom','doubleClickZoom','touchZoomRotate','boxZoom','keyboard'];
let enabledInteractions=[];
function lockCamera(){
  cameraBusy=true;$('map-shell').setAttribute('aria-busy','true');$('moving-indicator').hidden=false;controls();
  enabledInteractions=interactionNames.filter(name=>map[name]?.isEnabled());
  enabledInteractions.forEach(name=>map[name].disable());
  clearHover();
}
function unlockCamera(){cameraBusy=false;enabledInteractions.forEach(name=>map[name].enable());enabledInteractions=[];$('map-shell').setAttribute('aria-busy','false');$('moving-indicator').hidden=true;controls();updateLabels();}
function navigationOptions(options={}){const top=options.paddingTopLeft||options.padding||[28,65],bottom=options.paddingBottomRight||options.padding||[55,65];return{padding:{left:top[0],top:top[1],right:bottom[0],bottom:bottom[1]},maxZoom:options.maxZoom?options.maxZoom-1:11,retainPadding:false};}
function navigateBounds(bounds,options={},animate=true){
  if(cameraBusy)return Promise.resolve(false);
  map.stop();const cameraOptions=navigationOptions(options);
  if(!animate||reducedMotion.matches){map.fitBounds(bounds,{...cameraOptions,duration:0});updateLabels();return Promise.resolve(true);}
  lockCamera();return new Promise(resolve=>{
    let timer;const finish=()=>{if(finishNavigation!==finish)return;map.off('moveend',finish);clearTimeout(timer);finishNavigation=null;unlockCamera();resolve(true);};
    finishNavigation=finish;map.once('moveend',finish);
    timer=setTimeout(()=>{map.stop();map.fitBounds(bounds,{...cameraOptions,duration:0});finish();},1800);
    map.fitBounds(bounds,{...cameraOptions,duration:650});
  });
}
function fitHome(animate=false){return navigateBounds(homeBounds,{paddingTopLeft:[28,65],paddingBottomRight:[55,65]},animate);}
fitHome();
$('map').addEventListener('wheel',event=>{if(cameraBusy){event.preventDefault();event.stopImmediatePropagation();}},{capture:true,passive:false});
function showPanel(panel){if(quiz.active&&panel!=='quiz')return;for(const name of ['explore','layers','quiz']){$(name+'-panel').hidden=name!==panel;$('tab-'+name).setAttribute('aria-pressed',String(name===panel));}}
function clearSelection(){if(selected){setRegionState(selected.layer,{selected:false});selected=null;}}
function clearSearch(){$('search').value='';$('search-results').hidden=true;$('search-results').replaceChildren();}
function reset(){if(cameraBusy)return;clearSelection();activeCode=null;$('province').value='';$('welcome').hidden=true;$('selection').hidden=true;$('tab-explore').hidden=true;$('breadcrumb-region').hidden=true;$('map-shell').dataset.selected='false';clearSearch();showPanel('layers');setMode('province');syncLayers();return fitHome(true);}
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
function selectRegion(layer,parentCode,shouldFit=true){
  if(cameraBusy||!allReady||quiz.active)return Promise.resolve(false);
  clearSelection();clearSearch();
  const p=layer.feature.properties,isProvince=p.level==='province',code=isProvince?p.adcode:p.provinceCode||parentCode;
  activeCode=code;selected={layer};
  if(!isProvince){const id=isPrefectureLevel(p)?'prefecture-layer':'other-layer';$(id).checked=true;syncLayers();}
  setRegionState(layer,{selected:true});clearHover();
  $('province').value=String(code);$('welcome').hidden=true;$('selection').hidden=false;$('tab-explore').hidden=false;showPanel('explore');
  $('selection-kind').textContent=kind(p).toUpperCase();renderRegionFlag(p);renderRegionNames(p);renderPopulation(p);renderDivisionNote(layer);explorer.render(p.adcode);
  const coverage=manifest.coverage.find(c=>c.adcode===code);
  $('selection-meta').textContent=isProvince?(p.adcode===710000?'22 administrative divisions · 6 special municipalities, 3 cities, 13 counties':p.adcode===820000?'7 parishes · 4 other areas':coverage.unavailable?'Outer boundary only; internal divisions unavailable.':`${(detailLayers.get(code)||[]).filter(l=>l.feature.geometry).length} mapped subdivisions · ${coverage.levels.district?'district boundaries':'prefectures and direct divisions'}`):p.boundaryAvailable===false?'Boundary unavailable':p.provinceCode===820000?'Macao government map area':`Administrative code ${p.officialCode||p.adcode}`;
  $('parent-context').hidden=isProvince;$('parent-region').hidden=isProvince;
  const parentLayer=p.parentCity?regionByCode.get(p.parentCity):provinceLayers.get(code),parent=parentLayer.feature.properties;
  $('parent-kind').textContent=kind(parent);
  $('parent-english').textContent=englishName(parent);$('parent-chinese').textContent=parent.name;$('parent-region').setAttribute('aria-label','View '+bilingualName(parent));$('parent-region').onclick=()=>selectRegion(parentLayer,code);
  $('breadcrumb-region').hidden=false;$('breadcrumb-region').textContent=isProvince?bilingualName(p):english[code]+' / '+(p.parentCity?englishName(parent)+' / ':'')+bilingualName(p);$('map-shell').dataset.selected='true';
  setStory(p.adcode);renderChildren(p.adcode);setMode('prefecture');syncLayers();refreshStatus();
  document.querySelector('.sidebar-scroll').scrollTop=0;
  if(shouldFit&&layer.feature.geometry)return navigateBounds(layer.getBounds(),{paddingTopLeft:[35,70],paddingBottomRight:[55,65],maxZoom:regionZoom(p)});
  updateLabels();return Promise.resolve(true);
}
async function changeAtlas(next,animate=true){
  if(cameraBusy||!allReady||quiz.active||!koreaAtlas||next===atlasMode)return false;
  clearHover();clearSelection();clearSearch();activeCode=null;atlasMode=next;
  document.body.dataset.atlas=next;document.title=next==='korea'?'Korea · 한반도':'China · 中国';
  const korea=next==='korea';
  history.replaceState(null,'',location.pathname+location.search+(korea?'#korea':''));
  document.getElementById('china-sidebar').hidden=korea;
  $('atlas-title-english').textContent=korea?'Korea':'China';$('atlas-title-english').className=korea?'korea-english':'china-english';
  $('atlas-title-local').textContent=korea?'한반도':'中国';$('atlas-title-local').className=korea?'korean-title':'china-chinese';$('atlas-title-local').lang=korea?'ko':'zh';
  $('map').setAttribute('aria-label',korea?'Interactive map of North and South Korea':'Interactive China administrative boundary map');
  $('breadcrumb-region').hidden=true;$('map-shell').dataset.selected='false';
  for(const f of provinceFeatures)map.setFeatureState({source:'provinces',id:f.properties.adcode},{inactive:korea});
  syncLayers();updateLabels();koreaAtlas.context(korea);
  if(korea){await koreaAtlas.enter();}
  else{koreaAtlas.leave();$('province').value='';$('selection').hidden=true;$('tab-explore').hidden=true;showPanel('layers');$('home').textContent='All China';$('mode-province').textContent='Provinces';$('mode-prefecture').textContent='Subdivisions';setMode('province');refreshStatus();controls();if(animate)await fitHome(true);updateLabels();}
  return true;
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
  capitalDisplay?.sync();
  if(cameraBusy)return;
  if(atlasMode==='korea'){labels.forEach(label=>label.remove());labels.length=0;koreaAtlas?.updateLabels();return;}
  labels.forEach(label=>label.remove());labels.length=0;
  if(quiz.active){const layer=quiz.reviewLayer;if(layer){const p=layer.feature.properties;addLabel(p,englishName(p),p.name);}return;}
  if(!$('label-layer').checked||!provinceFeatures)return;
  const candidates=[],occupied=[];
  if(activeCode&&map.getZoom()>=4){for(const layer of detailLayers.get(districtsVisible()?districtScope():activeCode)||[]){const p=layer.feature.properties;if((isPrefectureLevel(p)&&$('prefecture-layer').checked)||(!isPrefectureLevel(p)&&$('other-layer').checked))candidates.push([p,p.name,null]);}}
  if(!candidates.length)for(const f of provinceFeatures)candidates.push([f.properties,english[f.properties.adcode],shortName(f.properties.name)]);
  for(const [p,text,small] of candidates){const xy=p.centroid||p.center;if(!xy)continue;const point=map.project(xy),size={x:map.getContainer().clientWidth,y:map.getContainer().clientHeight};if(point.x<25||point.x>size.x-30||point.y<75||point.y>size.y-45)continue;const width=Math.max(text.length*(small?6.6:12),small?small.length*12:0)+14,height=small?38:25;const rect={left:point.x-width/2,right:point.x+width/2,top:point.y-17,bottom:point.y-17+height};if(occupied.some(o=>rect.left<o.right&&rect.right>o.left&&rect.top<o.bottom&&rect.bottom>o.top))continue;occupied.push(rect);addLabel(p,text,small);}
}
function refreshStatus(){$('status').hidden=allReady;$('status').textContent=allReady?'':'Loading boundaries…';}
function renderSearch(){
  const query=$('search').value.trim().toLowerCase();const results=$('search-results');results.replaceChildren();results.hidden=!query;if(!query)return;
  const normalize=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  const matches=regionIndex.filter(r=>(r.name+' '+(r.layer.feature.properties.searchAliases||'')+' '+r.english+' '+r.regional+' '+r.layer.feature.properties.adcode).toLowerCase().includes(query)||normalize(r.english).includes(normalize(query))).slice(0,12);
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
// Polygon data remains exact. Line tiles omit subpixel detail while zoomed out.
const sourceOptions={type:'geojson',tolerance:0,maxzoom:18,buffer:128};
function addSource(id,data,options={}){map.addSource(id,{...sourceOptions,...options,data,promoteId:'adcode'});}
const featureCollection=features=>({type:'FeatureCollection',features});
const feature=geometry=>({type:'Feature',properties:{},geometry});
function addFill(id,source,baseColor,baseOpacity){
  map.addLayer({id,type:'fill',source,paint:fillPaint(baseColor,baseOpacity)});
}
function fillPaint(baseColor,baseOpacity){return {'fill-color':['case',['boolean',['feature-state','quizCorrect'],false],'#548165',['boolean',['feature-state','quizWrong'],false],'#b44737',['boolean',['feature-state','selected'],false],'#ca6a45',['boolean',['feature-state','hover'],false],'#d6a34f',baseColor],'fill-opacity':['case',['boolean',['feature-state','quizCorrect'],false],.65,['boolean',['feature-state','quizWrong'],false],.55,['boolean',['feature-state','selected'],false],.3,['boolean',['feature-state','hover'],false],.35,baseOpacity],'fill-antialias':false};}
function provinceColor(){return ['case',['boolean',['feature-state','inactive'],false],'#d7d7d3',normalProvinceColors];}
function addLine(id,source,color,width,opacity=1,dash){const paint={'line-color':color,'line-width':width,'line-opacity':opacity};if(dash)paint['line-dasharray']=dash;map.addLayer({id,type:'line',source,layout:{'line-cap':'round','line-join':'round'},paint});}
function addSelection(id,source){addLine(id,source+'-selection-edges',['case',['boolean',['feature-state','quizCorrect'],false],'#38684a','#a43829'],1.7,window.AtlasLines.adaptiveOpacity(['case',['any',['boolean',['feature-state','selected'],false],['boolean',['feature-state','quizCorrect'],false],['boolean',['feature-state','quizWrong'],false]],1,0]));}
function pickedRegion(point){
  if(quiz.active){const hit=map.queryRenderedFeatures(point,{layers:['prefecture-fill']})[0];return hit&&quiz.round.eligible.has(hit.properties.adcode)?regionByCode.get(hit.properties.adcode):undefined;}
  const layers=['province-fill'];if($('map-shell').dataset.level==='prefecture'){if($('prefecture-layer').checked)layers.unshift('prefecture-fill');if($('other-layer').checked)layers.unshift('other-fill');}
  if(districtsVisible())layers.unshift('city-district-fill');
  const hits=map.queryRenderedFeatures(point,{layers});
  for(const id of layers){const hit=hits.find(f=>f.layer.id===id);if(hit)return regionByCode.get(hit.properties.adcode);}
}
map.on('click',event=>{if(cameraBusy||!allReady)return;if(atlasMode==='korea'){if(map.queryRenderedFeatures(event.point,{layers:['province-fill']}).length)changeAtlas('china');return;}const region=pickedRegion(event.point);if(region){if(quiz.active)answerQuiz(region.feature.properties.adcode);else selectRegion(region,region.feature.properties.provinceCode||region.feature.properties.adcode);}});
map.on('mousemove',event=>{
  if(atlasMode!=='china'||cameraBusy||!allReady||map.isMoving())return;
  const region=pickedRegion(event.point);if(hovered!==region){clearHover();hovered=region;if(region)setRegionState(region,{hover:true});}
  if(!region)return;map.getCanvas().style.cursor='pointer';
  if(quiz.active)return;
  const p=region.feature.properties;tooltip.replaceChildren();const name=document.createElement('div');name.textContent=bilingualName(p);const small=document.createElement('small');small.textContent=kind(p);tooltip.append(name,small);tooltip.hidden=false;
  tooltip.style.left=Math.min(event.point.x+12,map.getContainer().clientWidth-tooltip.offsetWidth-10)+'px';tooltip.style.top=Math.max(8,event.point.y-tooltip.offsetHeight-12)+'px';
});
map.getCanvas().addEventListener('mouseleave',clearHover);
async function init(){try{
  const [display,m,names,administration,population,districts,districtNames,articles,landmarks]=await Promise.all([boundaryData(),json('data/manifest.json'),json('data/region-names.json'),json('data/xinjiang-administration.json'),json('data/region-population.json'),json('data/city-districts.bin'),json('data/city-district-names.json'),json('data/region-articles.json'),json('data/landmarks.json'),styleReady]);manifest=m;regionNames={...names.regions,...districtNames.regions};xinjiangAdministration=administration;regionPopulation=population;explorer=window.AtlasExplore.createExplorer(articles,landmarks);
  $('retrieved').textContent=new Date(m.retrieved).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  provinceFeatures=display.provinces.features;
  const prefFeatures=display.subdivisions.features.filter(f=>isPrefectureLevel(f.properties));
  const otherFeatures=display.subdivisions.features.filter(f=>!isPrefectureLevel(f.properties));
  addSource('provinces',display.provinces);addSource('prefectures',featureCollection(prefFeatures));addSource('others',featureCollection(otherFeatures));
  // Simplify line tiles within 0.65 screen pixels and fade subpixel islands.
  // The stored geometry and selectable polygons retain full detail.
  for(const [name,geometry] of Object.entries(display.boundaries))addSource(name+'-boundaries',window.AtlasLines.lineData(geometry),window.AtlasLines.lineSourceOptions);
  for(const [name,collection] of [['provinces',display.provinces],['prefectures',featureCollection(prefFeatures)],['others',featureCollection(otherFeatures)]])addSource(name+'-selection-edges',window.AtlasLines.lineData(collection),window.AtlasLines.lineSourceOptions);
  const colors=['match',['get','adcode']];for(const f of provinceFeatures)colors.push(f.properties.adcode,fillColors[Number(f.properties.adcode)/10000%fillColors.length|0]);colors.push(fillColors[0]);normalProvinceColors=colors;
  addFill('province-fill','provinces',provinceColor(),1);addFill('prefecture-fill','prefectures','#d6b974',.025);addFill('other-fill','others','#dbc886',.1);
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
  if(!map.loaded())await new Promise(resolve=>map.once('idle',resolve));
  allReady=true;initQuiz();controls();refreshStatus();updateLabels();
  koreaAtlas=await window.AtlasKorea.addKoreaPortal(map,{isBusy:()=>cameraBusy,controls,fit:(bounds,maxZoom)=>navigateBounds(bounds,{paddingTopLeft:[35,76],paddingBottomRight:[55,55],maxZoom:maxZoom+1}),switchAtlas:changeAtlas,returnToChina:()=>changeAtlas('china')});
  const capitalsResponse=await fetch('data/capitals.json');
  if(!capitalsResponse.ok)throw new Error('Capital locations could not load');
  capitalDisplay=window.AtlasCapitals.createCapitalDisplay(map,{mode:()=>atlasMode,quiz:()=>quiz.active},await capitalsResponse.json());
  koreaAtlas.warm().catch(error=>console.warn('Korea preload:',error.message));
  controls();if(location.hash==='#korea')changeAtlas('korea');
}catch(e){console.error(e);$('status').textContent='Map could not load';$('load-error').hidden=false;}}
$('province').addEventListener('change',e=>{const code=Number(e.target.value);code?selectRegion(provinceLayers.get(code),code):reset();});
for(const id of ['province-layer','prefecture-layer','other-layer'])$(id).addEventListener('change',()=>{
  if(cameraBusy)return;clearHover();syncLayers();
  if(selected&&selected.layer.feature.properties.level!=='province'){
    const checkbox=isPrefectureLevel(selected.layer.feature.properties)?'prefecture-layer':'other-layer';if(!$(checkbox).checked)selectRegion(provinceLayers.get(activeCode),activeCode,false);
  }
  updateLabels();refreshStatus();
});
$('label-layer').addEventListener('change',updateLabels);map.on('moveend',updateLabels);
$('mode-province').onclick=()=>{if(atlasMode==='korea')return koreaAtlas.setMode(1);if(!cameraBusy){clearHover();setMode('province');syncLayers();updateLabels();}};
$('mode-prefecture').onclick=()=>{if(atlasMode==='korea')return koreaAtlas.setMode(2);if(!cameraBusy){clearHover();setMode('prefecture');$('prefecture-layer').checked=true;syncLayers();refreshStatus();}};
$('tab-explore').onclick=()=>showPanel('explore');$('tab-layers').onclick=()=>showPanel('layers');$('tab-quiz').onclick=()=>{showPanel('quiz');updateQuizSetup();};
$('search').addEventListener('input',renderSearch);$('search').addEventListener('keydown',e=>{if(e.key==='Escape')clearSearch();if(e.key==='Enter')$('search-results').querySelector('button')?.click();});
function randomPlace(){
  if(cameraBusy||!allReady)return;
  const places=regionIndex.filter(r=>r.layer.feature.geometry&&isPrefectureLevel(r.layer.feature.properties)&&r.layer!==selected?.layer);
  if(!places.length)return;
  const {layer}=places[Math.floor(Math.random()*places.length)];
  return selectRegion(layer,layer.feature.properties.provinceCode);
}
$('surprise').onclick=()=>atlasMode==='korea'?koreaAtlas.random():randomPlace();
$('home').onclick=()=>atlasMode==='korea'?koreaAtlas.home():quiz.active?configureQuiz():reset();$('selection-reset').onclick=reset;$('fit-map').onclick=viewParent;
function zoomBy(amount){
  if(cameraBusy||!allReady)return;
  map.stop();const zoom=Math.max(map.getMinZoom(),Math.min(map.getMaxZoom(),map.getZoom()+amount));
  if(zoom===map.getZoom())return;
  if(reducedMotion.matches){map.jumpTo({zoom});updateLabels();return;}
  lockCamera();
  let timer;const finish=()=>{if(finishNavigation!==finish)return;map.off('moveend',finish);clearTimeout(timer);finishNavigation=null;unlockCamera();};
  finishNavigation=finish;map.once('moveend',finish);
  timer=setTimeout(()=>{map.stop();finish();},1200);
  map.easeTo({zoom,duration:350,easing:t=>1-Math.pow(1-t,3)});
}
function viewParent(){
  if(cameraBusy||!allReady)return;
  if(quiz.active)return fitQuizScope();
  if(atlasMode==='korea')return koreaAtlas.viewParent();
  if(!selected)return reset();
  const p=selected.layer.feature.properties;
  if(p.level==='province')return reset();
  const parent=p.parentCity?regionByCode.get(p.parentCity):provinceLayers.get(p.provinceCode||activeCode);
  return parent?selectRegion(parent,parent.feature.properties.adcode):reset();
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
  const scope=$('quiz-scope').value,pool=quizPool(),requested=$('quiz-length').value;
  const count=requested==='all'?pool.length:Math.min(Number(requested),pool.length);
  $('quiz-taiwan-option').hidden=!!scope;
  $('quiz-scope-note').textContent=scope==='710000'?'Taiwan uses its 22 city and county divisions.':'Municipal districts and directly administered county-level divisions are excluded.';
  $('quiz-count').textContent=`${pool.length} places available · ${count} questions`;
  controls();
}
function quizScopeLabel(){return quiz.settings.scope?bilingualName(provinceLayers.get(Number(quiz.settings.scope)).feature.properties):'All China · Taiwan '+(quiz.settings.includeTaiwan?'included':'excluded');}
function scrollToQuizMap(){if(matchMedia('(max-width:760px)').matches)window.scrollTo({top:0,behavior:'instant'});}
function fitQuizScope(animate=true){
  const layer=provinceLayers.get(Number(quiz.settings.scope));
  return layer?navigateBounds(layer.getBounds(),{paddingTopLeft:[30,75],paddingBottomRight:[45,100],maxZoom:regionZoom(layer.feature.properties)},animate):navigateBounds(homeBounds,{paddingTopLeft:[28,75],paddingBottomRight:[55,100]},animate);
}
function clearQuizHighlights(){for(const layer of quiz.highlighted)setRegionState(layer,{quizCorrect:false,quizWrong:false});quiz.highlighted=[];quiz.reviewLayer=null;clearHover();updateLabels();}
function syncQuizStyle(){
  map.setPaintProperty('province-fill','fill-color',quiz.active?'#e9e5dc':fillPaint(provinceColor(),1)['fill-color']);
  const paint=fillPaint(quiz.active?'#e6cda1':'#d6b974',quiz.active ? .65 : .025);
  for(const [property,value] of Object.entries(paint))map.setPaintProperty('prefecture-fill',property,value);
  const filter=quiz.active?['in',['to-string',['get','adcode']],['literal',quiz.pool.map(l=>String(l.feature.properties.adcode))]]:null;
  for(const id of ['prefecture-fill','prefecture-selection'])map.setFilter(id,filter);
  syncLayers();
  $('map-shell').dataset.quiz=String(quiz.active);$('quiz-map-prompt').hidden=!quiz.active;$('quiz-crosshair').hidden=true;
  $('home').textContent=quiz.active?'End quiz':'All China';
  $('fit-map').title=quiz.active?'Fit quiz scope':'View parent division';$('fit-map').setAttribute('aria-label',$('fit-map').title);
  map.getCanvas().setAttribute('aria-label',quiz.active?'Quiz map. Pan with arrow keys and zoom with plus or minus. Press Enter to select the area under the crosshair.':'Map');
}
async function startQuiz(){
  if(cameraBusy||!allReady)return;
  const settings={scope:$('quiz-scope').value,includeTaiwan:$('quiz-taiwan').checked},pool=quizPool(settings);if(!pool.length)return;
  if(!quiz.active)quiz.saved={selected:selected?.layer,activeCode,mode:$('map-shell').dataset.level};
  clearQuizHighlights();clearSelection();clearSearch();
  quiz.settings=settings;quiz.pool=pool;quiz.round=AtlasQuiz.createRound(pool,$('quiz-length').value);quiz.active=true;
  activeCode=Number(settings.scope)||null;$('map-shell').dataset.selected='true';setMode('prefecture');syncQuizStyle();
  $('breadcrumb-region').hidden=false;$('breadcrumb-region').textContent=quizScopeLabel();showPanel('quiz');
  $('quiz-setup').hidden=true;$('quiz-round').hidden=false;$('quiz-results').hidden=true;
  renderQuizQuestion();updateLabels();controls();scrollToQuizMap();await fitQuizScope();
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
  if(!quiz.active||cameraBusy||!allReady)return;
  const result=AtlasQuiz.answer(quiz.round,code);if(!result)return;
  clearHover();const target=regionByCode.get(result.expected);setRegionState(target,{quizCorrect:true});quiz.highlighted.push(target);quiz.reviewLayer=target;
  if(result.status==='incorrect'){const wrong=regionByCode.get(result.chosen);setRegionState(wrong,{quizWrong:true});quiz.highlighted.push(wrong);}
  renderQuizQuestion();updateLabels();$(matchMedia('(max-width:760px)').matches?'quiz-map-next':'quiz-next').focus({preventScroll:true});
}
async function nextQuizQuestion(){
  if(!quiz.active||cameraBusy||!AtlasQuiz.advance(quiz.round))return;
  clearQuizHighlights();
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
    button.onclick=()=>{if(cameraBusy)return;clearQuizHighlights();setRegionState(layer,{quizCorrect:true});quiz.highlighted.push(layer);quiz.reviewLayer=layer;updateLabels();viewQuizAnswer(layer);};review.append(button);
  }
  $('map-hint').textContent='Review a place or start another quiz';controls();$('quiz-results-title').focus({preventScroll:true});if(matchMedia('(max-width:760px)').matches)$('quiz-results').scrollIntoView({block:'start',behavior:'instant'});fitQuizScope();
}
function configureQuiz(){
  if(cameraBusy||!allReady)return;
  if(quiz.active){clearQuizHighlights();quiz.active=false;syncQuizStyle();const saved=quiz.saved;quiz.round=null;
    if(saved?.selected)selectRegion(saved.selected,saved.selected.feature.properties.provinceCode||saved.selected.feature.properties.adcode,false);
    else{activeCode=null;$('province').value='';$('breadcrumb-region').hidden=true;$('map-shell').dataset.selected='false';setMode(saved?.mode||'province');fitHome(true);}
  }
  $('quiz-setup').hidden=false;$('quiz-round').hidden=true;$('quiz-results').hidden=true;showPanel('quiz');updateQuizSetup();updateLabels();controls();
}
for(const id of ['quiz-scope','quiz-taiwan','quiz-length'])$(id).addEventListener('change',updateQuizSetup);
$('quiz-start').onclick=startQuiz;$('quiz-again').onclick=startQuiz;$('quiz-reveal').onclick=()=>answerQuiz();$('quiz-next').onclick=nextQuizQuestion;
$('quiz-view').onclick=()=>viewQuizAnswer();$('quiz-end').onclick=configureQuiz;$('quiz-configure').onclick=configureQuiz;
$('quiz-map-reveal').onclick=()=>answerQuiz();$('quiz-map-next').onclick=nextQuizQuestion;
map.getCanvas().addEventListener('keydown',event=>{if(event.key==='Enter'&&quiz.active&&!cameraBusy){event.preventDefault();const region=pickedRegion([map.getContainer().clientWidth/2,map.getContainer().clientHeight/2]);if(region)answerQuiz(region.feature.properties.adcode);}});
map.getCanvas().addEventListener('focus',()=>{$('quiz-crosshair').hidden=!quiz.active;});map.getCanvas().addEventListener('blur',()=>{$('quiz-crosshair').hidden=true;});
let previousSize;
new ResizeObserver(()=>{const size=$('map').getBoundingClientRect();if(previousSize&&previousSize.width===size.width&&previousSize.height===size.height)return;previousSize={width:size.width,height:size.height};if(cameraBusy){map.stop();finishNavigation?.();}map.resize();if(atlasMode==='korea'){updateLabels();return;}if(quiz.active)fitQuizScope(false);else if(!selected)fitHome(false);else if(selected.layer.feature.geometry)map.fitBounds(selected.layer.getBounds(),{...navigationOptions({padding:[60,65],maxZoom:regionZoom(selected.layer.feature.properties)}),duration:0});updateLabels();}).observe($('map'));
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'navigate_to_province',description:'Select a province, show its details, and zoom to its boundary. Returns when movement finishes.',inputSchema:{type:'object',properties:{adcode:{type:'integer',enum:Object.keys(english).map(Number)}},required:['adcode'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||!Number.isInteger(input.adcode)||!provinceLayers.has(input.adcode)||!allReady)throw new Error('A loaded province administrative code is required.');if(quiz.active)throw new Error("End the quiz before navigating to a region.");if(cameraBusy)throw new Error('The map is moving. Wait until the current navigation completes.');if(atlasMode==='korea')await changeAtlas('china',false);await selectRegion(provinceLayers.get(input.adcode),input.adcode);return{adcode:input.adcode,name:english[input.adcode]};}})).catch(()=>{});}catch{}}
showPanel('layers');controls();init();
