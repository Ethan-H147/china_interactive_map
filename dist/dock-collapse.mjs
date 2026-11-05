// Shared by the election and historical snapshot docks in every country.
export function addDockCollapse(dock,{label,onResize}){
 dock.classList.add('collapsible-dock');
 const details=document.createElement('div');details.className='dock-details';details.id=dock.id+'-details';
 details.append(dock.querySelector('.election-legend'),dock.querySelector('.election-timeline'));dock.append(details);
 const toggle=document.createElement('button');toggle.className='dock-collapse';toggle.type='button';toggle.setAttribute('aria-controls',details.id);toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Collapse '+label);
 toggle.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>';
 toggle.onclick=()=>{const collapsed=toggle.getAttribute('aria-expanded')==='true';details.hidden=collapsed;dock.classList.toggle('is-collapsed',collapsed);toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',(collapsed?'Expand':'Collapse')+' '+label);onResize();};
 dock.querySelector('.election-head').append(toggle);
}
