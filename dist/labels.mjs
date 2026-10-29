import {LABEL_CANDIDATE_LIMIT} from './interaction-policy.mjs';
import {labelFitsBoundary} from './label-boundary-fit.mjs';
import {getSettings} from './settings.mjs';
export {createHoverOverview} from './hover-overview.mjs';
export function labelLines(english,local,language='both',district=false){
 if(district&&!/\b(?:District|Dist\.)$/i.test(english))english+=' District';
 english=english.replace(/\bAutonomous Prefecture\b/gi,'A.P.').replace(/\bDistrict\b(?!\s+of Columbia\b)/gi,'Dist.');
 const compact=value=>String(value||'').replace(/,\s*(?:Kreisfreie Stadt|Landkreis|Stadtkreis)$/i,'').replace(/^Bangsamoro(?: Autonomous Region in Muslim Mindanao)?(?:\s*·\s*BARMM)?$/i,'BARMM').replace(/\bKabupaten\b/gi,'Kab.');
 english=compact(english);local=compact(local);
 return language==='en'?[english]:language==='local'?[local||english]:[english,local].filter((s,i,a)=>s&&a.indexOf(s)===i);
}
export function placeLabels(candidates,width,height){
 const occupied=[],accepted=[];
 for(const item of [...candidates].sort((a,b)=>Number(!!b.selected)-Number(!!a.selected)||(b.priority||0)-(a.priority||0)||String(a.id).localeCompare(String(b.id)))){
  const {x,y,w,h}=item;if(x-w/2<12||x+w/2>width-12||y-h/2<72||y+h/2>height-44)continue;
  const r={left:x-w/2-7,right:x+w/2+7,top:y-h/2-5,bottom:y+h/2+5};
  if(occupied.some(o=>r.left<o.right&&r.right>o.left&&r.top<o.bottom&&r.bottom>o.top))continue;
  occupied.push(r);accepted.push(item);
 }return accepted;
}
// Text widths per font and line; labels are placed again after every map movement.
let language='both',measure;const widths=new Map();
function textWidth(font,text){const key=font+'|'+text;let width=widths.get(key);if(width===undefined){measure.font=font;width=measure.measureText(text).width;widths.set(key,width);}return width;}
export function getLanguage(){return language;}
export function setLanguage(value){language=['en','local','both'].includes(value)?value:'both';document.querySelectorAll('[data-label-language]').forEach(el=>el.value=language);}
export function render(map,candidates,className){
 if(globalThis.AtlasPerformanceController?.labelsSuppressed)return [];
 const settings=getSettings(),large=settings.labelSize==='large';candidates=candidates.filter(item=>item.countryLabel?settings.countryNames:settings.placeNames);
 measure??=document.createElement('canvas').getContext('2d');
 // On the globe, places on the far side, or near its edge where they project poorly, are left out.
 if(map.getProjection?.()?.type==='globe'){const c=map.getCenter(),r=Math.PI/180;candidates=candidates.filter(({center:[x,y]})=>Math.sin(y*r)*Math.sin(c.lat*r)+Math.cos(y*r)*Math.cos(c.lat*r)*Math.cos((x-c.lng)*r)>Math.cos(65*r));}
 const items=candidates.sort((a,b)=>Number(!!b.selected)-Number(!!a.selected)||(b.priority||0)-(a.priority||0)||String(a.id).localeCompare(String(b.id))).map(item=>{
  const point=map.project(item.center),font=i=>(item.selected?'600 ':'')+(large?(i?'16px Arial':'18px Arial'):(i?'14px Arial':'16px Arial'));
  let lines=item.lines||labelLines(item.en,item.local,item.countryLabel?settings.countryLanguage:language,item.district);
  let w=Math.max(...lines.map((line,i)=>textWidth(font(i),line)));
  if(item.shortMapLabel&&item.shortMapLabel!==item.en){
   const container=map.getContainer(),height=lines.length*(large?24:21);
   const onScreen=point.x-w/2>=12&&point.x+w/2<=container.clientWidth-12&&point.y-height/2>=72&&point.y+height/2<=container.clientHeight-44;
   if(!onScreen||!labelFitsBoundary(map,item,point,w,height)){
    lines=[item.shortMapLabel];w=textWidth(font(0),item.shortMapLabel);
   }
  }
  return {...item,lines,x:point.x,y:point.y,w:w+4,h:lines.length*(large?24:21)};
 }).filter(({x,y,w,h})=>{const {clientWidth:width,clientHeight:height}=map.getContainer();return x-w/2>=12&&x+w/2<=width-12&&y-h/2>=72&&y+h/2<=height-44;}).slice(0,LABEL_CANDIDATE_LIMIT);
 return placeLabels(items,map.getContainer().clientWidth,map.getContainer().clientHeight).map(item=>{
  const el=document.createElement('div');el.dataset.atlasPlace=String(item.id);el.className=item.className||className;if(item.onClick){el.setAttribute('role','button');el.tabIndex=0;el.onclick=e=>{e.stopPropagation();item.onClick();};el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();item.onClick();}};}el.classList.toggle('selected-label',!!item.selected);el.textContent=item.lines[0];
  if(item.lang)el.lang=item.lang;
  for(const line of item.lines.slice(1)){const small=document.createElement('small');small.textContent=line;el.append(small);}
  return new window.maplibregl.Marker({element:el,anchor:'center'}).setLngLat(item.center).addTo(map);
 });
}


// Country names use their own land anchors, independent of camera framing and loaded adapters.
export function countryLabelCandidates(active,allows=()=>true,centerLongitude){
 if(globalThis.AtlasCountries.countries[active]?.snapshot)return [];
 return globalThis.AtlasCountries.ids.filter(id=>id!==active&&allows(id)).flatMap(id=>globalThis.AtlasCountries.countries[id].labelPoints.map(label=>({...label,country:id,countryLabel:true,center:Number.isFinite(centerLongitude)?[label.center[0]+360*Math.round((centerLongitude-label.center[0])/360),label.center[1]]:label.center})));
}
export function createCountryLabels(map,{allows=()=>true}={}){
 let markers=[];
 const clear=()=>{markers.forEach(marker=>marker.remove());markers=[];};
 return {clear,sync(active){clear();const candidates=countryLabelCandidates(active,allows,map.getRenderWorldCopies?.()?map.getCenter().lng:undefined);markers=render(map,candidates,'province-label');for(const marker of markers)marker.getElement().dataset.atlasCountryLabel='true';}};
}
