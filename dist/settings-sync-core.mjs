import {defaults,validateSettings} from './settings.mjs';
const keys=Object.keys(defaults),prefix='atlas_setting_';
export function decodeAccountSettings(metadata){
 if(!metadata||!keys.some(key=>Object.hasOwn(metadata,prefix+key)))return null;
 return validateSettings(Object.fromEntries(keys.filter(key=>Object.hasOwn(metadata,prefix+key)).map(key=>[key,metadata[prefix+key]])));
}
export function encodeAccountSettings(values){return Object.fromEntries(keys.filter(key=>Object.hasOwn(values,key)).map(key=>[prefix+key,values[key]]));}
function patch(value){const valid=validateSettings(value);return Object.fromEntries(keys.filter(key=>value&&Object.hasOwn(value,key)).map(key=>[key,valid[key]]));}
// Local edits are queued per account. Only changed preference keys are sent, so
// another device's unrelated settings and the account name are left intact.
export function createSettingsSync(io){
 let current=null,guest=validateSettings(io.guest),status='guest';
 const report=value=>{if(status!==value){status=value;io.status(value);}};
 const cache=r=>io.writeCache(r.id,{values:r.values,pending:r.pending});
 function apply(values){io.apply(validateSettings(values));}
 function schedule(r){clearTimeout(r.timer);r.timer=setTimeout(()=>void flushRecord(r),500);}
 async function flushRecord(r){
  if(current!==r||r.loading||r.writing)return;
  if(!r.initialized)return pull(r);
  const sent={...r.pending};if(!Object.keys(sent).length){report('synced');return;}
  r.writing=true;report('saving');
  try{
   const metadata=await io.writeRemote(r.id,encodeAccountSettings(sent));
   if(current!==r){
    if(current?.id!==r.id){const saved=io.readCache(r.id),pending={...saved?.pending};for(const key of Object.keys(sent))if(pending[key]===sent[key])delete pending[key];io.writeCache(r.id,{values:{...(decodeAccountSettings(metadata)||r.values),...pending},pending});}
    return;
   }
   for(const key of Object.keys(sent))if(r.pending[key]===sent[key])delete r.pending[key];
   r.values={...(decodeAccountSettings(metadata)||r.values),...r.pending};cache(r);apply(r.values);report(Object.keys(r.pending).length?'saving':'synced');
  }catch{if(current===r){cache(r);report('offline');}}
  finally{r.writing=false;if(current===r&&status!=='offline'&&Object.keys(r.pending).length)schedule(r);}
 }
 async function pull(r){
  if(current!==r||r.loading||r.writing)return;
  r.loading=true;report('loading');
  try{
   const remote=decodeAccountSettings(await io.readRemote(r.id));if(current!==r)return;
   r.initialized=true;if(!remote)r.pending={...r.values,...r.pending};
   r.values={...(remote||r.values),...r.pending};cache(r);apply(r.values);
  }catch{if(current===r){cache(r);report('offline');}return;}
  finally{r.loading=false;}
  if(current===r)await flushRecord(r);
 }
 return{
  async connect(id){
   if(current?.id===id)return;
   if(current){clearTimeout(current.timer);cache(current);}
   if(!id){current=null;io.owner(null);apply(guest);report('guest');return;}
   const saved=io.readCache(id);current={id,values:validateSettings(saved?.values||guest),pending:patch(saved?.pending),initialized:false,loading:false,writing:false,timer:null};io.owner(id);apply(current.values);await pull(current);
  },
  changed(values){
   const next=validateSettings(values);
   if(!current){guest=next;io.writeGuest(guest);return;}
   for(const key of keys)if(next[key]!==current.values[key])current.pending[key]=next[key];
   current.values=next;cache(current);if(Object.keys(current.pending).length){report('saving');schedule(current);}
  },
  retry(){if(current)return pull(current);},
  flush(){if(current){clearTimeout(current.timer);return flushRecord(current);}},
  disconnect(){if(current)clearTimeout(current.timer);current=null;},
  get accountId(){return current?.id||null;}
 };
}
