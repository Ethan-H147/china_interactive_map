import {communityFooter} from './feedback.mjs';
import {bilingualText} from './inline-typography.mjs';
// Country adapters supply content and controls; this module owns the page layout.
const escape=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function searchMarkup({id,label,placeholder=label,resultsId,disabled=false,dataNav=false}){
 return `<label class="sr-only" for="${escape(id)}">${escape(label)}</label><div class="search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="${escape(id)}" type="search" placeholder="${escape(placeholder)}" autocomplete="off" ${disabled?'disabled':''} ${dataNav?'data-nav':''}></div><div id="${escape(resultsId)}" hidden aria-live="polite"></div>`;
}
function headingMarkup({navigation,kindId,nameId,nameLang,names=''}){
 return `<div class="selection-top">${navigation}</div><span id="${escape(kindId)}" class="eyebrow"></span><h2 ${nameId?`id="${escape(nameId)}"`:''} ${nameLang?`lang="${escape(nameLang)}"`:''}></h2>${names}`;
}
export function countryPageMarkup({prefix='',search='',settings='',heading='',cards='',subdivisions='',actions='',footer='',tools='',extraTabs='',extraPanels='',beforeSelection='',afterPanels='',selectionId='',selectionHidden=false}){
 const id=name=>prefix+name;
 return `<div class="sidebar-tools">
  ${searchMarkup(search)}
  <div class="panel-tabs"><button id="${id('tab-layers')}" type="button" aria-pressed="true" aria-controls="${id('layers-panel')}">Map settings</button><button id="${id('tab-explore')}" type="button" hidden aria-pressed="false" aria-controls="${id('explore-panel')}">Discover</button>${extraTabs}</div>${tools}
 </div><div class="sidebar-scroll">
  <section id="${id('layers-panel')}"><div class="region-color-control"><label for="${id('region-color')}">Color by</label><select id="${id('region-color')}" data-region-color disabled><option value="none">None</option></select></div>${settings}</section>
  <section id="${id('explore-panel')}" hidden>${beforeSelection}
   <section ${selectionId?`id="${selectionId}"`:''} class="country-selection" ${selectionHidden?'hidden':''} aria-live="polite">
    <header class="country-selection-heading">${headingMarkup(heading)}</header>
    <div class="country-info-cards">${cards}</div>
    <section class="country-subdivisions">${subdivisions}</section>
    <div class="country-place-actions">${actions}</div>
   </section>
  </section>${extraPanels}${afterPanels}
 </div><footer class="sidebar-footer">${footer}${communityFooter}</footer>`;
}
export function createCountryPage({id,label,classes='sidebar',hidden=true,...content}){
 const page=document.createElement('aside');page.id=id;page.className=classes;page.hidden=hidden;page.setAttribute('aria-label',label);page.dataset.countryPage='';page.innerHTML=countryPageMarkup(content);return page;
}
export function insertInfoCard(anchor,card,after=anchor){
 after.after(card);return card;
}
export function prepareCountryDetails(anchor){
 const population=anchor.parentElement.querySelector(':scope > .population');
 if(population)insertInfoCard(anchor,population);
 const sidebar=anchor.closest?.('.sidebar');
 if(sidebar&&!sidebar.querySelector('.details-expand')){
  const button=document.createElement('button');button.className='details-expand';button.type='button';button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';button.setAttribute('aria-controls',sidebar.id);
  const edge=document.createElement('div');edge.className='details-resize-edge';edge.hidden=true;edge.tabIndex=0;edge.setAttribute('role','separator');edge.setAttribute('aria-orientation','vertical');edge.setAttribute('aria-label','Resize menu');edge.setAttribute('aria-controls',sidebar.id);
  const desktop=matchMedia('(min-width:761px)');
  let enabled=false,drag=null;
  const limits=()=>({min:280,max:Math.max(280,Math.min(1000,sidebar.parentElement.clientWidth-280))});
  const width=()=>sidebar.getBoundingClientRect().width;
  const resize=value=>{const {min,max}=limits(),next=Math.round(Math.max(min,Math.min(max,value)));sidebar.style.setProperty('--details-width',next+'px');sidebar.classList.toggle('details-expanded',next>=640);edge.setAttribute('aria-valuemin',min);edge.setAttribute('aria-valuemax',max);edge.setAttribute('aria-valuenow',next);edge.setAttribute('aria-valuetext',next+' pixels');};
  const finish=()=>{const pointer=drag?.id;drag=null;document.documentElement.removeAttribute('data-sidebar-resizing');if(pointer!==undefined&&edge.hasPointerCapture(pointer))edge.releasePointerCapture(pointer);};
  const enable=value=>{finish();const initial=width();enabled=value&&desktop.matches;sidebar.classList.toggle('details-resizable',enabled);edge.hidden=!enabled;button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'Reset menu width':'Enable menu resizing');button.title=enabled?'Reset menu width':'Enable menu resizing';if(enabled)resize(initial);else{sidebar.classList.remove('details-expanded');sidebar.style.removeProperty('--details-width');}};
  button.onclick=()=>enable(!enabled);
  edge.addEventListener('pointerdown',event=>{if(!enabled||event.button!==0)return;event.preventDefault();event.stopPropagation();edge.focus({preventScroll:true});drag={id:event.pointerId,x:event.clientX,width:width()};edge.setPointerCapture(event.pointerId);document.documentElement.setAttribute('data-sidebar-resizing','');});
  edge.addEventListener('pointermove',event=>{if(drag?.id===event.pointerId)resize(drag.width+event.clientX-drag.x);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])edge.addEventListener(event,finish);
  edge.addEventListener('keydown',event=>{const {min,max}=limits(),step=event.shiftKey?40:10;const next={ArrowLeft:width()-step,ArrowRight:width()+step,Home:min,End:max}[event.key];if(next===undefined)return;event.preventDefault();event.stopPropagation();resize(next);});
  sidebar.addEventListener('keydown',event=>{if(event.key==='Escape'&&enabled){enable(false);button.focus({preventScroll:true});event.stopPropagation();}});
  desktop.addEventListener('change',()=>{if(!desktop.matches)enable(false);});
  window.addEventListener('resize',()=>{if(enabled&&!sidebar.hidden)resize(width());});
  sidebar.append(button,edge);enable(false);
 }
 return population||anchor;
}
export function setSubdivisionHeading(heading,label,count){
 heading.textContent=label+' ';const value=document.createElement('span');value.className='division-count';value.textContent=String(count);heading.append(value);
}

