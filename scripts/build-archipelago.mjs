import fs from 'node:fs';
import {gzipSync,inflateRawSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
const rawDir='scripts/additional-sources/archipelago/',out='dist/data/archipelago/';
fs.mkdirSync(out,{recursive:true});
const fc=features=>({type:'FeatureCollection',features});
const write=(name,value)=>{const json=JSON.stringify(value),bytes=gzipSync(json,{level:9});fs.writeFileSync(out+name,bytes);return {file:name,bytes:bytes.length,decodedBytes:Buffer.byteLength(json)};};
const bbox=coordinates=>{const b=[Infinity,Infinity,-Infinity,-Infinity];function walk(c){if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);}walk(coordinates);return [[b[0],b[1]],[b[2],b[3]]];};
const insideBox=(p,b)=>p[0]>=b[0][0]&&p[0]<=b[1][0]&&p[1]>=b[0][1]&&p[1]<=b[1][1];
const insideRing=(p,ring)=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
const area=ring=>Math.abs(ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length];return s+p[0]*q[1]-q[0]*p[1];},0));
async function commands(data,command){const files=await mapshaper.applyCommands('-i input.json '+command+' -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify(data)});const result=JSON.parse(files['output.json']);return result.type==='FeatureCollection'?result:result.type==='Feature'?fc([result]):fc((result.geometries||[result]).map(geometry=>({type:'Feature',properties:{},geometry})));}
const namesPH={PH01:['Ilocos Region','Region I'],PH02:['Cagayan Valley','Region II'],PH03:['Central Luzon','Region III'],PH04:['CALABARZON','Region IV-A'],PH05:['Bicol Region','Region V'],PH06:['Western Visayas','Region VI'],PH07:['Central Visayas','Region VII'],PH08:['Eastern Visayas','Region VIII'],PH09:['Zamboanga Peninsula','Region IX'],PH10:['Northern Mindanao','Region X'],PH11:['Davao Region','Region XI'],PH12:['SOCCSKSARGEN','Region XII'],PH13:['Metro Manila','National Capital Region · NCR'],PH14:['Cordillera','Cordillera Administrative Region · CAR'],PH16:['Caraga','Region XIII'],PH17:['MIMAROPA','MIMAROPA Region'],PH18:['Negros Island Region','NIR'],PH19:['Bangsamoro','Bangsamoro Autonomous Region in Muslim Mindanao · BARMM']};
const namesID={'Sumatera Utara':'North Sumatra','Sumatera Barat':'West Sumatra','Sumatera Selatan':'South Sumatra','Jawa Barat':'West Java','Jawa Tengah':'Central Java','Jawa Timur':'East Java','Kalimantan Barat':'West Kalimantan','Kalimantan Tengah':'Central Kalimantan','Kalimantan Selatan':'South Kalimantan','Kalimantan Timur':'East Kalimantan','Kalimantan Utara':'North Kalimantan','Sulawesi Utara':'North Sulawesi','Sulawesi Tengah':'Central Sulawesi','Sulawesi Selatan':'South Sulawesi','Sulawesi Tenggara':'Southeast Sulawesi','Sulawesi Barat':'West Sulawesi','Nusa Tenggara Barat':'West Nusa Tenggara','Nusa Tenggara Timur':'East Nusa Tenggara','Kepulauan Bangka Belitung':'Bangka Belitung Islands','Kepulauan Riau':'Riau Islands','Dki Jakarta':'Jakarta','Daerah Istimewa Yogyakarta':'Special Region of Yogyakarta','Papua Barat':'West Papua','Papua Selatan':'South Papua','Papua Tengah':'Central Papua','Papua Pegunungan':'Highland Papua','Papua Barat Daya':'Southwest Papua','Maluku Utara':'North Maluku'};
const papua={
 'Papua Selatan':['Merauke','Boven Digoel','Mappi','Asmat'],
 'Papua Tengah':['Nabire','Paniai','Mimika','Puncak Jaya','Puncak','Dogiyai','Intan Jaya','Deiyai'],
 'Papua Pegunungan':['Jayawijaya','Pegunungan Bintang','Yahukimo','Tolikara','Mamberamo Tengah','Yalimo','Lanny Jaya','Nduga'],
 'Papua Barat Daya':['Sorong','Sorong Selatan','Raja Ampat','Tambrauw','Maybrat','Kota Sorong']
};
const corrections={'Toba Samosir':'Toba','Maluku Tenggara Barat':'Kepulauan Tanimbar','Mamuju Utara':'Pasangkayu'};
const isabelaNote='Isabela City is a component city of Basilan province, but belongs to Region IX (Zamboanga Peninsula). The rest of Basilan belongs to BARMM. Region boundaries therefore split the province.';
const isabelaSource='https://psa.gov.ph/classification/psgc/summary';
function unzipText(code){const zip=fs.readFileSync(rawDir+code+'.zip'),end=zip.lastIndexOf(Buffer.from('504b0506','hex'));let p=zip.readUInt32LE(end+16);while(zip.readUInt32LE(p)===0x02014b50){const len=zip.readUInt16LE(p+28),name=zip.subarray(p+46,p+46+len).toString(),size=zip.readUInt32LE(p+20),offset=zip.readUInt32LE(p+42);if(name===code+'.txt'){const start=offset+30+zip.readUInt16LE(offset+26)+zip.readUInt16LE(offset+28);return inflateRawSync(zip.subarray(start,start+size)).toString();}p+=46+len+zip.readUInt16LE(p+30)+zip.readUInt16LE(p+32);}throw Error('Missing country dump');}
for(const country of process.argv.slice(2).length?process.argv.slice(2):['philippines','indonesia']){
 const code=country==='philippines'?'PH':'ID',source=rawDir+country+'-'+(code==='PH'?'phl':'idn')+'_admin2.geojson',cache=rawDir+country+'-20m.bin';
 let data;
 if(fs.existsSync(cache))data=JSON.parse(gunzipSync(fs.readFileSync(cache)));
 else{
  const raw=JSON.parse(fs.readFileSync(source));
  for(const f of raw.features){const p=f.properties;let parent=p.adm1_pcode,parentLocal=p.adm1_name,kind=code==='PH'?'Province':p.adm2_name.startsWith('Kota ')?'City':'Regency',mapped=true,en=p.adm2_name,local='';
   if(code==='PH'){
    if(['Negros Occidental','Negros Oriental','Siquijor'].includes(en))parent='PH18';
    if(en==='Sulu')parent='PH09';
    if(parent==='PH13'||/not a province|Special Geographic Area/.test(en)){mapped=false;kind=parent==='PH13'?'Statistical district':'Special administrative area';}
    en=en.replace(/ \((?:Western Samar|North Cotabato|Compostela Valley)\)/,'');
   }else{
    const newer=Object.entries(papua).find(([,children])=>children.includes(en));
    if(newer){parent='ID-'+newer[0].toLowerCase().replaceAll(' ','-');parentLocal=newer[0];}
    if(/(?:88|99)$/.test(p.adm2_pcode)){mapped=false;kind='Geographic context';}
    en=corrections[en]||en;
    local=kind==='City'?en:kind==='Regency'?'Kabupaten '+en:en;
    en=en.replace(/^Kota /,'');
    if(parent==='ID31')kind=kind==='City'?'Administrative city':'Administrative regency';
   }
   f.properties={id:p.adm2_pcode,parent,parentLocal,en,local,kind,level:2,mapped,aliases:[p.adm2_name,p.adm2_ref_name,p.adm2_name1].filter(Boolean),sourceDate:p.valid_on,center:[p.center_lon,p.center_lat]};
  }
  console.log(country,'simplifying original topology');
  data=await commands(raw,'-clean -simplify dp interval=20 keep-shapes');fs.writeFileSync(cache,gzipSync(JSON.stringify(data)));
 }
 // Kota Baru is a regency name, not a kota. Classify by source code rather
 // than the word Kota so similarly named regencies and cities stay distinct.
 if(code==='ID')for(const f of data.features){const p=f.properties;if(!p.mapped)continue;const city=Number(p.id.slice(-2))>=71&&Number(p.id.slice(-2))<=79;if(p.id==='ID6302')p.en='Kotabaru';p.kind=p.parent==='ID31'?(city?'Administrative city':'Administrative regency'):(city?'City':'Regency');p.local=(city?'Kota ':'Kabupaten ')+p.en;}
 const groups=new Map();for(const f of data.features){const p=f.properties;p.bounds=bbox(f.geometry.coordinates);if(!p.center.every(Number.isFinite))p.center=[(p.bounds[0][0]+p.bounds[1][0])/2,(p.bounds[0][1]+p.bounds[1][1])/2];(groups.get(p.parent)||groups.set(p.parent,[]).get(p.parent)).push(f);}
 const firstPrecise=await commands(data,'-dissolve parent copy-fields=parentLocal');
 for(const f of firstPrecise.features){const p=f.properties,id=p.parent;f.properties={id,en:code==='PH'?namesPH[id][0]:namesID[p.parentLocal]||p.parentLocal,local:code==='PH'?namesPH[id][1]:p.parentLocal,kind:code==='PH'?(id==='PH19'?'Autonomous region':'Region'):'Province',level:1,aliases:code==='PH'?[namesPH[id][0],namesPH[id][1]]:[p.parentLocal],bounds:bbox(f.geometry.coordinates)};
  const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates,largest=polygons.toSorted((a,b)=>area(b[0])-area(a[0]))[0],b=bbox(largest);f.properties.center=[(b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2];
 }
 // Regional geometry must remain split. Provincial geometry includes the
 // component city, with a separate selectable city overlay showing its region.
 let secondFeatures=data.features.filter(f=>f.properties.mapped);
 if(code==='PH'){
  const city=data.features.find(f=>f.properties.id==='PH09097'),basilan=data.features.find(f=>f.properties.id==='PH19007');
  const fullProvince=await commands(fc([basilan,city]),'-dissolve');
  const province={...basilan,geometry:fullProvince.features[0].geometry,properties:{...basilan.properties,bounds:bbox(fullProvince.features[0].geometry.coordinates),note:isabelaNote,noteSource:isabelaSource}};
  const exception={...city,properties:{...city.properties,en:'Isabela City',kind:'Component city',mapped:true,special:true,province:'PH19007',note:isabelaNote,noteSource:isabelaSource,aliases:['Isabela City','City of Isabela','Isabela de Basilan']}};
  secondFeatures=[...secondFeatures.filter(f=>f!==basilan),province,exception];
  for(const id of ['PH09','PH19'])Object.assign(firstPrecise.features.find(f=>f.properties.id===id).properties,{note:isabelaNote,noteSource:isabelaSource});
 }
 const overview=await commands(firstPrecise,'-simplify dp interval=250 keep-shapes'),overviewSecond=await commands(fc(secondFeatures),'-simplify dp interval=500 keep-shapes');write(country+'-overview.bin',{first:overview,second:overviewSecond});
 const context=await commands(firstPrecise,'-simplify dp interval=800 keep-shapes');write(country+'-context.bin',context);
 const chunks={};for(const [id] of groups){const second=fc(secondFeatures.filter(f=>f.properties.parent===id)),first=fc(firstPrecise.features.filter(f=>f.properties.id===id));chunks[id]=write(country+'-'+id+'.bin',{first,second});}
 // Physical land components give named islands camera extents without loading
 // their geometry at runtime. GeoNames points/aliases remain a separate index.
 const land=await commands(firstPrecise,'-dissolve');
 const components=land.features.flatMap(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).map(coordinates=>({coordinates,bounds:bbox(coordinates),area:area(coordinates[0])})).sort((a,b)=>b.area-a.area);
 const islands=[],islandKeys=new Map();
 for(const row of unzipText(code).split('\n')){const c=row.split('\t');if(!['ISL','ISLS','ATOL'].includes(c[7]))continue;const center=[+c[5],+c[4]];if(!center.every(Number.isFinite))continue;const match=c[7]==='ISL'?components.find(p=>insideBox(center,p.bounds)&&insideRing(center,p.coordinates[0])):null;
  const parent=firstPrecise.features.find(f=>insideBox(center,f.properties.bounds)&&(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).some(p=>insideRing(center,p[0])))?.properties.id;
  const key=c[1].toLowerCase()+JSON.stringify(match?.bounds||center),existing=islandKeys.get(key);if(existing){existing.aliases=[...new Set([...existing.aliases,...c[3].split(',')])].filter(Boolean).slice(0,30);continue;}
  const island={id:'island-'+c[0],en:c[1],local:c[2]!==c[1]?c[2]:'',aliases:[...new Set([c[2],...c[3].split(',')])].filter(Boolean).slice(0,20),center,bounds:match?.bounds,parent:parent||null,kind:c[7]==='ISLS'?'Island group':c[7]==='ATOL'?'Atoll':'Island',level:0,geonames:c[0],note:code==='ID'&&['1648148','2082514'].includes(c[0])?'Shared island. This view focuses on its Indonesian portion.':undefined};islands.push(island);islandKeys.set(key,island);
 }
 if(code==='PH')for(const island of islands.filter(p=>p.geonames==='1726402'))Object.assign(island,{note:isabelaNote,noteSource:isabelaSource});
 const records=[...firstPrecise.features.map(f=>f.properties),...secondFeatures.map(f=>f.properties),...islands];
 const catalogue=write(country+'-catalogue.bin',{country,records,chunks,home:code==='PH'?[[116,4.3],[127.2,21.5]]:[[94.5,-11.3],[141.2,6.3]],summary:code==='PH'?'18 regions · 82 provinces':'38 provinces · 514 regencies and cities'});
 const mapped=records.filter(p=>p.level===2&&!p.special).length,first=records.filter(p=>p.level===1).length;
 if(first!==(code==='PH'?18:38)||mapped!==(code==='PH'?82:514))throw Error('Incorrect administrative counts '+first+'/'+mapped);
 const report={country,retrieved:'2026-10-05',first,second:mapped,namedIslands:islands.length,source:code==='PH'?'https://data.humdata.org/dataset/cod-ab-phl':'https://data.humdata.org/dataset/cod-ab-idn',boundaryOrigin:code==='PH'?'NAMRIA / Philippine Statistics Authority, distributed by OCHA':'Badan Pusat Statistik (Statistics Indonesia), distributed by OCHA',license:'CC BY-IGO',sha256:createHash('sha256').update(fs.readFileSync(source)).digest('hex'),originalBytes:fs.statSync(source).size,catalogue,chunks,processing:'Shared topology cleaned and simplified together to 20 m, then partitioned by parent division. Overview 250 m; context 800 m. GeoNames island extents match dissolved physical land components where the catalogue point lies on land.',islandSource:'https://download.geonames.org/export/dump/',islandLicense:'CC BY 4.0',notes:code==='PH'?['Negros Island Region reconstructed from Negros Occidental, Negros Oriental and Siquijor (RA 12000).','Sulu reassigned to Zamboanga Peninsula (EO 91/2025).','NCR statistical districts and Bangsamoro Special Geographic Area contribute to regional geometry but are not labeled as provinces. Isabela City is a separately selectable component city, excluded from the 82-province count.','Basilan provincial geometry includes Isabela City; its region remains Region IX while the rest of Basilan belongs to BARMM. Other provincial coverage follows the COD snapshot; independent cities embedded in source provincial shapes are not separately mapped.']:['Source regency geometry is the 2020 COD snapshot. The four new Papua provinces are reconstructed from constituent regencies under the 2022 laws; regency IDs remain source identifiers, not current official codes.','Eight lake/reservoir/forest context polygons are excluded from the 514 administrative divisions.','Toba, Kepulauan Tanimbar and Pasangkayu names updated; Jakarta second-level areas labeled administrative cities/regency.'],references:code==='PH'?[isabelaSource,'https://psa.gov.ph/content/second-quarter-2024-psgc-updates-creation-negros-island-region-and-correction-names-two','https://psa.gov.ph/content/province-sulu-officially-transferred-region-ix-zamboanga-peninsula']:['https://peraturan.bpk.go.id/Details/232726/uu-','https://peraturan.bpk.go.id/Details/217799/uu-no-16-','https://nabirekab.go.id/harapan-dan-tantangan-pembangunan-provinsi-papua-tengah/','https://papua.go.id/infografis']};
 fs.writeFileSync(out+country+'-sources.json',JSON.stringify(report,null,2));console.log(country,first,mapped,islands.length,'catalogue',catalogue,'largest chunk',Math.max(...Object.values(chunks).map(c=>c.decodedBytes)));
}
