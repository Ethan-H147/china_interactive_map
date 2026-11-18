import fs from 'node:fs';
import clip from 'polygon-clipping';
import {bounds,fc,load,write,command} from './us-geography.mjs';

const lagoon=JSON.parse(fs.readFileSync(new URL('./additional-sources/water/mexico-terminos.geojson',import.meta.url)));
const [[west,south],[east,north]]=bounds(lagoon.geometry);
function carve(geometry){
 const parts=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 let changed=false;
 const result=parts.flatMap(p=>{
  const [[w,s],[e,n]]=bounds({type:'Polygon',coordinates:p});
  if(e<west||w>east||n<south||s>north||!clip.intersection(p,lagoon.geometry.coordinates).length)return [p];
  changed=true;
  return clip.difference(p,lagoon.geometry.coordinates);
 });
 if(!changed)return geometry;
 return result.length===1?{type:'Polygon',coordinates:result[0]}:{type:'MultiPolygon',coordinates:result};
}

// Keep administrative strokes independent of the cutout, including the two tidal entrances.
export async function carveTerminos(root){
 const first=load(root+'first.bin'),state=first.regions.features.find(f=>f.properties.id==='MX-CAM');
 if(first.selectionOutlineOverrides?.features.some(f=>f.properties.id==='MX-CAM'))return;
 const catalogue=load(root+'catalogue.bin'),chunk=catalogue.chunks['MX-CAM'],municipal=load(root+chunk.file);
 const originals=[];
 for(const f of municipal.regions.features){
  const geometry=carve(f.geometry);
  if(geometry!==f.geometry){originals.push({...f});f.geometry=geometry;}
 }
 municipal.selectionOutlineOverrides=fc(originals);
 first.selectionOutlineOverrides??=fc([]);
 first.selectionOutlineOverrides.features.push({...state});
 const dissolved=await command(municipal.regions,'-dissolve');
 state.geometry=dissolved.features[0].geometry;
 const context=load(root+'context.bin');
 for(const f of context.features)f.geometry=carve(f.geometry);
 Object.assign(chunk,write(root+chunk.file,municipal));
 write(root+'catalogue.bin',catalogue);write(root+'first.bin',first);write(root+'context.bin',context);
}
