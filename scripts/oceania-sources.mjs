import fs from 'node:fs';import {gzipSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
export const root='scripts/boundary-sources/oceania';const manifestFile=root+'/sources.json';
export const manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile)):{retrieved:'2026-10-17',sources:{}};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function readSource(name){const bytes=gunzipSync(fs.readFileSync(root+'/'+name+'.gz'));if(JSON.parse(fs.readFileSync(manifestFile)).sources[name]?.sha256!==sha(bytes))throw Error('Source hash mismatch: '+name);return JSON.parse(bytes);}
export async function retain(name,url,metadata={},load){
 if(fs.existsSync(root+'/'+name+'.gz')){const latest=JSON.parse(fs.readFileSync(manifestFile));if(!latest.sources[name]){const bytes=gunzipSync(fs.readFileSync(root+'/'+name+'.gz'));latest.sources[name]={url,...metadata,sha256:sha(bytes),bytes:bytes.length};fs.writeFileSync(manifestFile,JSON.stringify(latest,null,2)+'\n');}return readSource(name);}
 const value=load?await load():await request(url).then(r=>r.json());
 const bytes=Buffer.from(JSON.stringify(value)),latest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile)):manifest;if(latest.sources[name]?.sha256&&latest.sources[name].sha256!==sha(bytes))throw Error('Upstream source changed: '+name+'. Review the pinned source before updating it.');fs.mkdirSync(root,{recursive:true});fs.writeFileSync(root+'/'+name+'.gz',gzipSync(bytes,{level:9}));latest.sources[name]={url,...metadata,sha256:sha(bytes),bytes:bytes.length};Object.assign(manifest,latest);fs.writeFileSync(manifestFile,JSON.stringify(latest,null,2)+'\n');console.log('Retained',name,(bytes.length/1048576).toFixed(2)+' MB');return value;
}
export async function request(url,options={}){let error;for(let i=0;i<3;i++){try{const r=await fetch(url,{...options,headers:{'User-Agent':'BoundaryAtlas/1.0 (sourced local map build)',...options.headers},signal:AbortSignal.timeout(240000)});if(!r.ok)throw Error('HTTP '+r.status+' '+url);return r;}catch(e){error=e;if(i<2)await new Promise(r=>setTimeout(r,1000*(i+1)));}}throw error;}
export async function arcgis(name,layer,{geometry=true,where='1=1',fields='*',...meta}={}){
 const url=layer+'/query';return retain(name,layer,meta,async()=>{
  if(!geometry){const d=await request(url+'?'+new URLSearchParams({where,outFields:fields,returnGeometry:'false',f:'json'})).then(r=>r.json());if(d.error||d.exceededTransferLimit)throw Error(name+' incomplete attribute response');return d;}
  const ids=await request(url+'?'+new URLSearchParams({where,returnIdsOnly:'true',f:'json'})).then(r=>r.json());if(!ids.objectIds?.length)throw Error(name+' missing feature IDs: '+JSON.stringify(ids));
  const features=[];for(let i=0;i<ids.objectIds.length;i+=300){const params=new URLSearchParams({objectIds:ids.objectIds.slice(i,i+300).join(','),outFields:fields,outSR:'4326',returnGeometry:'true',f:'geojson'});const d=await request(url,{method:'POST',body:params}).then(r=>r.json());if(d.error||d.exceededTransferLimit||!d.features)throw Error(name+' incomplete geometry batch');features.push(...d.features);console.log(name,features.length+'/'+ids.objectIds.length);}
  if(features.length!==ids.objectIds.length)throw Error(name+' missing geometry records');return {type:'FeatureCollection',features};
 });
}
