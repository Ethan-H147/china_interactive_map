import fs from 'node:fs';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';

const sourceDir='scripts/statistics-sources/botswana-namibia-cities';
const read=name=>JSON.parse(fs.readFileSync(`${sourceDir}/${name}`,'utf8'));
for(const [file,expected] of Object.entries(read('checksums.json'))){if(createHash('sha256').update(fs.readFileSync(`${sourceDir}/${file}`)).digest('hex')!==expected)throw Error('Pinned settlement source changed; review '+file);}
const normalize=name=>String(name).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function inRing(point,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function contains(point,g){const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;return polygons.some(p=>inRing(point,p[0])&&!p.slice(1).some(r=>inRing(point,r)));}
const snapshot=read('census-city-source.json'),assets=read('flag-assets.json');
const bwSource='https://www.statsbots.org.bw/sites/default/files/publications/Population%20%26%20Housing%20Census%202022-%20Population%20of%20Cities%2C%20Towns%2C%20Villages%20%26%20Associated%20Localities.pdf';
const naSource='https://nsa.org.na/wp-content/uploads/2024/10/2023-Population-and-Housing-Census-Main-Report-28-Oct-2024.pdf';
const flagChecks={gaborone:['Gaborone','https://www.crwflags.com/fotw/flags/bw-gabor.html'],francistown:['Francistown','https://www.fotw.info/flags/bw-franc.html'],windhoek:['Windhoek','https://www.fotw.info/flags/na-wind.html'],oshakati:['Oshakati','https://www.fotw.info/flags/na-oshak.html'],walvisbay:['Walvis Bay','https://www.fotw.info/flags/na-wb.html'],oranjemund:['Oranjemund','https://www.fotw.info/flags/na-oran.html']};
// Unverified regional designs and flag-like council logos are not treated as flags.
for(const [key,flag] of Object.entries(assets)){const hash=createHash('sha256').update(fs.readFileSync('dist/'+flag.file)).digest('hex');if(hash!==flag.sha256)throw Error('Original flag changed '+key);}
const flagManifest={nationalFlags:{botswana:assets.botswana,namibia:assets.namibia},flags:{}};
const labelSnapshot=read('wikidata-labels.json'),entities=labelSnapshot.data.entities;
const nameLanguages={en:'English',af:'Afrikaans',de:'German',tn:'Setswana',hz:'Otjiherero',naq:'Khoekhoegowab',ng:'Oshindonga',kj:'Oshikwanyama'};
const labelsByName=new Map(Object.values(labelSnapshot.pages.query.pages).filter(p=>p.title!=='Kanye West').map(p=>[normalize(p.title),entities[p.pageprops?.wikibase_item]]));
const kazungula=read('kazungula-locality.json');
if(!contains(snapshot.botswana.find(r=>r.name==='Kazungula').center,kazungula.geometry))throw Error('Kazungula point must lie inside its documented locality.');
for(const [country,code,year,populationSource] of [['botswana','BW',2022,bwSource],['namibia','NA',2023,naSource]]){
 const base=`dist/data/southern-africa/${country}`;
 const first=JSON.parse(zlib.gunzipSync(fs.readFileSync(base+'/first.bin'))).regions.features;
 const catalogue=JSON.parse(zlib.gunzipSync(fs.readFileSync(base+'/catalogue.bin'))).records;
 const places={},records=snapshot[country].map(row=>{
  if(!row.center||!row.geonamesId||!Number.isInteger(row.population)||row.population<=0)throw Error('Incomplete census locality '+row.name);
  const matches=first.filter(f=>contains(row.center,f.geometry));
  if(matches.length!==1)throw Error(`Expected one containing region for ${country}/${row.name}, found ${matches.length}`);
  const parentId=matches[0].properties.id;
  if(!catalogue.some(r=>r.id===parentId))throw Error('Unknown region '+parentId);
  const en={'Selibe Phikwe':'Selebi-Phikwe','Luderitz':'Lüderitz','Maltahohe':'Maltahöhe','Oshikuk u':'Oshikuku'}[row.name]||row.name;
  const id=code+'-S-'+normalize(en),key=normalize(en),entry={name:en,names:{},aliases:en!==row.name?[row.name]:[]};
  const entity=labelsByName.get(key);
  for(const [language,label] of Object.entries(entity?.labels||{}))if(nameLanguages[language])entry.names[language]={name:label.value,type:'linguistic label',source:'https://www.wikidata.org/wiki/'+entity.id};
  if(flagChecks[key]&&assets[key]){entry.flag={...assets[key],name:en,scope:'Municipality',status:'documented',verification:flagChecks[key][1]};flagManifest.flags[id]=entry.flag;}
  places[key]=entry;
  return {id,en,name:en,kind:country==='botswana'?row.kind:'Urban locality',center:row.center,parentId,provinceId:parentId,aliases:entry.aliases,population:{value:row.population,year,source:populationSource+'#page='+row.page,periodLabel:`${year} census`,scope:country==='botswana'?'Census city, town or village':'Census urban locality',scopeNote:country==='botswana'?'Settlement population; associated outlying localities are counted separately.':'Census urban locality; regional and constituency totals are separate.'},provenance:{population:country==='botswana'?'Statistics Botswana, final revised December 2022 locality report':'Namibia Statistics Agency, final 2023 census main report, Appendix III',censusName:row.name,censusCode:row.code,censusTablePage:row.page,geonamesId:row.geonamesId,coordinates:row.coordinateSource||'https://www.geonames.org/'+row.geonamesId,coordinateMatch:row.coordinateScope||'Named populated-place gazetteer point; homonyms manually checked; region assigned by polygon containment',...(row.coordinateValidation?{coordinateValidation:row.coordinateValidation}:{})}};
 }).sort((a,b)=>b.population.value-a.population.value||a.id.localeCompare(b.id));
 const expected=country==='botswana'?66:57;
 if(records.length!==expected||new Set(records.map(r=>r.id)).size!==expected)throw Error('Unexpected settlement count '+country);
 const sources=[{id:code+'-census-localities',title:country==='botswana'?'Statistics Botswana 2022 census: revised city, town and village populations':'Namibia Statistics Agency 2023 census main report: Appendix III urban locality populations',url:populationSource,scope:`${year} census settlement population`},{id:'geonames-'+code,title:'GeoNames '+country+' gazetteer coordinates',url:'https://download.geonames.org/export/dump/'+code+'.zip',license:'CC BY 4.0',licenseURL:'https://creativecommons.org/licenses/by/4.0/',description:'Coordinates only; gazetteer population values are not used.'},...(country==='botswana'?[{id:'osm-ramotswa',title:'OpenStreetMap Ramotswa railway station',url:'https://www.openstreetmap.org/node/11299498807',license:'ODbL',licenseURL:'https://www.openstreetmap.org/copyright',description:'Location anchor for Ramotswa Station/Taung; corrected a displaced gazetteer point.'}]:[])];
 fs.writeFileSync(base+'/settlements.json',JSON.stringify({country,records,sources,selection:{count:records.length,method:country==='botswana'?'All 7 census cities/towns and all 59 villages with at least 5,000 residents in the revised 2022 census':'All 57 urban localities in the final 2023 census main report Appendix III'}},null,2)+'\n');
 fs.writeFileSync(base+'/place-names-flags.json',JSON.stringify({retrieved:'2026-10-13',languages:Object.fromEntries(Object.entries(nameLanguages).map(([id,name])=>[id,{label:name,native:name}])),places,sources:{wikidata:{title:'Wikidata language labels (linguistic labels, CC0)',url:'https://www.wikidata.org/wiki/Wikidata:Licensing'},flags:{title:'Documented municipal flags and original artwork',url:'https://commons.wikimedia.org/'}}})+'\n');
 console.log(country,records.length,'census localities;',Object.values(places).filter(p=>p.flag).length,'documented municipal flags');
}
fs.writeFileSync('dist/data/botswana-namibia-flag-sources.json',JSON.stringify(flagManifest,null,2)+'\n');
