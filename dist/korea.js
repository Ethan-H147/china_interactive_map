import {koreaComparisonProfile} from './compare.mjs';
import {koreaPanel} from './korea-panel.mjs';
import {adaptiveOpacity,lineSourceOptions,setLayerVisible} from './adaptive-lines.mjs';
export function createKoreaAtlas(map,host){
 const maplibre=window.maplibregl,home=[[124,33],[131.9,43.1]],countryNames={KP:'North Korea',KR:'South Korea'};
 const template=document.createElement('template');template.innerHTML=koreaPanel;
 const sidebar=template.content.querySelector('aside'),dialog=template.content.querySelector('dialog');
 document.querySelector('.workspace').insertBefore(sidebar,document.getElementById('map-shell'));document.body.append(dialog);
 const $=id=>document.getElementById('k-'+id)||document.getElementById(id);
let data,ready=false,active=false,loading=null,selected=null,hovered=null,mode=1,scope='',labels=[];
const index=new Map();
const sourceUrls=[];
function showLayer(id,visible){setLayerVisible(map,id,visible);}
const nativeName=p=>p.ko+(p.hanja?' · '+p.hanja:'');
const tip=document.createElement('div');tip.className='korea-tooltip';tip.hidden=true;$('map-shell').append(tip);
const state=(f,value)=>{if(f){const source=f.properties.level===1?'korea-first':'korea-second';for(const id of [source,source+'-selection-edges'])window.AtlasMotion.setFeatureState(map,{source:id,id:f.properties.id},value);}};
function controls(){host.controls();}
function clearHover(){state(hovered,{hover:false});hovered=null;tip.hidden=true;map.getCanvas().style.cursor='';}
function fit(bounds=home,maxZoom=11,camera={}){return host.fit(bounds,maxZoom,camera);}
function scopeBounds(){if(!scope)return home;return boundsOf(data.first.features.filter(f=>f.properties.country===scope));}
function boundsOf(features){const b=new maplibre.LngLatBounds();features.forEach(f=>{b.extend(f.properties.bounds[0]);b.extend(f.properties.bounds[1]);});return b;}
function panel(name){for(const key of ['layers','explore']){$(key+'-panel').hidden=key!==name;$('tab-'+key).setAttribute('aria-pressed',String(key===name));}}
function setMode(value,automatic=false){if(automatic&&$('mode-lock')?.getAttribute?.('aria-pressed')==='true')value=$('mode-province').getAttribute('aria-pressed')==='true'?1:2;mode=value;$('mode-province').setAttribute('aria-pressed',String(value===1));$('mode-prefecture').setAttribute('aria-pressed',String(value===2));$('map-hint').textContent=value===1?'Select a province or city':'Select a city, county or district';clearHover();updateLabels();}
function reset(camera={}){if(host.isBusy()||!ready)return;state(selected,{selected:false});selected=null;$('tab-explore').hidden=true;panel('layers');$('breadcrumb-region').hidden=!scope;$('breadcrumb-region').textContent=scope?countryNames[scope]:'';$('province').value='';clearSearch();setMode(1,true);return fit(scopeBounds(),8,camera);}
function viewParent(camera={}){
 if(!active||host.isBusy()||!ready)return;
 if(selected){const parent=index.get(selected.properties.parent);return parent?select(parent,true,camera):reset(camera);}
 if(scope){scope='';$('country').value='';listRegions();return reset(camera);}
 return fit(home,8,camera);
}
function clearSearch(){$('search').value='';$('search-results').replaceChildren();$('search-results').hidden=true;}
function listRegions(){const select=$('province');select.replaceChildren(new Option('All regions',''));for(const c of ['KP','KR']){if(scope&&scope!==c)continue;const group=document.createElement('optgroup');group.label=countryNames[c];for(const f of data.first.features.filter(f=>f.properties.country===c).sort((a,b)=>a.properties.en.localeCompare(b.properties.en)))group.append(new Option(f.properties.en+' · '+nativeName(f.properties),f.properties.id));select.append(group);}}
function select(f,shouldFit=true,camera={}){
 if(!active||host.isBusy()||!ready)return;state(selected,{selected:false});selected=f;state(f,{selected:true});clearHover();clearSearch();
 const p=f.properties,parent=index.get(p.parent);scope=p.country;$('country').value=scope;listRegions();$('province').value=p.level===1?p.id:p.parent;window.AtlasStatistics.renderStatistics($('selection-meta'),'korea:'+p.id);
 $('selection-name').textContent=p.en;$('selection-name').classList.toggle('long-name',p.en.length>28);$('selection-chinese').textContent=p.ko;$('selection-kind').textContent=p.type.toUpperCase();$('selection-country').textContent=countryNames[p.country];
 $('selection-hanja').hidden=!p.hanja;$('selection-hanja-name').textContent=p.hanja||'';$('selection-chinese').classList.toggle('has-hanja',!!p.hanja);
 $('selection-flag').src='vendor/flag-'+p.country.toLowerCase()+'.svg';$('selection-flag').alt='Flag of '+countryNames[p.country];
 const children=data.second.features.filter(f=>f.properties.parent===p.id).sort((a,b)=>a.properties.en.localeCompare(b.properties.en));
 $('selection-meta').textContent=p.id==='KR-36'?'No second-level division':p.level===1?children.length+' mapped subdivisions':p.country==='KP'?'OpenStreetMap boundary':'July 2026 boundary';
 $('parent-context').hidden=!parent;if(parent){$('parent-english').textContent=parent.properties.en;$('parent-chinese').textContent=parent.properties.ko;$('parent-hanja').hidden=!parent.properties.hanja;$('parent-hanja').textContent=parent.properties.hanja||'';$('parent-region').onclick=()=>select(parent);}
 $('subdivisions').hidden=!children.length;$('subdivisions-title').textContent='Subdivisions';$('region-list').replaceChildren();
 for(const child of children){const b=document.createElement('button');b.type='button';b.dataset.nav='';const en=document.createElement('span'),ko=document.createElement('small');en.textContent=child.properties.en;ko.textContent=child.properties.ko;ko.lang='ko';b.append(en,ko);if(child.properties.hanja){const h=document.createElement('small');h.lang='ko-Hani';h.textContent=child.properties.hanja;b.append(h);}b.onclick=()=>select(child);$('region-list').append(b);}
 $('tab-explore').hidden=false;panel('explore');$('breadcrumb-region').hidden=false;$('breadcrumb-region').textContent=p.en;$('prefecture-layer').checked=true;syncLayers();setMode(2,true);sidebar.querySelector('.sidebar-scroll').scrollTop=0;return shouldFit?fit(p.bounds,p.level===1?11:13,camera):Promise.resolve();
}
function syncLayers(){
 if(!ready)return;
 for(const id of layerIds){
  const enabled=id==='korea-first-lines'?$('province-layer').checked:id.includes('-second-')?$('prefecture-layer').checked:true;
  showLayer(id,active&&enabled);
 }
 updateLabels();
}
let labelFrame;
function updateLabels(){
 if(labelFrame!==undefined)return;
 labelFrame=requestAnimationFrame(()=>{labelFrame=undefined;renderLabels();});
}
function renderLabels(){
 if(!active||!ready||host.isBusy()||host.isMoving?.())return;labels.forEach(m=>m.remove());labels=[];if(!$('label-layer').checked)return;
 const parent=selected&&(selected.properties.level===1?selected.properties.id:selected.properties.parent);
 const candidates=parent&&mode===2&&$('prefecture-layer').checked?data.second.features.filter(f=>f.properties.parent===parent):data.first.features;
 const visible=selected&&!candidates.includes(selected)?[selected,...candidates]:candidates;
 labels=window.AtlasLabels.render(map,visible.filter(f=>f.properties.center).map(f=>({id:f.properties.id,center:f.properties.center,en:f.properties.en,local:f.properties.ko,selected:f===selected})),'korea-marker');

}
function picked(point){const layers=mode===2&&$('prefecture-layer').checked?['korea-second-fill','korea-first-fill']:['korea-first-fill'];const hits=window.AtlasMotion.queryRegions(map,point,{layers});for(const id of layers){const hit=hits.find(f=>f.layer.id===id);if(hit)return index.get(hit.properties.id);}}
map.on('click',event=>{if(!active||!ready||host.isBusy())return;const f=picked(event.point);if(f)select(f);});
map.on('mousemove',event=>{if(!active||!ready||host.isBusy()||map.isMoving())return;const f=picked(event.point);if(f!==hovered){clearHover();hovered=f;state(f,{hover:true});}if(!f)return;map.getCanvas().style.cursor='pointer';const p=f.properties;tip.replaceChildren();tip.append(document.createTextNode(p.en+' · '+nativeName(p)));const small=document.createElement('small');small.textContent=p.type+' · '+countryNames[p.country];tip.append(small);tip.hidden=false;tip.style.left=Math.max(8,Math.min(event.point.x+12,map.getContainer().clientWidth-tip.offsetWidth-10))+'px';tip.style.top=Math.max(8,event.point.y-tip.offsetHeight-12)+'px';});
map.on('movestart',clearHover);map.on('moveend',updateLabels);map.on('resize',updateLabels);map.getCanvas().addEventListener('mouseleave',clearHover);
$('search').addEventListener('input',()=>{const q=$('search').value.trim().toLowerCase(),box=$('search-results');box.replaceChildren();box.hidden=!q;if(!q)return;const normalize=s=>s.normalize('NFD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();const matches=[...index.values()].filter(f=>(f.properties.en+' '+nativeName(f.properties)).toLowerCase().includes(q)||normalize(f.properties.en).includes(normalize(q))).slice(0,15);for(const f of matches){const b=document.createElement('button');b.className='search-result';b.dataset.nav='';const strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=f.properties.en+' · '+nativeName(f.properties);small.textContent=f.properties.type+' · '+(index.get(f.properties.parent)?.properties.en||countryNames[f.properties.country]);b.append(strong,small);b.onclick=()=>select(f);box.append(b);}if(!matches.length){const p=document.createElement('p');p.textContent='No matching places.';box.append(p);}});
$('country').onchange=()=>{scope=$('country').value;listRegions();reset();};$('province').onchange=()=>{$('province').value?select(index.get($('province').value)):reset();};
for(const id of ['province-layer','prefecture-layer','label-layer'])$(id).onchange=syncLayers;
$('compare-open').onclick=()=>host.comparison?.open(undefined,'korea');$('compare-place').onclick=()=>host.comparison?.open(selected?.properties.id,'korea');
$('selection-reset').onclick=()=>{scope='';$('country').value='';listRegions();reset();};
$('tab-explore').onclick=()=>panel('explore');$('tab-layers').onclick=()=>panel('layers');$('about-open').onclick=()=>$('about').showModal();$('about-close').onclick=()=>$('about').close();

let preparedPromise;
 function preload(){
  if(!preparedPromise)preparedPromise=new Promise((resolve,reject)=>{const worker=new Worker(new URL('./korea-worker.mjs',import.meta.url),{type:'module'});worker.onmessage=event=>{worker.terminate();event.data.error?reject(new Error(event.data.error)):resolve(event.data.result);};worker.onerror=event=>{worker.terminate();reject(new Error(event.message||'Korea preparation failed'));};}).catch(error=>{preparedPromise=null;throw error;});
  return preparedPromise;
 }
async function ensureData(){
 if(ready)return;if(loading)return loading;
 loading=(async()=>{
 const prepared=await preload();
 data=prepared.metadata;
 const sourceData=id=>{const url=URL.createObjectURL(prepared.sources[id]);sourceUrls.push(url);return url;};
 const options={type:'geojson',tolerance:.375,maxzoom:18,buffer:128,promoteId:'id',attribution:'<a href="https://sgis.kostat.go.kr" target="_blank" rel="noopener">Statistics Korea SGIS</a> · <a href="https://github.com/vuski/admdongkor" target="_blank" rel="noopener">vuski/admdongkor</a>'};
 for(const level of ['first','second']){for(const f of data[level].features)index.set(f.properties.id,f);map.addSource('korea-'+level,{...options,data:sourceData('korea-'+level)});map.addSource('korea-'+level+'-selection-edges',{...options,...lineSourceOptions,data:sourceData('korea-'+level+'-selection-edges')});}
 for(const id of ['first','second','countries'])map.addSource('korea-'+id+'-edges',{...lineSourceOptions,data:sourceData('korea-'+id+'-edges')});
 for(const level of ['first','second']){map.addLayer({id:'korea-'+level+'-fill',type:'fill',layout:{visibility:'none'},source:'korea-'+level,paint:{'fill-color':['case',['boolean',['feature-state','selected'],false],level==='first'?'#b9cfe5':'#235a91',['boolean',['feature-state','hover'],false],'#b4c9df',['match',['get','country'],'KP','#dce5ef','#e7edf5']],'fill-opacity':level==='first'?1:['case',['boolean',['feature-state','selected'],false],.45,['boolean',['feature-state','hover'],false],.4,.01],'fill-antialias':false}});}
 for(const level of ['second','first','countries'])map.addLayer({id:'korea-'+level+'-lines',type:'line',source:'korea-'+level+'-edges',paint:{'line-color':level==='second'?'#9aafc3':'#587694','line-width':['interpolate',['linear'],['zoom'],4,level==='second'?.4:.65,8,level==='second'?.65:level==='first'?1.15:1.25],'line-opacity':adaptiveOpacity(level==='second'?.8:1)},layout:{visibility:'none','line-join':'round','line-cap':'round'}});
 for(const level of ['first','second'])map.addLayer({id:'korea-'+level+'-selected',type:'line',layout:{visibility:'none','line-join':'round','line-cap':'round'},source:'korea-'+level+'-selection-edges',paint:{'line-color':'#b73945','line-width':1.8,'line-opacity':adaptiveOpacity(['case',['boolean',['feature-state','selected'],false],1,0])}});

 for(const id of layerIds)showLayer(id,false);
 listRegions();

 host.comparison?.register('korea',koreaComparisonProfile([...index.values()].map(f=>f.properties)));ready=true;controls();
 })().catch(error=>{for(const id of layerIds)if(map.getLayer(id))map.removeLayer(id);for(const id of ['korea-first','korea-second','korea-first-selection-edges','korea-second-selection-edges','korea-first-edges','korea-second-edges','korea-countries-edges'])if(map.getSource(id))map.removeSource(id);sourceUrls.splice(0).forEach(url=>URL.revokeObjectURL(url));index.clear();loading=null;throw error;});return loading;
}
const layerIds=['korea-first-fill','korea-second-fill','korea-second-lines','korea-first-lines','korea-countries-lines','korea-first-selected','korea-second-selected'];
function leave(){active=false;sidebar.hidden=true;labels.forEach(m=>m.remove());labels=[];clearHover();for(const id of layerIds)showLayer(id,false);}
async function enter(shouldFit=true){
 if(host.isBusy())return;active=true;sidebar.hidden=false;scope='';state(selected,{selected:false});selected=null;mode=1;panel('layers');$('country').value='';$('tab-explore').hidden=true;
 $('home').textContent='All Korea';$('mode-province').textContent='First level';$('mode-prefecture').textContent='Second level';$('breadcrumb-region').hidden=true;setMode(1,true);
 $('status').hidden=ready;$('status').textContent='Loading Korea boundaries…';controls();
 try{await ensureData();if(!active)return;syncLayers();$('status').hidden=true;if(shouldFit)await fit(home,8);updateLabels();controls();}
 catch(error){console.error(error);if(host.isBusy())await new Promise(resolve=>map.once('moveend',resolve));host.returnToChina();}
}
window.addEventListener('pagehide',event=>{if(!event.persisted)sourceUrls.forEach(url=>URL.revokeObjectURL(url));});
return {getSelection:()=>selected?.properties.id||null,getScope:()=>scope,async restore(id,savedScope){scope=['KP','KR'].includes(savedScope)?savedScope:'';$('country').value=scope;listRegions();const f=index.get(id);if(f)await select(f,false);syncLayers();},sync:syncLayers,enter,leave,updateLabels,pauseLabels(){labels.forEach(label=>label.remove());labels=[];},preload,warm:ensureData,get active(){return active;},get ready(){return ready;},select,viewParent,home(){scope='';$('country').value='';listRegions();reset();},fit(){return fit(selected?.properties.bounds||scopeBounds());},setMode,random(){if(!ready||host.isBusy())return;const places=data.second.features.filter(f=>!scope||f.properties.country===scope);select(places[Math.floor(Math.random()*places.length)]);}};
}
