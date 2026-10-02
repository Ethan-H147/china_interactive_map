const $=id=>document.getElementById(id);
const english={110000:'Beijing',120000:'Tianjin',130000:'Hebei',140000:'Shanxi',150000:'Inner Mongolia',210000:'Liaoning',220000:'Jilin',230000:'Heilongjiang',310000:'Shanghai',320000:'Jiangsu',330000:'Zhejiang',340000:'Anhui',350000:'Fujian',360000:'Jiangxi',370000:'Shandong',410000:'Henan',420000:'Hubei',430000:'Hunan',440000:'Guangdong',450000:'Guangxi',460000:'Hainan',500000:'Chongqing',510000:'Sichuan',520000:'Guizhou',530000:'Yunnan',540000:'Tibet',610000:'Shaanxi',620000:'Gansu',630000:'Qinghai',640000:'Ningxia',650000:'Xinjiang',710000:'Taiwan',810000:'Hong Kong',820000:'Macao'};
const map=L.map('map',{zoomControl:false,attributionControl:true,minZoom:2,maxZoom:12,zoomSnap:.25,preferCanvas:true,zoomAnimation:!matchMedia('(prefers-reduced-motion: reduce)').matches});
map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
map.attributionControl.addAttribution('Boundaries: <a href="https://datav.aliyun.com/portal/school/atlas/area_selector" target="_blank" rel="noopener">DataV GeoAtlas</a>');
map.createPane('provinceStroke');map.getPane('provinceStroke').style.zIndex=430;map.getPane('provinceStroke').style.pointerEvents='none';
map.createPane('labels');map.getPane('labels').style.zIndex=440;map.getPane('labels').style.pointerEvents='none';
const strokeRenderer=L.canvas({pane:'provinceStroke',padding:.5});
const fillStyle={color:'#7f9caf',weight:0,fillColor:'#fafcfd',fillOpacity:1};
const detailStyle={color:'#7799ac',weight:.65,opacity:.85,fillColor:'#b9d7e5',fillOpacity:.06};
const otherStyle={color:'#699893',weight:.65,opacity:.8,dashArray:'3 3',fillColor:'#c4ded5',fillOpacity:.08};
let provinces,outline,provinceFeatures,manifest,selected=null,allReady=false;
const prefectures=L.featureGroup().addTo(map),others=L.featureGroup(),labels=L.layerGroup().addTo(map);
const provinceLayers=new Map(),detailLayers=new Map();
const homeBounds=L.latLngBounds([[17.3,73],[54,135.5]]);
function fitHome(){map.fitBounds(homeBounds,{paddingTopLeft:[25,95],paddingBottomRight:[40,65],animate:false});}
fitHome();
const shortName=n=>n.replace(/壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市/g,'');
function kind(p){if(p.level==='province')return 'Province-level region';if(p.level==='district')return 'District';if(String(p.adcode).slice(2,4)==='90')return 'Directly administered county';return 'Prefecture-level region';}
function restoreSelection(){if(selected){selected.layer.setStyle(selected.base);selected=null;}}
function reset(){restoreSelection();$('province').value='';$('selection-kind').textContent='NATIONAL VIEW';$('selection-name').innerHTML='China <span lang="zh">中国</span>';$('selection-description').textContent='Select an outline to see its name and administrative level.';$('selection-meta').textContent='';$('selection-reset').hidden=true;fitHome();updateLabels();}
function selectRegion(layer,parentCode,shouldFit=true){
  restoreSelection();const p=layer.feature.properties,isProvince=p.level==='province';
  const base=isProvince?fillStyle:p.level==='district'||String(p.adcode).slice(2,4)==='90'?otherStyle:detailStyle;
  selected={layer,base};layer.setStyle({fillColor:'#70b8d1',fillOpacity:isProvince?.65:.7,color:'#266f8c',weight:2});
  const code=isProvince?p.adcode:parentCode;$('province').value=String(code);
  $('selection-kind').textContent=kind(p).toUpperCase();$('selection-name').textContent=isProvince?english[code]+' · '+shortName(p.name):p.name;
  const c=manifest?.coverage.find(c=>c.adcode===code);const region=provinceLayers.get(code)?.feature.properties.name;
  $('selection-description').textContent=isProvince?(c?.unavailable?'The source provides the outer outline only; internal divisions are unavailable.':c?.levels.district?`${c.count} district boundaries available in Other subdivisions.`:`${c?.count??0} prefecture-level and directly administered subdivisions in the source.`):`${region} · ${english[code]||''}`;
  $('selection-meta').textContent=`Administrative code ${p.adcode}`;$('selection-reset').hidden=false;
  if(shouldFit)map.fitBounds(layer.getBounds(),{padding:[55,70],maxZoom:isProvince?8:10,animate:false});
  updateLabels();
}
function tooltip(layer,parentCode){const p=layer.feature.properties;const div=document.createElement('div');div.textContent=(english[p.adcode]?english[p.adcode]+' · ':'')+p.name;const sub=document.createElement('small');sub.textContent=kind(p);div.append(sub);layer.bindTooltip(div,{sticky:true,className:'region-tooltip'});layer.on('click',()=>selectRegion(layer,parentCode));layer.on('mouseover',()=>{if(selected?.layer!==layer)layer.setStyle({fillColor:'#8fc9dc',fillOpacity:.45});});layer.on('mouseout',()=>{if(selected?.layer!==layer)layer.setStyle(p.level==='province'?fillStyle:(kind(p)==='Prefecture-level region'?detailStyle:otherStyle));});}
function addLabel(p,text,small){const xy=p.centroid||p.center;if(!xy)return;const div=document.createElement('div');div.textContent=text;if(small){const s=document.createElement('small');s.textContent=small;div.append(s);}labels.addLayer(L.marker([xy[1],xy[0]],{pane:'labels',interactive:false,keyboard:false,icon:L.divIcon({className:'province-label',html:div,iconSize:[140,30],iconAnchor:[70,15]})}));}
function updateLabels(){
  labels.clearLayers();if(!$('label-layer').checked||!provinceFeatures)return;
  const code=Number($('province').value),candidates=[],occupied=[];
  if(code&&detailLayers.has(code)){
    for(const layer of detailLayers.get(code)){const p=layer.feature.properties;if((kind(p)==='Prefecture-level region'&&$('prefecture-layer').checked)||(kind(p)!=='Prefecture-level region'&&$('other-layer').checked))candidates.push([p,p.name,null]);}
  }
  if(!candidates.length)for(const f of provinceFeatures)candidates.push([f.properties,english[f.properties.adcode],shortName(f.properties.name)]);
  for(const [p,text,small] of candidates){
    const xy=p.centroid||p.center;if(!xy)continue;
    const point=map.latLngToContainerPoint([xy[1],xy[0]]),size=map.getSize();
    if(point.x<20||point.x>size.x-20||point.y<85||point.y>size.y-45)continue;
    const width=Math.max(text.length*(small?6.2:12),small?small.length*12:0)+12,height=small?35:22;
    const rect={left:point.x-width/2,right:point.x+width/2,top:point.y-15,bottom:point.y-15+height};
    if(occupied.some(o=>rect.left<o.right&&rect.right>o.left&&rect.top<o.bottom&&rect.bottom>o.top))continue;
    occupied.push(rect);addLabel(p,text,small);
  }
}
function refreshStatus(){const pref=$('prefecture-layer').checked,other=$('other-layer').checked;$('status').textContent=allReady?`34 province-level regions${pref?' · 333 prefectures':''}${other?' · 142 other subdivisions':''}`:'Loading prefecture boundaries…';}
async function json(url){const r=await fetch(url);if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json();}
async function init(){try{
  const [data,m]=await Promise.all([json('data/provinces.json'),json('data/manifest.json')]);manifest=m;
  $('retrieved').textContent=new Date(m.retrieved).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  provinceFeatures=data.features.filter(f=>f.properties.name&&f.properties.adcode);
  provinces=L.geoJSON({type:'FeatureCollection',features:provinceFeatures},{style:fillStyle,onEachFeature:(f,l)=>{provinceLayers.set(f.properties.adcode,l);tooltip(l,f.properties.adcode);}}).addTo(map);
  outline=L.geoJSON(data,{style:{color:'#375a72',weight:1.45,fill:false,opacity:.9},interactive:false,renderer:strokeRenderer}).addTo(map);
  for(const f of [...provinceFeatures].sort((a,b)=>english[a.properties.adcode].localeCompare(english[b.properties.adcode]))){const p=f.properties;const o=document.createElement('option');o.value=p.adcode;o.textContent=english[p.adcode]+' · '+p.name;$('province').append(o);}
  $('province').disabled=false;updateLabels();
  const results=await Promise.allSettled(m.coverage.filter(c=>!c.unavailable).map(async c=>{const d=await json('data/'+c.adcode+'.json');const layers=[];L.geoJSON(d,{style:f=>kind(f.properties)==='Prefecture-level region'?detailStyle:otherStyle,onEachFeature:(f,l)=>{layers.push(l);tooltip(l,c.adcode);(kind(f.properties)==='Prefecture-level region'?prefectures:others).addLayer(l);}});detailLayers.set(c.adcode,layers);}));
  if(results.some(r=>r.status==='rejected'))throw new Error('Incomplete boundary data');
  allReady=true;refreshStatus();updateLabels();
}catch(e){console.error(e);$('status').textContent='Boundary data incomplete';$('load-error').hidden=false;}}
$('province').addEventListener('change',e=>{const l=provinceLayers.get(Number(e.target.value));l?selectRegion(l,Number(e.target.value)):reset();});
for(const [id,getLayer] of [['province-layer',()=>outline],['prefecture-layer',()=>prefectures],['other-layer',()=>others]])$(id).addEventListener('change',e=>{const layer=getLayer();if(layer)e.target.checked?layer.addTo(map):map.removeLayer(layer);if(selected&&!map.hasLayer(selected.layer)&&selected.layer.feature.properties.level!=='province')restoreSelection();updateLabels();refreshStatus();});
$('label-layer').addEventListener('change',updateLabels);map.on('zoomend moveend resize',updateLabels);
$('home').onclick=reset;$('selection-reset').onclick=reset;$('zoom-in').onclick=()=>map.zoomIn();$('zoom-out').onclick=()=>map.zoomOut();$('retry').onclick=()=>location.reload();
$('about-open').onclick=()=>$('about').showModal();$('about-close').onclick=()=>$('about').close();$('about').addEventListener('click',e=>{if(e.target===$('about')&&e.offsetX>=0&&e.offsetY>=0){const r=$('about').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('about').close();}});
new ResizeObserver(()=>{map.invalidateSize();if(!selected)fitHome();}).observe($('map'));
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'navigate_to_province',description:'Select a province-level region and fit its boundary on the map.',inputSchema:{type:'object',properties:{adcode:{type:'integer',enum:Object.keys(english).map(Number)}},required:['adcode'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||!Number.isInteger(input.adcode)||!provinceLayers.has(input.adcode))throw new Error('A loaded province administrative code is required.');selectRegion(provinceLayers.get(input.adcode),input.adcode);return{adcode:input.adcode,name:english[input.adcode]};}})).catch(()=>{});}catch{}}
init();
