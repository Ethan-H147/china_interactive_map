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

// Reserve before loading, retain the active country, and release the oldest inactive
// country before admitting another. Loading reservations count toward the limit.
// A one-country mobile budget releases even the previous active country; a failed
// switch reloads it through the normal country-switch recovery path.
export function createCountryResidency({limit=3,dispose=async()=>{}}={}){
 if(!Number.isInteger(limit)||limit<1)throw Error('Country limit must be at least one');
 const records=new Map(),pending=new Map();let active,clock=0,queue=Promise.resolve();
 function ensure(id,load){
  if(pending.has(id))return pending.get(id);
  const reserve=queue.then(async()=>{
   let record=records.get(id);
   if(!record){
    if(records.size>=limit){
     const victim=[...records.values()].filter(r=>limit===1||r.id!==active).sort((a,b)=>a.used-b.used)[0];
     if(!victim)throw Error('No inactive country can be released');
     await victim.done?.catch(()=>{});await dispose(victim.id);records.delete(victim.id);
    }
    record={id};records.set(id,record);
   }
   record.used=++clock;record.status='loading';return record;
  });
  queue=reserve.then(()=>{},()=>{});
  const job=reserve.then(async record=>{
   record.done=job;
   try{const value=await load();record.status='ready';return value;}
   catch(error){try{await dispose(id);}finally{records.delete(id);}throw error;}
  }).finally(()=>{if(pending.get(id)===job)pending.delete(id);});
  pending.set(id,job);return job;
 }
 return {limit,ensure,activate(id){active=id;const r=records.get(id);if(r)r.used=++clock;},
  snapshot:()=>({limit,active,countries:[...records.values()].sort((a,b)=>a.used-b.used).map(({id,status})=>({id,status}))})};
}
