import {loadCompressed} from './korea-data.mjs';
import {mongoliaPanel} from './mongolia-panel.mjs';
import {lineData,adaptiveOpacity,lineSourceOptions,setLayerVisible} from './adaptive-lines.mjs';
export async function addMongoliaPortal(map,host){
 const outline=await loadCompressed('data/mongolia-context.bin'),home=[[87.7,41.5],[120,52.2]];
 map.addSource('mongolia-portal',{type:'geojson',data:outline,tolerance:0,maxzoom:18,buffer:128});
 map.addSource('mongolia-portal-edges',{...lineSourceOptions,data:lineData(outline)});
 map.addLayer({id:'mongolia-portal-fill',type:'fill',source:'mongolia-portal',paint:{'fill-color':'#d7d7d3','fill-opacity':1,'fill-antialias':false}},map.getLayer('province-fill')?'province-fill':undefined);
 map.addLayer({id:'mongolia-portal-line',type:'line',source:'mongolia-portal-edges',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#aaa9a2','line-width':.75,'line-opacity':adaptiveOpacity()}},map.getLayer('province-fill')?'province-fill':undefined);
 const template=document.createElement('template');template.innerHTML=mongoliaPanel;
 const sidebar=template.content.querySelector('aside'),dialog=template.content.querySelector('dialog');
 document.querySelector('.workspace').insertBefore(sidebar,document.getElementById('map-shell'));document.body.append(dialog);
 const $=id=>document.getElementById('m-'+id),index=new Map(),layerIds=[],urls=[];
 let data,ready=false,active=false,loading,selected=null,hovered=null,mode=1,labels=[],portalClick=null;
 const tip=document.createElement('div');tip.className='korea-tooltip';tip.hidden=true;document.getElementById('map-shell').append(tip);
 const name=p=>p.en+(p.mn?' · '+p.mn:'');
 function show(id,visible){setLayerVisible(map,id,visible);}
 function state(f,value){if(!f)return;const source='mongolia-'+(f.properties.level===1?'first':'second');for(const id of [source,source+'-selection-edges'])window.AtlasMotion.setFeatureState(map,{source:id,id:f.properties.id},value);}
 function clearHover(){state(hovered,{hover:false});hovered=null;tip.hidden=true;map.getCanvas().style.cursor='';}
 function clearLabels(){labels.forEach(label=>label.remove());labels=[];}
 function panel(key){for(const p of ['layers','explore']){$(p+'-panel').hidden=p!==key;$('tab-'+p).setAttribute('aria-pressed',String(p===key));}}
 function setMode(value,automatic=false){if(automatic&&document.getElementById('mode-lock')?.getAttribute?.('aria-pressed')==='true')value=document.getElementById('mode-province').getAttribute('aria-pressed')==='true'?1:2;mode=value;document.getElementById('mode-province').setAttribute('aria-pressed',String(mode===1));document.getElementById('mode-prefecture').setAttribute('aria-pressed',String(mode===2));document.getElementById('map-hint').textContent=mode===1?'Select a province or the capital':'Select a district';clearHover();updateLabels();}
 function clearSearch(){$('search').value='';$('search-results').hidden=true;$('search-results').replaceChildren();}
 function sync(){
 if(!ready)return;
 for(const id of layerIds){
  const enabled=id==='mongolia-first-lines'?$('province-layer').checked:id.includes('-second-')?$('district-layer').checked:true;
  show(id,active&&enabled);
 }
 updateLabels();
}
 function population(p){const record=p.level===1?host.population(p):null;$('population').hidden=!record;if(!record)return;$('population-total').textContent=record.total.toLocaleString('en-US');$('population-scope').textContent=p.iso==='MN-1'?'Entire capital municipality':'Entire province';$('population-date').textContent=record.dateLabel;$('population-source').href=record.sourceUrl;}
 async function select(f,shouldFit=true){
  if(!active||!ready||host.isBusy()||!f)return;state(selected,{selected:false});selected=f;state(f,{selected:true});clearHover();clearSearch();
  const p=f.properties,parent=index.get(p.parent);$('province').value=p.level===1?p.id:p.parent;
  $('selection-name').textContent=p.en;$('selection-name').classList.toggle('long-name',p.en.length>28);$('selection-local').textContent=p.mn||'';$('selection-kind').textContent=p.type.toUpperCase();
  const record=p.level===1?host.population(p):null,traditional=p.traditional||record?.traditional;
  $('traditional').hidden=!traditional;$('traditional-name').textContent=traditional||'';population(p);
  $('selection-meta').hidden=true;
  $('parent-context').hidden=!parent;if(parent){$('parent-kind').textContent=parent.properties.iso==='MN-1'?'Capital municipality':'Province';$('parent-english').textContent=parent.properties.en;$('parent-local').textContent=parent.properties.mn||'';$('parent-region').onclick=()=>select(parent);}
  const children=data.second.features.filter(child=>child.properties.parent===p.id).sort((a,b)=>a.properties.en.localeCompare(b.properties.en));
  $('subdivisions').hidden=!children.length;$('region-list').replaceChildren();for(const child of children){const button=document.createElement('button');button.dataset.nav='';const en=document.createElement('span'),local=document.createElement('small');en.textContent=child.properties.en;local.textContent=child.properties.mn||'';local.lang='mn-Cyrl';button.append(en,local);button.onclick=()=>select(child);$('region-list').append(button);}
  $('tab-explore').hidden=false;panel('explore');document.getElementById('breadcrumb-region').hidden=false;document.getElementById('breadcrumb-region').textContent=(parent?parent.properties.en+' / ':'')+name(p);
  $('district-layer').checked=true;sync();setMode(2,true);sidebar.querySelector('.sidebar-scroll').scrollTop=0;host.controls();if(shouldFit)await host.fit(p.bounds,p.level===1?9:12);
 }
 async function reset(){if(!active||host.isBusy()||!ready)return;state(selected,{selected:false});selected=null;clearHover();clearSearch();$('province').value='';$('tab-explore').hidden=true;panel('layers');document.getElementById('breadcrumb-region').hidden=true;setMode(1,true);await host.fit(home,7);}
 function viewParent(){return selected?.properties.level===2?select(index.get(selected.properties.parent)):reset();}
 let labelFrame;
function updateLabels(){
 if(labelFrame!==undefined)return;
 labelFrame=requestAnimationFrame(()=>{labelFrame=undefined;renderLabels();});
}
function renderLabels(){
  if(!active||!ready||host.isBusy()||host.isMoving?.())return;clearLabels();if(!$('label-layer').checked)return;
  const parent=selected&&(selected.properties.level===1?selected.properties.id:selected.properties.parent),candidates=parent&&mode===2&&$('district-layer').checked?data.second.features.filter(f=>f.properties.parent===parent):data.first.features;
  const visible=selected&&!candidates.includes(selected)?[selected,...candidates]:candidates;
  labels=window.AtlasLabels.render(map,visible.filter(f=>f.properties.center).map(f=>({id:f.properties.id,center:f.properties.center,en:f.properties.en,local:f.properties.mn,selected:f===selected})),'korea-marker');

 }
 function picked(point){const layers=mode===2&&$('district-layer').checked?['mongolia-second-fill','mongolia-first-fill']:['mongolia-first-fill'];const hits=window.AtlasMotion.queryRegions(map,point,{layers});for(const layer of layers){const hit=hits.find(h=>h.layer.id===layer);if(hit)return index.get(hit.properties.id);}}
 map.on('click',['mongolia-portal-fill','mongolia-portal-fill-motion'],event=>{if(!active&&!host.isBusy()){portalClick=event.originalEvent;host.switchAtlas('mongolia');}});
 map.on('click',event=>{if(event.originalEvent===portalClick)return;if(active&&ready&&!host.isBusy()){const f=picked(event.point);if(f)select(f);}});
 map.on('mousemove',event=>{if(!active||!ready||host.isBusy()||map.isMoving())return;const f=picked(event.point);if(f!==hovered){clearHover();hovered=f;state(f,{hover:true});}if(!f)return;map.getCanvas().style.cursor='pointer';tip.replaceChildren(document.createTextNode(name(f.properties)));const small=document.createElement('small');small.textContent=f.properties.type;tip.append(small);tip.hidden=false;tip.style.left=Math.max(8,Math.min(event.point.x+12,map.getContainer().clientWidth-tip.offsetWidth-10))+'px';tip.style.top=Math.max(8,event.point.y-tip.offsetHeight-12)+'px';});
 map.on('movestart',clearHover);map.on('moveend',updateLabels);map.on('resize',updateLabels);map.getCanvas().addEventListener('mouseleave',clearHover);
 const normalize=s=>s.normalize('NFD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
 $('search').oninput=()=>{const q=normalize($('search').value),box=$('search-results');box.replaceChildren();box.hidden=!q;if(!q)return;const matches=[...index.values()].filter(f=>normalize(name(f.properties)).includes(q)).slice(0,18);for(const f of matches){const b=document.createElement('button');b.dataset.nav='';b.className='search-result';const strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=name(f.properties);small.textContent=f.properties.type+' · '+(index.get(f.properties.parent)?.properties.en||'Mongolia');b.append(strong,small);b.onclick=()=>select(f);box.append(b);}if(!matches.length)box.textContent='No matching places.';};
 $('province').onchange=()=>{$('province').value?select(index.get($('province').value)):reset();};$('selection-reset').onclick=reset;
 for(const id of ['province-layer','district-layer','label-layer'])$(id).onchange=sync;
 $('tab-explore').onclick=()=>panel('explore');$('tab-layers').onclick=()=>panel('layers');$('about-open').onclick=()=>$('about').showModal();$('about-close').onclick=()=>$('about').close();
 async function ensureData(){
  if(ready)return;if(loading)return loading;
  loading=(async()=>{
   const prepared=await new Promise((resolve,reject)=>{const worker=new Worker(new URL('./mongolia-worker.mjs',import.meta.url),{type:'module'});worker.onmessage=e=>{worker.terminate();e.data.error?reject(new Error(e.data.error)):resolve(e.data.result);};worker.onerror=e=>{worker.terminate();reject(new Error(e.message||'Mongolia preparation failed'));};});data=prepared.metadata;
   for(const [id,blob] of Object.entries(prepared.sources)){const url=URL.createObjectURL(blob);urls.push(url);map.addSource(id,{type:'geojson',tolerance:.375,maxzoom:18,buffer:128,promoteId:'id',...(id.endsWith('-edges')?lineSourceOptions:{}),data:url,attribution:'<a href="https://www.nso.mn/" target="_blank" rel="noopener">National Statistics Office of Mongolia</a>'});}
   for(const level of ['first','second']){for(const f of data[level].features)index.set(f.properties.id,f);const id='mongolia-'+level+'-fill';layerIds.push(id);map.addLayer({id,type:'fill',source:'mongolia-'+level,paint:{'fill-color':['case',['boolean',['feature-state','selected'],false],'#b6d0e1',['boolean',['feature-state','hover'],false],'#d9bd72','#d9e7ee'],'fill-opacity':level==='first'?1:['case',['boolean',['feature-state','selected'],false],.65,['boolean',['feature-state','hover'],false],.4,.01],'fill-antialias':false}});}
   for(const level of ['second','first','countries']){const id='mongolia-'+level+'-lines';layerIds.push(id);map.addLayer({id,type:'line',source:'mongolia-'+level+'-edges',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':level==='second'?'#94adbd':'#4e7d98','line-width':['interpolate',['linear'],['zoom'],3,level==='second'?.35:.65,8,level==='second'?.7:1.2],'line-opacity':adaptiveOpacity(level==='second'?.8:1)}});}
   for(const level of ['first','second']){const id='mongolia-'+level+'-selected';layerIds.push(id);map.addLayer({id,type:'line',source:'mongolia-'+level+'-selection-edges',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#ad4037','line-width':1.8,'line-opacity':adaptiveOpacity(['case',['boolean',['feature-state','selected'],false],1,0])}});}
   for(const id of layerIds)show(id,false);
   for(const f of [...data.first.features].sort((a,b)=>a.properties.en.localeCompare(b.properties.en)))$('province').append(new Option(name(f.properties),f.properties.id));
   await new Promise((resolve,reject)=>{const ids=Object.keys(prepared.sources),done=()=>{if(ids.every(id=>map.isSourceLoaded(id))){map.off('sourcedata',done);map.off('error',fail);resolve();}},fail=e=>{if(ids.includes(e.sourceId)){map.off('sourcedata',done);map.off('error',fail);reject(e.error);}};map.on('sourcedata',done);map.on('error',fail);done();});ready=true;host.controls();
  })().catch(error=>{for(const id of layerIds.splice(0))if(map.getLayer(id))map.removeLayer(id);for(const id of ['first','second','first-edges','second-edges','countries-edges','first-selection-edges','second-selection-edges'].map(id=>'mongolia-'+id))if(map.getSource(id))map.removeSource(id);urls.splice(0).forEach(url=>URL.revokeObjectURL(url));index.clear();$('province').replaceChildren(new Option('All Mongolia',''));loading=null;throw error;});return loading;
 }
 function leave(){active=false;sidebar.hidden=true;clearLabels();clearHover();for(const id of layerIds)show(id,false);}
 async function enter(){active=true;sidebar.hidden=false;document.getElementById('home').textContent='All Mongolia';document.getElementById('mode-province').textContent='Provinces';document.getElementById('mode-prefecture').textContent='Districts';state(selected,{selected:false});selected=null;$('tab-explore').hidden=true;panel('layers');setMode(1,true);const status=document.getElementById('status');status.hidden=ready;status.textContent='Loading Mongolia boundaries…';host.controls();try{await ensureData();if(!active)return;sync();status.hidden=true;await host.fit(home,7);updateLabels();}catch(error){console.warn('Mongolia:',error);host.returnToChina();}}
 window.addEventListener('pagehide',e=>{if(!e.persisted)urls.forEach(url=>URL.revokeObjectURL(url));});
 return {getSelection:()=>selected?.properties.id||null,async restore(id){const f=index.get(id);if(f)await select(f,false);sync();},sync,enter,leave,viewParent,home:reset,setMode,updateLabels,pauseLabels:clearLabels,warm:ensureData,get active(){return active;},get ready(){return ready;},random(){if(ready&&!host.isBusy()){const places=selected?data.second.features.filter(f=>f.properties.parent===(selected.properties.level===1?selected.properties.id:selected.properties.parent)):data.second.features;select(places[Math.floor(Math.random()*places.length)]);}},context(value){map.setPaintProperty('mongolia-portal-line','line-opacity',value?0:adaptiveOpacity());}};
}
