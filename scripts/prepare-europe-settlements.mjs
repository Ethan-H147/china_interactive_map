// Cities and towns as points independent of the subdivisions, for the European countries whose
// subdivisions are not themselves towns (the United Kingdom has its own script,
// prepare-uk-settlements.mjs). Each country's settlements.json has the UK's format.
// Iceland: Statistics Iceland's population of localities (þéttbýlisstaðir) at 1 January 2026
// (table MAN030102), placed at the centre of the matching urban nucleus (byggðarkjarni) in the
// IS 50V place-name areas; Greater Reykjavík is one locality, placed at Reykjavík.
// Turkey: OpenStreetMap cities and towns, without populations (see turkey()).
// Retained extracts live in scripts/statistics-sources/europe; pass --refresh to download again.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {polygons,landIndex} from './geo-index.mjs';

const refresh=process.argv.includes('--refresh'),retained='scripts/statistics-sources/europe',today=new Date().toISOString().slice(0,10);
const agent={'User-Agent':'boundary-atlas settlements (github.com/Ethan-H147/china_interactive_map)'};
async function retain(name,fetcher){const file=path.join(retained,name);if(!refresh&&fs.existsSync(file))return JSON.parse(fs.readFileSync(file));const data=await fetcher();fs.writeFileSync(file,JSON.stringify(data,null,1)+'\n');return data;}
async function request(url,options={}){for(let attempt=1;;attempt++){try{const r=await fetch(url,{...options,headers:{...agent,...options.headers},signal:AbortSignal.timeout(300000)});if(!r.ok)throw Error(url+' '+r.status);return await r.json();}catch(error){if(attempt>=6)throw error;await new Promise(r=>setTimeout(r,5000*attempt));}}}
const readBin=file=>JSON.parse(gunzipSync(fs.readFileSync(file)));
const round=p=>p.map(v=>Math.round(v*1e5)/1e5);
// A point well inside a polygon: the centre of its largest part, or the middle of the longest
// horizontal run through that part's centre row when the centre falls outside it.
function inner(geometry){
 const parts=polygons(geometry),area=r=>Math.abs(r.slice(1).reduce((s,p,i)=>s+r[i][0]*p[1]-p[0]*r[i][1],0)),largest=parts.sort((a,b)=>area(b[0])-area(a[0]))[0];
 const ring=largest[0],cx=ring.reduce((s,p)=>s+p[0],0)/ring.length,cy=ring.reduce((s,p)=>s+p[1],0)/ring.length;
 if(landIndex(largest)([cx,cy]))return [cx,cy];
 const xs=[];for(const r of largest)for(let i=1;i<r.length;i++){const a=r[i-1],b=r[i];if((a[1]>cy)!==(b[1]>cy))xs.push(a[0]+(cy-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
 xs.sort((a,b)=>a-b);let best=[cx,cy],width=-1;for(let i=0;i+1<xs.length;i+=2)if(xs[i+1]-xs[i]>width){width=xs[i+1]-xs[i];best=[(xs[i]+xs[i+1])/2,cy];}
 return best;
}
// The unit of a level containing a point.
function locator(features){const units=features.map(f=>({id:f.properties.id,inside:landIndex(polygons(f.geometry).flat())}));return p=>units.find(u=>u.inside(p))?.id;}

async function iceland(){
 const nuclei=await retain('iceland-urban-nuclei-is50v.json',async()=>{
  const url="https://gis.lmi.is/geoserver/IS_50V/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=IS_50V:ornefni_flakar&outputFormat=application/json&srsName=EPSG:4326&CQL_FILTER="+encodeURIComponent("ornefnaflokkur='Þéttbýli'");
  const data=await request(url);
  return {url,title:'IS 50V place-name areas, urban nuclei (byggðarkjarni)',retrieved:today,places:data.features.map(f=>({name:f.properties.ornefni,center:round(inner(f.geometry))}))};
 });
 const localities=await retain('iceland-localities-2026.json',async()=>{
  const url='https://px.hagstofa.is/pxis/api/v1/is/Ibuar/mannfjoldi/2_byggdir/Byggdakjarnar/MAN030102.px';
  const meta=await request(url),loc=meta.variables[0],names=Object.fromEntries(loc.values.map((v,i)=>[v,loc.valueTexts[i]]));
  const body={query:[{code:loc.code,selection:{filter:'all',values:['*']}},{code:'Aldur',selection:{filter:'item',values:['-1']}},{code:'Ár',selection:{filter:'item',values:['2026']}},{code:'Kyn',selection:{filter:'item',values:['0']}}],response:{format:'json'}};
  const data=await request(url,{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}});
  return {url,table:'MAN030102',title:'Mannfjöldi eftir þéttbýlisstöðum, kyni og aldri 1. janúar 1998-2026',date:'2026-01-01',retrieved:today,values:data.data.map(row=>({code:row.key[0],name:names[row.key[0]],population:Number(row.values[0])}))};
 });
 // Statistics Iceland's names, as LMÍ names the urban nucleus (the Reykholts by longitude).
 const aliases={'Stór-Reykjavík':'Reykjavík','Keflavík og Njarðvík':'Keflavík','Höfn í Hornafirði':'Höfn','Vík í Mýrdal':'Vík','Hólar í Hjaltadal':'Hólar','Borgarfjörður eystri':'Bakkagerði','Hrafnagil':'Hrafnagilshverfi','Grundarhverfi, Kjalarnesi':'Grundarhverfi'};
 const placeOf=name=>{
  const plain=aliases[name]||name.replace(/ og nágr\.$/,'').replace(/, .*$/,'');
  const matches=nuclei.places.filter(p=>p.name===plain);
  if(plain==='Reykholt')return matches.find(p=>name.includes('Borgarfirði')?p.center[0]<-21:p.center[0]>-21);
  return matches[0];
 };
 const all=readBin('dist/data/europe/iceland/all.bin'),municipality=locator(all.levels.find(l=>l.level===2).regions.features);
 const catalogue=readBin('dist/data/europe/iceland/catalogue.bin'),parents=new Map(catalogue.records.map(r=>[r.id,r.parent]));
 const records=[],unplaced=[];
 for(const l of localities.values){
  if(l.name==='Alls'||l.name.startsWith('Strjálbýli'))continue;
  const place=placeOf(l.name);if(!place){unplaced.push(l.name);continue;}
  const parentId=municipality(place.center);assert(parentId,l.name+' lies in a municipality');
  const name=l.name.replace(/ og nágr\.$/,'');
  records.push({id:'IS-S-'+l.code,en:l.name==='Stór-Reykjavík'?'Greater Reykjavík':name,name,kind:l.name==='Stór-Reykjavík'?'Urban area':'Town or village (locality)',center:place.center,parentId,provinceId:parents.get(parentId),aliases:l.name==='Stór-Reykjavík'?['Reykjavík','Stór-Reykjavík','Greater Reykjavik']:[],population:{value:l.population,year:2026,source:'https://px.hagstofa.is/pxen/pxweb/en/Ibuar/Ibuar__mannfjoldi__2_byggdir__Byggdakjarnar/MAN030102.px',periodLabel:'1 January 2026',scope:'Locality (Statistics Iceland)',scopeNote:'A locality is a cluster of at least 50 residents, independent of municipal boundaries'+(l.name==='Stór-Reykjavík'?'; Greater Reykjavík joins Reykjavík, Kópavogur, Hafnarfjörður, Garðabær and Seltjarnarnes':'')+'.'}});
 }
 assert(records.length>90,'Most Icelandic localities are placed');
 assert.equal(new Set(records.map(r=>r.center.join())).size,records.length,'No two dots share a location');
 return {records,unplaced,sources:[{id:'hagstofa-man030102',title:localities.title+' (Statistics Iceland)',url:'https://px.hagstofa.is/pxen/pxweb/en/Ibuar/Ibuar__mannfjoldi__2_byggdir__Byggdakjarnar/MAN030102.px',license:'Statistics Iceland open data (attribution)'},{id:'is50v-urban-nuclei',title:nuclei.title+' (Icelandic Institute of Natural History)',url:'https://gis.lmi.is/geoserver/IS_50V/ows',license:'Creative Commons Attribution 4.0'}],selection:`Every locality Statistics Iceland counts (at least 50 residents) whose urban nucleus IS 50V maps; ${unplaced.length} small localities without a mapped outline are left out.`};
}

// Turkey: the province-centre cities from OpenStreetMap (place=city). A city such as Ankara spans
// several districts, so it stands apart from them; each district, though, is named after its own
// central town, so towns are not shown. TÜİK's city populations are not openly downloadable (its
// tables sit behind a browser check), and OpenStreetMap's tags mix years and areas, so the dots
// show no population; they appear from zoom 5.4.
async function turkey(){
 const places=await retain('turkey-places-osm.json',async()=>{
  const query='[out:json][timeout:300];area["ISO3166-1"="TR"][admin_level=2]->.tr;node(area.tr)["place"~"^(city|town)$"];out;';
  const url='https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query),data=await request(url);
  return {url,title:'OpenStreetMap place=city and place=town nodes in Türkiye',retrieved:today,places:data.elements.map(e=>({osm:e.id,place:e.tags.place,name:e.tags.name,en:e.tags['name:en']||null,center:round([e.lon,e.lat])}))};
 });
 const catalogue=readBin('dist/data/europe/turkey/catalogue.bin'),parents=new Map(catalogue.records.map(r=>[r.id,r.parent]));
 const districts=Object.values(catalogue.chunks).flatMap(c=>readBin('dist/data/europe/turkey/'+c.file).regions.features),district=locator(districts);
 const records=[],outside=[];
 for(const p of places.places){
  const parentId=district(p.center);if(!parentId){outside.push(p.name);continue;}
  const city=p.place==='city';if(!city)continue;
  records.push({id:'TR-S-'+p.osm,en:p.en&&p.en!==p.name?p.en:p.name,name:p.name,kind:city?'City (province centre)':'Town',center:p.center,parentId,provinceId:parents.get(parents.get(parentId)),aliases:p.en&&p.en!==p.name?[p.en]:[],minzoom:city?5.4:7.2});
 }
 assert(records.filter(r=>r.kind.startsWith('City')).length>=80,'Every province centre is a city dot');
 const seen=new Set();const unique=records.filter(r=>{const k=r.center.join();if(seen.has(k))return false;seen.add(k);return true;});
 return {records:unique,unplaced:outside,sources:[{id:'osm-places',title:places.title,url:'https://www.openstreetmap.org/copyright',license:'Open Data Commons Open Database License 1.0'}],selection:'Every OpenStreetMap city (province centre) in Türkiye. Towns are left out: each district is named after its own central town. Populations are not shown: TÜİK publishes city populations only in tables that cannot be retained by script.'};
}

// Chile and Peru: their communes and districts are municipalities named after their own towns, so
// towns are not shown; the national and regional capitals, which often span several of them
// (Greater Santiago, Lima, Greater Concepción), are dots of their own, from OpenStreetMap, without
// populations (INE's and INEI's urban-area figures are not openly downloadable by city). Paraguay's
// capitals each match one district, so it has none.
function capitals(country,idPrefix){
 const list=JSON.parse(fs.readFileSync(path.join(retained,'latam-capitals-osm.json')))[country];
 const catalogue=readBin(`dist/data/europe/${country}/catalogue.bin`),parents=new Map(catalogue.records.map(r=>[r.id,r.parent]));
 const lowest=Object.values(catalogue.chunks).filter(c=>c.level===3).flatMap(c=>readBin(`dist/data/europe/${country}/`+c.file).regions.features),unit=locator(lowest);
 const records=list.map(p=>{const parentId=unit(p.center);assert(parentId,p.name+' lies in a mapped unit');return {id:idPrefix+p.osm,en:p.en||p.name,name:p.name,kind:p.capital==='2'?'National capital':'Regional capital',center:p.center,parentId,provinceId:parents.get(parents.get(parentId)),aliases:p.en&&p.en!==p.name?[p.en]:[],minzoom:p.capital==='2'?3:5};});
 return {records,unplaced:[],sources:[{id:'osm-capitals',title:'National and regional capitals in OpenStreetMap',url:'https://www.openstreetmap.org/copyright',license:'Open Data Commons Open Database License 1.0'}],selection:'The national capital and every regional capital, from OpenStreetMap. Towns are left out: each '+(country==='chile'?'commune':'district')+' is named after its own town. Populations are not shown.'};
}
const chile=()=>capitals('chile','CL-S-'),peru=()=>capitals('peru','PE-S-');

for(const [country,build] of [['iceland',iceland],['turkey',turkey],['chile',chile],['peru',peru]]){
 const {records,unplaced,sources,selection}=await build();
 fs.writeFileSync(`dist/data/europe/${country}/settlements.json`,JSON.stringify({country,records,sources,selection})+'\n');
 // The settlement layer also reads extra place names and flags; these countries have none yet.
 fs.writeFileSync(`dist/data/europe/${country}/place-names-flags.json`,JSON.stringify({retrieved:today,languages:{},places:{},sources:[]})+'\n');
 console.log(country,records.length,'settlements; not placed:',unplaced.slice(0,20).join(', ')||'none',unplaced.length>20?'…':'');
}
