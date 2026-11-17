// Adapt retained physical coast displays at build time. Face IDs, dated ownership,
// unit records and source geometry remain unchanged.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export async function prepareAtlanticHistory(root,country){
 const {decodeData}=await import(pathToFileURL(root+'/dist/geo-pack.mjs'));
 const base='dist/data/europe/'+country+'/history/',pins=[];
 const read=async file=>{const bytes=fs.readFileSync(root+'/'+file);pins.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});return decodeData(bytes);};
 const retained=await read(base+'borders.bin');
 const fc=features=>({type:'FeatureCollection',features});
 let faces=[],edges=[],waters=[];
 const land=f=>({...f,properties:{id:f.properties.f,...(f.properties.f<0?{neutral:true}:{})}});
 if(country==='united-states'){
  const display=await read(base+'coastal-display.bin');
  if(display.historySource!==retained.source.sha256)throw Error('US coast does not match chronology');
  faces=display.faces.features.map(land);edges=display.arcs.features;waters=display.water.features;
  // Compile the existing Canadian context into this source rather than starting
  // a second runtime renderer for Rupert's Land.
  const canada=await read('dist/data/europe/canada/history/borders.bin'),offset=retained.faces.features.length;
  const used=new Set(),configs=[],frames=new Map(),years={};
  for(const [year,dated]of Object.entries(retained.years)){
   const context=+year<=1869?canada.configs[canada.years[Math.max(+year,1866)].config]:null;
   const contextUnit=context?.units.find(u=>u.key==='ruperts-land');
   const key=dated.config+':'+(contextUnit?canada.years[Math.max(+year,1866)].config:'none');
   if(!frames.has(key)){
    const config=structuredClone(retained.configs[dated.config]);
    if(contextUnit){const index=config.units.length;config.units.push(contextUnit);
     context.face.forEach((owner,f)=>{if(context.units[owner]===contextUnit){config.face[offset+f]=index;used.add(f);}});
    }
    frames.set(key,configs.length);configs.push(config);
   }
   years[year]={...dated,config:frames.get(key)};
  }
  for(const config of configs)for(let id=0;id<offset+canada.faces.features.length;id++)if(config.face[id]==null)config.face[id]=-1;
  retained.configs=configs;retained.years=years;
  faces.push(...canada.faces.features.filter(f=>used.has(f.properties.f)).map(f=>({...f,properties:{id:offset+f.properties.f}})));
  edges.push(...canada.arcs.features.filter(f=>used.has(f.properties.l)||used.has(f.properties.r)).map(f=>({...f,properties:{...f.properties,l:used.has(f.properties.l)?offset+f.properties.l:-1,r:used.has(f.properties.r)?offset+f.properties.r:-1}})));
 }else if(country==='united-kingdom'){
  const replaced=new Set(retained.coasts.flatMap(entry=>entry.faces));
  faces=retained.faces.features.filter(f=>!replaced.has(f.properties.f)).map(land);
  edges=retained.arcs.features.filter(f=>!replaced.has(f.properties.l)&&!replaced.has(f.properties.r));
  for(const entry of retained.coasts){
   const display=await read(base+entry.file);
   for(const f of display.faces.features)faces.push(land(f));
   for(const e of display.arcs.features)edges.push(e);
   waters.push(...display.water.features);
   console.log('Prepared',entry.id,display.faces.features.length,'physical cells');
  }
  // The overview water package contains shared lake cutouts and source overhangs.
  // It becomes ordinary water features in the same tile source and fill layer.
  const overview=await read(base+retained.coastWater);
  const water=overview.features||overview.water?.features;
  if(!water)throw Error('Unsupported UK overview water');
  waters.push(...water);
 }else throw Error('Unsupported tiled chronology: '+country);
 const faceCount=Math.max(retained.faces.features.length,...faces.map(f=>f.properties.id+1));
 const neutralId=faceCount,waterId=faceCount+1;
 faces=faces.map(f=>f.properties.id<0?{...f,properties:{id:neutralId,neutral:true}}:f);
 faces.push(...waters.map(f=>({...f,properties:{id:waterId,water:true}})));
 edges=edges.filter(f=>f.geometry).map((f,id)=>({...f,properties:{id,l:f.properties.l??-1,r:f.properties.r??-1,coast:!!f.properties.coast,selectionOnly:!!f.properties.selectionOnly}}));
 const data={...retained,faces:fc(faces),arcs:fc(edges)};
 const inputSha256=createHash('sha256').update(JSON.stringify(pins)).digest('hex');
 // The North American package's neutral geometry is its full modern land
 // union (reconcileNorthAmerica returns neutral: land), not a coastal band.
 // It owns the US/Canadian backdrop even after their historical units leave.
 return {data,inputSha256,sources:pins,extra:{country,faceCount:waterId+1,replaceContexts:country==='united-kingdom'?['united-states','canada']:[],coasts:retained.coasts?.map(({bounds,areas,minZoom})=>({bounds,areas,minZoom}))}};
}
