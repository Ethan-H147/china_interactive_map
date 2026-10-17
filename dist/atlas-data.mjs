// Loads the data behind an atlas-data:// source URL (geo-pack.mjs addWorkerSource) inside
// MapLibre's workers (maplibre-worker-protocols.mjs), so the page never copies the geometry.
// atlas-data://<source>?url=<blob URL>[&transform=parts|coastal]
import {decodeData} from './geo-pack.mjs';
import {polygonParts} from './polygon-parts.mjs';
import {splitCoastalDetail} from './coastal-detail.mjs';

const transforms={parts:polygonParts,coastal:data=>splitCoastalDetail(data,{context:true})};
export async function loadAtlasData(url){
 const params=new URLSearchParams(url.slice(url.indexOf('?')+1)),transform=transforms[params.get('transform')];
 const response=await fetch(params.get('url'));if(!response.ok)throw Error(url+': '+response.status);
 const data=await decodeData(await response.arrayBuffer());
 return transform?transform(data):data;
}
