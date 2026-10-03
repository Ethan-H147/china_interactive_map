import {loadCompressed} from './korea-data.mjs';
import {koreaPanel} from './korea-panel.mjs';
import {lineData,adaptiveOpacity,lineSourceOptions} from './adaptive-lines.mjs';
export function createKoreaAtlas(map,host){
 const maplibre=window.maplibregl,home=[[124,33],[131.9,43.1]],countryNames={KP:'North Korea',KR:'South Korea'};
 const template=document.createElement('template');template.innerHTML=koreaPanel;
 const sidebar=template.content.querySelector('aside'),dialog=template.content.querySelector('dialog');
 document.querySelector('.workspace').insertBefore(sidebar,document.getElementById('map-shell'));document.body.append(dialog);
 const $=id=>document.getElementById('k-'+id)||document.getElementById(id);
let data,ready=false,active=false,loading=null,selected=null,hovered=null,mode=1,scope='',labels=[];
const index=new Map();
const nativeName=p=>p.ko+(p.hanja?' · '+p.hanja:'');
const tip=document.createElement('div');tip.className='korea-tooltip';tip.hidden=true;$('map-shell').append(tip);
const state=(f,value)=>{if(f){const source=f.properties.level===1?'korea-first':'korea-second';for(const id of [source,source+'-selection-edges'])map.setFeatureState({source:id,id:f.properties.id},value);}};
function controls(){host.controls();}
function clearHover(){state(hovered,{hover:false});hovered=null;tip.hidden=true;map.getCanvas().style.cursor='';}
function fit(bounds=home,maxZoom=11){return host.fit(bounds,maxZoom);}
function scopeBounds(){if(!scope)return home;return boundsOf(data.first.features.filter(f=>f.properties.country===scope));}
function boundsOf(features){const b=new maplibre.LngLatBounds();features.forEach(f=>{b.extend(f.properties.bounds[0]);b.extend(f.properties.bounds[1]);});return b;}
function panel(name){for(const key of ['layers','explore']){$(key+'-panel').hidden=key!==name;$('tab-'+key).setAttribute('aria-pressed',String(key===name));}}
function setMode(value){mode=value;$('mode-province').setAttribute('aria-pressed',String(value===1));$('mode-prefecture').setAttribute('aria-pressed',String(value===2));$('map-hint').textContent=value===1?'Select a province or city':'Select a city, county or district';clearHover();updateLabels();}
function reset(){if(host.isBusy()||!ready)return;state(selected,{selected:false});selected=null;$('tab-explore').hidden=true;panel('layers');$('breadcrumb-region').hidden=!scope;$('breadcrumb-region').textContent=scope?countryNames[scope]:'';$('province').value='';clearSearch();setMode(1);return fit(scopeBounds(),8);}
function viewParent(){
 if(!active||host.isBusy()||!ready)return;
 if(selected){const parent=index.get(selected.properties.parent);return parent?select(parent):reset();}
 if(scope){scope='';$('country').value='';listRegions();return reset();}
 return fit(home,8);
}
function clearSearch(){$('search').value='';$('search-results').replaceChildren();$('search-results').hidden=true;}
function listRegions(){const select=$('province');select.replaceChildren(new Option('All regions',''));for(const c of ['KP','KR']){if(scope&&scope!==c)continue;const group=document.createElement('optgroup');group.label=countryNames[c];for(const f of data.first.features.filter(f=>f.properties.country===c).sort((a,b)=>a.properties.en.localeCompare(b.properties.en)))group.append(new Option(f.properties.en+' · '+nativeName(f.properties),f.properties.id));select.append(group);}}
function select(f){
 if(!active||host.isBusy()||!ready)return;state(selected,{selected:false});selected=f;state(f,{selected:true});clearHover();clearSearch();
 const p=f.properties,parent=index.get(p.parent);scope=p.country;$('country').value=scope;listRegions();$('province').value=p.level===1?p.id:p.parent;
 $('selection-name').textContent=p.en;$('selection-name').classList.toggle('long-name',p.en.length>28);$('selection-chinese').textContent=p.ko;$('selection-kind').textContent=p.type.toUpperCase();$('selection-country').textContent=countryNames[p.country];
 $('selection-hanja').hidden=!p.hanja;$('selection-hanja-name').textContent=p.hanja||'';$('selection-chinese').classList.toggle('has-hanja',!!p.hanja);
 $('selection-flag').src='vendor/flag-'+p.country.toLowerCase()+'.svg';$('selection-flag').alt='Flag of '+countryNames[p.country];
 const children=data.second.features.filter(f=>f.properties.parent===p.id).sort((a,b)=>a.properties.en.localeCompare(b.properties.en));
 $('selection-meta').textContent=p.id==='KR-36'?'No second-level division':p.level===1?children.length+' mapped subdivisions':p.country==='KP'?'OpenStreetMap boundary':'July 2026 boundary';
 $('parent-context').hidden=!parent;if(parent){$('parent-english').textContent=parent.properties.en;$('parent-chinese').textContent=parent.properties.ko;$('parent-hanja').hidden=!parent.properties.hanja;$('parent-hanja').textContent=parent.properties.hanja||'';$('parent-region').onclick=()=>select(parent);}
 $('subdivisions').hidden=!children.length;$('subdivisions-title').textContent='Subdivisions';$('region-list').replaceChildren();
 for(const child of children){const b=document.createElement('button');b.type='button';b.dataset.nav='';const en=document.createElement('span'),ko=document.createElement('small');en.textContent=child.properties.en;ko.textContent=child.properties.ko;ko.lang='ko';b.append(en,ko);if(child.properties.hanja){const h=document.createElement('small');h.lang='ko-Hani';h.textContent=child.properties.hanja;b.append(h);}b.onclick=()=>select(child);$('region-list').append(b);}
 $('tab-explore').hidden=false;panel('explore');$('breadcrumb-region').hidden=false;$('breadcrumb-region').textContent=p.en;$('prefecture-layer').checked=true;syncLayers();setMode(2);sidebar.querySelector('.sidebar-scroll').scrollTop=0;fit(p.bounds,p.level===1?11:13);
}
function syncLayers(){if(!ready||!active)return;map.setLayoutProperty('korea-first-lines','visibility',$('province-layer').checked?'visible':'none');for(const id of ['korea-second-fill','korea-second-lines','korea-second-selected'])map.setLayoutProperty(id,'visibility',$('prefecture-layer').checked?'visible':'none');updateLabels();}
function updateLabels(){
 if(!active||!ready||host.isBusy())return;labels.forEach(m=>m.remove());labels=[];if(!$('label-layer').checked)return;
 const parent=selected&&(selected.properties.level===1?selected.properties.id:selected.properties.parent);
 const candidates=parent&&mode===2&&$('prefecture-layer').checked?data.second.features.filter(f=>f.properties.parent===parent):data.first.features;
 const occupied=[],w=map.getContainer().clientWidth,h=map.getContainer().clientHeight;
 for(const f of candidates){const p=f.properties,point=map.project(p.center);if(point.x<35||point.x>w-45||point.y<85||point.y>h-55)continue;const width=Math.max(p.en.length*6.7,p.ko.length*12,(p.hanja||'').length*12)+16,rect=[point.x-width/2,point.y-19,point.x+width/2,point.y+(p.hanja?39:22)];if(occupied.some(r=>rect[0]<r[2]&&rect[2]>r[0]&&rect[1]<r[3]&&rect[3]>r[1]))continue;occupied.push(rect);const el=document.createElement('div');el.className='korea-marker';el.textContent=p.en;const ko=document.createElement('small');ko.textContent=p.ko;ko.lang='ko';el.append(ko);if(p.hanja){const hanja=document.createElement('small');hanja.lang='ko-Hani';hanja.textContent=p.hanja;el.append(hanja);}labels.push(new maplibre.Marker({element:el,anchor:'center'}).setLngLat(p.center).addTo(map));}
}
function picked(point){const layers=mode===2&&$('prefecture-layer').checked?['korea-second-fill','korea-first-fill']:['korea-first-fill'];const hits=map.queryRenderedFeatures(point,{layers});for(const id of layers){const hit=hits.find(f=>f.layer.id===id);if(hit)return index.get(hit.properties.id);}}
map.on('click',event=>{if(!active||!ready||host.isBusy())return;const f=picked(event.point);if(f)select(f);});
map.on('mousemove',event=>{if(!active||!ready||host.isBusy()||map.isMoving())return;const f=picked(event.point);if(f!==hovered){clearHover();hovered=f;state(f,{hover:true});}if(!f)return;map.getCanvas().style.cursor='pointer';const p=f.properties;tip.replaceChildren();tip.append(document.createTextNode(p.en+' · '+nativeName(p)));const small=document.createElement('small');small.textContent=p.type+' · '+countryNames[p.country];tip.append(small);tip.hidden=false;tip.style.left=Math.max(8,Math.min(event.point.x+12,map.getContainer().clientWidth-tip.offsetWidth-10))+'px';tip.style.top=Math.max(8,event.point.y-tip.offsetHeight-12)+'px';});
map.on('movestart',clearHover);map.on('moveend',updateLabels);map.on('resize',updateLabels);map.getCanvas().addEventListener('mouseleave',clearHover);
$('search').addEventListener('input',()=>{const q=$('search').value.trim().toLowerCase(),box=$('search-results');box.replaceChildren();box.hidden=!q;if(!q)return;const normalize=s=>s.normalize('NFD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();const matches=[...index.values()].filter(f=>(f.properties.en+' '+nativeName(f.properties)).toLowerCase().includes(q)||normalize(f.properties.en).includes(normalize(q))).slice(0,15);for(const f of matches){const b=document.createElement('button');b.className='search-result';b.dataset.nav='';const strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=f.properties.en+' · '+nativeName(f.properties);small.textContent=f.properties.type+' · '+(index.get(f.properties.parent)?.properties.en||countryNames[f.properties.country]);b.append(strong,small);b.onclick=()=>select(f);box.append(b);}if(!matches.length){const p=document.createElement('p');p.textContent='No matching places.';box.append(p);}});
$('country').onchange=()=>{scope=$('country').value;listRegions();reset();};$('province').onchange=()=>{$('province').value?select(index.get($('province').value)):reset();};
for(const id of ['province-layer','prefecture-layer','label-layer'])$(id).onchange=syncLayers;
$('selection-reset').onclick=()=>{scope='';$('country').value='';listRegions();reset();};
$('tab-explore').onclick=()=>panel('explore');$('tab-layers').onclick=()=>panel('layers');$('about-open').onclick=()=>$('about').showModal();$('about-close').onclick=()=>$('about').close();

async function ensureData(){
 if(ready)return;if(loading)return loading;
 loading=(async()=>{
 data=await loadCompressed('data/korea-boundaries.bin');
 const options={type:'geojson',tolerance:0,maxzoom:18,buffer:128,promoteId:'id',attribution:'<a href="https://sgis.kostat.go.kr" target="_blank" rel="noopener">Statistics Korea SGIS</a> · <a href="https://github.com/vuski/admdongkor" target="_blank" rel="noopener">vuski/admdongkor</a>'};
 for(const level of ['first','second']){for(const f of data[level].features)index.set(f.properties.id,f);map.addSource('korea-'+level,{...options,data:data[level]});map.addSource('korea-'+level+'-selection-edges',{...options,...lineSourceOptions,data:lineData(data[level])});}
 for(const [id,geometry] of Object.entries(data.boundaries))map.addSource('korea-'+id+'-edges',{...lineSourceOptions,data:lineData(geometry)});
 for(const level of ['first','second']){map.addLayer({id:'korea-'+level+'-fill',type:'fill',layout:{visibility:'none'},source:'korea-'+level,paint:{'fill-color':['case',['boolean',['feature-state','selected'],false],level==='first'?'#ead1ba':'#ca6a45',['boolean',['feature-state','hover'],false],'#d6a34f',['match',['get','country'],'KP','#e7d9be','#efe2c8']],'fill-opacity':level==='first'?1:['case',['boolean',['feature-state','selected'],false],.45,['boolean',['feature-state','hover'],false],.4,.01],'fill-antialias':false}});}
 for(const level of ['second','first','countries'])map.addLayer({id:'korea-'+level+'-lines',type:'line',source:'korea-'+level+'-edges',paint:{'line-color':level==='second'?'#ad9775':'#987343','line-width':['interpolate',['linear'],['zoom'],4,level==='second'?.4:.65,8,level==='second'?.65:level==='first'?1.15:1.25],'line-opacity':adaptiveOpacity(level==='second'?.8:1)},layout:{visibility:'none','line-join':'round','line-cap':'round'}});
 for(const level of ['first','second'])map.addLayer({id:'korea-'+level+'-selected',type:'line',layout:{visibility:'none','line-join':'round','line-cap':'round'},source:'korea-'+level+'-selection-edges',paint:{'line-color':'#a43829','line-width':1.8,'line-opacity':adaptiveOpacity(['case',['boolean',['feature-state','selected'],false],1,0])}});

 ready=true;listRegions();controls();
 })().catch(error=>{loading=null;throw error;});return loading;
}
const layerIds=['korea-first-fill','korea-second-fill','korea-second-lines','korea-first-lines','korea-countries-lines','korea-first-selected','korea-second-selected'];
function leave(){active=false;sidebar.hidden=true;labels.forEach(m=>m.remove());labels=[];clearHover();for(const id of layerIds)if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');}
async function enter(){
 if(host.isBusy())return;active=true;sidebar.hidden=false;scope='';state(selected,{selected:false});selected=null;mode=1;panel('layers');$('country').value='';$('tab-explore').hidden=true;
 $('home').textContent='All Korea';$('mode-province').textContent='First level';$('mode-prefecture').textContent='Second level';$('breadcrumb-region').hidden=true;setMode(1);
 $('status').hidden=ready;$('status').textContent='Loading Korea boundaries…';controls();
 try{await Promise.all([ensureData(),fit(home,8)]);if(!active)return;for(const id of layerIds)map.setLayoutProperty(id,'visibility','visible');syncLayers();$('status').hidden=true;updateLabels();controls();}
 catch(error){console.error(error);if(host.isBusy())await new Promise(resolve=>map.once('moveend',resolve));host.returnToChina();}
}
return {enter,leave,updateLabels,get active(){return active;},get ready(){return ready;},select,viewParent,home(){scope='';$('country').value='';listRegions();reset();},fit(){return fit(selected?.properties.bounds||scopeBounds());},setMode,random(){if(!ready||host.isBusy())return;const places=data.second.features.filter(f=>!scope||f.properties.country===scope);select(places[Math.floor(Math.random()*places.length)]);}};
}
