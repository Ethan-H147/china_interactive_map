// Loads the data behind an atlas-data:// source URL (geo-pack.mjs addWorkerSource) inside
// MapLibre's workers (maplibre-worker-protocols.mjs), so the page never copies the geometry.
// atlas-data://<source>?url=<blob URL>[&transform=parts|coastal|outline|selection-outline][&member=<key>]
import {decodeData} from './geo-pack.mjs';
import {polygonParts} from './polygon-parts.mjs';
import {splitCoastalDetail} from './coastal-detail.mjs';
import {lineData} from './adaptive-lines.mjs';
import {selectionLineData} from './outline-detail.mjs';

const transforms={parts:polygonParts,outline:lineData,'selection-outline':selectionLineData,coastal:data=>splitCoastalDetail(data,{context:true})};
export async function loadAtlasData(url){
 const params=new URLSearchParams(url.slice(url.indexOf('?')+1)),transform=transforms[params.get('transform')]||(/-selection-edges(?:\?|$)/.test(url)?selectionLineData:null);
 const response=await fetch(params.get('url'));if(!response.ok)throw Error(url+': '+response.status);
 // member: one collection of a file that holds several (elections.mjs, historic borders).
 const decoded=await decodeData(await response.arrayBuffer()),data=params.has('member')?decoded[params.get('member')]:decoded;
 return transform?transform(data):data;
}
