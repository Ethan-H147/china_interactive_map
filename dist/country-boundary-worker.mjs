import {loadCompressed} from './korea-data.mjs';
import {polygonParts} from './polygon-parts.mjs';
import {lineData} from './adaptive-lines.mjs';
import {selectionLineData} from './outline-detail.mjs';
const empty='{"type":"FeatureCollection","features":[]}';
const encoder=new TextEncoder();
function indexedRegions(regions){
 const {features,...metadata}=regions,prefix=JSON.stringify(metadata).slice(0,-1)+',"features":[',parts=[prefix],outlineIndex=Object.create(null);
 let offset=encoder.encode(prefix).length;
 features.forEach((feature,i)=>{
  if(i){parts.push(',');offset++;}
  const text=JSON.stringify(feature),end=offset+encoder.encode(text).length;
  const ranges=outlineIndex[feature.properties.id]??=[],last=ranges.at(-1);
  // Adjacent polygon parts already have their separating comma in this blob.
  // A single byte slice retains them all, avoiding thousands of synchronous
  // Blob.slice/Blob registrations on the page for island-heavy selections.
  if(last&&last[1]+1===offset)last[1]=end;else ranges.push([offset,end]);
  parts.push(text);offset=end;
 });
 parts.push(']}');
 return {blob:new Blob([parts.join('')],{type:'application/json'}),outlineIndex};
}
self.onmessage=async({data})=>{
 try{
  const prepare=part=>{
   const regions=polygonParts(part.regions),indexed=data.deferOutlines?indexedRegions(regions):null;
   return {
    ...(part.towns?{towns:prepare(part.towns)}:{}),
    blob:indexed?.blob||new Blob([JSON.stringify(regions)],{type:'application/json'}),
    borders:new Blob([JSON.stringify(lineData(part.boundaries))],{type:'application/json'}),
    hasBorders:part.boundaries.features.length>0,
    // The selection reads byte slices from the same polygon blob. No second full
    // outline geometry is copied or tiled; duplicate IDs retain all island parts.
    ...(indexed?{outlines:new Blob([empty],{type:'application/json'}),outlineData:indexed.blob,outlineIndex:indexed.outlineIndex}:{
     outlines:new Blob([JSON.stringify(selectionLineData(part.regions))],{type:'application/json'})
    })
   };
  };
  const read=async url=>{const payload=await loadCompressed(url);return payload.levels?{levels:payload.levels.map(part=>({level:part.level,...prepare(part)}))}:prepare(payload);};
  self.postMessage(data.urls?{chunks:await Promise.all(data.urls.map(read))}:await read(data.url));
 }catch(error){self.postMessage({error:error.message});}
};
