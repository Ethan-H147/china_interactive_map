import {combineLondonSettlements} from './london-settlement.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {gunzipSync,gzipSync} from 'node:zlib';
import {prepareUKPlaces} from './prepare-uk-places.mjs';
import {readXlsx} from './read-xlsx.mjs';
// United Kingdom cities and towns as points, independent of local authorities (like
// South Africa). Each nation's own statistical settlements and census counts:
// England and Wales: ONS 2022 built-up areas, Census 2021 usual residents (London's
//   built-up areas, which ONS's towns tables omit, summed from Census output areas, as ONS does);
// Scotland: NRS Census 2022 settlements and their counts;
// Northern Ireland: NISRA 2015 settlements, Census 2021 usual residents (CT0100), located by GeoNames.
// Places with at least 1,000 residents are kept. Pass --refresh to download sources again.
const require=createRequire(import.meta.url);
const mapshaper=require('mapshaper'),{unzipSync,strFromU8}=createRequire(require.resolve('mapshaper'))('fflate');
const refresh=process.argv.includes('--refresh'),artifacts='artifacts/europe-source',retained='scripts/statistics-sources/europe',out='dist/data/europe/united-kingdom';
const today=new Date().toISOString().slice(0,10),minimum=1000,agent={'User-Agent':'boundary-atlas (github.com/Ethan-H147/china_interactive_map)'};
async function retain(name,fetcher){const file=path.join(retained,name);if(!refresh&&fs.existsSync(file))return JSON.parse(fs.readFileSync(file));const data=await fetcher();fs.writeFileSync(file,JSON.stringify(data,null,1)+'\n');return data;}
async function json(url){const r=await fetch(url,{headers:agent,signal:AbortSignal.timeout(300000)});if(!r.ok)throw Error(url+' '+r.status);return r.json();}
async function file(url,name){const target=path.join(artifacts,name);if(!refresh&&fs.existsSync(target))return fs.readFileSync(target);const r=await fetch(url,{headers:{...agent,'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(300000)});if(!r.ok)throw Error(url+' '+r.status);const b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(target,b);return b;}
const arcgis='https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/';
async function arcgisRows(service,where,fields){const rows=[];for(let offset=0;;offset+=1000){const j=await json(`${arcgis}${service}/FeatureServer/0/query?where=${encodeURIComponent(where)}&outFields=${fields}&returnGeometry=false&resultOffset=${offset}&resultRecordCount=1000&orderByFields=${fields.split(',')[0]}&f=json`);rows.push(...j.features.map(f=>f.attributes));if(!j.exceededTransferLimit&&j.features.length<1000)break;}return rows;}
const title=s=>s.toLowerCase().replace(/(^|[\s\-'(])\p{L}/gu,c=>c.toUpperCase()).replace(/\b(And|Of|The|Upon|On|In|Le|By|Next|Under|With|De|La)\b/g,w=>w.toLowerCase()).replace(/^./,c=>c.toUpperCase());
const tidy=s=>String(s||'').trim();

// England and Wales.
const towns='https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/housing/datasets/townsandcitiescharacteristicsofbuiltupareasenglandandwalescensus2021/2021/townsandcitiescharacteristicsofbuiltupareasenglandandwalescensus2021.xlsx';
const englandWales=await retain('uk-bua-census2021.json',async()=>{
 const book=readXlsx(path.join(artifacts,'ons-towns-cities-bua-census2021.xlsx')),values={};
 for(const sheet of ['2c','2d'])for(const r of book[sheet])if(/^[EW](63|45)\d{6}$/.test(r[4]||''))values[r[4]]={name:tidy(r[5]),size:tidy(r[6]),population:r[8],source:'towns'};
 // London's built-up areas: Census 2021 usual residents of their output areas.
 const lookup=await arcgisRows('OA21_BUA22_LAD22_RGN22_EW_LU',"RGN22CD='E12000007'",'OA21CD,BUA22CD,BUA22NM');
 const oa=new Map();for(let offset=0;;offset+=25000){const csv=await(await fetch(`https://www.nomisweb.co.uk/api/v01/dataset/NM_2021_1.data.csv?geography=TYPE150&c2021_restype_3=0&measures=20100&select=geography_code,obs_value&recordoffset=${offset}&recordlimit=25000`,{headers:agent})).text();const lines=csv.trim().split('\n').slice(1);for(const l of lines){const [code,value]=l.replace(/"/g,'').split(',');oa.set(code,+value);}if(lines.length<25000)break;}
 const london={};for(const row of lookup){if(!row.BUA22CD||values[row.BUA22CD])continue;assert(oa.has(row.OA21CD),'Census count for '+row.OA21CD);(london[row.BUA22CD]??={name:tidy(row.BUA22NM),population:0,outputAreas:0,source:'outputAreas'});london[row.BUA22CD].population+=oa.get(row.OA21CD);london[row.BUA22CD].outputAreas++;}
 Object.assign(values,london);
 return {retrieved:today,towns,lookup:arcgis+'OA21_BUA22_LAD22_RGN22_EW_LU',census:'https://www.nomisweb.co.uk/datasets/c2021ts001',values};
});
const buaPoints=await retain('uk-bua-2022-points.json',async()=>{const rows=await arcgisRows('BUA_2022_GB',"BUA22CD LIKE 'E%' OR BUA22CD LIKE 'W%'",'BUA22CD,BUA22NM,BUA22NMW,LONG,LAT');return {retrieved:today,source:arcgis+'BUA_2022_GB',values:Object.fromEntries(rows.map(r=>[r.BUA22CD,{welsh:tidy(r.BUA22NMW),center:[r.LONG,r.LAT]}]))};});

// Scotland: NRS Census 2022 settlements (WFS), with an interior point of each polygon.
const scotland=await retain('scotland-settlements-2022.json',async()=>{
 const gml=await(await fetch('https://maps.gov.scot/server/services/NRS/Census2022/MapServer/WFSServer?service=WFS&version=2.0.0&request=GetFeature&typeNames=CEN2022:Settlement2022&srsName=EPSG:4326',{headers:agent,signal:AbortSignal.timeout(600000)})).text();
 const features=gml.split('<wfs:member>').slice(1).map(m=>{
  const get=tag=>new RegExp(`<CEN2022:${tag}>([^<]*)<`).exec(m)?.[1];
  const coordinates=[...m.matchAll(/<gml:Polygon\b[\s\S]*?<\/gml:Polygon>/g)].map(([p])=>[...p.matchAll(/<gml:posList[^>]*>([^<]*)</g)].map(([,list])=>{const n=list.trim().split(/\s+/).map(Number),ring=[];for(let i=0;i<n.length;i+=2)ring.push([n[i+1],n[i]]);return ring;}));
  return {type:'Feature',properties:{code:get('code'),name:get('name'),population:+get('Popcount')},geometry:{type:'MultiPolygon',coordinates}};
 });
 const points=JSON.parse((await mapshaper.applyCommands('-i in.json -points inner -o out.json format=geojson',{'in.json':JSON.stringify({type:'FeatureCollection',features})}))['out.json']);
 assert(points.features.every(f=>f.geometry.coordinates[1]>54.5&&f.geometry.coordinates[1]<61&&f.geometry.coordinates[0]<0),'Scottish settlement points in Scotland (latitude-first GML decoded)');
 return {retrieved:today,source:'https://spatialdata.gov.scot/geonetwork/srv/api/records/3d4b28c3-180d-4a21-8771-3193aa5f2e8d',values:Object.fromEntries(points.features.map(f=>[f.properties.code,{name:f.properties.name,population:f.properties.population,center:f.geometry.coordinates.map(v=>Math.round(v*1e5)/1e5)}]))};
});

// Northern Ireland: NISRA CT0100 (split settlements summed), located by GeoNames.
const northernIreland=await retain('ni-settlements-2021.json',async()=>{
 const rows=readXlsx(path.join(artifacts,'nisra-ct0100-settlements-2021.xlsx')).CT0100,values={};
 // NISRA names carry suffixes ("Belfast City", "Omagh Town", "… Urban Area Including …")
 // and district qualifiers; the displayed name drops them, the census name is kept.
 const clean=s=>s.replace(/\s*\([^)]*\)/g,'').replace(/\s+Urban Area\b.*$/i,'').replace(/\s+Including\b.*$/i,'').replace(/\s+(City|Town)$/i,'').trim();
 for(const r of rows)if(/^N11\d{6}$/.test(r[1]||'')&&!/^elsewhere/i.test(r[0])){(values[r[1]]??={name:clean(title(tidy(r[0]))),censusName:tidy(r[0]),population:0,districts:[]}).population+=r[4];values[r[1]].districts.push(r[2]);}
 const gb=unzipSync(await file('https://download.geonames.org/export/dump/GB.zip','geonames-GB.zip')),text=strFromU8(gb['GB.txt']);
 const places=text.split('\n').map(l=>l.split('\t')).filter(c=>c[6]==='P'&&c[10]==='NIR');
 const key=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/^metropolitan\s+/,'').replace(/[^a-z]/g,'');
 const byName=new Map();for(const c of places)for(const n of [c[1],c[2],...c[3].split(',')])if(n){const k=key(n);if(!byName.has(k))byName.set(k,[]);if(!byName.get(k).includes(c))byName.get(k).push(c);}
 // Among same-named places, take the one nearest the centre of the settlement's district.
 const ukCatalogue=JSON.parse(gunzipSync(fs.readFileSync(path.join(out,'catalogue.bin')))),districtCentre=code=>ukCatalogue.records.find(r=>r.code===code)?.center;
 const missing=[];
 for(const v of Object.values(values)){
  const names=[v.name,...v.name.split(/\s+\/\s+|\s+and\s+/i)].map(key),centre=districtCentre(v.districts[0]);
  const candidates=names.map(n=>byName.get(n)||[]).find(list=>list.length)||[];
  if(v.censusName==='METROPOLITAN LISBURN'){const c=byName.get('dunmurry')?.[0];assert(c,'Dunmurry');Object.assign(v,{center:[+c[5],+c[4]],geonamesId:c[0],geonamesName:c[1],locationNote:'Located at Dunmurry, the main place in Lisburn\'s metropolitan (Belfast-side) settlement, which is separate from Lisburn City.'});continue;}
  if(!candidates.length){
   // Villages absent from GeoNames: OpenStreetMap's gazetteer, limited to Northern Ireland.
   const q=new URLSearchParams({q:v.name.split(' / ')[0]+', Northern Ireland',format:'jsonv2',limit:'1',countrycodes:'gb',viewbox:'-8.2,55.4,-5.4,54.0',bounded:'1'});
   await new Promise(r=>setTimeout(r,1100));const hit=(await json('https://nominatim.openstreetmap.org/search?'+q))[0];
   if(hit){v.center=[+hit.lon,+hit.lat];v.osm=hit.osm_type+'/'+hit.osm_id;v.osmName=hit.display_name.split(',')[0];continue;}
   missing.push(v.censusName);continue;
  }
  const c=candidates.map(c=>({c,d:Math.hypot(+c[5]-centre[0],+c[4]-centre[1])})).sort((a,b)=>a.d-b.d)[0].c;
  v.center=[+c[5],+c[4]];v.geonamesId=c[0];v.geonamesName=c[1];
 }
 return {retrieved:today,source:'https://www.nisra.gov.uk/publications/census-2021-commissioned-table-ct0100',coordinates:'https://download.geonames.org/export/dump/GB.zip',values,unlocated:missing};
});

// Parent: the district or single-tier authority containing the point.
const read=n=>JSON.parse(gunzipSync(fs.readFileSync(path.join(out,n))));
const catalogue=read('catalogue.bin'),records=new Map(catalogue.records.map(r=>[r.id,r])),bundle=read('all.bin');
const leaves=bundle.levels.flatMap(l=>l.regions.features).filter(f=>!catalogue.records.some(r=>r.parent===f.properties.id));
const rings=g=>(g.type==='Polygon'?[g.coordinates]:g.coordinates);
const inRing=(p,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
const boxes=leaves.map(f=>{const b=[180,90,-180,-90];for(const poly of rings(f.geometry))for(const [x,y] of poly[0]){b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}return b;});
function container(p){
 for(let i=0;i<leaves.length;i++){const b=boxes[i];if(p[0]<b[0]||p[0]>b[2]||p[1]<b[1]||p[1]>b[3])continue;if(rings(leaves[i].geometry).some(poly=>inRing(p,poly[0])&&!poly.slice(1).some(h=>inRing(p,h))))return leaves[i].properties.id;}
 // A coastal point can fall just offshore of the simplified outline: take the nearest centre.
 let best=null;for(const f of leaves){const r=records.get(f.properties.id),d=Math.hypot((r.center[0]-p[0])*Math.cos(p[1]*Math.PI/180),r.center[1]-p[1]);if(!best||d<best.d)best={d,id:r.id};}return best.d<.15?best.id:null;
}
const province=id=>{let r=records.get(id);while(r.parent)r=records.get(r.parent);return r.id;};
const sizeKinds={Major:'City or large town',Large:'Large town',Medium:'Town',Small:'Small town',Minor:'Village or small town'};
const settlements=[],unplaced=[];
function add(id,v,center,population,extra){if(population<minimum)return;const parent=container(center);if(!parent){unplaced.push(v.name);return;}settlements.push({id,en:v.name,name:v.name,kind:extra.kind,center:center.map(x=>Math.round(x*1e5)/1e5),parentId:parent,provinceId:province(parent),aliases:extra.aliases||[],...(extra.names?{names:extra.names}:{}),population:{value:population,year:extra.year,source:extra.source,periodLabel:extra.period,scope:extra.scope,scopeNote:extra.scopeNote},provenance:extra.provenance});}
for(const [code,v] of Object.entries(englandWales.values)){
 const point=buaPoints.values[code];assert(point,'Point for built-up area '+code);
 const welsh=point.welsh&&point.welsh!==v.name?point.welsh:'';
 add('GB-S-'+code,v,point.center,v.population,{kind:v.size?sizeKinds[v.size]+' (built-up area)':'Built-up area',year:2021,source:v.source==='towns'?towns:'https://www.nomisweb.co.uk/datasets/c2021ts001',period:'2021 census',scope:'Built-up area (ONS 2022)',scopeNote:'The continuous built-up area, independent of council boundaries.',aliases:welsh?[welsh]:[],...(welsh?{names:{cy:{name:welsh,type:'official name',source:arcgis+'BUA_2022_GB'}}}:{}),provenance:{population:v.source==='towns'?'ONS, Towns and cities, characteristics of built-up areas, Census 2021 (tables 2c and 2d)':'Census 2021 usual residents (TS001) summed over the built-up area\'s output areas (ONS OA21 to BUA22 lookup)',code,...(v.outputAreas?{outputAreas:v.outputAreas}:{}),coordinates:arcgis+'BUA_2022_GB'}});
}
// NRS settlements can join several towns ("Aberdeen, Milltimber, and Peterculter"); each
// component is a search alias. One NRS name misspells Airdrie; the census spelling is kept in provenance.
const nrsCorrections={'Aidrie, Hamilton and Motherwell':'Airdrie, Hamilton and Motherwell'};
const components=name=>[...new Set(name.replace(/^Greater\s+/,'').split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map(x=>x.trim()).filter(x=>x&&x!==name))];
for(const [code,v] of Object.entries(scotland.values))add('GB-S-'+code,{...v,name:nrsCorrections[v.name]||v.name},v.center,v.population,{aliases:components(nrsCorrections[v.name]||v.name),kind:'Settlement',year:2022,source:scotland.source,period:'2022 census',scope:'Settlement (NRS Census 2022)',scopeNote:'NRS settlements are built-up areas defined from postcode densities, independent of council boundaries.',provenance:{population:'National Records of Scotland, Scotland\'s Census 2022 settlements (Popcount)',censusName:v.name,code,coordinates:'Interior point of the NRS settlement polygon'}});
for(const [code,v] of Object.entries(northernIreland.values))if(v.center)add('GB-S-'+code,v,v.center,v.population,{kind:'Settlement',year:2021,source:northernIreland.source,period:'2021 census',scope:'Settlement (NISRA 2015)',scopeNote:'NISRA statistical settlements; Census 2021 counts are approximated from data zones and grid squares.',provenance:{population:'NISRA Census 2021 commissioned table CT0100',censusName:v.censusName,code,...(v.osm?{coordinates:'https://www.openstreetmap.org/'+v.osm,osmName:v.osmName}:{geonamesId:v.geonamesId,geonamesName:v.geonamesName,coordinates:'https://www.geonames.org/'+v.geonamesId}),...(v.locationNote?{locationNote:v.locationNote}:{})}});
const unlocated=Object.values(northernIreland.values).filter(v=>!v.center&&v.population>=minimum).map(v=>v.name);
assert.deepEqual(unplaced,[],'Every settlement lies in a UK authority');
settlements.sort((a,b)=>b.population.value-a.population.value);
const sources=[
 {id:'ons-bua-2022',title:'ONS Built-up Areas (December 2022), centroids',url:arcgis+'BUA_2022_GB',license:'Open Government Licence v3.0'},
 {id:'ons-towns-census2021',title:'ONS · Towns and cities, characteristics of built-up areas, England and Wales: Census 2021',url:towns,license:'Open Government Licence v3.0'},
 {id:'ons-census2021-oa',title:'ONS Census 2021 TS001 usual residents by output area (Nomis), summed for London\'s built-up areas',url:'https://www.nomisweb.co.uk/datasets/c2021ts001',license:'Open Government Licence v3.0'},
 {id:'nrs-settlements-2022',title:'National Records of Scotland · Census 2022 settlements',url:scotland.source,license:'Open Government Licence v3.0',attribution:'Copyright National Records of Scotland, contains Ordnance Survey data © Crown copyright and database right 2024'},
 {id:'nisra-ct0100',title:'NISRA · Census 2021 commissioned table CT0100, usual resident population by settlement',url:northernIreland.source,license:'Open Government Licence v3.0'},
 {id:'osm-nominatim',title:'OpenStreetMap Nominatim coordinates for Northern Irish villages absent from GeoNames',url:'https://nominatim.openstreetmap.org/',license:'ODbL 1.0',licenseURL:'https://www.openstreetmap.org/copyright',description:'Coordinates only.'},
 {id:'geonames-GB',title:'GeoNames United Kingdom gazetteer coordinates (Northern Ireland only)',url:northernIreland.coordinates,license:'CC BY 4.0',licenseURL:'https://creativecommons.org/licenses/by/4.0/',description:'Coordinates only; gazetteer population values are not used.'}
];
fs.writeFileSync(path.join(out,'settlements.json'),JSON.stringify(combineLondonSettlements({country:'united-kingdom',records:settlements,sources,selection:`Every built-up area or settlement with at least ${minimum.toLocaleString('en-US')} residents in its census: England and Wales 2021, Scotland 2022, Northern Ireland 2021.${unlocated.length?' Not located in GeoNames: '+unlocated.join(', ')+'.':''}`},catalogue,JSON.parse(fs.readFileSync(path.join(out,'statistics.json')))))+'\n');
fs.writeFileSync(path.join(out,'place-names-flags.json'),JSON.stringify({retrieved:today,languages:{cy:'Welsh'},places:{},sources:[]})+'\n');
const by=prefix=>settlements.filter(s=>s.id.startsWith('GB-S-'+prefix)).length;
console.log('UK settlements:',settlements.length,'— England',by('E'),'Wales',by('W'),'Scotland',by('S'),'Northern Ireland',by('N'),unlocated.length?'; unlocated '+unlocated.join(', '):'');

// Refresh the census base before restoring all gazetteer places.
const gazetteerBase='scripts/boundary-sources/uk-places/';
if(fs.existsSync(gazetteerBase+'manifest.json')){fs.writeFileSync(gazetteerBase+'statistical-base.json.gz',gzipSync(fs.readFileSync(path.join(out,'settlements.json')),{level:9}));prepareUKPlaces();}
