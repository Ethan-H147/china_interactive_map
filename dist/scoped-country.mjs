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
 let wanted=null,loaded=null,running=null,epoch=0;
 const suffixes=['','-edges','-selection-edges'];
 async function drain(token){
  while(token===epoch&&wanted!==loaded){
   const parent=wanted;loaded=undefined;changed();
   for(const suffix of suffixes){const source=map.getSource(country+'-second'+suffix);if(!source||token!==epoch)return;await source.setData(empty());}
   if(token!==epoch)return;if(parent!==wanted)continue;
   if(parent)for(const suffix of suffixes){
    if(token!==epoch||parent!==wanted)break;
    const id=country+'-second'+suffix,url=new URL('data/scoped/'+country+'/second/'+parent+suffix+'.bin',import.meta.url);
    await map.getSource(id).setData('atlas-data://'+id+'?url='+encodeURIComponent(url.href));
   }
   if(token!==epoch)return;
   if(parent===wanted){loaded=parent;changed();}
  }
 }
 return {get loaded(){return loaded;},ensure(parent){wanted=parent||null;if(!running&&wanted!==loaded){const token=epoch,task=Promise.resolve().then(()=>drain(token)).finally(()=>{if(running===task)running=null;});running=task;}return running||Promise.resolve();},clear(){epoch++;wanted=loaded=null;running=null;for(const suffix of suffixes)Promise.resolve(map.getSource(country+'-second'+suffix)?.setData(empty())).catch(()=>{});}};
}

