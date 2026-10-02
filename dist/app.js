const $=id=>document.getElementById(id);
const english={110000:'Beijing',120000:'Tianjin',130000:'Hebei',140000:'Shanxi',150000:'Inner Mongolia',210000:'Liaoning',220000:'Jilin',230000:'Heilongjiang',310000:'Shanghai',320000:'Jiangsu',330000:'Zhejiang',340000:'Anhui',350000:'Fujian',360000:'Jiangxi',370000:'Shandong',410000:'Henan',420000:'Hubei',430000:'Hunan',440000:'Guangdong',450000:'Guangxi',460000:'Hainan',500000:'Chongqing',510000:'Sichuan',520000:'Guizhou',530000:'Yunnan',540000:'Tibet',610000:'Shaanxi',620000:'Gansu',630000:'Qinghai',640000:'Ningxia',650000:'Xinjiang',710000:'Taiwan',810000:'Hong Kong',820000:'Macao'};
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const shapeRenderer=L.svg({padding:.5});
const map=L.map('map',{zoomControl:false,attributionControl:true,minZoom:2,maxZoom:12,zoomSnap:.25,renderer:shapeRenderer,trackResize:false,zoomAnimation:!reducedMotion.matches,maxBounds:[[0,45],[68,165]],maxBoundsViscosity:.7});
map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
map.attributionControl.addAttribution('Boundaries: <a href="https://datav.aliyun.com/portal/school/atlas/area_selector" target="_blank" rel="noopener">DataV GeoAtlas</a>');
for(const [name,z] of [['prefecture-shapes',405],['other-shapes',406],['province-stroke',420],['labels',430]]){map.createPane(name);map.getPane(name).classList.add(name);map.getPane(name).style.zIndex=z;}
map.getPane('province-stroke').style.pointerEvents='none';map.getPane('labels').style.pointerEvents='none';
const prefectureRenderer=L.svg({pane:'prefecture-shapes',padding:.5});
const otherRenderer=L.svg({pane:'other-shapes',padding:.5});
const strokeRenderer=L.svg({pane:'province-stroke',padding:.5});
const geoOptions={noClip:true,smoothFactor:0};
function retainWholeBoundary(feature,layer){
  // Leaflet 1.9.4 still culls offscreen polygons with noClip enabled.
  // Keep every projected ring so long drags and flights cannot expose an empty rectangle.
  // This override is scoped to our polygon layers and the vendored Leaflet version.
  if(layer instanceof L.Polygon)layer._clipPoints=function(){this._parts=this._rings;};
}
const fillColors=['#efe2c8','#eee6d5','#f2e9d6','#e9ddc3','#f4e6d0','#e9e0ca'];
function provinceStyle(feature){return{stroke:false,color:'#997544',weight:0,fillColor:fillColors[Number(feature.properties.adcode)/10000%fillColors.length|0],fillOpacity:1};}
const detailStyle={stroke:false,color:'#b39a77',weight:.7,opacity:.85,fillColor:'#d6b974',fillOpacity:.025};
const otherStyle={stroke:false,color:'#9f874e',weight:.7,opacity:.85,dashArray:'3 3',fillColor:'#dbc886',fillOpacity:.1};
const selectedStyle={stroke:true,color:'#a43829',weight:1.7,fillColor:'#ca6a45',fillOpacity:.3};
const provinceLayers=new Map(),detailLayers=new Map(),regionIndex=[];
let activeTooltip=null;
map.on('tooltipopen',event=>{if(cameraBusy){map.closeTooltip(event.tooltip);return;}if(activeTooltip&&activeTooltip!==event.tooltip)map.closeTooltip(activeTooltip);activeTooltip=event.tooltip;});
map.on('movestart',()=>{if(activeTooltip){map.closeTooltip(activeTooltip);activeTooltip=null;}});
const prefectures=L.featureGroup().addTo(map),others=L.featureGroup(),labels=L.layerGroup().addTo(map);
let provinces,outline,provinceFeatures,manifest,selected=null,allReady=false,cameraBusy=false,activeCode=null,finishNavigation=null;
const homeBounds=L.latLngBounds([[17.3,73],[54,135.5]]);
const shortName=n=>n.replace(/壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市/g,'');
function kind(p){if(p.level==='province')return 'Province-level region';if(p.level==='district')return 'District';if(String(p.adcode).slice(2,4)==='90')return 'Directly administered county';return 'Prefecture-level region';}
function baseStyle(layer){return layer.feature.properties.level==='province'?provinceStyle(layer.feature):kind(layer.feature.properties)==='Prefecture-level region'?detailStyle:otherStyle;}
function controls(){document.querySelectorAll('[data-nav]').forEach(el=>el.disabled=cameraBusy||!allReady);}
function setMode(mode){$('map-shell').dataset.level=mode;$('mode-province').setAttribute('aria-pressed',String(mode==='province'));$('mode-prefecture').setAttribute('aria-pressed',String(mode==='prefecture'));$('map-hint').textContent=mode==='province'?'Select a province':'Select a prefecture';}
const interactionNames=['dragging','scrollWheelZoom','doubleClickZoom','touchZoom','boxZoom','keyboard'];
let enabledInteractions=[];
function lockCamera(){
  cameraBusy=true;$('map-shell').setAttribute('aria-busy','true');$('moving-indicator').hidden=false;controls();
  enabledInteractions=interactionNames.filter(name=>map[name]?.enabled());
  enabledInteractions.forEach(name=>map[name].disable());
  for(const region of regionIndex)region.layer.closeTooltip();
}
function unlockCamera(){cameraBusy=false;enabledInteractions.forEach(name=>map[name].enable());enabledInteractions=[];$('map-shell').setAttribute('aria-busy','false');$('moving-indicator').hidden=true;controls();updateLabels();}
function navigateBounds(bounds,options={},animate=true){
  if(cameraBusy)return Promise.resolve(false);
  map.stop();
  if(!animate||reducedMotion.matches){map.fitBounds(bounds,{...options,animate:false,reset:true});updateLabels();return Promise.resolve(true);}
  lockCamera();
  return new Promise(resolve=>{
    let timer;
    const finish=()=>{if(finishNavigation!==finish)return;map.off('moveend',finish);clearTimeout(timer);finishNavigation=null;unlockCamera();resolve(true);};
    finishNavigation=finish;map.once('moveend',finish);
    // A backgrounded tab may pause animation frames; this also releases controls safely.
    timer=setTimeout(()=>{map.stop();map.fitBounds(bounds,{...options,animate:false});finish();},1800);
    map.flyToBounds(bounds,{...options,animate:true,duration:.65,easeLinearity:.25});
  });
}
function fitHome(animate=false){return navigateBounds(homeBounds,{paddingTopLeft:[28,65],paddingBottomRight:[55,65]},animate);}
fitHome();
$('map').addEventListener('wheel',event=>{if(cameraBusy){event.preventDefault();event.stopImmediatePropagation();}},{capture:true,passive:false});
function showPanel(panel){for(const name of ['explore','layers']){$(name+'-panel').hidden=name!==panel;$('tab-'+name).setAttribute('aria-pressed',String(name===panel));}}
function clearSelection(){if(selected){selected.layer.setStyle(baseStyle(selected.layer));selected=null;}}
function clearSearch(){$('search').value='';$('search-results').hidden=true;$('search-results').replaceChildren();}
function reset(){if(cameraBusy)return;clearSelection();activeCode=null;$('province').value='';$('welcome').hidden=false;$('selection').hidden=true;$('breadcrumb-region').hidden=true;$('map-shell').dataset.selected='false';clearSearch();showPanel('explore');setMode('province');return fitHome(true);}
function setStory(code){const s=stories[code];$('story').hidden=!s;if(!s)return;$('story-title').textContent=s.place;$('story-text').textContent=s.text;$('story-source').href=s.source;}
function renderChildren(code){const children=detailLayers.get(code)||[];$('subdivisions').hidden=!children.length;$('subdivisions').open=false;$('subdivisions-title').textContent=`Subdivisions (${children.length})`;$('region-list').replaceChildren();for(const layer of children){const b=document.createElement('button');b.type='button';b.dataset.nav='';b.textContent=layer.feature.properties.name;b.onclick=()=>selectRegion(layer,code);$('region-list').append(b);}}
function selectRegion(layer,parentCode,shouldFit=true){
  if(cameraBusy||!allReady)return Promise.resolve(false);
  clearSelection();clearSearch();
  const p=layer.feature.properties,isProvince=p.level==='province',code=isProvince?p.adcode:parentCode;
  activeCode=code;selected={layer};
  if(!isProvince){const group=kind(p)==='Prefecture-level region'?prefectures:others;const id=group===prefectures?'prefecture-layer':'other-layer';if(!map.hasLayer(group)){group.addTo(map);$(id).checked=true;}}
  layer.setStyle(selectedStyle);
  $('province').value=String(code);$('welcome').hidden=true;$('selection').hidden=false;showPanel('explore');
  $('selection-kind').textContent=kind(p).toUpperCase();$('selection-name').textContent=isProvince?english[code]:p.name;$('selection-chinese').textContent=isProvince?shortName(p.name):english[code];
  const coverage=manifest.coverage.find(c=>c.adcode===code);
  $('selection-meta').textContent=isProvince?(coverage.unavailable?'Outer boundary only; internal divisions unavailable.':`${coverage.count} mapped subdivisions · ${coverage.levels.district?'district boundaries':'prefectures and direct counties'}`):`Administrative code ${p.adcode}`;
  $('parent-region').hidden=isProvince;$('parent-region').textContent='View '+english[code];$('parent-region').onclick=()=>selectRegion(provinceLayers.get(code),code);
  $('breadcrumb-region').hidden=false;$('breadcrumb-region').textContent=isProvince?english[code]:english[code]+' / '+p.name;$('map-shell').dataset.selected='true';
  setStory(code);renderChildren(code);setMode('prefecture');refreshStatus();
  document.querySelector('.sidebar-scroll').scrollTop=0;
  if(shouldFit)return navigateBounds(layer.getBounds(),{paddingTopLeft:[35,70],paddingBottomRight:[55,65],maxZoom:isProvince?8:10});
  updateLabels();return Promise.resolve(true);
}
function bindRegion(feature,layer,parentCode){
  retainWholeBoundary(feature,layer);
  const p=feature.properties;
  const div=document.createElement('div');div.textContent=(english[p.adcode]?english[p.adcode]+' · ':'')+p.name;const small=document.createElement('small');small.textContent=kind(p);div.append(small);
  layer.bindTooltip(div,{sticky:true,className:'region-tooltip',direction:'top',offset:[0,-12]});
  layer.on('click',()=>{if(!cameraBusy)selectRegion(layer,parentCode);});
  layer.on('mouseover',()=>{if(!cameraBusy&&selected?.layer!==layer)layer.setStyle({fillColor:'#d6a34f',fillOpacity:.35});});
  layer.on('mouseout',()=>{if(selected?.layer!==layer)layer.setStyle(baseStyle(layer));});
  layer.on('add',()=>{const path=layer.getElement();if(path){path.setAttribute('aria-label',p.name);path.setAttribute('data-adcode',p.adcode);path.style.vectorEffect='non-scaling-stroke';}});
  regionIndex.push({layer,parentCode,name:p.name,english:english[p.adcode]||'',type:kind(p)});
}
function addLabel(p,text,small){const xy=p.centroid||p.center;if(!xy)return;const div=document.createElement('div');div.textContent=text;if(small){const s=document.createElement('small');s.textContent=small;div.append(s);}labels.addLayer(L.marker([xy[1],xy[0]],{pane:'labels',interactive:false,keyboard:false,icon:L.divIcon({className:'province-label',html:div,iconSize:[150,34],iconAnchor:[75,17]})}));}
function updateLabels(){
  if(cameraBusy)return;
  labels.clearLayers();if(!$('label-layer').checked||!provinceFeatures)return;
  const candidates=[],occupied=[];
  if(activeCode&&map.getZoom()>=5){for(const layer of detailLayers.get(activeCode)||[]){const p=layer.feature.properties;if((kind(p)==='Prefecture-level region'&&$('prefecture-layer').checked)||(kind(p)!=='Prefecture-level region'&&$('other-layer').checked))candidates.push([p,p.name,null]);}}
  if(!candidates.length)for(const f of provinceFeatures)candidates.push([f.properties,english[f.properties.adcode],shortName(f.properties.name)]);
  for(const [p,text,small] of candidates){const xy=p.centroid||p.center;if(!xy)continue;const point=map.latLngToContainerPoint([xy[1],xy[0]]),size=map.getSize();if(point.x<25||point.x>size.x-30||point.y<75||point.y>size.y-45)continue;const width=Math.max(text.length*(small?6.6:12),small?small.length*12:0)+14,height=small?38:25;const rect={left:point.x-width/2,right:point.x+width/2,top:point.y-17,bottom:point.y-17+height};if(occupied.some(o=>rect.left<o.right&&rect.right>o.left&&rect.top<o.bottom&&rect.bottom>o.top))continue;occupied.push(rect);addLabel(p,text,small);}
}
function refreshStatus(){const pref=$('prefecture-layer').checked,other=$('other-layer').checked;$('status').textContent=allReady?`34 province-level regions${pref?' · 333 prefectures':''}${other?' · 142 other divisions':''}`:'Loading boundaries…';}
function renderSearch(){
  const query=$('search').value.trim().toLowerCase();const results=$('search-results');results.replaceChildren();results.hidden=!query;if(!query)return;
  const matches=regionIndex.filter(r=>(r.name+' '+r.english+' '+r.layer.feature.properties.adcode).toLowerCase().includes(query)).slice(0,12);
  if(!matches.length){const p=document.createElement('p');p.textContent='No matches. Try an English province name or a Chinese place name.';results.append(p);return;}
  for(const r of matches){const b=document.createElement('button');b.type='button';b.className='search-result';b.dataset.nav='';const strong=document.createElement('strong');strong.textContent=r.english?r.english+' · '+r.name:r.name;const small=document.createElement('small');small.textContent=r.type+(r.english?'':' · '+english[r.parentCode]);b.append(strong,small);b.onclick=()=>selectRegion(r.layer,r.parentCode);results.append(b);}
}
for(const [code,s] of Object.entries(stories)){const b=document.createElement('button');b.className='discovery-card';b.type='button';b.dataset.nav='';b.disabled=true;const mark=document.createElement('span');mark.className='region-mark';mark.lang='zh';mark.setAttribute('aria-hidden','true');mark.textContent=s.mark;const content=document.createElement('span');const strong=document.createElement('strong');strong.textContent=s.name;const small=document.createElement('small');small.textContent=s.place;content.append(strong,small);b.append(mark,content);b.onclick=()=>selectRegion(provinceLayers.get(Number(code)),Number(code));$('discovery-cards').append(b);}
async function json(url){const r=await fetch(url);if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json();}
async function init(){try{
  const [display,m]=await Promise.all([json('data/display-boundaries.json'),json('data/manifest.json')]);const data=display.provinces;manifest=m;$('retrieved').textContent=new Date(m.retrieved).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  provinceFeatures=data.features.filter(f=>f.properties.name&&f.properties.adcode);
  provinces=L.geoJSON({type:'FeatureCollection',features:provinceFeatures},{...geoOptions,renderer:shapeRenderer,style:provinceStyle,onEachFeature:(f,l)=>{provinceLayers.set(f.properties.adcode,l);bindRegion(f,l,f.properties.adcode);}}).addTo(map);
  const lineLayer=(geometry,renderer,style)=>L.geoJSON(geometry,{...geoOptions,style:{...style,stroke:true,fill:false,lineCap:'round',lineJoin:'round'},interactive:false,renderer});
  outline=L.featureGroup([lineLayer(display.boundaries.province,strokeRenderer,{color:'#987343',weight:1.2,opacity:.95}),lineLayer(display.annotations,strokeRenderer,{color:'#987343',weight:1.2,opacity:.95})]).addTo(map);
  lineLayer(display.boundaries.prefecture,prefectureRenderer,detailStyle).addTo(prefectures);
  lineLayer(display.boundaries.other,otherRenderer,otherStyle).addTo(others);
  for(const f of [...provinceFeatures].sort((a,b)=>english[a.properties.adcode].localeCompare(english[b.properties.adcode]))){const p=f.properties,o=document.createElement('option');o.value=p.adcode;o.textContent=english[p.adcode]+' · '+p.name;$('province').append(o);}
  updateLabels();
  const results=await Promise.allSettled(m.coverage.filter(c=>!c.unavailable).map(async c=>{const d={features:display.subdivisions.features.filter(f=>f.properties.provinceCode===c.adcode)},children=[];for(const feature of d.features){const pref=kind(feature.properties)==='Prefecture-level region';L.geoJSON(feature,{...geoOptions,renderer:pref?prefectureRenderer:otherRenderer,style:pref?detailStyle:otherStyle,onEachFeature:(f,l)=>{children.push(l);bindRegion(f,l,c.adcode);(pref?prefectures:others).addLayer(l);}});}detailLayers.set(c.adcode,children);}));
  if(results.some(r=>r.status==='rejected'))throw new Error('Incomplete boundary data');allReady=true;controls();refreshStatus();updateLabels();
}catch(e){console.error(e);$('status').textContent='Boundary data incomplete';$('load-error').hidden=false;}}
$('province').addEventListener('change',e=>{const code=Number(e.target.value);code?selectRegion(provinceLayers.get(code),code):reset();});
for(const [id,getLayer] of [['province-layer',()=>outline],['prefecture-layer',()=>prefectures],['other-layer',()=>others]])$(id).addEventListener('change',e=>{if(cameraBusy)return;const layer=getLayer();if(layer)e.target.checked?layer.addTo(map):map.removeLayer(layer);if(selected?.layer.feature.properties.level!=='province'&&selected&&!map.hasLayer(selected.layer)){selectRegion(provinceLayers.get(activeCode),activeCode,false);}updateLabels();refreshStatus();});
$('label-layer').addEventListener('change',updateLabels);map.on('moveend',updateLabels);
$('mode-province').onclick=()=>{if(!cameraBusy)setMode('province');};$('mode-prefecture').onclick=()=>{if(!cameraBusy){setMode('prefecture');if(!$('prefecture-layer').checked){$('prefecture-layer').checked=true;prefectures.addTo(map);refreshStatus();}}};
$('tab-explore').onclick=()=>showPanel('explore');$('tab-layers').onclick=()=>showPanel('layers');
$('search').addEventListener('input',renderSearch);$('search').addEventListener('keydown',e=>{if(e.key==='Escape')clearSearch();if(e.key==='Enter')$('search-results').querySelector('button')?.click();});
$('surprise').onclick=()=>{if(cameraBusy)return;const codes=Object.keys(stories).map(Number).filter(c=>c!==activeCode);const code=codes[Math.floor(Math.random()*codes.length)];selectRegion(provinceLayers.get(code),code);};
$('home').onclick=reset;$('selection-reset').onclick=reset;$('fit-map').onclick=reset;
function zoomBy(amount){if(cameraBusy||!allReady)return;lockCamera();map.setZoom(Math.max(2,Math.min(12,map.getZoom()+amount)),{animate:false});unlockCamera();}
$('zoom-in').onclick=()=>zoomBy(1);$('zoom-out').onclick=()=>zoomBy(-1);$('retry').onclick=()=>location.reload();
$('about-open').onclick=()=>$('about').showModal();$('about-close').onclick=()=>$('about').close();$('about').addEventListener('click',e=>{if(e.target!==$('about'))return;const r=$('about').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('about').close();});
let previousSize;
new ResizeObserver(()=>{const size=$('map').getBoundingClientRect();if(previousSize&&previousSize.width===size.width&&previousSize.height===size.height)return;previousSize={width:size.width,height:size.height};if(cameraBusy){map.stop();finishNavigation?.();}map.invalidateSize({pan:false});if(!selected)fitHome(false);else map.fitBounds(selected.layer.getBounds(),{padding:[60,65],maxZoom:selected.layer.feature.properties.level==='province'?8:10,animate:false});updateLabels();}).observe($('map'));
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'navigate_to_province',description:'Select a province, show its details, and zoom to its boundary. Returns when movement finishes.',inputSchema:{type:'object',properties:{adcode:{type:'integer',enum:Object.keys(english).map(Number)}},required:['adcode'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||!Number.isInteger(input.adcode)||!provinceLayers.has(input.adcode)||!allReady)throw new Error('A loaded province administrative code is required.');if(cameraBusy)throw new Error('The map is moving. Wait until the current navigation completes.');await selectRegion(provinceLayers.get(input.adcode),input.adcode);return{adcode:input.adcode,name:english[input.adcode]};}})).catch(()=>{});}catch{}}
controls();init();
