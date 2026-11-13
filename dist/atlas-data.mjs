import {disjointScopes} from './context-visibility.mjs';
// Loads the data behind an atlas-data:// source URL (geo-pack.mjs addWorkerSource) inside
// MapLibre's workers (maplibre-worker-protocols.mjs), so the page never copies the geometry.
// atlas-data://<source>?url=<blob URL>[&transform=parts|coastal|outline|selection-outline][&member=<key>]
import {decodeData,createGeoDecoder,isGeoPack} from './geo-pack.mjs';
import {polygonParts} from './polygon-parts.mjs';
import {contextPolygons,contextLinePaths} from './modern-context-geometry.mjs';
import {splitCoastalDetail} from './coastal-detail.mjs';
import {lineData} from './adaptive-lines.mjs';
import {compactMosaic,compactRegions,regionFeatures,selectionLineData,unitOutline,unitShape} from './outline-detail.mjs';

const transforms={parts:polygonParts,outline:lineData,'selection-outline':selectionLineData,coastal:data=>splitCoastalDetail(data,{context:true})};
// One selected period retained briefly for outlines without precomputed geometry.
const mosaics=new Map();
const expiry=new Map();
function expire(cache,key){const id=(cache===mosaics?'m:':'r:')+key;clearTimeout(expiry.get(id));expiry.set(id,setTimeout(()=>{cache.delete(key);expiry.delete(id);},10000));}
const bytes=async (url,select,options={})=>{
 const response=await fetch(url,{signal:options.signal});
 if(!response.ok)throw Error(url+': '+response.status);
 return decodeData(await response.arrayBuffer(),{...options,select});
};
function mosaicFor(params){
 const url=params.get('url'),configs=params.get('configs')||url,config=+params.get('config'),key=url+':'+config;let mosaic=mosaics.get(key);
 if(!mosaic){mosaic=(async()=>{const select=d=>({faces:d.faces,arcs:{...d.arcs,features:d.arcs.features.filter(f=>!f.properties.borderOnly)},configs:d.configs?.map((c,i)=>i===config?{face:c.face,units:c.units,selectionLines:c.selectionLines}:{face:[]})});const decoded=await bytes(url,select);return compactMosaic(decoded,(configs===url?decoded:await bytes(configs,d=>({configs:d.configs.map((c,i)=>i===config?{face:c.face,units:c.units,selectionLines:c.selectionLines}:{face:[]})}))).configs);})();mosaics.set(key,mosaic);if(mosaics.size>1)mosaics.delete(mosaics.keys().next().value);mosaic.catch(()=>{if(mosaics.get(key)===mosaic)mosaics.delete(key);});}
 expire(mosaics,key);return mosaic;
}
// Compact copies of dated region files, by region ID, the two most recently used.
const regionFiles=new Map();
function regionsFor(url){
 let regions=regionFiles.get(url);
 if(regions)regionFiles.delete(url);
 else{regions=bytes(url,d=>d.regions).then(decoded=>compactRegions(decoded));regions.catch(()=>{if(regionFiles.get(url)===regions)regionFiles.delete(url);});}
 regionFiles.set(url,regions);if(regionFiles.size>2)regionFiles.delete(regionFiles.keys().next().value);
 expire(regionFiles,url);return regions;
}
// Expand only the selected unit's paths. The worker releases this temporary
// geometry after handing the outline to its map source.
async function historicalOutline(params,signal){
 const config=+params.get('config'),unit=+params.get('unit');
 const scope=params.has('scope')?params.get('scope').split(',').map(Number):undefined;
 const scoped=data=>{
  if(!scope)return data;
  data.faces={...data.faces,features:data.faces.features.flatMap(feature=>{const parts=contextPolygons([feature],scope,null,null,null,{preserveProperties:true,clipThreshold:0});return parts.length?[{...feature,geometry:{type:'MultiPolygon',coordinates:parts.map(part=>part.geometry.coordinates)}}]:[];})};
  data.arcs={...data.arcs,features:data.arcs.features.flatMap(feature=>contextLinePaths([feature.geometry.coordinates],scope).map(coordinates=>({...feature,geometry:{type:'LineString',coordinates}})))};
  return data;
 };

 const replacements=params.has('coasts')?JSON.parse(params.get('coasts')):params.get('coast')?[{url:params.get('coast'),region:params.get('coastRegion')}]:[];
 let selected,affected;
 const relevant=({properties:{l,r}})=>selected.has(l)||selected.has(r);
 const base=await bytes(params.get('url'),d=>{
  selected=new Set(d.configs[config].face.flatMap((u,f)=>u===unit?[f]:[]));
  affected=new Set(replacements.flatMap(({region})=>d.coasts.find(entry=>entry.id===region)?.faces||[]));
  return {
   faces:{...d.faces,features:d.faces.features.filter(({properties:{f}})=>selected.has(f)&&!affected.has(f))},
   arcs:{...d.arcs,features:d.arcs.features.filter(f=>!f.properties.borderOnly&&relevant(f)&&!affected.has(f.properties.l)&&!affected.has(f.properties.r))}
  };
 },{signal,flatPaths:true,scope});
 scoped(base);
 for(const {url} of replacements){
  const detail=await bytes(url,d=>({
   faces:{...d.faces,features:d.faces.features.filter(({properties:{f}})=>selected.has(f))},
   arcs:{...d.arcs,features:d.arcs.features.filter(relevant)}
  }),{signal,flatPaths:true,scope});
  scoped(detail);
  base.faces.features=base.faces.features.concat(detail.faces.features);
  base.arcs.features=base.arcs.features.concat(detail.arcs.features);
 }
 signal?.throwIfAborted();
 const ids=new Map(base.faces.features.map((f,i)=>[f.properties.f,i]));
 for(const {properties:p} of base.arcs.features){p.l=ids.get(p.l)??-1;p.r=ids.get(p.r)??-1;}
 const assignment=new Int32Array(ids.size);
 return unitOutline(compactMosaic(base,[{face:assignment}]),0,0);
}
// One reusable packed snapshot per map worker. Repeated pans previously
// inflated and parsed the same 44 MB file for each source and every new view.
// Only packed paths/point tables are retained; expanded GeoJSON stays local.
let historicalPack;
async function historicalDecoder(url,signal){
 let entry=historicalPack;
 if(entry?.url!==url){
  clearTimeout(entry?.timer);entry?.controller.abort();entry=historicalPack={url,controller:new AbortController()};
  entry.promise=(async()=>{
   const response=await fetch(url,{signal:entry.controller.signal});if(!response.ok)throw Error(url+': '+response.status);
   let data=new Uint8Array(await response.arrayBuffer());
   if(data[0]===31&&data[1]===139)data=new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'),{signal:entry.controller.signal})).arrayBuffer());
   if(data.length>64*1024*1024||!isGeoPack(data))return null;
   return createGeoDecoder(data);
  })().catch(error=>{if(historicalPack===entry)historicalPack=null;throw error;});
 }
 clearTimeout(entry.timer);entry.timer=setTimeout(()=>{if(historicalPack===entry){entry.controller.abort();historicalPack=null;}},10000);entry.timer.unref?.();
 const decoder=await entry.promise;signal?.throwIfAborted();return decoder;
}
export async function loadAtlasData(url,signal){
 const params=new URLSearchParams(url.slice(url.indexOf('?')+1)),transform=transforms[params.get('transform')]||(/-selection-edges(?:\?|$)/.test(url)?selectionLineData:null);
 if(params.has('prepared'))return bytes(params.get('url'),undefined,{signal});
 if(params.get('transform')==='historical-outline')return historicalOutline(params,signal);
 // A supplied outline needs only this unit's coordinates, not a whole mosaic.
 if(params.get('transform')==='unit-outline'&&params.has('exact')){
  const outline=await bytes(params.get('configs')||params.get('url'),d=>{const c=d.configs[+params.get('config')];return c.selectionLines?.[c.units[+params.get('unit')]?.id];});
  if(outline)return outline;
 }
 if(['unit-outline','unit-shape'].includes(params.get('transform'))){const mosaic=await mosaicFor(params),config=+params.get('config'),unit=+params.get('unit');return params.get('transform')==='unit-outline'?unitOutline(mosaic,config,unit):unitShape(mosaic,config,unit);}
 // One region of a dated file (historic-borders.mjs): the selected region's outline or shape
 // comes from the worker's compact copy; an empty unit only builds that copy.
 if(params.get('member')==='regions'&&params.has('unit')&&!params.has('interior')){const data={type:'FeatureCollection',features:regionFeatures(await regionsFor(params.get('url')),params.get('unit'))};return transform?transform(data):data;}
 if(params.get('transform')==='historical-water'){
  const scopes=params.getAll('scope').map(value=>value.split(',').map(Number));
  const data=await bytes(params.get('url'),undefined,{signal,flatPaths:true,scope:scopes.length>1?scopes:scopes[0]});
  return polygonParts({...data,features:disjointScopes(scopes).flatMap(window=>contextPolygons(data.features,window,null,null,null,{preserveProperties:true,clipThreshold:0}))});
 }
 if(params.get('transform')==='coast-display'){
  let {faces,water,arcs}=await bytes(params.get('url'),d=>({faces:d.faces,water:d.water,
   ...(params.has('borders')?{arcs:{...d.arcs,features:d.arcs.features.flatMap((f,i)=>
    f.properties.coast===false||f.properties.r>=0?[{...f,properties:{...f.properties,edge:i}}]:[])}}:{})}),{signal,flatPaths:params.has('scope'),scope:params.has('scope')?params.get('scope').split(',').map(Number):undefined});
  if(params.has('scope')){
   const scope=params.get('scope').split(',').map(Number),clip=features=>contextPolygons(features,scope,null,null,null,{preserveProperties:true});
   faces={...faces,features:clip(faces.features)};
   water={...water,features:clip(water.features)};
   if(arcs)arcs={...arcs,features:arcs.features.flatMap(feature=>contextLinePaths([feature.geometry.coordinates],scope).map(coordinates=>({...feature,geometry:{...feature.geometry,coordinates}})))};
  }
  return polygonParts({...faces,features:[...faces.features,...water.features.map(f=>({...f,properties:{water:true}})),...(arcs?.features||[])]});
 }
 const reuse=url.startsWith('atlas-data://united-kingdom-history?')||url.startsWith('atlas-data://united-kingdom-original-history?');
 const decode=reuse?await historicalDecoder(params.get('url'),signal):null;
 const response=decode?null:await fetch(params.get('url'),{signal});if(response&&!response.ok)throw Error(url+': '+response.status);
 const scopes=params.getAll('scope').map(value=>value.split(',').map(Number)),scope=scopes.length>1?scopes:scopes[0];
 // member: one collection of a file that holds several (elections.mjs, historic borders).
 const options={signal,select:d=>{
  let member=params.has('member')?d[params.get('member')]:d;
  // Historical cells for other periods and reused host land have no visible
  // pixels. Exclude them before expanding paths and building the tile index.
  if(params.get('member')==='faces'&&params.has('faceConfig')){
   const config=d.configs[+params.get('faceConfig')],gray=new Set(config.modernLand||[]),skipHosts=params.has('skipHosts');
   member={...member,features:member.features.filter(({properties:p})=>
    (!skipHosts||!p.hostId)&&(config.fullLand||config.face[p.f]>=0||gray.has(p.f)))};
  }
  // Unselected history draws shared land borders. Coast paths are only
  // needed for the selected outline, and stay packed until then.
  return params.has('adjacent')?{...member,features:member.features.filter(f=>!f.properties.selectionOnly&&(f.properties.coast===false||f.properties.r>=0))}:member;
 },scope,flatPaths:!!scope};
 let data=decode?decode(options).value:await decodeData(await response.arrayBuffer(),options);
 if(scope){
  data={...data,features:disjointScopes(scopes).flatMap(window=>data.features.flatMap(feature=>{
   const g=feature.geometry;
   if(g?.type==='Polygon'||g?.type==='MultiPolygon')return contextPolygons([feature],window,null,null,null,{preserveProperties:true,clipThreshold:0});
   if(g?.type==='LineString'||g?.type==='MultiLineString')return contextLinePaths(g.type==='LineString'?[g.coordinates]:g.coordinates,window).map(coordinates=>({...feature,geometry:{type:'LineString',coordinates}}));
   return [feature];
  }))};
 }
 const interior=params.has('interior'),unit=params.get('unit');
 if(interior)data={...data,features:data.features.filter(f=>f.properties.b).map((f,i)=>({...f,properties:{...f.properties,edge:i}}))};
 if(unit)data={...data,features:data.features.filter(({properties:p})=>interior?p.a===unit||p.b===unit:p.id===unit)};
 return transform?transform(data):data;
}

