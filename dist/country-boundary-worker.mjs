import {loadCompressed} from './korea-data.mjs';
import {polygonParts} from './polygon-parts.mjs';
import {lineData} from './adaptive-lines.mjs';
import {selectionLineData} from './outline-detail.mjs';
import {applyOutlineEdits} from './outline-edits.mjs';
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
  if(data.operation==='historical-geometry'){
   const {loadAtlasData}=await import('./atlas-data.mjs');
   const geometry=await loadAtlasData(data.url);
   let points=0;const count=coordinates=>{if(!coordinates)return;if(typeof coordinates[0]==='number'){points+=coordinates.length===2?1:coordinates.length/2;}else for(const path of coordinates)count(path);};
   for(const feature of geometry.features){count(feature.geometry?.coordinates);if(points>data.maxPoints)throw Error('Historical detail exceeded its point budget');}
   const blob=new Blob([JSON.stringify(geometry)],{type:'application/json'});
   if(blob.size>data.maxBytes)throw Error('Historical detail exceeded its memory budget');
   const {packShapes}=await import('./historic-shapes.mjs');
   const picking=packShapes(geometry.features),buffers=picking.flatMap(shape=>[shape.xy.buffer,shape.starts.buffer]);
   self.postMessage({blob,points,picking},buffers);return;
  }
  if(data.operation==='context-detail'){
   const {prepareModernContext}=await import('./modern-context-geometry.mjs');
   self.postMessage(await prepareModernContext(data));return;
  }
  if(data.operation==='polar-mesh'){
   const mesh=await loadCompressed(data.url),buffers=[];
   // These coordinates go straight to WebGL as floats. Transfer that final
   // representation and retain every original outline used for hit testing.
   for(const part of [mesh.neutral,...mesh.claims]){part.positions=new Float32Array(part.positions);buffers.push(part.positions.buffer);}
   self.postMessage(mesh,buffers);return;
  }
  const prepare=part=>{
   // A few units (Antarctic claims) replace only their own selected outline,
   // leaving out an artificial cut such as the flat map's 85°S limit.
   const regions=polygonParts(part.regions),overrides=part.selectionOutlineOverrides,replaced=new Set(overrides?.features.map(f=>f.properties.id));
   const custom=part.selectionOutlines||(overrides&&{...regions,features:[...regions.features.filter(f=>!replaced.has(f.properties.id)),...overrides.features]});
   const outlineRegions=part.selectionOutlineEdits?applyOutlineEdits(custom||regions,part.selectionOutlineEdits):custom||regions,indexed=data.deferOutlines?indexedRegions(outlineRegions):null;
   return {
    ...(part.towns?{towns:prepare(part.towns)}:{}),
    blob:!custom&&!part.selectionOutlineEdits&&indexed?.blob||new Blob([JSON.stringify(regions)],{type:'application/json'}),
    borders:new Blob([JSON.stringify(lineData(part.boundaries||part.lines))],{type:'application/json'}),
    hasBorders:(part.boundaries||part.lines).features.length>0,
    // Reuse polygon slices unless the build supplies selection lines that omit
    // permanent water shores. Duplicate IDs retain every island or line part.
    ...(indexed?{outlines:new Blob([empty],{type:'application/json'}),outlineData:indexed.blob,outlineIndex:indexed.outlineIndex}:{
     outlines:new Blob([JSON.stringify(selectionLineData(part.selectionOutlineEdits?outlineRegions:custom||part.regions))],{type:'application/json'})
    })
   };
  };
  const read=async url=>{const payload=await loadCompressed(url);return payload.levels?{levels:payload.levels.map(part=>({level:part.level,...prepare(part)}))}:prepare(payload);};
  self.postMessage(data.urls?{chunks:await Promise.all(data.urls.map(read))}:await read(data.url));
 }catch(error){self.postMessage({error:error.message});}
};
