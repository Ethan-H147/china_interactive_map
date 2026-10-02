const $=id=>document.getElementById(id);
const english={110000:'Beijing',120000:'Tianjin',130000:'Hebei',140000:'Shanxi',150000:'Inner Mongolia',210000:'Liaoning',220000:'Jilin',230000:'Heilongjiang',310000:'Shanghai',320000:'Jiangsu',330000:'Zhejiang',340000:'Anhui',350000:'Fujian',360000:'Jiangxi',370000:'Shandong',410000:'Henan',420000:'Hubei',430000:'Hunan',440000:'Guangdong',450000:'Guangxi',460000:'Hainan',500000:'Chongqing',510000:'Sichuan',520000:'Guizhou',530000:'Yunnan',540000:'Tibet',610000:'Shaanxi',620000:'Gansu',630000:'Qinghai',640000:'Ningxia',650000:'Xinjiang',710000:'Taiwan',810000:'Hong Kong',820000:'Macao'};
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const map=new maplibregl.Map({container:'map',style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#f4f0e7'}}],transition:{duration:0,delay:0}},center:[105,36],zoom:3,minZoom:1,maxZoom:11,maxBounds:[[45,0],[165,68]],renderWorldCopies:false,dragRotate:false,pitchWithRotate:false,touchPitch:false,maxPitch:0,attributionControl:false,canvasContextAttributes:{antialias:true},fadeDuration:0});
map.touchZoomRotate.disableRotation();map.keyboard.disableRotation();
map.addControl(new maplibregl.AttributionControl({compact:false,customAttribution:'Boundaries: <a href="https://datav.aliyun.com/portal/school/atlas/area_selector" target="_blank" rel="noopener">DataV GeoAtlas</a>'}));
const styleReady=new Promise(resolve=>map.once('load',resolve));
const labels=[];
const sourceFor=r=>r.feature.properties.level==='province'?'provinces':isPrefectureLevel(r.feature.properties)?'prefectures':'others';
function setRegionState(region,state){map.setFeatureState({source:sourceFor(region),id:region.feature.properties.adcode},state);}
function layerVisible(id,visible){if(map.getLayer(id))map.setLayoutProperty(id,'visibility',visible?'visible':'none');}
function syncLayers(){
  const pref=$('prefecture-layer').checked,other=$('other-layer').checked,prov=$('province-layer').checked;
  for(const id of ['prefecture-fill','prefecture-lines','prefecture-selection'])layerVisible(id,pref);
  for(const id of ['other-fill','other-lines','other-selection'])layerVisible(id,other);
  for(const id of ['province-lines','annotations'])layerVisible(id,prov);
}
const fillColors=['#efe2c8','#eee6d5','#f2e9d6','#e9ddc3','#f4e6d0','#e9e0ca'];
const provinceLayers=new Map(),detailLayers=new Map(),regionIndex=[];
let regionNames={};
let provinceFeatures,manifest,selected=null,allReady=false,cameraBusy=false,activeCode=null,finishNavigation=null,hovered=null;
const regionByCode=new Map();
const homeBounds=[[73,17.3],[135.5,54]];
const tooltip=document.createElement('div');tooltip.className='region-tooltip gpu-tooltip';tooltip.hidden=true;$('map-shell').append(tooltip);
function clearHover(){if(hovered){setRegionState(hovered,{hover:false});hovered=null;}tooltip.hidden=true;map.getCanvas().style.cursor='';}
map.on('movestart',clearHover);
const shortName=n=>n.replace(/壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市/g,'');
const provinceTypes={110000:'Municipality',120000:'Municipality',310000:'Municipality',500000:'Municipality',150000:'Autonomous Region',450000:'Zhuang Autonomous Region',540000:'Autonomous Region',640000:'Hui Autonomous Region',650000:'Uyghur Autonomous Region',810000:'Special Administrative Region',820000:'Special Administrative Region'};
function englishName(p){return p.level==='province'?english[p.adcode]:regionNames[p.adcode]?.en||p.name;}
function bilingualName(p){return englishName(p)+' · '+p.name;}
function renderRegionNames(p){
  const name=englishName(p);
  $('selection-name').textContent=name;$('selection-name').classList.toggle('long-name',name.length>28);
  $('selection-chinese').textContent=p.name;
  const container=$('selection-regional'),names=regionNames[p.adcode]?.regional||[];
  container.replaceChildren();container.hidden=!names.length;
  for(const n of names){
    const row=document.createElement('div');row.className='regional-name';
    const caption=document.createElement('span');caption.className='name-caption';caption.textContent=n.language;
    const text=document.createElement('p');text.className='regional-text';text.lang=n.lang;text.dir=n.dir;text.dataset.vertical=String(n.vertical);text.textContent=n.text;
    row.append(caption,text);container.append(row);
  }
}
function isPrefectureLevel(p){return p.level==='city'&&String(p.adcode).slice(2,4)!=='90';}
function kind(p){
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
function controls(){document.querySelectorAll('[data-nav]').forEach(el=>el.disabled=cameraBusy||!allReady);}
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
function showPanel(panel){for(const name of ['explore','layers']){$(name+'-panel').hidden=name!==panel;$('tab-'+name).setAttribute('aria-pressed',String(name===panel));}}
function clearSelection(){if(selected){setRegionState(selected.layer,{selected:false});selected=null;}}
function clearSearch(){$('search').value='';$('search-results').hidden=true;$('search-results').replaceChildren();}
function reset(){if(cameraBusy)return;clearSelection();activeCode=null;$('province').value='';$('welcome').hidden=true;$('selection').hidden=true;$('tab-explore').hidden=true;$('breadcrumb-region').hidden=true;$('map-shell').dataset.selected='false';clearSearch();showPanel('layers');setMode('province');return fitHome(true);}
function setStory(code){const s=stories[code]||Object.values(stories).find(s=>s.subdivisionCodes.includes(code));$('story').hidden=!s;$('story-title').textContent=s?.place||'';$('story-text').textContent=s?.text||'';if(s)$('story-source').href=s.source;else $('story-source').removeAttribute('href');}
function renderChildren(code){const children=detailLayers.get(code)||[];$('subdivisions').hidden=!children.length;$('subdivisions').open=false;$('subdivisions-title').textContent=`Subdivisions (${children.length})`;$('region-list').replaceChildren();for(const layer of children){const b=document.createElement('button');b.type='button';b.dataset.nav='';const en=document.createElement('span');en.textContent=englishName(layer.feature.properties);const zh=document.createElement('small');zh.lang='zh';zh.textContent=layer.feature.properties.name;b.append(en,zh);b.onclick=()=>selectRegion(layer,code);$('region-list').append(b);}}
function renderDivisionNote(layer){
  const p=layer.feature.properties,note=$('division-note');note.replaceChildren();note.hidden=true;
  if(p.adcode===650000){
    note.textContent='Some county-level cities are administered directly by Xinjiang. Their territories may have separate areas within surrounding prefectures.';
  }else if(p.provinceCode===650000&&String(p.adcode).slice(2,4)==='90'){
    const count=layer.feature.geometry.type==='MultiPolygon'?layer.feature.geometry.coordinates.length:1;
    note.textContent=(p.adcode===659005?'Beitun is geographically within Altay and administered directly by Xinjiang. ':'Administered directly by Xinjiang. ')+(count>1?`The boundary dataset contains ${count} separate areas.`:'');
    if(p.adcode===659005){const source=document.createElement('a');source.href='https://www.bts.gov.cn/c/2927/2927662.shtml';source.target='_blank';source.rel='noopener';source.textContent='Administrative details';note.append(document.createTextNode(' '),source);}
  }
  note.hidden=!note.textContent;
}
function selectRegion(layer,parentCode,shouldFit=true){
  if(cameraBusy||!allReady)return Promise.resolve(false);
  clearSelection();clearSearch();
  const p=layer.feature.properties,isProvince=p.level==='province',code=isProvince?p.adcode:parentCode;
  activeCode=code;selected={layer};
  if(!isProvince){const id=isPrefectureLevel(p)?'prefecture-layer':'other-layer';$(id).checked=true;syncLayers();}
  setRegionState(layer,{selected:true});clearHover();
  $('province').value=String(code);$('welcome').hidden=true;$('selection').hidden=false;$('tab-explore').hidden=false;showPanel('explore');
  $('selection-kind').textContent=kind(p).toUpperCase();renderRegionNames(p);renderDivisionNote(layer);
  const coverage=manifest.coverage.find(c=>c.adcode===code);
  $('selection-meta').textContent=isProvince?(coverage.unavailable?'Outer boundary only; internal divisions unavailable.':`${coverage.count} mapped subdivisions · ${coverage.levels.district?'district boundaries':'prefectures and direct divisions'}`):`Administrative code ${p.adcode}`;
  $('parent-context').hidden=isProvince;$('parent-region').hidden=isProvince;
  const parent=provinceLayers.get(code).feature.properties;
  $('parent-kind').textContent=kind(parent);
  $('parent-english').textContent=englishName(parent);$('parent-chinese').textContent=parent.name;$('parent-region').setAttribute('aria-label','View '+bilingualName(parent));$('parent-region').onclick=()=>selectRegion(provinceLayers.get(code),code);
  $('breadcrumb-region').hidden=false;$('breadcrumb-region').textContent=isProvince?bilingualName(p):english[code]+' / '+bilingualName(p);$('map-shell').dataset.selected='true';
  setStory(p.adcode);renderChildren(p.adcode);setMode('prefecture');refreshStatus();
  document.querySelector('.sidebar-scroll').scrollTop=0;
  if(shouldFit)return navigateBounds(layer.getBounds(),{paddingTopLeft:[35,70],paddingBottomRight:[55,65],maxZoom:isProvince?8:10});
  updateLabels();return Promise.resolve(true);
}
function bindRegion(feature,parentCode){
  const bounds=new maplibregl.LngLatBounds();
  function extend(c){if(typeof c[0]==='number')bounds.extend(c);else c.forEach(extend);}extend(feature.geometry.coordinates);
  const layer={feature,getBounds:()=>bounds};const p=feature.properties;
  regionIndex.push({layer,parentCode,name:p.name,english:englishName(p),regional:(regionNames[p.adcode]?.regional||[]).map(n=>n.text).join(' '),type:kind(p)});regionByCode.set(p.adcode,layer);return layer;
}
function addLabel(p,text,small){const xy=p.centroid||p.center;if(!xy)return;const div=document.createElement('div');div.className='province-label';div.textContent=text;if(small){const el=document.createElement('small');el.textContent=small;div.append(el);}labels.push(new maplibregl.Marker({element:div,anchor:'center'}).setLngLat(xy).addTo(map));}
function updateLabels(){
  if(cameraBusy)return;
  labels.forEach(label=>label.remove());labels.length=0;if(!$('label-layer').checked||!provinceFeatures)return;
  const candidates=[],occupied=[];
  if(activeCode&&map.getZoom()>=4){for(const layer of detailLayers.get(activeCode)||[]){const p=layer.feature.properties;if((isPrefectureLevel(p)&&$('prefecture-layer').checked)||(!isPrefectureLevel(p)&&$('other-layer').checked))candidates.push([p,p.name,null]);}}
  if(!candidates.length)for(const f of provinceFeatures)candidates.push([f.properties,english[f.properties.adcode],shortName(f.properties.name)]);
  for(const [p,text,small] of candidates){const xy=p.centroid||p.center;if(!xy)continue;const point=map.project(xy),size={x:map.getContainer().clientWidth,y:map.getContainer().clientHeight};if(point.x<25||point.x>size.x-30||point.y<75||point.y>size.y-45)continue;const width=Math.max(text.length*(small?6.6:12),small?small.length*12:0)+14,height=small?38:25;const rect={left:point.x-width/2,right:point.x+width/2,top:point.y-17,bottom:point.y-17+height};if(occupied.some(o=>rect.left<o.right&&rect.right>o.left&&rect.top<o.bottom&&rect.bottom>o.top))continue;occupied.push(rect);addLabel(p,text,small);}
}
function refreshStatus(){const pref=$('prefecture-layer').checked,other=$('other-layer').checked;$('status').textContent=allReady?`34 province-level regions${pref?' · 333 prefectures':''}${other?' · 142 other divisions':''}`:'Loading boundaries…';}
function renderSearch(){
  const query=$('search').value.trim().toLowerCase();const results=$('search-results');results.replaceChildren();results.hidden=!query;if(!query)return;
  const normalize=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  const matches=regionIndex.filter(r=>(r.name+' '+r.english+' '+r.regional+' '+r.layer.feature.properties.adcode).toLowerCase().includes(query)||normalize(r.english).includes(normalize(query))).slice(0,12);
  if(!matches.length){const p=document.createElement('p');p.textContent='No matches. Try an English province name or a Chinese place name.';results.append(p);return;}
  for(const r of matches){const b=document.createElement('button');b.type='button';b.className='search-result';b.dataset.nav='';const strong=document.createElement('strong');strong.textContent=r.english+' · '+r.name;const small=document.createElement('small');small.textContent=r.type+(r.layer.feature.properties.level==='province'?'':' · '+english[r.parentCode]);b.append(strong,small);b.onclick=()=>selectRegion(r.layer,r.parentCode);results.append(b);}
}
for(const [code,s] of Object.entries(stories)){const b=document.createElement('button');b.className='discovery-card';b.type='button';b.dataset.nav='';b.disabled=true;const mark=document.createElement('span');mark.className='region-mark';mark.lang='zh';mark.setAttribute('aria-hidden','true');mark.textContent=s.mark;const content=document.createElement('span');const strong=document.createElement('strong');strong.textContent=s.name;const small=document.createElement('small');small.textContent=s.place;content.append(strong,small);b.append(mark,content);b.onclick=()=>selectRegion(provinceLayers.get(Number(code)),Number(code));$('discovery-cards').append(b);}
async function json(url){const r=await fetch(url);if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json();}
// Zero tolerance preserves every boundary vertex; tiling and triangulation run in workers.
const sourceOptions={type:'geojson',tolerance:0,maxzoom:18,buffer:128};
function addSource(id,data){map.addSource(id,{...sourceOptions,data,promoteId:'adcode'});}
const featureCollection=features=>({type:'FeatureCollection',features});
const feature=geometry=>({type:'Feature',properties:{},geometry});
function addFill(id,source,baseColor,baseOpacity){
  map.addLayer({id,type:'fill',source,paint:{'fill-color':['case',['boolean',['feature-state','selected'],false],'#ca6a45',['boolean',['feature-state','hover'],false],'#d6a34f',baseColor],'fill-opacity':['case',['boolean',['feature-state','selected'],false],.3,['boolean',['feature-state','hover'],false],.35,baseOpacity],'fill-antialias':false}});
}
function addLine(id,source,color,width,opacity=1,dash){const paint={'line-color':color,'line-width':width,'line-opacity':opacity};if(dash)paint['line-dasharray']=dash;map.addLayer({id,type:'line',source,layout:{'line-cap':'round','line-join':'round'},paint});}
function addSelection(id,source){addLine(id,source,'#a43829',1.7,['case',['boolean',['feature-state','selected'],false],1,0]);}
function pickedRegion(point){
  const layers=['province-fill'];if($('map-shell').dataset.level==='prefecture'){if($('prefecture-layer').checked)layers.unshift('prefecture-fill');if($('other-layer').checked)layers.unshift('other-fill');}
  const hits=map.queryRenderedFeatures(point,{layers});
  for(const id of layers){const hit=hits.find(f=>f.layer.id===id);if(hit)return regionByCode.get(Number(hit.properties.adcode));}
}
map.on('click',event=>{if(cameraBusy||!allReady)return;const region=pickedRegion(event.point);if(region)selectRegion(region,region.feature.properties.provinceCode||region.feature.properties.adcode);});
map.on('mousemove',event=>{
  if(cameraBusy||!allReady||map.isMoving())return;
  const region=pickedRegion(event.point);if(hovered!==region){clearHover();hovered=region;if(region)setRegionState(region,{hover:true});}
  if(!region)return;map.getCanvas().style.cursor='pointer';
  const p=region.feature.properties;tooltip.replaceChildren();const name=document.createElement('div');name.textContent=bilingualName(p);const small=document.createElement('small');small.textContent=kind(p);tooltip.append(name,small);tooltip.hidden=false;
  tooltip.style.left=Math.min(event.point.x+12,map.getContainer().clientWidth-tooltip.offsetWidth-10)+'px';tooltip.style.top=Math.max(8,event.point.y-tooltip.offsetHeight-12)+'px';
});
map.getCanvas().addEventListener('mouseleave',clearHover);
async function init(){try{
  const [display,m,names]=await Promise.all([json('data/display-boundaries.json'),json('data/manifest.json'),json('data/region-names.json'),styleReady]);manifest=m;regionNames=names.regions;
  $('retrieved').textContent=new Date(m.retrieved).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  provinceFeatures=display.provinces.features;
  const prefFeatures=display.subdivisions.features.filter(f=>isPrefectureLevel(f.properties));
  const otherFeatures=display.subdivisions.features.filter(f=>!isPrefectureLevel(f.properties));
  addSource('provinces',display.provinces);addSource('prefectures',featureCollection(prefFeatures));addSource('others',featureCollection(otherFeatures));
  for(const [name,geometry] of Object.entries(display.boundaries))addSource(name+'-boundaries',feature(geometry));
  addSource('annotations',display.annotations);
  const colors=['match',['get','adcode']];for(const f of provinceFeatures)colors.push(f.properties.adcode,fillColors[Number(f.properties.adcode)/10000%fillColors.length|0]);colors.push(fillColors[0]);
  addFill('province-fill','provinces',colors,1);addFill('prefecture-fill','prefectures','#d6b974',.025);addFill('other-fill','others','#dbc886',.1);
  addLine('prefecture-lines','prefecture-boundaries','#b39a77',.7,.85);addLine('other-lines','other-boundaries','#9f874e',.7,.85,[3,3]);
  addSelection('province-selection','provinces');addSelection('prefecture-selection','prefectures');addSelection('other-selection','others');
  addLine('province-lines','province-boundaries','#987343',1.2,.95);addLine('annotations','annotations','#987343',1.2,.95);
  for(const f of provinceFeatures){const code=f.properties.adcode;provinceLayers.set(code,bindRegion(f,code));}
  for(const f of display.subdivisions.features){const code=f.properties.provinceCode;if(!detailLayers.has(code))detailLayers.set(code,[]);detailLayers.get(code).push(bindRegion(f,code));}
  for(const f of [...provinceFeatures].sort((a,b)=>english[a.properties.adcode].localeCompare(english[b.properties.adcode]))){const p=f.properties,o=document.createElement('option');o.value=p.adcode;o.textContent=english[p.adcode]+' · '+p.name;$('province').append(o);}
  syncLayers();
  if(!map.loaded())await new Promise(resolve=>map.once('idle',resolve));
  allReady=true;controls();refreshStatus();updateLabels();
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
$('mode-province').onclick=()=>{if(!cameraBusy){clearHover();setMode('province');}};
$('mode-prefecture').onclick=()=>{if(!cameraBusy){clearHover();setMode('prefecture');$('prefecture-layer').checked=true;syncLayers();refreshStatus();}};
$('tab-explore').onclick=()=>showPanel('explore');$('tab-layers').onclick=()=>showPanel('layers');
$('search').addEventListener('input',renderSearch);$('search').addEventListener('keydown',e=>{if(e.key==='Escape')clearSearch();if(e.key==='Enter')$('search-results').querySelector('button')?.click();});
$('surprise').onclick=()=>{if(cameraBusy)return;const codes=Object.keys(stories).map(Number).filter(c=>c!==activeCode);const code=codes[Math.floor(Math.random()*codes.length)];selectRegion(provinceLayers.get(code),code);};
$('home').onclick=reset;$('selection-reset').onclick=reset;$('fit-map').onclick=reset;
function zoomBy(amount){if(cameraBusy||!allReady)return;lockCamera();map.jumpTo({zoom:Math.max(1,Math.min(11,map.getZoom()+amount))});unlockCamera();}
$('zoom-in').onclick=()=>zoomBy(1);$('zoom-out').onclick=()=>zoomBy(-1);$('retry').onclick=()=>location.reload();
$('about-open').onclick=()=>$('about').showModal();$('about-close').onclick=()=>$('about').close();$('about').addEventListener('click',e=>{if(e.target!==$('about'))return;const r=$('about').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('about').close();});
let previousSize;
new ResizeObserver(()=>{const size=$('map').getBoundingClientRect();if(previousSize&&previousSize.width===size.width&&previousSize.height===size.height)return;previousSize={width:size.width,height:size.height};if(cameraBusy){map.stop();finishNavigation?.();}map.resize();if(!selected)fitHome(false);else map.fitBounds(selected.layer.getBounds(),{...navigationOptions({padding:[60,65],maxZoom:selected.layer.feature.properties.level==='province'?8:10}),duration:0});updateLabels();}).observe($('map'));
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'navigate_to_province',description:'Select a province, show its details, and zoom to its boundary. Returns when movement finishes.',inputSchema:{type:'object',properties:{adcode:{type:'integer',enum:Object.keys(english).map(Number)}},required:['adcode'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||!Number.isInteger(input.adcode)||!provinceLayers.has(input.adcode)||!allReady)throw new Error('A loaded province administrative code is required.');if(cameraBusy)throw new Error('The map is moving. Wait until the current navigation completes.');await selectRegion(provinceLayers.get(input.adcode),input.adcode);return{adcode:input.adcode,name:english[input.adcode]};}})).catch(()=>{});}catch{}}
showPanel('layers');controls();init();
