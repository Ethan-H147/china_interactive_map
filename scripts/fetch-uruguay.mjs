import fs from 'node:fs';
const out='artifacts/uruguay/';fs.mkdirSync(out,{recursive:true});
const url='https://mapas.ide.uy/geoserver-vectorial/ideuy/municipios_20250507/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=ideuy:municipios_20250507&outputFormat=application/json&srsName=EPSG:4326';
const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('Municipal download: '+response.status);
const bytes=Buffer.from(await response.arrayBuffer()),data=JSON.parse(bytes);
if(data.features?.length!==136||data.features.some(f=>!f.geometry||!f.properties.cod_muni))throw Error('Municipal coverage changed; review the official release before rebuilding');
fs.writeFileSync(out+'municipios-wfs.geojson',bytes);console.log('Official Uruguay 2025 municipal geometry: 136 jurisdictions.');
