import {createLatestScope} from './interaction-policy.mjs';
import {loadCompressed} from './korea-data.mjs';
const empty=()=>({type:'FeatureCollection',features:[]});

export async function prepareScopedCountry(country){
 const base=new URL('data/scoped/'+country+'/',import.meta.url);
 const [metadata,manifest]=await Promise.all([loadCompressed(new URL('metadata.bin',base)),fetch(new URL('manifest.json',base)).then(r=>{if(!r.ok)throw Error('Country source index unavailable');return r.json();})]);
 const entries=await Promise.all(Object.entries(manifest.sources).map(async([id,entry])=>[id,new Blob([JSON.stringify(await loadCompressed(new URL(entry.file,base)))],{type:'application/json'})]));
 for(const suffix of ['', '-edges', '-selection-edges'])entries.push([country+'-second'+suffix,new Blob([JSON.stringify(empty())],{type:'application/json'})]);
 return {metadata,sources:Object.fromEntries(entries)};
}

// Keep one area in the renderer. Serial replacements bound memory use and prevent
// a slower previous selection from replacing the most recent one.
export function createSubdivisionScope(map,country,{changed=()=>{}}={}){
 const suffixes=['','-edges','-selection-edges'];
 return createLatestScope(async(parent,current)=>{
  for(const suffix of suffixes){if(!current())return;
   const id=country+'-second'+suffix,url=new URL('data/scoped/'+country+'/second/'+parent+suffix+'.bin',import.meta.url);
   await map.getSource(id)?.setData('atlas-data://'+id+'?url='+encodeURIComponent(url.href)+(suffix==='-selection-edges'?'&transform=selection-outline':''));
  }
 },{clear:async()=>{for(const suffix of suffixes)await map.getSource(country+'-second'+suffix)?.setData(empty());},changed});
}
