import fs from 'node:fs/promises';
const base='artifacts/argentina-cities/';
await fs.mkdir(base,{recursive:true});
for(const [name,url] of [
 ['municipalities.geojson','https://wms.ign.gob.ar/geoserver/ign/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ign%3Amunicipio&outputFormat=application%2Fjson&srsName=EPSG%3A4326'],
 ['georef-localities.json','https://apis.datos.gob.ar/georef/api/v2.0/localidades.geojson']
]){
 try{await fs.access(base+name);console.log(name,'cached');continue;}catch{}
 const response=await fetch(url,{signal:AbortSignal.timeout(240000)});
 if(!response.ok)throw Error(name+': HTTP '+response.status);
 const text=await response.text(),value=JSON.parse(text);
 if(value.type!=='FeatureCollection'||!value.features?.length)throw Error(name+': empty source');
 await fs.writeFile(base+name,text);console.log(name,value.features.length,'features');
}
