// Loads the data behind an atlas-data:// source URL (geo-pack.mjs addWorkerSource) inside
// MapLibre's workers (maplibre-worker-protocols.mjs), so the page never copies the geometry.
// atlas-data://<source>?url=<blob URL>[&transform=parts|coastal|outline|selection-outline][&member=<key>]
import {decodeData} from './geo-pack.mjs';
import {polygonParts} from './polygon-parts.mjs';
import {splitCoastalDetail} from './coastal-detail.mjs';
import {lineData} from './adaptive-lines.mjs';
import {compactMosaic,compactRegions,regionFeatures,selectionLineData,unitOutline,unitShape} from './outline-detail.mjs';

const transforms={parts:polygonParts,outline:lineData,'selection-outline':selectionLineData,coastal:data=>splitCoastalDetail(data,{context:true})};
// Compact copies of dated mosaics for selected-unit shapes, the two most recent files.
const mosaics=new Map();
const bytes=async url=>{const response=await fetch(url);if(!response.ok)throw Error(url+': '+response.status);return decodeData(await response.arrayBuffer());};
function mosaicFor(params){
 const url=params.get('url'),configs=params.get('configs')||url;let mosaic=mosaics.get(url);
 if(!mosaic){mosaic=(async()=>{const decoded=await bytes(url);return compactMosaic(decoded,(configs===url?decoded:await bytes(configs)).configs);})();mosaics.set(url,mosaic);if(mosaics.size>2)mosaics.delete(mosaics.keys().next().value);mosaic.catch(()=>mosaics.delete(url));}
 return mosaic;
}
// Compact copies of dated region files, by region ID, the two most recently used.
const regionFiles=new Map();
function regionsFor(url){
 let regions=regionFiles.get(url);
 if(regions)regionFiles.delete(url);
 else{regions=bytes(url).then(decoded=>compactRegions(decoded.regions));regions.catch(()=>{if(regionFiles.get(url)===regions)regionFiles.delete(url);});}
 regionFiles.set(url,regions);if(regionFiles.size>2)regionFiles.delete(regionFiles.keys().next().value);
 return regions;
}
export async function loadAtlasData(url){
 const params=new URLSearchParams(url.slice(url.indexOf('?')+1)),transform=transforms[params.get('transform')]||(/-selection-edges(?:\?|$)/.test(url)?selectionLineData:null);
 if(['unit-outline','unit-shape'].includes(params.get('transform'))){const mosaic=await mosaicFor(params),config=+params.get('config'),unit=+params.get('unit');return params.get('transform')==='unit-outline'?unitOutline(mosaic,config,unit):unitShape(mosaic,config,unit);}
 // One region of a dated file (historic-borders.mjs): the selected region's outline or shape
 // comes from the worker's compact copy; an empty unit only builds that copy.
 if(params.get('member')==='regions'&&params.has('unit')&&!params.has('interior')){const data={type:'FeatureCollection',features:regionFeatures(await regionsFor(params.get('url')),params.get('unit'))};return transform?transform(data):data;}
 const response=await fetch(params.get('url'));if(!response.ok)throw Error(url+': '+response.status);
 // member: one collection of a file that holds several (elections.mjs, historic borders).
 const decoded=await decodeData(await response.arrayBuffer());
 let data=params.has('member')?decoded[params.get('member')]:decoded;
 const interior=params.has('interior'),unit=params.get('unit');
 if(interior)data={...data,features:data.features.filter(f=>f.properties.b).map((f,i)=>({...f,properties:{...f.properties,edge:i}}))};
 if(unit)data={...data,features:data.features.filter(({properties:p})=>interior?p.a===unit||p.b===unit:p.id===unit)};
 return transform?transform(data):data;
}
