import fs from 'node:fs';
import {createHash} from 'node:crypto';
const dir='artifacts/mexico-water-source',pinFile='scripts/mexico-water-sources.json';
fs.mkdirSync(dir,{recursive:true});
let pins;try{pins=JSON.parse(fs.readFileSync(pinFile));}catch{pins={retrieved:new Date().toISOString().slice(0,10),files:{}};}
async function get(name,url){
 const file=dir+'/'+name;
 if(!fs.existsSync(file)){
  const r=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error(url+' HTTP '+r.status);
  const bytes=Buffer.from(await r.arrayBuffer());const json=JSON.parse(bytes);if(json.error)throw Error(JSON.stringify(json.error));
  fs.writeFileSync(file,bytes);
 }
 const bytes=fs.readFileSync(file),sha256=createHash('sha256').update(bytes).digest('hex');
 if(pins.files[name]?.sha256&&pins.files[name].sha256!==sha256)throw Error('Pinned hydrography differs: '+name);
 pins.files[name]={url,sha256,bytes:bytes.length};fs.writeFileSync(pinFile,JSON.stringify(pins,null,2)+'\n');
 return JSON.parse(bytes);
}
const service='https://geomatica.semarnat.gob.mx/arcgis/rest/services/INFOTECA/Agua/MapServer/';
for(const [kind,id,fields]of [['water',2,'OBJECTID,DESCRIBE,NOMBRE,DESCRIBE_T,NOM_EDO,Shape_Area'],['rivers',1,'OBJECTID,nom_rio,orden_rio,longitud']]){
 const meta=await get(kind+'-metadata.json',service+id+'?f=pjson');
 const ids=await get(kind+'-ids.json',service+id+'/query?f=json&where=1%3D1&returnIdsOnly=true');
 const list=ids.objectIds.sort((a,b)=>a-b);let total=0;
 for(let i=0;i<list.length;i+=400){
  const selected=list.slice(i,i+400),u=service+id+'/query?f=json&where='+encodeURIComponent('OBJECTID >= '+selected[0]+' AND OBJECTID <= '+selected.at(-1))+'&outFields='+encodeURIComponent(fields)+'&outSR=4326&geometryPrecision=6&maxAllowableOffset=0.0001';
  const page=await get(kind+'-'+String(i).padStart(5,'0')+'.json',u);
  if(page.exceededTransferLimit||page.features.length!==selected.length)throw Error('Incomplete water export '+kind+' '+i);
  total+=page.features.length;console.log(kind,total+'/'+list.length);
 }
}
