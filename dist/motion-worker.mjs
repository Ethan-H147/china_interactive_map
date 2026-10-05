import {lineData} from './adaptive-lines.mjs';
try{
 const country=new URL(import.meta.url).searchParams.get('country')||'china';
 if(!['china','korea','mongolia'].includes(country))throw Error('Unknown atlas');
 const response=await fetch(new URL('data/'+country+'-motion.bin',import.meta.url));if(!response.ok)throw Error('Motion data unavailable');
 const data=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
 for(const id of ['provinces','prefectures','others','city-districts','korea-first','korea-second','mongolia-first','mongolia-second']){
  if(!data[id])continue;
  const collection={type:'FeatureCollection',features:data[id].features.filter(f=>![220000,222400].includes(f.properties.adcode))};
  if(id==='provinces')collection.features.push(...data['fill-outlines'].features.filter(f=>f.properties.adcode===220000));
  if(id==='prefectures')collection.features.push(...data['fill-outlines'].features.filter(f=>f.properties.adcode===222400));
  data[id+'-selection-edges']=lineData(collection);
 }
 delete data['fill-outlines'];
 const sources={};
 for(const [id,collection] of Object.entries(data)){
  const grouped=new Map();
  for(const feature of collection.features){const key=feature.properties.adcode??feature.properties.id;if(key===undefined)continue;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(JSON.stringify(feature));}
  const dynamic=id.endsWith('-selection-edges')||['prefectures','prefectures-fragments','others','city-districts','korea-second','mongolia-second'].includes(id);
  sources[id]={data:dynamic?null:new Blob([JSON.stringify(collection)],{type:'application/json'}),ids:[...grouped.keys()],features:dynamic?Object.fromEntries([...grouped].map(([key,items])=>[key,new Blob([items.join(',')])])):null};
 }
 postMessage({sources});
}catch(error){postMessage({error:error.message});}
