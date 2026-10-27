import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const root='scripts/boundary-sources/caucasus-gulf/';
const agent={'User-Agent':'BoundaryAtlas/1.0 (https://github.com/Ethan-H147/china_interactive_map)'};
export function source(name){const m=JSON.parse(fs.readFileSync(root+'manifest.json')),b=gunzipSync(fs.readFileSync(root+name+'.gz'));if(createHash('sha256').update(b).digest('hex')!==m.files[name].sha256)throw Error('Source checksum '+name);return b;}
export async function retain(name,url,meta={}){
 fs.mkdirSync(root,{recursive:true});const mf=root+'manifest.json',m=fs.existsSync(mf)?JSON.parse(fs.readFileSync(mf)):{retrieved:'2026-10-26',files:{}};
 let b;if(fs.existsSync(root+name+'.gz'))b=gunzipSync(fs.readFileSync(root+name+'.gz'));else{const r=await fetch(url,{headers:agent,signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error(name+' HTTP '+r.status);b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(root+name+'.gz',gzipSync(b,{level:9}));}
 const sha256=createHash('sha256').update(b).digest('hex');if(m.files[name]?.sha256&&m.files[name].sha256!==sha256)throw Error('Pinned source changed '+name);m.files[name]={url,...meta,sha256,bytes:b.length};fs.writeFileSync(mf,JSON.stringify(m,null,2)+'\n');console.log(name,b.length);return b;
}
export async function fetchCountries(){
 const entity=async id=>JSON.parse(await retain('wikidata-'+id+'.json','https://www.wikidata.org/wiki/Special:EntityData/'+id+'.json',{credit:'Wikidata',license:'CC0'})).entities[id];
 const mappings={};
 for(const [country,q]of [['armenia','Q399'],['georgia','Q230'],['azerbaijan','Q227'],['bahrain','Q398']]){
  const c=await entity(q),ids=[...new Set((c.claims.P150||[]).filter(x=>!x.qualifiers?.P582).map(x=>x.mainsnak.datavalue?.value.id).filter(Boolean))],records=[];
  if(country==='azerbaijan')ids.push('Q2025789','Q136386175');
  for(const id of ids){const e=await entity(id),claim=(e.claims.P402||[]).find(x=>!x.qualifiers?.P582),en=e.labels.en?.value;if(!en)continue;let relation=claim?.mainsnak.datavalue?.value;
   if(!relation){const query=country==='armenia'?'Lori Province, Armenia':en+', '+c.labels.en.value;const d=JSON.parse(await retain('geocode-'+id+'.json','https://nominatim.openstreetmap.org/search?'+new URLSearchParams({q:query,format:'json',limit:'3'}),{credit:'© OpenStreetMap contributors',license:'ODbL 1.0'}));relation=d.find(r=>r.osm_type==='relation'&&r.class==='boundary')?.osm_id;}
   if(!relation){if(['Q2025789','Q136386175','Q158903'].includes(id))continue;throw Error('Missing boundary relation '+id+' '+en);}
   if(records.some(r=>r.relation===Number(relation)))continue;
   const iso=e.claims.P300?.find(x=>!x.qualifiers?.P582)?.mainsnak.datavalue?.value;
   const download=()=>retain('relation-'+relation+'.json','https://www.openstreetmap.org/api/0.6/relation/'+relation+'/full.json',{credit:'© OpenStreetMap contributors',license:'ODbL 1.0',page:'https://www.openstreetmap.org/relation/'+relation,relation:Number(relation),country});
   try{await download();}catch(error){if(!/HTTP (404|410)/.test(error.message))throw error;const d=JSON.parse(await retain('geocode-current-'+id+'.json','https://nominatim.openstreetmap.org/search?'+new URLSearchParams({q:en+', '+c.labels.en.value,format:'json',limit:'3'}),{credit:'© OpenStreetMap contributors',license:'ODbL 1.0'}));relation=d.find(r=>r.osm_type==='relation'&&r.class==='boundary')?.osm_id;if(!relation)throw Error('Current boundary '+id+' '+en);await download();}
   records.push({id,relation:Number(relation),en,iso,labels:Object.fromEntries(Object.entries(e.labels).filter(([lang])=>['en','hy','ka','az','ar'].includes(lang)).map(([lang,l])=>[lang,l.value]))});
  }
  mappings[country]=records;fs.writeFileSync(root+'division-mapping.json',JSON.stringify(mappings,null,2)+'\n');
 }
 const ossetia=await entity('Q23427'),geocode=JSON.parse(await retain('geocode-ossetia.json','https://nominatim.openstreetmap.org/search?q=South%20Ossetia&format=json&limit=3',{credit:'© OpenStreetMap contributors',license:'ODbL 1.0'})),ossetiaRelation=ossetia.claims.P402?.find(x=>!x.qualifiers?.P582)?.mainsnak.datavalue.value||geocode.find(r=>r.osm_type==='relation').osm_id;
 await retain('relation-'+ossetiaRelation+'.json','https://www.openstreetmap.org/api/0.6/relation/'+ossetiaRelation+'/full.json',{credit:'© OpenStreetMap contributors',license:'ODbL 1.0',page:'https://www.openstreetmap.org/relation/'+ossetiaRelation,relation:Number(ossetiaRelation),country:'georgia'});
 mappings.georgia.push({id:'Q23427',relation:Number(ossetiaRelation),en:'South Ossetia',iso:'GE-SO',special:true,labels:{ka:'სამხრეთ ოსეთი'}});
 const nx=JSON.parse(await retain('geocode-nakhchivan.json','https://nominatim.openstreetmap.org/search?q=Nakhchivan%20Autonomous%20Republic&format=json&limit=3',{credit:'© OpenStreetMap contributors',license:'ODbL 1.0'})).find(r=>r.osm_type==='relation');
 await retain('relation-'+nx.osm_id+'.json','https://www.openstreetmap.org/api/0.6/relation/'+nx.osm_id+'/full.json',{credit:'© OpenStreetMap contributors',license:'ODbL 1.0',relation:nx.osm_id,country:'azerbaijan'});
 const nxData=JSON.parse(source('relation-'+nx.osm_id+'.json')),nxRelation=nxData.elements.find(r=>r.type==='relation'&&r.id===nx.osm_id);
 for(const m of nxRelation.members.filter(m=>m.type==='relation'&&m.role==='subarea'))await retain('relation-'+m.ref+'.json','https://www.openstreetmap.org/api/0.6/relation/'+m.ref+'/full.json',{credit:'© OpenStreetMap contributors',license:'ODbL 1.0',relation:m.ref,country:'azerbaijan',parent:'AZ-NX'});
 mappings.azerbaijan.push({relation:nx.osm_id,en:'Nakhchivan',iso:'AZ-NX',labels:{az:'Naxçıvan Muxtar Respublikası'},autonomous:true});
 for(const [en,native]of [['Binagadi','Binəqədi'],['Khazar','Xəzər'],['Khatai','Xətai'],['Garadagh','Qaradağ'],['Narimanov','Nərimanov'],['Nasimi','Nəsimi'],['Nizami','Nizami'],['Sabunchu','Sabunçu'],['Sabail','Səbail'],['Surakhani','Suraxanı'],['Yasamal','Yasamal'],['Pirallahi','Pirallahı']]){
  const r=JSON.parse(await retain('baku-regional-'+en+'.json','https://nominatim.openstreetmap.org/search?'+new URLSearchParams({q:native+' rayonu',countrycodes:'az',viewbox:'49,41,51,39',bounded:'1',format:'json',limit:'5'}),{credit:'© OpenStreetMap contributors',license:'ODbL 1.0'})).find(r=>r.osm_type==='relation'&&r.class==='boundary');if(!r)throw Error('Baku district '+en);
  await retain('relation-'+r.osm_id+'.json','https://www.openstreetmap.org/api/0.6/relation/'+r.osm_id+'/full.json',{credit:'© OpenStreetMap contributors',license:'ODbL 1.0',relation:r.osm_id,country:'azerbaijan',parent:'AZ-BA',en});
 }
 const bhr=JSON.parse(await retain('bhr-boundary-metadata.json','https://www.geoboundaries.org/api/current/gbOpen/BHR/ADM1/'));
 await retain('bhr-land.geojson',bhr.gjDownloadURL.replace('github.com/wmgeolab/geoBoundaries/raw/','media.githubusercontent.com/media/wmgeolab/geoBoundaries/'),{credit:bhr.boundarySource,license:bhr.boundaryLicense,year:bhr.boundaryYearRepresented,page:'https://www.geoboundaries.org/api/current/gbOpen/BHR/ADM1/'});
 for(const iso of ['qat','are']){const m=JSON.parse(await retain(iso+'-metadata.json','https://data.humdata.org/api/3/action/package_show?id=cod-ab-'+iso));const r=m.result.resources.find(r=>r.name.endsWith('.geojson.zip'));if(!r)throw Error('GeoJSON '+iso);await retain(iso+'.zip',r.url,{credit:m.result.organization.title+' · HDX COD-AB',license:m.result.license_title,page:'https://data.humdata.org/dataset/cod-ab-'+iso});}
 await retain('worldbank.json','https://api.worldbank.org/v2/country/ARM;AZE;GEO;QAT;BHR;ARE/indicator/NY.GDP.MKTP.CD;NY.GDP.PCAP.CD;SP.POP.TOTL?source=2&date=2023:2025&format=json&per_page=1000',{credit:'World Bank World Development Indicators',license:'CC BY 4.0'});
 await retain('bahrain-population.json','https://www.data.gov.bh/api/explore/v2.1/catalog/datasets/population-by-governorate-nationality-and-sex-census-2020/records?limit=100',{credit:'Bahrain Information & eGovernment Authority: 2020 census',license:'Bahrain Open Data Licence'});
 await retain('qatar-population.json','https://www.data.gov.qa/api/explore/v2.1/catalog/datasets/total-population-and-population-density-by-municipality-in-census-2010-2020/records?limit=100',{credit:'Qatar National Planning Council: 2020 census',license:'Qatar Open Data Licence'});
 try{await retain('azerbaijan-population.xls','https://www.stat.gov.az/source/demoqraphy/en/001_15en.xls',{credit:'State Statistical Committee of Azerbaijan: area, population and population density by territorial unit',license:'Official statistics; attribution'});}catch(e){console.log('Official Azerbaijan table currently unavailable:',e.message);}
 for(const [name,url]of [
  ['armenia-population.pdf','https://www.armstat.am/file/article/population_01_01_25.pdf'],
  ['georgia-population.pdf','https://www.geostat.ge/media/78328/Number-of-Population-as-of-January-1%2C-2026.pdf']
 ]){try{await retain(name,url,{credit:'National statistical authority',license:'Official statistics; attribution'});}catch(e){if(name!=='armenia-population.pdf')throw e;await retain(name,'https://www.e-research.am/storage/statistical_data/tpmruvJpTDCOARBw49BRENsnruKthJ1jsWOhsJtF.pdf',{credit:'Armstat, retained official publication via e-research.am',license:'Official statistics; attribution',originalUrl:url});}}
 for(const [name,url]of [['uae-abu-dhabi.html','https://www.statad.gov.ae/en/w/abu-dhabi-population-in-2024-grows-7-5-to-reach-4-14m'],['uae-dubai.html','https://www.dubai.ae/web/dubai.ae/dubai-fact-sheet'],['uae-sharjah.html','https://u.ae/en/about-the-uae/the-seven-emirates/Sharjah']]){try{await retain(name,url,{credit:'UAE federal or emirate government',license:'Official statistics; attribution'});}catch(e){console.log('Official emirate page unavailable:',name,e.message);}}
 await retain('uae-dubai-population.html','https://www.digitaldubai.ae/initiatives/paperless/dubai-digital-dubai%27s-population-tops-4.580-million-by-the-end-of-2025-recording-7.5-growth',{credit:'Digital Dubai / Dubai Data and Statistics Establishment: resident population, 2025',license:'Official statistics; attribution'});
 for(const [iso,file]of [['am','2/2f/Flag_of_Armenia.svg'],['az','d/dd/Flag_of_Azerbaijan.svg'],['ge','0/0f/Flag_of_Georgia.svg'],['qa','6/65/Flag_of_Qatar.svg'],['bh','2/2c/Flag_of_Bahrain.svg'],['ae','c/cb/Flag_of_the_United_Arab_Emirates.svg']])await retain('flag-'+iso+'.svg','https://upload.wikimedia.org/wikipedia/commons/'+file,{credit:'Wikimedia Commons · national flag artwork',license:'Public domain',page:'https://commons.wikimedia.org/wiki/File:'+file.split('/').at(-1)});
 fs.writeFileSync(root+'division-mapping.json',JSON.stringify(mappings,null,2)+'\n');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await fetchCountries();
