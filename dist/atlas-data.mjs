// Loads the data behind an atlas-data:// source URL (geo-pack.mjs addWorkerSource) inside
// MapLibre's workers (maplibre-worker-protocols.mjs), so the page never copies the geometry.
// atlas-data://<source>?url=<blob URL>[&transform=parts|coastal|outline|selection-outline][&member=<key>]
import {decodeData} from './geo-pack.mjs';
import {polygonParts} from './polygon-parts.mjs';
import {splitCoastalDetail} from './coastal-detail.mjs';
import {lineData} from './adaptive-lines.mjs';
import {compactMosaic,compactRegions,regionFeatures,selectionLineData,unitOutline,unitShape} from './outline-detail.mjs';

const transforms={parts:polygonParts,outline:lineData,'selection-outline':selectionLineData,coastal:data=>splitCoastalDetail(data,{context:true})};
// One selected period retained briefly for outlines without precomputed geometry.
const mosaics=new Map();
const expiry=new Map();
function expire(cache,key){const id=(cache===mosaics?'m:':'r:')+key;clearTimeout(expiry.get(id));expiry.set(id,setTimeout(()=>{cache.delete(key);expiry.delete(id);},10000));}
const bytes=async (url,select)=>{const response=await fetch(url);if(!response.ok)throw Error(url+': '+response.status);return decodeData(await response.arrayBuffer(),{select});};
function mosaicFor(params){
 const url=params.get('url'),configs=params.get('configs')||url,config=+params.get('config'),key=url+':'+config;let mosaic=mosaics.get(key);
 if(!mosaic){mosaic=(async()=>{const select=d=>({faces:d.faces,arcs:d.arcs,configs:d.configs?.map((c,i)=>i===config?{face:c.face,units:c.units,selectionLines:c.selectionLines}:{face:[]})});const decoded=await bytes(url,select);return compactMosaic(decoded,(configs===url?decoded:await bytes(configs,d=>({configs:d.configs.map((c,i)=>i===config?{face:c.face,units:c.units,selectionLines:c.selectionLines}:{face:[]})}))).configs);})();mosaics.set(key,mosaic);if(mosaics.size>1)mosaics.delete(mosaics.keys().next().value);mosaic.catch(()=>{if(mosaics.get(key)===mosaic)mosaics.delete(key);});}
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
export async function loadAtlasData(url){
 const params=new URLSearchParams(url.slice(url.indexOf('?')+1)),transform=transforms[params.get('transform')]||(/-selection-edges(?:\?|$)/.test(url)?selectionLineData:null);
 // A supplied outline needs only this unit's coordinates, not a whole mosaic.
 if(params.get('transform')==='unit-outline'&&params.has('exact')){
  const outline=await bytes(params.get('configs')||params.get('url'),d=>{const c=d.configs[+params.get('config')];return c.selectionLines?.[c.units[+params.get('unit')]?.id];});
  if(outline)return outline;
 }
 if(['unit-outline','unit-shape'].includes(params.get('transform'))){const mosaic=await mosaicFor(params),config=+params.get('config'),unit=+params.get('unit');return params.get('transform')==='unit-outline'?unitOutline(mosaic,config,unit):unitShape(mosaic,config,unit);}
 // One region of a dated file (historic-borders.mjs): the selected region's outline or shape
 // comes from the worker's compact copy; an empty unit only builds that copy.
 if(params.get('member')==='regions'&&params.has('unit')&&!params.has('interior')){const data={type:'FeatureCollection',features:regionFeatures(await regionsFor(params.get('url')),params.get('unit'))};return transform?transform(data):data;}
 const response=await fetch(params.get('url'));if(!response.ok)throw Error(url+': '+response.status);
 // member: one collection of a file that holds several (elections.mjs, historic borders).
 let data=await decodeData(await response.arrayBuffer(),{select:d=>params.has('member')?d[params.get('member')]:d});
 const interior=params.has('interior'),unit=params.get('unit');
 if(interior)data={...data,features:data.features.filter(f=>f.properties.b).map((f,i)=>({...f,properties:{...f.properties,edge:i}}))};
 if(unit)data={...data,features:data.features.filter(({properties:p})=>interior?p.a===unit||p.b===unit:p.id===unit)};
 return transform?transform(data):data;
}
