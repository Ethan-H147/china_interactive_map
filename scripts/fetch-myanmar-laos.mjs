import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {gzipSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
export const root='scripts/boundary-sources/myanmar-laos',retrieved='2026-10-18';
const defs={
'myanmar-hdx-metadata.json':{url:'https://data.humdata.org/api/3/action/package_show?id=cod-ab-mmr',license:'Source metadata',credit:'OCHA HDX'},
'myanmar-admin1.zip':{url:'https://data.themimu.info/api/files/resources/a0feb2a2-5356-40c9-87e6-1925b78e456c/myanmar-state-and-region-boundaries-mimu-pcodev9-4.zip',license:'MIMU data licence; free use with attribution',credit:'Myanmar Information Management Unit (MIMU), PCode v9.4',year:2024},
'myanmar-townships.zip':{url:'https://data.themimu.info/api/files/resources/361513c4-22d4-4f85-9920-1a9afc2ac1cb/myanmar-township-boundaries-mimu-pcodev9-4.zip',license:'MIMU data licence; free use with attribution',credit:'Myanmar Information Management Unit (MIMU), PCode v9.4',year:2024},
'myanmar-selfadmin.zip':{url:'https://data.themimu.info/api/files/resources/b2604cb9-d355-409d-a308-a21df2b5b795/myanmar-self-administered-regions-boundaries-mimu-pcodev9-4.zip',license:'MIMU data licence; free use with attribution',credit:'Myanmar Information Management Unit (MIMU), PCode v9.4',year:2024},
'myanmar-administrative-source.html':{url:'https://data.themimu.info/en/dataset/myanmar-administrative-boundary',license:'Source metadata',credit:'MIMU',updated:'2026-08-14'},
'myanmar-pcodes.html':{url:'https://www.themimu.info/place-codes',license:'Source metadata',credit:'MIMU'},
'laos-boundaries.zip':{url:'https://data.humdata.org/dataset/9eb6aff1-9e3f-43d3-99a6-f415fe4b4dff/resource/3541e1a1-a15f-4c5f-982a-0747e441611a/download/lao_admin_boundaries.geojson.zip',license:'CC BY3.0 IGO',credit:'OCHA HDX / Lao national administrative boundaries',year:2019,reviewed:'2025-10-30'},
'laos-hdx-metadata.json':{url:'https://data.humdata.org/api/3/action/package_show?id=cod-ab-lao',license:'Source metadata',credit:'OCHA HDX'},
'laos-population-metadata.json':{url:'https://data.humdata.org/api/3/action/package_show?id=cod-ps-lao',license:'Source metadata',credit:'OCHA HDX'},
'laos-population1.csv':{url:'https://data.humdata.org/dataset/f9ec8c86-e300-443b-bd04-a6c9923c29ef/resource/55d90dae-f476-4fe1-bcc5-0745087154ee/download/lao_admpop_adm1_2024.csv',license:'CC BY3.0 IGO',credit:'UNFPA, Lao Statistics Bureau via OCHA HDX; 2024 population projections',year:2024},
'laos-population2.csv':{url:'https://data.humdata.org/dataset/f9ec8c86-e300-443b-bd04-a6c9923c29ef/resource/87e60232-7af8-43c3-bc47-685f2a770ab1/download/lao_admpop_adm2_2024.csv',license:'CC BY3.0 IGO',credit:'UNFPA, Lao Statistics Bureau via OCHA HDX; 2024 population projections',year:2024},
'flag-mm.svg':{url:'https://upload.wikimedia.org/wikipedia/commons/8/8c/Flag_of_Myanmar.svg',license:'Public domain',credit:'Myanmar national flag, Wikimedia Commons'},
'flag-la.svg':{url:'https://upload.wikimedia.org/wikipedia/commons/5/56/Flag_of_Laos.svg',license:'Public domain',credit:'Laos national flag, Wikimedia Commons'}
};
export async function retain(name,meta){fs.mkdirSync(root,{recursive:true});const file=root+'/'+name+'.gz',manifestFile=root+'/manifest.json',manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile)):{retrieved,files:{}};let b;if(fs.existsSync(file))b=gunzipSync(fs.readFileSync(file));else{const r=await fetch(meta.url,{headers:{'User-Agent':'BoundaryAtlas/1.0 (+https://github.com/Ethan-H147/china_interactive_map)'},signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(name+' HTTP '+r.status);b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(file,gzipSync(b,{level:9}));}const sha256=createHash('sha256').update(b).digest('hex');if(manifest.files[name]){if(manifest.files[name].sha256!==sha256)throw Error('Retained input differs '+name);}manifest.files[name]={...meta,sha256,bytes:b.length};fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');console.log(name,b.length);return b;}
export function readSource(name){const b=gunzipSync(fs.readFileSync(root+'/'+name+'.gz')),m=JSON.parse(fs.readFileSync(root+'/manifest.json'));if(createHash('sha256').update(b).digest('hex')!==m.files[name].sha256)throw Error('Input checksum '+name);return b;}
Object.assign(defs,{
  "myanmar-iiss-dashboard.js": {
    "url": "https://myanmar.iiss.org/_app/immutable/chunks/L26jvRJT.js",
    "license": "Copyright IISS. Research and private study permitted; public redistribution not licensed.",
    "credit": "IISS Myanmar Conflict Map",
    "effectiveDate": "Territory polygon date unspecified; retrieved 2026-10-18",
    "terms": "https://www.iiss.org/terms-and-conditions/"
  },
  "myanmar-iiss-methodology.html": {
    "url": "https://myanmar.iiss.org/methodology",
    "license": "Copyright source; retained local research reference, paraphrased with attribution",
    "credit": "IISS"
  },
  "myanmar-iiss-terms.html": {
    "url": "https://www.iiss.org/terms-and-conditions/",
    "license": "Copyright source; retained local research reference, paraphrased with attribution",
    "credit": "IISS"
  },
  "myanmar-isp2026.html": {
    "url": "https://ispmyanmar.com/2026mp003/",
    "license": "Copyright source; retained local research reference, paraphrased with attribution",
    "credit": "ISP-Myanmar"
  },
  "myanmar-iiss-2026-analysis.html": {
    "url": "https://myanmar.iiss.org/analysis/war-by-other-means",
    "license": "Copyright source; retained local research reference, paraphrased with attribution",
    "credit": "IISS"
  },
  "myanmar-iiss-northeast.html": {
    "url": "https://myanmar.iiss.org/analysis/northeast",
    "license": "Copyright source; retained local research reference, paraphrased with attribution",
    "credit": "IISS"
  },
  "myanmar-census2014.pdf": {
    "url": "https://www.themimu.info/sites/themimu.info/files/documents/Census_Data_Sheet_Eng_2015.pdf",
    "license": "Official census factual statistics, MIMU/UNFPA attribution",
    "credit": "Department of Population, UNFPA, MIMU",
    "year": 2014
  },
  "myanmar-acled2026.html": {
    "url": "https://acleddata.com/report/state-repression-increases-under-myanmar-militarys-new-leadership",
    "license": "Copyright ACLED; local reference, factual paraphrases with attribution",
    "credit": "ACLED",
    "asOf": "2026-07-17"
  },
  "myanmar-inle-osm.json": {
    "url": "https://api.openstreetmap.org/api/0.6/relation/5661748/full.json",
    "license": "ODbL1.0",
    "credit": "© OpenStreetMap contributors"
  },
  "myanmar-indawgyi-osm.json": {
    "url": "https://api.openstreetmap.org/api/0.6/relation/7181898/full.json",
    "license": "ODbL1.0",
    "credit": "© OpenStreetMap contributors"
  }
});
export async function fetchSources(){for(const [name,meta]of Object.entries(defs))await retain(name,meta);}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await fetchSources();
