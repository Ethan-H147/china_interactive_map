export function labelLines(english,local,language='both'){english=english.replace(/\bAutonomous Prefecture\b/gi,'A.P.');return language==='en'?[english]:language==='local'?[local||english]:[english,local].filter((s,i,a)=>s&&a.indexOf(s)===i);}
export function placeLabels(candidates,width,height){
 const occupied=[],accepted=[];
 for(const item of [...candidates].sort((a,b)=>Number(!!b.selected)-Number(!!a.selected)||String(a.id).localeCompare(String(b.id)))){
  const {x,y,w,h}=item;if(x-w/2<12||x+w/2>width-12||y-h/2<72||y+h/2>height-44)continue;
  const r={left:x-w/2-7,right:x+w/2+7,top:y-h/2-5,bottom:y+h/2+5};
  if(occupied.some(o=>r.left<o.right&&r.right>o.left&&r.top<o.bottom&&r.bottom>o.top))continue;
  occupied.push(r);accepted.push(item);
 }return accepted;
}
let language='both',measure;
export function getLanguage(){return language;}
export function setLanguage(value){language=['en','local','both'].includes(value)?value:'both';document.querySelectorAll('[data-label-language]').forEach(el=>el.value=language);}
export function render(map,candidates,className){
 measure??=document.createElement('canvas').getContext('2d');
 const items=candidates.map(item=>{
  const lines=labelLines(item.en,item.local,language),point=map.project(item.center);
  const widths=lines.map((line,i)=>{measure.font=(item.selected?'600 ':'')+(i?'14px Arial':'16px Arial');return measure.measureText(line).width;});
  return {...item,lines,x:point.x,y:point.y,w:Math.max(...widths)+4,h:lines.length*21};
 });
 return placeLabels(items,map.getContainer().clientWidth,map.getContainer().clientHeight).map(item=>{
  const el=document.createElement('div');el.className=className;el.classList.toggle('selected-label',!!item.selected);el.textContent=item.lines[0];
  for(const line of item.lines.slice(1)){const small=document.createElement('small');small.textContent=line;el.append(small);}
  return new window.maplibregl.Marker({element:el,anchor:'center'}).setLngLat(item.center).addTo(map);
 });
}

