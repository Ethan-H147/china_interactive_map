import {getSettings} from './settings.mjs';
import {createFrameTask} from './pointer-performance.mjs';

export function overviewLines(place){
 if(!place)return [];
 const names=[...new Set([place.en,...(place.overviewNames||(place.names?Object.values(place.names).filter(v=>v&&v.type!=='historical language label').map(v=>typeof v==='string'?v:v.name):[place.local||place.ko||place.mn||place.ja]))].filter(Boolean))];
 return [names[0],names.slice(1).join(' / '),place.kind||place.type].filter(Boolean);
}

// One overview owns canvas hits and DOM labels for every country adapter.
export function createHoverOverview(map,{resolve,blocked=()=>false,document:doc=document,id='atlas-hover-overview'}){
 const container=map.getContainer(),tip=doc.createElement('div');
 tip.className='region-tooltip gpu-tooltip atlas-hover-overview';tip.hidden=true;tip.id=id;tip.setAttribute('role','tooltip');container.append(tip);
 let current=null,size=null;
 const update=createFrameTask(({clientX,clientY,id})=>{const bounds=container.getBoundingClientRect();show({x:clientX-bounds.left,y:clientY-bounds.top},id);});
 function clear(){update.cancel();current=null;size=null;tip.hidden=true;map.getCanvas().style.cursor='';}
 function show(point,id){
  if(!getSettings().hoverInfo||blocked()||map.isMoving()){clear();return;}
  // MapLibre accepts a coordinate array or its own Point instance. A plain
  // {x,y} object is treated as options and queries the entire viewport.
  const place=resolve([point.x,point.y],id),lines=overviewLines(place);if(!lines.length){clear();return;}
  const key=lines.join('\n');if(current!==key){size=null;tip.replaceChildren();lines.forEach((line,i)=>{const el=doc.createElement(i?'small':'div');el.textContent=line;tip.append(el);});current=key;}
  tip.hidden=false;map.getCanvas().style.cursor='pointer';
  size??={width:tip.offsetWidth,height:tip.offsetHeight};
  tip.style.left=Math.max(8,Math.min(point.x+12,container.clientWidth-size.width-10))+'px';
  tip.style.top=Math.max(8,Math.min(point.y-size.height-12,container.clientHeight-size.height-8))+'px';
 }
 const labelOf=target=>target?.closest?.('[data-atlas-place]');
 const move=event=>{if(event.pointerType==='touch'){clear();return;}const label=labelOf(event.target);if(!label&&event.target!==map.getCanvas()){clear();return;}update({clientX:event.clientX,clientY:event.clientY,id:label?.dataset.atlasPlace});};
 const focus=event=>{update.cancel();const label=labelOf(event.target);if(!label)return;const box=label.getBoundingClientRect(),bounds=container.getBoundingClientRect();show({x:(box.left+box.right)/2-bounds.left,y:box.top-bounds.top},label.dataset.atlasPlace);};
 container.addEventListener('pointermove',move);container.addEventListener('pointerleave',clear);container.addEventListener('focusin',focus);container.addEventListener('focusout',clear);container.addEventListener('pointerdown',clear);
 const settingsChanged=()=>{if(!getSettings().hoverInfo)clear();};
 globalThis.addEventListener?.('atlas-settings-change',settingsChanged);
 map.on('movestart',clear);map.on('resize',clear);
 return {clear,show,destroy(){globalThis.removeEventListener?.('atlas-settings-change',settingsChanged);clear();tip.remove();for(const [type,fn] of [['pointermove',move],['pointerleave',clear],['focusin',focus],['focusout',clear],['pointerdown',clear]])container.removeEventListener(type,fn);map.off('movestart',clear);map.off('resize',clear);}};
}
