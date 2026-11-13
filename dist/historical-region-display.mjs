import {membershipFilter} from './interaction-policy.mjs';
import {internationalBorderPaint} from './adaptive-lines.mjs';
import {compactUrl,decodeData,fetchBytes} from './geo-pack.mjs';
import {mapPalette} from './map-palette.mjs';

const included=(field,ids)=>membershipFilter(field,ids);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const providers=['country-border-previews','globe-overview-borders'];
export function regionalProviderFilter(base,keys,owner){
 const affected=['all',['==',['get','pair'],'CAN-USA'],['==',['get',owner],'united-states'+(owner==='previewLayer'?'-international':'')],['any',...keys.map(k=>['all',...['pair','resolvedFrontier','visibleZoom'].map((field,i)=>['==',['get',field],k[i]])])]];
 return ['all',...(base?[base]:[]),['!',affected]];
}

// This renderer owns its sources and only filters the specific shared features
// for which it draws outside-region replacements. It restores those filters on exit.
export function createHistoricalRegion(map,{country,base,packShapes,shapeAt,ownLayers}){
 const prefix=country+'-history-region-',members=['land','sea','displayFaces','displayEdges','displayBorders','outsidePrecise','outsideCoarse'];
 const layerNames=['land','sea','fill','lines','frontiers','outer','precise','coarse'];
 const ids=Object.fromEntries(layerNames.map(k=>[k,prefix+k])),sources=Object.fromEntries(members.map(k=>[k,prefix+k]));
 for(const id of Object.values(ids))ownLayers.add(id);
 let unified=false;let data,url,shapes,active=false,committed=false,syncing=false,listening=false;
 const saved=new Map();
 const inBox=p=>{const x=((p.lng+540)%360+360)%360-180;return x>=data.bounds[0]&&x<=data.bounds[2]&&p.lat>=data.bounds[1]&&p.lat<=data.bounds[3];};
 function sync(){
  if(!active||syncing)return;syncing=true;
  try{
   if(!committed&&members.every(k=>map.getSource(sources[k])&&map.isSourceLoaded(sources[k])))committed=true;
   if(!committed)return;
   for(const id of providers){if(!map.getLayer(id))continue;const current=map.getFilter(id),previous=saved.get(id);if(previous&&same(current,previous.applied))continue;
    const applied=regionalProviderFilter(current,data.affected.providerKeys,id===providers[0]?'previewLayer':'overviewOwner');saved.set(id,{base:current,applied});map.setFilter(id,applied);
   }
   const coarse=globalThis.AtlasGlobeOverviewController?.snapshot().borders?.coarse??map.getZoom()<4;
   for(const [key,visible]of [['precise',!coarse],['coarse',coarse],['outer',true]]){const value=visible?'visible':'none';if(map.getLayoutProperty(ids[key],'visibility')!==value)map.setLayoutProperty(ids[key],'visibility',value);}
  }finally{syncing=false;}
 }
 return {
  async load(history){
   if(country!=='united-states')return;
   const bytes=await fetchBytes(compactUrl(base+'history/upper-peninsula.bin')),loaded=await decodeData(bytes);
   if(loaded.historySource!==history.source.sha256||loaded.historyFaces!==(history.faceCount??history.shapes.length))throw Error('Upper Peninsula display does not match the retained history');
   unified=history.display;data=loaded;url=URL.createObjectURL(new Blob([bytes]));shapes=packShapes(data.faces.features);
  },
  pick(point){if(!data||!inBox(map.unproject(point)))return undefined;return shapeAt(map,shapes,point)?.properties.f??null;},
  exclude(field,filter){return data?['all',filter,['!',included(field,data.affected[field==='f'?'faces':field==='a'?'edges':'borders'])]]:filter;},
  draw(config,colors,linePaint){
   if(!data)return;active=true;
   if(!map.getSource(sources.land)){
    for(const member of members)map.addSource(sources[member],{type:'geojson',data:'atlas-data://'+prefix+'?url='+encodeURIComponent(url)+'&member='+member,tolerance:0,...(member==='sea'?{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}:{})});
    const add=(key,type,member,paint,metadata={atlas:{role:type==='line'?'border':'fill'}})=>map.addLayer({id:ids[key],type,source:sources[member],metadata,...(type==='line'?{layout:{'line-cap':'round','line-join':'round'},filter:included('a',[])}:{}),paint});
    add('land','fill','land',{'fill-color':mapPalette.country,'fill-antialias':false});
    add('fill','fill','displayFaces',{'fill-color':'rgba(0,0,0,0)','fill-antialias':false});
    add('sea','fill','sea',{'fill-color':map.getPaintProperty('background','background-color'),'fill-antialias':false},{atlas:{role:'water',sea:true,satellite:{fill:'fade'}}});
    add('lines','line','displayEdges',linePaint);add('frontiers','line','displayEdges',internationalBorderPaint());add('outer','line','displayBorders',internationalBorderPaint());
    add('precise','line','outsidePrecise',internationalBorderPaint());add('coarse','line','outsideCoarse',internationalBorderPaint());
    for(const k of ['precise','coarse'])map.setFilter(ids[k],null);
    for(const k of ['precise','coarse','outer'])map.setLayoutProperty(ids[k],'visibility','none');
   }
   map.setPaintProperty(ids.fill,'fill-color',colors);map.setPaintProperty(ids.fill,'fill-opacity',unified?0:1);
   const lines=[],frontiers=[];
   for(const f of data.displayEdges.features){const {a,l,r}=f.properties,L=config.face[l],R=r>=0?config.face[r]:-1;if(L>=0&&R>=0&&L!==R)(config.units[L].sovereign===config.units[R].sovereign?lines:frontiers).push(a);}
   const old=new Set(config.borders),outer=data.displayBorders.features.filter(f=>{const p=f.properties;if(p.face===undefined)return old.has(p.b);const u=config.units[config.face[p.face]];return u&&u.sovereign!=='Britain'&&u.sovereign!=='Contested';}).map(f=>f.properties.b);
   map.setFilter(ids.lines,included('a',[]));map.setFilter(ids.frontiers,included('a',[]));map.setFilter(ids.outer,included('b',outer));
   if(!listening){map.on('render',sync);listening=true;}sync();
  },
  remove(){active=false;committed=false;if(listening){map.off('render',sync);listening=false;}
   for(const [id,filter]of saved)if(map.getLayer(id)&&same(map.getFilter(id),filter.applied))map.setFilter(id,filter.base??null);saved.clear();
   for(const id of Object.values(ids))if(map.getLayer(id))map.removeLayer(id);for(const id of Object.values(sources))if(map.getSource(id))map.removeSource(id);
  },
  dispose(){this.remove();if(url)URL.revokeObjectURL(url);data=null;shapes=null;url=null;}
 };
}
