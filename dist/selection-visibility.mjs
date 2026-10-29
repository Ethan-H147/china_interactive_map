// Keep empty feature-state outlines out of the renderer. Their normal paint and
// intended visibility remain unchanged, so selection and quiz feedback restore them.
import {SELECTION_STATE_PREFIX} from './interaction-policy.mjs';
export const selectionStates=Object.freeze(['selected','quizTarget','quizCorrect','quizWrong']);
export function createSelectionVisibility(map,changed){
 const sources=new Map();
 const active=(source,keys)=>{for(const state of sources.get(source)?.values()||[])for(const key of keys)if(state[key])return true;return false;};
 function update(target,patch){
  const keys=Object.keys(patch).filter(key=>selectionStates.includes(key)||key.startsWith(SELECTION_STATE_PREFIX));if(target.sourceLayer||!keys.length)return;
  let records=sources.get(target.source);const previous=records?.get(target.id)||{},next={...previous,...Object.fromEntries(keys.map(key=>[key,!!patch[key]]))};
  if(Object.values(next).some(Boolean)){if(!records)sources.set(target.source,records=new Map());records.set(target.id,next);}
  else{records?.delete(target.id);if(!records?.size)sources.delete(target.source);}
  changed(target.source);
 }
 if(map.setFeatureState){const native=map.setFeatureState.bind(map);map.setFeatureState=(target,patch)=>{const result=native(target,patch);update(target,patch);return result;};}
 if(map.removeFeatureState){const native=map.removeFeatureState.bind(map);map.removeFeatureState=(target,key)=>{
  const result=native(target,key),records=sources.get(target.source);
  if(records&&!target.sourceLayer){
   if(target.id===undefined){if(key)for(const state of records.values())delete state[key];else sources.delete(target.source);}
   else if(key){const state=records.get(target.id);if(state)delete state[key];}else records.delete(target.id);
   changed(target.source);
  }
  return result;
 };}
 if(map.removeSource){const native=map.removeSource.bind(map);map.removeSource=id=>{const result=native(id);sources.delete(id);return result;};}
 const ids=(source,keys)=>[...(sources.get(source)||[])].filter(([,state])=>keys.some(key=>state[key])).map(([id])=>id);
 return {active,ids};
}
