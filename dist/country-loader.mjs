// Each country owns its promise and lifecycle. A failed promise is retried on demand.
export function createCountryLoader(load){
 const records=new Map();
 function ensure(id){
  let record=records.get(id);
  if(record?.status==='ready')return Promise.resolve(record.value);
  if(record?.status==='loading')return record.promise;
  record={status:'loading',error:null};records.set(id,record);
  record.promise=Promise.resolve().then(()=>load(id)).then(value=>{
   record.status='ready';record.value=value;return value;
  },error=>{record.status='failed';record.error=error;throw error;});
  return record.promise;
 }
 return {ensure,status:id=>records.get(id)?.status||'unloaded',async ensureAll(ids){return Promise.allSettled(ids.map(ensure));}};
}

// Track resources through a facade: concurrent countries only clean up what they own.
export function createMapResources(map){
 const layers=[],sources=[];let committed=false;
 const scoped=new Proxy(map,{get(target,key){
  if(!committed&&key==='addLayer')return (layer,...args)=>{if(target.getLayer(layer.id))throw Error('Layer already exists: '+layer.id);target.addLayer(layer,...args);layers.push(layer.id);return scoped;};
  if(!committed&&key==='addSource')return (id,source)=>{if(target.getSource(id))throw Error('Source already exists: '+id);target.addSource(id,source);sources.push({id,data:source.data});return scoped;};
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
 return {map:scoped,commit(){committed=true;layers.length=0;sources.length=0;},dispose(){
  for(const id of layers.splice(0).reverse())if(map.getLayer(id))map.removeLayer(id);
  for(const {id,data} of sources.splice(0).reverse()){
   if(map.getSource(id))map.removeSource(id);
   if(typeof data==='string'&&data.startsWith('atlas-data://')){const url=new URL(data).searchParams.get('url');if(url?.startsWith('blob:'))URL.revokeObjectURL(url);}
  }
 }};
}
