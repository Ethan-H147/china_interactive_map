import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const root='scripts/boundary-sources/central-europe/';
export function source(name){const bytes=gunzipSync(fs.readFileSync(root+name+'.gz')),m=JSON.parse(fs.readFileSync(root+'manifest.json'));if(createHash('sha256').update(bytes).digest('hex')!==m.files[name].sha256)throw Error('Central Europe source checksum '+name);return bytes;}
export async function retain(name,url,meta={},options={}){
 fs.mkdirSync(root,{recursive:true});const file=root+name+'.gz';let bytes;
 if(fs.existsSync(file))bytes=gunzipSync(fs.readFileSync(file));else{const r=await fetch(url,{...options,signal:AbortSignal.timeout(300000)});if(!r.ok)throw Error(name+' HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());if(name.endsWith('.geojson')){const d=JSON.parse(bytes);if(!d.features?.length||d.numberReturned<d.numberMatched||d.totalFeatures>d.features.length)throw Error('Incomplete official boundary layer '+name);}fs.writeFileSync(file,gzipSync(bytes,{level:9}));}
 const fileMeta=root+'manifest.json',m=fs.existsSync(fileMeta)?JSON.parse(fs.readFileSync(fileMeta)):{retrieved:'2026-10-22',files:{}},sha256=createHash('sha256').update(bytes).digest('hex');
 if(m.files[name]?.sha256&&m.files[name].sha256!==sha256)throw Error('Pinned source changed '+name);
 m.files[name]={url,...meta,sha256,bytes:bytes.length};fs.writeFileSync(fileMeta,JSON.stringify(m,null,2)+'\n');console.log('Retained',name,bytes.length);return bytes;
}
const wfs=(base,type)=>base+'?'+new URLSearchParams({service:'WFS',version:'2.0.0',request:'GetFeature',typeNames:type,outputFormat:'application/json',srsName:'EPSG:4326',count:'20000'});
export async function fetchCentralEurope(){
 await Promise.all([
  retain('austria-local.geojson',wfs('https://www.statistik.at/gs-open/GEODATA/ows','GEODATA:STATISTIK_AUSTRIA_GEM_20260101'),{provider:'Statistics Austria · municipalities and Vienna municipal districts, 1 January 2026',license:'CC BY 4.0'}),
  retain('austria-districts.geojson',wfs('https://www.statistik.at/gs-open/GEODATA/ows','GEODATA:STATISTIK_AUSTRIA_POLBEZ_20260101'),{provider:'Statistics Austria · political districts, including separate Vienna borough reference areas, 1 January 2026',license:'CC BY 4.0'}),
  retain('austria-population.ods','https://www.statistik.at/fileadmin/pages/453/RegUnitsPopulation.ods',{provider:'Statistics Austria · Population on 1 January 2026',license:'CC BY 4.0'})
 ]);
 const si='https://ipi.eprostor.gov.si/wfs-si-gurs-rpe/wfs';
 await Promise.all(['NASELJA','OBCINE','STATISTICNE_REGIJE'].map((type,i)=>retain(['slovenia-settlements.geojson','slovenia-municipalities.geojson','slovenia-regions.geojson'][i],wfs(si,'SI.GURS.RPE:'+type),{provider:'Geodetska uprava Republike Slovenije · current Register of Spatial Units, retrieved 22 October 2026',license:'CC BY 4.0 · GURS',type})));
 const populationUrl='https://pxweb.stat.si/SiStatData/api/v1/en/Data/05C5003S.px';
 await retain('slovenia-population-metadata.json',populationUrl,{provider:'SURS · population by municipality and settlement, 1 January'});
 const query={query:[{code:'OBČINA/NASELJE',selection:{filter:'all',values:['*']}},{code:'LETO',selection:{filter:'item',values:['2026']}},{code:'MERITVE',selection:{filter:'item',values:['0']}}],response:{format:'json-stat2'}};
 await retain('slovenia-population.json',populationUrl,{provider:'SURS · resident population on 1 January 2026',license:'CC BY 4.0',query},{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(query)});
 for(const [code,url]of [['at','https://upload.wikimedia.org/wikipedia/commons/4/41/Flag_of_Austria.svg'],['hu','https://upload.wikimedia.org/wikipedia/commons/c/c1/Flag_of_Hungary.svg'],['si','https://upload.wikimedia.org/wikipedia/commons/f/f0/Flag_of_Slovenia.svg']])await retain('flag-'+code+'.svg',url,{provider:'Wikimedia Commons national flag artwork',license:'Public domain'});
 await fetchHungary();
 await fetchCentralStatistics();
}
export async function fetchHungary(){
 const base='https://map.ksh.hu/arcgis/rest/services/ksh_vazterkep/MapServer';
 for(const [name,id]of [['hungary-municipalities.geojson',7],['hungary-districts.geojson',5],['hungary-counties.geojson',3]]){
  if(fs.existsSync(root+name+'.gz')){source(name);continue;}
  await retain('hungary-layer-'+id+'.json',base+'/'+id+'?f=json',{provider:'Hungarian Central Statistical Office · TIMEA public administrative geometry',license:'KSH published geographical information with attribution'});
  const ids=await(await fetch(base+'/'+id+'/query?where=1%3D1&returnIdsOnly=true&f=json')).json();if(!ids.objectIds)throw Error('Missing Hungarian layer IDs');
  const features=[];
  for(let start=0;start<ids.objectIds.length;start+=150){const query=new URLSearchParams({objectIds:ids.objectIds.slice(start,start+150).join(','),outFields:'*',outSR:'4326',geometryPrecision:'6',f:'geojson'}),r=await fetch(base+'/'+id+'/query?'+query,{signal:AbortSignal.timeout(120000)}),j=await r.json();if(!j.features||j.exceededTransferLimit)throw Error('Incomplete Hungary page '+JSON.stringify(j.error));features.push(...j.features);console.log(name,features.length,'/',ids.objectIds.length);}
  if(features.length!==ids.objectIds.length)throw Error('Hungary layer count mismatch');
  const bytes=Buffer.from(JSON.stringify({type:'FeatureCollection',features}));fs.writeFileSync(root+name+'.gz',gzipSync(bytes,{level:9}));
  await retain(name,base+'/'+id,{provider:'Hungarian Central Statistical Office · TIMEA administrative boundaries, retrieved 22 October 2026',license:'KSH published geographical information with attribution',features:features.length,query:'Object IDs enumerated once, downloaded in batches of 150; WGS84, six decimal places.'});
 }
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await fetchCentralEurope();

export async function fetchCentralStatistics(){
 const gisco='https://gisco-services.ec.europa.eu/distribution/v2/lau/geojson/LAU_RG_01M_2024_4326.geojson';
 if(!fs.existsSync(root+'hungary-population-2024.json.gz')){const r=await fetch(gisco,{signal:AbortSignal.timeout(300000)});if(!r.ok)throw Error('GISCO population HTTP '+r.status);const bytes=Buffer.from(await r.arrayBuffer()),known=JSON.parse(fs.readFileSync('scripts/country-expansion-sources.json')).files['lau2024.geojson'].sha256;if(createHash('sha256').update(bytes).digest('hex')!==known)throw Error('Review updated validated GISCO source before replacing the retained release');const records=JSON.parse(bytes).features.filter(f=>f.properties.CNTR_CODE==='HU').map(f=>f.properties);fs.writeFileSync(root+'hungary-population-2024.json.gz',gzipSync(JSON.stringify({year:2024,date:'2024-01-01',records}),{level:9}));}
 await retain('hungary-population-2024.json',gisco,{provider:'Eurostat GISCO · validated 2024 LAU reference population, Hungarian country extract',license:'Eurostat / EuroGeographics GISCO terms',extraction:'Hungarian LAU properties only, from the retained and pinned whole-Europe 2024 source'});
 const api='https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/',at=['AT11','AT12','AT13','AT21','AT22','AT31','AT32','AT33','AT34'],others=['HU110','HU120','HU211','HU212','HU213','HU221','HU222','HU223','HU231','HU232','HU233','HU311','HU312','HU313','HU321','HU322','HU323','HU331','HU332','HU333','SI031','SI032','SI033','SI034','SI035','SI036','SI037','SI038','SI041','SI042','SI043','SI044'];
 for(const[dataset,geo]of [['nama_10r_2gdp',at],['nama_10r_3gdp',others]])await retain(dataset+'.json',api+dataset+'?format=JSON&unit=MIO_EUR&unit=EUR_HAB&sinceTimePeriod=2021&'+geo.map(g=>'geo='+g).join('&'),{provider:'Eurostat · GDP at current market prices, official NUTS geography',license:'CC BY 4.0'});
 await retain('eurostat-exchange.json',api+'ert_bil_eur_a?format=JSON&currency=USD&statinfo=AVG&sinceTimePeriod=2021',{provider:'Eurostat · annual average USD per EUR',license:'CC BY 4.0'});
}
