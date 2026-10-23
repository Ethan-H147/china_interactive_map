import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const root='scripts/boundary-sources/four-europe/';
export const digest=b=>createHash('sha256').update(b).digest('hex');
export function source(name){const b=gunzipSync(fs.readFileSync(root+name+'.gz')),m=JSON.parse(fs.readFileSync(root+'manifest.json'));if(digest(b)!==m.files[name].sha256)throw Error('Source checksum '+name);return b;}
export async function retain(name,url,meta={},bytes){fs.mkdirSync(root,{recursive:true});let b=bytes;if(fs.existsSync(root+name+'.gz'))b=gunzipSync(fs.readFileSync(root+name+'.gz'));if(!b){const r=await fetch(url,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(name+' HTTP '+r.status);b=Buffer.from(await r.arrayBuffer());}const file=root+'manifest.json',m=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{retrieved:'2026-10-23',files:{}};if(m.files[name]&&m.files[name].sha256!==digest(b))throw Error('Pinned source changed '+name);fs.writeFileSync(root+name+'.gz',gzipSync(b,{level:9}));m.files[name]={url,...meta,sha256:digest(b),bytes:b.length};fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');console.log('Retained',name,b.length);return b;}
if(process.argv[1]?.endsWith('fetch-four-europe.mjs')){
 const original='artifacts/expansion-source/';
 const pins=JSON.parse(fs.readFileSync('scripts/country-expansion-sources.json'));
 for(const n of ['lau2024.geojson','nuts2024.geojson']){if(fs.existsSync(root+n+'.gz')){source(n);continue;}let b;if(fs.existsSync(original+n))b=fs.readFileSync(original+n);else{const r=await fetch(pins.files[n].url);if(!r.ok)throw Error('GISCO HTTP '+r.status);b=Buffer.from(await r.arrayBuffer());}if(digest(b)!==pins.files[n].sha256)throw Error('GISCO original checksum');const data=JSON.parse(b);data.features=data.features.filter(f=>['HR','RO','BA'].includes(f.properties.CNTR_CODE));await retain(n,pins.files[n].url,{credit:'Eurostat GISCO 2024',license:'GISCO distribution terms',originalSha256:digest(b),extraction:'Croatia, Romania and Bosnia and Herzegovina only'},Buffer.from(JSON.stringify(data)));}
 for(const level of [1,2,3]){const m=JSON.parse(await retain('bih-adm'+level+'-metadata.json','https://www.geoboundaries.org/api/current/gbOpen/BIH/ADM'+level+'/'));await retain('bih-adm'+level+'.geojson',m.gjDownloadURL,{credit:m.boundarySource,license:m.boundaryLicense,year:m.boundaryYearRepresented});}
 await retain('bih-census-2013.pdf','https://www.popis.gov.ba/popis2013/doc/RezultatiPopisa_BS.pdf',{credit:'Agency for Statistics of Bosnia and Herzegovina, final 2013 census',license:'Official published statistical facts with attribution'});
 const h=JSON.parse(await retain('blr-metadata.json','https://data.humdata.org/api/3/action/package_show?id=cod-ab-blr')).result;
 await retain('blr-boundaries.zip',h.resources.find(r=>r.name.endsWith('geojson.zip')).url,{credit:h.dataset_source,license:h.license_title,notes:h.notes});
 const nuts=JSON.parse(source('nuts2024.geojson')).features.filter(f=>['HR','RO'].includes(f.properties.CNTR_CODE)&&f.properties.LEVL_CODE===3).map(f=>f.properties.NUTS_ID);
 const api='https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
 await retain('gdp.json',api+'nama_10r_3gdp?unit=MIO_EUR&unit=EUR_HAB&sinceTimePeriod=2022&'+nuts.map(c=>'geo='+c).join('&'),{credit:'Eurostat regional GDP, current prices',license:'CC BY 4.0'});
 await retain('exchange.json',api+'ert_bil_eur_a?currency=USD&statinfo=AVG&sinceTimePeriod=2022',{credit:'Eurostat annual average USD per EUR',license:'CC BY 4.0'});
 for(const code of ['BIH','HRV','ROU','BLR'])await retain('worldbank-'+code+'.json','https://api.worldbank.org/v2/country/'+code+'/indicator/SP.POP.TOTL;NY.GDP.MKTP.CD;NY.GDP.PCAP.CD?source=2&date=2023:2025&format=json&per_page=100',{credit:'World Bank World Development Indicators',license:'CC BY 4.0'});
 for(const [code,part]of [['ba','b/bf/Flag_of_Bosnia_and_Herzegovina.svg'],['hr','1/1b/Flag_of_Croatia.svg'],['ro','7/73/Flag_of_Romania.svg'],['by','8/85/Flag_of_Belarus.svg']])await retain('flag-'+code+'.svg','https://upload.wikimedia.org/wikipedia/commons/'+part,{credit:'Wikimedia Commons',license:'Public domain'});
}
