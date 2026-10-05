import fs from 'node:fs/promises';
const root=new URL('./mongolia-sources/',import.meta.url);
const base='https://services-ap1.arcgis.com/QIJaUt9oyULFXfLr/ArcGIS/rest/services/mng_admbnda_adm2_nso_20201019/FeatureServer/0';
const files=[['nso-original-service.json',base+'?f=pjson'],['nso-original-soum.geojson',base+'/query?where=1%3D1&outFields=ADM2_PCODE,ADM1_PCODE&outSR=4326&f=geojson'],['nso-names.json',base+'/query?where=1%3D1&outFields=*&returnGeometry=false&f=json'],['hdx-license.json','https://data.humdata.org/api/3/action/package_show?id=cod-ab-mng']];
await fs.mkdir(root,{recursive:true});
for(const [name,url] of files){const response=await fetch(url);if(!response.ok)throw Error(name+': HTTP '+response.status);const text=await response.text(),data=JSON.parse(text);if(data.error||data.success===false)throw Error(name+': source returned an error');await fs.writeFile(new URL(name,root),text);console.log(name);}
