// Settlements are points, independent of a country's administrative hierarchy.
export const nameKey=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function settlementStatistics(record,key){
 const metrics={},sources={};
 for(const type of ['population','area']){
  const metric=record[type];if(!metric)continue;
  metrics[type]=metric;
  if(metric.source)sources[metric.source]={title:record.provenance?.[type]||`${metric.year||''} census settlement ${type}`.trim(),url:metric.source};
 }
 return {regions:{[key]:metrics},sources};
}
export function enrichPlaces(records,supplement={}){
 const entries=new Map(Object.entries(supplement.places||{}));
 for(const entry of Object.values(supplement.places||{}))for(const alias of entry.aliases||[])if(!entries.has(nameKey(alias)))entries.set(nameKey(alias),entry);
 for(const record of records){const entry=[record.en,...(record.aliases||[])].map(nameKey).map(key=>entries.get(key)).find(Boolean);if(!entry)continue;const former=record.en;if(entry.renameSource&&entry.name)record.en=entry.name;record.names=entry.names;record.flag=entry.flag;record.aliases=[...new Set([former,...(record.aliases||[]),...(entry.aliases||[]),...Object.values(entry.names||{}).map(v=>typeof v==='string'?v:v.name)].filter(Boolean))];}
 return records;
}
export function placeLines(record,language='both'){
 const variants=Object.entries(record.names||{}).filter(([,value])=>value.type!=='historical language label').map(([code,value])=>[code,typeof value==='string'?value:value.name]).filter(([,name])=>name);
 if(language==='en')return [record.en];
 if(language!=='both')return [variants.find(([code])=>code===language)?.[1]||record.en];
 return [...new Set([record.en,...variants.filter(([,name])=>name!==record.en).slice(0,1).map(([,name])=>name)])];
}
// A tenfold population decrease needs 2.4 more zoom levels, without abrupt batches. A record
// without a population can give its own minzoom (Turkey's towns, by rank).
export function settlementZoom(record){
 // The Finnish gazetteer's village relevance is for printed maps, not a city rank.
 if(record.id?.startsWith('FI-NLS-')&&(record.kind==='Village / hamlet'||record.provenance?.gazetteer?.placeType==='3010110'))return 14+Math.max(0,Math.min(3,(record.minzoom||10)-7))/3;
 if(Number.isFinite(record.minzoom))return record.minzoom;const population=Math.max(1,record.population?.value||0);return Math.max(4,Math.min(9.5,5.8+2.4*Math.log10(100000/population)));
}
export function visibleSettlements(records,zoom,bounds,selected){return records.filter(r=>(r.id===selected||zoom>=settlementZoom(r))&&r.center[0]>=bounds.getWest()&&r.center[0]<=bounds.getEast()&&r.center[1]>=bounds.getSouth()&&r.center[1]<=bounds.getNorth()).sort((a,b)=>(b.population?.value||0)-(a.population?.value||0));}
// A stable geographic hierarchy gives each point room on screen. Previously admitted
// points keep priority as the map zooms in; panning cannot reshuffle the visible dots.
// Compute once per country, never while handling a gesture or waiting for worker tiles.
export function settlementDotZooms(records,spacing=36){
 const points=records.map(r=>{const lat=Math.max(-85.051129,Math.min(85.051129,r.center[1]))*Math.PI/180;return {id:r.id,x:((r.center[0]+180)/360%1+1)%1,y:(1-Math.log(Math.tan(Math.PI/4+lat/2))/Math.PI)/2,minzoom:settlementZoom(r),population:r.population?.value||0};}).sort((a,b)=>a.minzoom-b.minzoom||b.population-a.population||String(a.id).localeCompare(String(b.id)));
 const admitted=[],pending=new Set(points),zooms=new Map();
 for(let z=0;z<=20&&pending.size;z+=.25){
  const scale=512*2**z,cells=Math.ceil(scale/spacing),grid=new Map();
  const cell=p=>[Math.floor(p.x*scale/spacing),Math.floor(p.y*scale/spacing)];
  const add=p=>{const [x,y]=cell(p),key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(p);};
  for(const p of admitted)add(p);
  for(const p of pending){
   if(p.minzoom>z)continue;const [x,y]=cell(p);let crowded=false;
   // The extra column covers the partial cell across the antimeridian.
   for(let dx=-2;dx<=2&&!crowded;dx++)for(let dy=-1;dy<=1&&!crowded;dy++)for(const q of grid.get(((x+dx+cells)%cells)+','+(y+dy))||[]){const distance=Math.abs(p.x-q.x);if(Math.hypot(Math.min(distance,1-distance)*scale,(p.y-q.y)*scale)<spacing){crowded=true;break;}}
   if(crowded)continue;zooms.set(p.id,z+.25);admitted.push(p);add(p);pending.delete(p);
  }
 }
 // Coincident points stay searchable and selectable without stacking their dots.
 for(const p of pending)zooms.set(p.id,25);return zooms;
}
export function settlementFeatures(records){const zooms=settlementDotZooms(records);return {type:'FeatureCollection',features:records.map(r=>({type:'Feature',properties:{id:r.id,minzoom:settlementZoom(r),dotzoom:zooms.get(r.id)},geometry:{type:'Point',coordinates:r.center}}))};}
// Use camera-only paint on separate admission tiers. Composite feature/zoom paint
// is baked at a tile's zoom and can leave old close-up tiles opaque during zoom-out.
// Layer minzoom and camera opacity both use the current frame, even for stale tiles.
export function settlementDotOpacity(dotzoom){return ['interpolate',['linear'],['zoom'],dotzoom-.25,0,dotzoom,1];}
export function settlementDotLayers(id,features,color){
 const paint={'circle-radius':['interpolate',['linear'],['zoom'],4,2,10,4],'circle-color':color,'circle-stroke-color':'#fff','circle-stroke-width':1};
 const tiers=[...new Set(features.features.map(f=>f.properties.dotzoom))].filter(z=>z<=21).sort((a,b)=>a-b);
 return [...tiers.map(z=>({id:id+'-density-'+z*4,type:'circle',source:id,minzoom:z-.25,filter:['==',['get','dotzoom'],z],layout:{visibility:'none'},paint:{...paint,'circle-opacity':settlementDotOpacity(z),'circle-stroke-opacity':settlementDotOpacity(z),'circle-opacity-transition':{duration:0},'circle-stroke-opacity-transition':{duration:0}}})),{id,type:'circle',source:id,filter:['==',['get','id'],''],layout:{visibility:'none'},paint}];
}
export function settlementDotVisible(feature,zoom,selected){return feature.properties.id===selected||zoom>feature.properties.dotzoom-.25;}
