// Country data can vary; interaction, selection and detail policies are shared.
export const SEARCH_LIMIT=20;
export const LABEL_CANDIDATE_LIMIT=100;
export const normalizeSearch=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
export const SELECTION_STATE_PREFIX='_atlasSelection:';
export const selectedOpacity=value=>{
 if(!Array.isArray(value))return value;
 if(value[0]==='case')return value.map((v,i)=>i>1&&i%2===0&&JSON.stringify(value[i-1]).includes('"feature-state","selected"')?1:selectedOpacity(v));
 return value.map(selectedOpacity);
};
export function selectionFilter(filter){
 return Array.isArray(filter)&&filter[0]==='=='&&filter[1]?.[0]==='get'&&['id','adcode'].includes(filter[1][1])&&['string','number'].includes(typeof filter[2])?{property:filter[1][1],id:filter[2]}:null;
}
export const selectionOpacity=(key,base=1)=>base===0?0:['case',['boolean',['feature-state',key],false],base,0];
// All adapters express maximum zoom in MapLibre units.
export const cameraOptions=(bounds,maxZoom,camera={})=>({bounds,options:{...camera,...(Number.isFinite(maxZoom)?{maxZoom}:{}),manual:camera.manual===true}});
// Serialize source replacement; every continuation verifies the latest request.
// Clearing invalidates an in-flight scope immediately and drains its cleanup before reuse.
export function createLatestScope(load,{clear=async()=>{},changed=()=>{}}={}){
 let wanted=null,loaded=null,running,disposed=false,epoch=0,dirty=false;
 async function drain(){while(!disposed&&(dirty||loaded!==wanted)){
  const scope=wanted,token=epoch;dirty=false;loaded=undefined;changed();
  await clear();const current=()=>!disposed&&token===epoch;
  if(!current())continue;if(scope)await load(scope,current);
  if(current()){loaded=scope;changed();}
 }}
 function schedule(){if(!running&&!disposed&&(dirty||loaded!==wanted))running=Promise.resolve().then(drain).finally(()=>{running=null;});return running||Promise.resolve();}
 return{get loaded(){return loaded;},ensure(scope){scope=scope||null;if(scope!==wanted){wanted=scope;epoch++;}return schedule();},clear(){epoch++;wanted=loaded=null;dirty=true;changed();return schedule();},async dispose(){disposed=true;epoch++;wanted=null;await running?.catch(()=>{});loaded=null;}};
}
