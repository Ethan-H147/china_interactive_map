import * as maplibre from './vendor/maplibre-gl.mjs';
import {loadCompressed} from './korea-data.mjs';
const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const countryNames={KP:'North Korea',KR:'South Korea'},home=[[124,33],[131.9,43.1]];
const map=new maplibre.Map({container:'map',style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#f4f0e7'}}],transition:{duration:0,delay:0}},center:[127.6,38],zoom:5,minZoom:3,maxZoom:16,maxBounds:[[115,27],[138,48]],renderWorldCopies:false,dragRotate:false,pitchWithRotate:false,touchPitch:false,maxPitch:0,attributionControl:false,canvasContextAttributes:{antialias:true},fadeDuration:0});
maplibre.setWorkerCount(2);map.touchZoomRotate.disableRotation();map.keyboard.disableRotation();
map.addControl(new maplibre.AttributionControl({compact:true,customAttribution:'<a href="https://sgis.kostat.go.kr" target="_blank" rel="noopener">Statistics Korea SGIS</a> · <a href="https://github.com/vuski/admdongkor" target="_blank" rel="noopener">vuski/admdongkor</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>'}));
let data,ready=false,busy=false,selected=null,hovered=null,mode=1,scope='',labels=[];
const index=new Map(),interactions=['dragPan','scrollZoom','doubleClickZoom','touchZoomRotate','boxZoom','keyboard'];
const tip=document.createElement('div');tip.className='korea-tooltip';tip.hidden=true;$('map-shell').append(tip);
const fc=features=>({type:'FeatureCollection',features});
const state=(f,value)=>{if(f)map.setFeatureState({source:f.properties.level===1?'first':'second',id:f.properties.id},value);};
function controls(){document.querySelectorAll('[data-nav]').forEach(el=>el.disabled=!ready||busy);}
function clearHover(){state(hovered,{hover:false});hovered=null;tip.hidden=true;map.getCanvas().style.cursor='';}
function animate(action){
 if(busy||!ready)return;clearHover();map.stop();
 if(reduced.matches){action(0);updateLabels();return;}
 busy=true;controls();$('map-shell').setAttribute('aria-busy','true');$('moving-indicator').hidden=false;
 const enabled=interactions.filter(k=>map[k].isEnabled());enabled.forEach(k=>map[k].disable());
 let timer,finished=false;const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);map.off('moveend',finish);busy=false;enabled.forEach(k=>map[k].enable());$('map-shell').setAttribute('aria-busy','false');$('moving-indicator').hidden=true;controls();updateLabels();};
 map.once('moveend',finish);timer=setTimeout(()=>{map.stop();finish();},2000);action(650);
}
function fit(bounds=home,maxZoom=11){animate(duration=>map.fitBounds(bounds,{padding:{top:76,bottom:55,left:35,right:55},maxZoom,duration,retainPadding:false}));}
function scopeBounds(){if(!scope)return home;return boundsOf(data.first.features.filter(f=>f.properties.country===scope));}
function boundsOf(features){const b=new maplibre.LngLatBounds();features.forEach(f=>{b.extend(f.properties.bounds[0]);b.extend(f.properties.bounds[1]);});return b;}
function panel(name){for(const key of ['layers','explore']){$(key+'-panel').hidden=key!==name;$('tab-'+key).setAttribute('aria-pressed',String(key===name));}}
function setMode(value){mode=value;$('mode-province').setAttribute('aria-pressed',String(value===1));$('mode-prefecture').setAttribute('aria-pressed',String(value===2));$('map-hint').textContent=value===1?'Select a province or city':'Select a city, county or district';clearHover();updateLabels();}
function reset(){if(busy||!ready)return;state(selected,{selected:false});selected=null;$('tab-explore').hidden=true;panel('layers');$('breadcrumb-region').hidden=true;$('province').value='';clearSearch();setMode(1);fit(scopeBounds(),8);}
function clearSearch(){$('search').value='';$('search-results').replaceChildren();$('search-results').hidden=true;}
function listRegions(){const select=$('province');select.replaceChildren(new Option('All regions',''));for(const c of ['KP','KR']){if(scope&&scope!==c)continue;const group=document.createElement('optgroup');group.label=countryNames[c];for(const f of data.first.features.filter(f=>f.properties.country===c).sort((a,b)=>a.properties.en.localeCompare(b.properties.en)))group.append(new Option(f.properties.en+' · '+f.properties.ko,f.properties.id));select.append(group);}}
function select(f){
 if(busy||!ready)return;state(selected,{selected:false});selected=f;state(f,{selected:true});clearHover();clearSearch();
 const p=f.properties,parent=index.get(p.parent);scope=p.country;$('country').value=scope;listRegions();$('province').value=p.level===1?p.id:p.parent;
 $('selection-name').textContent=p.en;$('selection-name').classList.toggle('long-name',p.en.length>28);$('selection-chinese').textContent=p.ko;$('selection-kind').textContent=p.type.toUpperCase();$('selection-country').textContent=countryNames[p.country];
 $('selection-flag').src='vendor/flag-'+p.country.toLowerCase()+'.svg';$('selection-flag').alt='Flag of '+countryNames[p.country];
 const children=data.second.features.filter(f=>f.properties.parent===p.id).sort((a,b)=>a.properties.en.localeCompare(b.properties.en));
 $('selection-meta').textContent=p.id==='KR-36'?'No second-level division':p.level===1?children.length+' mapped subdivisions':p.country==='KP'?'OpenStreetMap boundary':'July 2026 boundary';
 $('parent-context').hidden=!parent;if(parent){$('parent-english').textContent=parent.properties.en;$('parent-chinese').textContent=parent.properties.ko;$('parent-region').onclick=()=>select(parent);}
 $('subdivisions').hidden=!children.length;$('subdivisions-title').textContent='Subdivisions';$('region-list').replaceChildren();
 for(const child of children){const b=document.createElement('button');b.type='button';b.dataset.nav='';const en=document.createElement('span'),ko=document.createElement('small');en.textContent=child.properties.en;ko.textContent=child.properties.ko;ko.lang='ko';b.append(en,ko);b.onclick=()=>select(child);$('region-list').append(b);}
 $('tab-explore').hidden=false;panel('explore');$('breadcrumb-region').hidden=false;$('breadcrumb-region').textContent=p.en;$('prefecture-layer').checked=true;syncLayers();setMode(2);document.querySelector('.sidebar-scroll').scrollTop=0;fit(p.bounds,p.level===1?11:13);
}
function syncLayers(){if(!ready)return;map.setLayoutProperty('first-lines','visibility',$('province-layer').checked?'visible':'none');for(const id of ['second-fill','second-lines','second-selected'])map.setLayoutProperty(id,'visibility',$('prefecture-layer').checked?'visible':'none');updateLabels();}
function updateLabels(){
 if(!ready||busy)return;labels.forEach(m=>m.remove());labels=[];if(!$('label-layer').checked)return;
 const parent=selected&&(selected.properties.level===1?selected.properties.id:selected.properties.parent);
 const candidates=parent&&mode===2&&$('prefecture-layer').checked?data.second.features.filter(f=>f.properties.parent===parent):data.first.features;
 const occupied=[],w=map.getContainer().clientWidth,h=map.getContainer().clientHeight;
 for(const f of candidates){const p=f.properties,point=map.project(p.center);if(point.x<35||point.x>w-45||point.y<85||point.y>h-55)continue;const width=Math.max(p.en.length*6.7,p.ko.length*12)+16,rect=[point.x-width/2,point.y-19,point.x+width/2,point.y+22];if(occupied.some(r=>rect[0]<r[2]&&rect[2]>r[0]&&rect[1]<r[3]&&rect[3]>r[1]))continue;occupied.push(rect);const el=document.createElement('div');el.className='korea-marker';el.textContent=p.en;const ko=document.createElement('small');ko.textContent=p.ko;ko.lang='ko';el.append(ko);labels.push(new maplibre.Marker({element:el,anchor:'center'}).setLngLat(p.center).addTo(map));}
}
function picked(point){const layers=mode===2&&$('prefecture-layer').checked?['second-fill','first-fill']:['first-fill'];const hits=map.queryRenderedFeatures(point,{layers});for(const id of layers){const hit=hits.find(f=>f.layer.id===id);if(hit)return index.get(hit.properties.id);}}
map.on('click',event=>{if(!ready||busy)return;const f=picked(event.point);if(f)select(f);});
map.on('mousemove',event=>{if(!ready||busy||map.isMoving())return;const f=picked(event.point);if(f!==hovered){clearHover();hovered=f;state(f,{hover:true});}if(!f)return;map.getCanvas().style.cursor='pointer';const p=f.properties;tip.replaceChildren();tip.append(document.createTextNode(p.en+' · '+p.ko));const small=document.createElement('small');small.textContent=p.type+' · '+countryNames[p.country];tip.append(small);tip.hidden=false;tip.style.left=Math.max(8,Math.min(event.point.x+12,map.getContainer().clientWidth-tip.offsetWidth-10))+'px';tip.style.top=Math.max(8,event.point.y-tip.offsetHeight-12)+'px';});
map.on('movestart',clearHover);map.on('moveend',updateLabels);map.on('resize',updateLabels);map.getCanvas().addEventListener('mouseleave',clearHover);
$('search').addEventListener('input',()=>{const q=$('search').value.trim().toLowerCase(),box=$('search-results');box.replaceChildren();box.hidden=!q;if(!q)return;const normalize=s=>s.normalize('NFD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();const matches=[...index.values()].filter(f=>(f.properties.en+' '+f.properties.ko).toLowerCase().includes(q)||normalize(f.properties.en).includes(normalize(q))).slice(0,15);for(const f of matches){const b=document.createElement('button');b.className='search-result';b.dataset.nav='';const strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=f.properties.en+' · '+f.properties.ko;small.textContent=f.properties.type+' · '+(index.get(f.properties.parent)?.properties.en||countryNames[f.properties.country]);b.append(strong,small);b.onclick=()=>select(f);box.append(b);}if(!matches.length){const p=document.createElement('p');p.textContent='No matching places.';box.append(p);}});
$('country').onchange=()=>{scope=$('country').value;listRegions();reset();};$('province').onchange=()=>{$('province').value?select(index.get($('province').value)):reset();};
for(const id of ['province-layer','prefecture-layer','label-layer'])$(id).onchange=syncLayers;
$('home').onclick=$('selection-reset').onclick=()=>{if(busy)return;scope='';$('country').value='';listRegions();reset();};
$('fit-map').onclick=()=>fit(selected?.properties.bounds||scopeBounds());
$('mode-province').onclick=()=>setMode(1);$('mode-prefecture').onclick=()=>setMode(2);
$('zoom-in').onclick=()=>animate(duration=>map.easeTo({zoom:Math.min(16,map.getZoom()+1),duration:Math.min(duration,350)}));$('zoom-out').onclick=()=>animate(duration=>map.easeTo({zoom:Math.max(3,map.getZoom()-1),duration:Math.min(duration,350)}));
$('surprise').onclick=()=>{const places=data.second.features.filter(f=>!scope||f.properties.country===scope);select(places[Math.floor(Math.random()*places.length)]);};
$('tab-explore').onclick=()=>panel('explore');$('tab-layers').onclick=()=>panel('layers');$('about-open').onclick=()=>$('about').showModal();$('about-close').onclick=()=>$('about').close();$('retry').onclick=()=>location.reload();
try{
 [data]=await Promise.all([loadCompressed('data/korea-boundaries.bin'),new Promise(resolve=>map.once('load',resolve))]);
 const options={type:'geojson',tolerance:0,maxzoom:18,buffer:128,promoteId:'id'};
 for(const level of ['first','second']){for(const f of data[level].features)index.set(f.properties.id,f);map.addSource(level,{...options,data:data[level]});}
 for(const [id,geometry] of Object.entries(data.boundaries))map.addSource(id+'-edges',{type:'geojson',tolerance:0,maxzoom:18,data:{type:'Feature',properties:{},geometry}});
 for(const level of ['first','second']){map.addLayer({id:level+'-fill',type:'fill',source:level,paint:{'fill-color':['case',['boolean',['feature-state','selected'],false],level==='first'?'#ead1ba':'#ca6a45',['boolean',['feature-state','hover'],false],'#d6a34f',['match',['get','country'],'KP','#e7d9be','#efe2c8']],'fill-opacity':level==='first'?1:['case',['boolean',['feature-state','selected'],false],.45,['boolean',['feature-state','hover'],false],.4,.01],'fill-antialias':false}});}
 for(const level of ['second','first','countries'])map.addLayer({id:level+'-lines',type:'line',source:level+'-edges',paint:{'line-color':level==='second'?'#ad9775':'#987343','line-width':level==='second'?.65:level==='first'?1.15:1.5},layout:{'line-join':'round','line-cap':'round'}});
 for(const level of ['first','second'])map.addLayer({id:level+'-selected',type:'line',source:level,paint:{'line-color':'#a43829','line-width':1.8,'line-opacity':['case',['boolean',['feature-state','selected'],false],1,0]}});
 if(!map.loaded())await new Promise(resolve=>map.once('idle',resolve));ready=true;controls();listRegions();$('status').hidden=true;map.fitBounds(home,{padding:65,duration:0});updateLabels();
}catch(error){console.error(error);$('status').hidden=true;$('load-error').hidden=false;}
