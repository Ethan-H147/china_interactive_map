// Keep MapLibre's live source credits, with one compact, accessible disclosure.
export function setupMapSources(map){
 const control=map.getContainer().querySelector('.maplibregl-ctrl-attrib');
 if(!control)return;
 const button=control.querySelector('summary'),panel=control.querySelector('.maplibregl-ctrl-attrib-inner');
 control.classList.add('atlas-sources');button.textContent='i';button.title='Map sources';button.setAttribute('aria-label','Map sources');panel.id='map-source-credits';button.setAttribute('aria-controls',panel.id);
 const fitPanel=()=>{panel.style.maxWidth=Math.max(120,map.getContainer().clientWidth-24)+'px';};fitPanel();map.on('resize',fitPanel);
 const setOpen=open=>{control.open=open;control.classList.toggle('maplibregl-compact-show',open);button.setAttribute('aria-expanded',String(open));};
 setOpen(false);
 button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();setOpen(!control.open);},true);
 control.addEventListener('pointerenter',()=>{if(matchMedia('(hover: hover) and (pointer: fine)').matches)setOpen(true);});
 control.addEventListener('pointerleave',()=>{if(!control.contains(document.activeElement))setOpen(false);});
 control.addEventListener('focusin',event=>{if(event.target!==button||button.matches(':focus-visible'))setOpen(true);});
 control.addEventListener('focusout',()=>queueMicrotask(()=>{if(!control.contains(document.activeElement))setOpen(false);}));
 control.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();button.focus();setOpen(false);}});
 document.addEventListener('pointerdown',event=>{if(!control.contains(event.target))setOpen(false);});
 map.on('drag',()=>setOpen(false));
}
