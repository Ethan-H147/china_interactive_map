import fs from 'node:fs';import assert from 'node:assert/strict';import mapshaper from 'mapshaper';import {load,polygons,landIndex} from './geo-index.mjs';import {readXlsx} from './read-xlsx.mjs';import {decodeStat} from './denmark-statistics.mjs';import {root,manifest,readSettlementSource} from './fetch-nordic-settlements.mjs';
const sources=manifest();
const definitions={
 sweden:{prefix:'SE',file:'sweden-2023.geojson',year:2023,population:'bef',code:'tatortskod',name:'tatort',source:'https://www.scb.se/vara-tjanster/oppna-data/oppna-geodata/statistiska-tatorter/',title:'Statistics Sweden · statistical localities (tätorter), 2023',date:'2023-12-31',expected:2017,total:9265976,license:'CC0',credit:'Source: Statistics Sweden. Point locations derived from official polygons.'},
 norway:{prefix:'NO',file:'norway-2026.geojson',year:2026,population:'befolkning_tettsted',code:'tett_nr',name:'tettstedsnavn',source:'https://www.ssb.no/en/statbank1/table/04859',title:'Statistics Norway · urban settlements (tettsteder), 2026',date:'2026-01-01',expected:1000,total:4696257,license:'Open data, attribution to Statistics Norway',credit:'Source: Statistics Norway. Point locations derived from official polygons.'},
 finland:{prefix:'FI',file:'finland-2025.geojson',year:2025,population:'vaesto25lkm',code:'tktaajtunnus',name:'taajnimi',source:'https://ckan.ymparisto.fi/dataset/ykr-taajama',title:'Syke/YKR · urban settlements (taajamat), 2025',expected:708,total:4877208,license:'CC BY 4.0',credit:'Source: Syke/YKR (Lähde: Syke/YKR). Point locations derived from official polygons.'}
};
fs.mkdirSync('artifacts/nordic-settlements',{recursive:true});
const workbook='artifacts/nordic-settlements/sweden-parents-retained.xlsx';fs.writeFileSync(workbook,readSettlementSource('sweden-municipal-parts.xlsx'));
const swedishParts=new Map();for(const row of Object.values(readXlsx(workbook))[0]){if(!/^[0-9]{4}T[A-Z][0-9]{3}$/.test(String(row[4])))continue;const key=String(row[4]);if(!swedishParts.has(key))swedishParts.set(key,[]);swedishParts.get(key).push({municipality:String(row[2]).padStart(4,'0'),population:Number.isFinite(row[7])?row[7]:null});}
const norwegianParts=new Map();for(const row of decodeStat(JSON.parse(readSettlementSource('norway-municipal-parts.json')).data)){if(row.value>0&&row.TettSted!=='9999'){if(!norwegianParts.has(row.TettSted))norwegianParts.set(row.TettSted,[]);norwegianParts.get(row.TettSted).push({municipality:row.Region,population:row.value});}}
for(const [country,config]of Object.entries(definitions)){
 const dir='dist/data/europe/'+country,catalogue=load(dir+'/catalogue.bin'),units=new Map(catalogue.records.map(r=>[r.id,r])),municipalities=catalogue.records.filter(r=>r.level===2&&r.id.startsWith(config.prefix+'-M-'));
 const areas=JSON.parse(readSettlementSource(config.file));assert.equal(areas.features.length,config.expected);
 const result=await mapshaper.applyCommands('-i input.geojson -points inner -o points.geojson format=geojson',{'input.geojson':JSON.stringify(areas)}),points=JSON.parse(result['points.geojson']).features;
 const municipalGeometry=[];for(const chunk of Object.values(catalogue.chunks).filter(c=>c.level===2)){for(const f of load(dir+'/'+chunk.file).regions.features){const unit=units.get(f.properties.id);if(unit?.id.startsWith(config.prefix+'-M-'))municipalGeometry.push({unit,contains:landIndex(polygons(f.geometry).flat())});}}
 if(country==='finland'){const official=load('scripts/boundary-sources/nordics/finland-municipalities.json.gz').features.map(f=>({unit:units.get('FI-M-'+f.properties.kunta),contains:landIndex(polygons(f.geometry).flat())}));municipalGeometry.unshift(...official);}
 const records=[];
 for(let i=0;i<points.length;i++){
  const feature=points[i],p=feature.properties,sourceFeature=areas.features[i],code=p[config.code],center=feature.geometry.coordinates.map(v=>+v.toFixed(6));assert(p[config.population]>=200);
  let parts=country==='sweden'?swedishParts.get(code):country==='norway'?norwegianParts.get(code):undefined;
  if(parts){parts=parts.map(part=>({...part,id:config.prefix+'-M-'+part.municipality}));assert(parts.every(part=>units.has(part.id)),country+' '+code+' municipality codes');if(country==='norway')assert.equal(parts.reduce((s,part)=>s+part.population,0),p[config.population],code+' population parts');}
  const pointMunicipality=municipalGeometry.find(g=>g.contains(center))?.unit;
  const representative=parts?.slice().sort((a,b)=>(b.population||0)-(a.population||0))[0];
  const location=parts?(parts.some(part=>part.id===pointMunicipality?.id)?pointMunicipality:units.get(country==='sweden'?'SE-M-'+p.kommun:representative.id)):pointMunicipality;
  assert(location,country+' '+code+' '+p[config.name]+' point has no municipality '+JSON.stringify(center));
  const parentId=location.id,parents=[...new Set([parentId,...(parts||[]).map(part=>part.id)])];
  let name=p[config.name]||'Unnamed urban area ('+location.en+')',local=name,names,aliases=[];
  if(country==='finland'){
   const fi=p.taajnimi,sv=p.taajnimiruo;
   if(fi&&sv){const svBase=sv.replace(/ ct\.$/,'');const municipality=fi.endsWith(' kt.')?municipalities.find(r=>(r.names?.sv||r.local)===svBase):null;name=municipality?.en||fi;local=municipality?.names?.fi||fi;names={en:name,fi:{name:local},sv:{name:sv.replace(/ ct\.$/,'')}};aliases=[fi,sv,svBase,...(municipality?.aliases||[])];}
  }else if(country==='sweden'){names={en:name,sv:{name}};if(name==='Göteborg')aliases.push('Gothenburg');}
  else names={en:name,nb:{name}};
  const id=config.prefix+'-S-'+(code||'YKR25-'+p.ykr25nro);
  const note=country==='finland'?'Whole statistical urban area, which may span municipality boundaries.':parents.length>1?'Whole statistical urban area spanning '+parents.length+' municipalities.':'Statistical urban settlement, distinct from the municipality.';
  records.push({id,en:name,name,local,kind:'Urban area',center,parentId,parents,provinceId:location.parent,...(names?{names}:{}),aliases:[...new Set(aliases.filter(Boolean))],
   population:{value:p[config.population],year:config.year,...(config.date?{date:config.date}:{}),source:config.source,periodLabel:country==='sweden'?'31 December 2023 population':country==='norway'?'1 January 2026 population':'2025 population',scope:'Urban area',scopeNote:note+(!code?' The source has not assigned this newly qualifying area a name or Statistics Finland code.':'')},
   provenance:{settlementCode:code||null,...(country==='finland'?{ykrCode:p.ykr25nro}:{}),coordinates:sources.files[config.file].url,coordinateMethod:'Interior point of the official settlement polygon',population:config.source,municipalityMethod:country==='finland'?'Municipality containing point; not complete urban-area membership':'Official municipal parts; navigation follows point location where mapped, otherwise the source-assigned municipality or largest population part',...(parts?{municipalParts:parts}:{}),license:config.license,credit:config.credit}});
 }
 records.sort((a,b)=>a.id.localeCompare(b.id));assert.equal(new Set(records.map(r=>r.id)).size,config.expected);assert.equal(records.reduce((s,r)=>s+r.population.value,0),config.total);
 const output={country,records,sources:[{title:config.title,url:config.source,license:config.license,credit:config.credit},{title:'Official settlement polygons; point locations derived',url:sources.files[config.file].url,license:config.license}],selection:'All '+config.expected+' official '+config.year+' statistical urban settlements with at least 200 residents. Rural hamlets below the national urban-settlement threshold are excluded. These points are independent of administrative subdivisions.'};
 fs.writeFileSync(dir+'/settlements.json',JSON.stringify(output)+'\n');if(!fs.existsSync(dir+'/place-names-flags.json'))fs.writeFileSync(dir+'/place-names-flags.json',JSON.stringify({places:{},sources:[]})+'\n');console.log(country,records.length,'settlements;',config.total,'residents');
}

// Supplement statistical urban areas with the nationwide named village register.
(await import('./prepare-finland-places.mjs')).prepareFinlandPlaces();
