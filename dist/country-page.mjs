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
 </div><footer class="sidebar-footer">${footer}</footer>`;
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
  const expand=value=>{sidebar.classList.toggle('details-expanded',value);button.setAttribute('aria-expanded',String(value));button.setAttribute('aria-label',value?'Collapse region details':'Expand region details');button.title=value?'Collapse details (Esc)':'Expand region details';requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));};
  button.onclick=()=>expand(!sidebar.classList.contains('details-expanded'));
  sidebar.addEventListener('keydown',event=>{if(event.key==='Escape'&&sidebar.classList.contains('details-expanded')){expand(false);button.focus();event.stopPropagation();}});
  sidebar.append(button);expand(false);
 }
 return population||anchor;
}
export function setSubdivisionHeading(heading,label,count){
 heading.textContent=label+' ';const value=document.createElement('span');value.className='division-count';value.textContent=String(count);heading.append(value);
}