// Parents use the same selection action as search and map clicks.
export function setMapBreadcrumb(items){
 const root=document.getElementById('breadcrumb-region');root.replaceChildren();root.hidden=!items.length;
 items.forEach(({label,select},i)=>{
  if(i){const separator=document.createElement('span');separator.className='breadcrumb-separator';separator.textContent=' / ';separator.setAttribute('aria-hidden','true');root.append(separator);}
  const node=document.createElement(select?'button':'span');bilingualText(node,label);
  if(select){node.type='button';node.className='breadcrumb-parent';node.dataset.nav='';node.setAttribute('aria-label','View '+label);node.onclick=select;}
  else{node.className='breadcrumb-current';node.setAttribute('aria-current','location');}
  root.append(node);
 });
}
export function setRegionBreadcrumb(record,parentOf,labelOf,select){
 const path=[],seen=new Set();let item=record;
 while(item&&!seen.has(item)){seen.add(item);path.unshift(item);item=parentOf(item);}
 setMapBreadcrumb(path.map(item=>({label:labelOf(item),...(item!==record?{select:()=>select(item)}:{})})));
}

// Tab state includes panels added later, such as the shared quiz setup.
export function showCountryPanel(sidebar,target){
 if(!target)return;
 for(const panel of sidebar.querySelectorAll('.sidebar-scroll > section'))panel.hidden=panel!==target;
 for(const tab of sidebar.querySelectorAll('.panel-tabs button'))tab.setAttribute('aria-pressed',String(tab.getAttribute('aria-controls')===target.id));
}
