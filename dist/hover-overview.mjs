export function overviewLines(place){
 if(!place)return [];
 const names=[...new Set([place.en,...(place.overviewNames||(place.names?Object.values(place.names).filter(v=>v&&v.type!=='historical language label').map(v=>typeof v==='string'?v:v.name):[place.local||place.ko||place.mn||place.ja]))].filter(Boolean))];
 return [names[0],names.slice(1).join(' · '),place.kind||place.type].filter(Boolean);
}

// One overview owns canvas hits and DOM labels for every country adapter.
export function createHoverOverview(map,{resolve,blocked=()=>false,document:doc=document}){
 const container=map.getContainer(),tip=doc.createElement('div');
 tip.className='region-tooltip gpu-tooltip atlas-hover-overview';tip.hidden=true;tip.id='atlas-hover-overview';tip.setAttribute('role','tooltip');container.append(tip);
 let current=null;
 function clear(){current=null;tip.hidden=true;map.getCanvas().style.cursor='';}
 function show(point,id){
  if(blocked()||map.isMoving()){clear();return;}
  // MapLibre accepts a coordinate array or its own Point instance. A plain
  // {x,y} object is treated as options and queries the entire viewport.
  const place=resolve([point.x,point.y],id),lines=overviewLines(place);if(!lines.length){clear();return;}
  const key=lines.join('\n');if(current!==key){tip.replaceChildren();lines.forEach((line,i)=>{const el=doc.createElement(i?'small':'div');el.textContent=line;tip.append(el);});current=key;}
  tip.hidden=false;map.getCanvas().style.cursor='pointer';
  tip.style.left=Math.max(8,Math.min(point.x+12,container.clientWidth-tip.offsetWidth-10))+'px';
  tip.style.top=Math.max(8,Math.min(point.y-tip.offsetHeight-12,container.clientHeight-tip.offsetHeight-8))+'px';
 }
 const labelOf=target=>target?.closest?.('[data-atlas-place]');
 const move=event=>{if(event.pointerType==='touch'){clear();return;}const label=labelOf(event.target);if(!label&&event.target!==map.getCanvas()){clear();return;}const bounds=container.getBoundingClientRect();show({x:event.clientX-bounds.left,y:event.clientY-bounds.top},label?.dataset.atlasPlace);};
 const focus=event=>{const label=labelOf(event.target);if(!label)return;const box=label.getBoundingClientRect(),bounds=container.getBoundingClientRect();show({x:(box.left+box.right)/2-bounds.left,y:box.top-bounds.top},label.dataset.atlasPlace);};
 container.addEventListener('pointermove',move);container.addEventListener('pointerleave',clear);container.addEventListener('focusin',focus);container.addEventListener('focusout',clear);container.addEventListener('pointerdown',clear);
 map.on('movestart',clear);map.on('resize',clear);
 return {clear,show,destroy(){clear();tip.remove();for(const [type,fn] of [['pointermove',move],['pointerleave',clear],['focusin',focus],['focusout',clear],['pointerdown',clear]])container.removeEventListener(type,fn);map.off('movestart',clear);map.off('resize',clear);}};
}
