import {selectionLineData} from './outline-detail.mjs';
import {lineData} from './adaptive-lines.mjs';
import './countries.js';
try{
 const country=new URL(import.meta.url).searchParams.get('country')||'china';
 if(!globalThis.AtlasCountries.countries[country]?.motionData)throw Error('Unknown atlas');
 const response=await fetch(new URL('data/'+country+'-motion.bin',import.meta.url));if(!response.ok)throw Error('Motion data unavailable');
 const data=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
 for(const id of ['provinces','prefectures','others','city-districts','korea-first','korea-second','mongolia-first','mongolia-second','japan-first']){
  if(!data[id])continue;
  const collection={type:'FeatureCollection',features:data[id].features.filter(f=>![220000,222400].includes(f.properties.adcode))};
  if(id==='provinces')collection.features.push(...data['fill-outlines'].features.filter(f=>f.properties.adcode===220000));
  if(id==='prefectures')collection.features.push(...data['fill-outlines'].features.filter(f=>f.properties.adcode===222400));
  data[id+'-selection-edges']=selectionLineData(collection);
 }
 delete data['fill-outlines'];
 const sources={};
 for(const [id,collection] of Object.entries(data)){
  const ids=[...new Set(collection.features.map(feature=>feature.properties.adcode??feature.properties.id).filter(id=>id!==undefined))];
  // One lightweight index, with the same feature-state highlighting as the
  // detailed map. Selection never rebuilds a preview source or its tile buckets.
  sources[id]={data:new Blob([JSON.stringify(collection)],{type:'application/json'}),ids,features:null};
 }
 postMessage({sources});
}catch(error){postMessage({error:error.message});}
