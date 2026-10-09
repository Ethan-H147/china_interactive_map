import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {lineData} from '../dist/adaptive-lines.mjs';
const dependencyRoot=process.env.ATLAS_DEPENDENCY_ROOT||path.resolve('../../china-atlas/package.json');
const localDependencies=fs.existsSync('node_modules/mapshaper');
const require=createRequire(localDependencies?path.resolve('package.json'):dependencyRoot);
const mapshaper=require('mapshaper'),{feature,mesh}=require('topojson-client'),{topology}=require('topojson-server');
const {alignCountry}=await import(localDependencies?new URL('./international-topology.mjs',import.meta.url):pathToFileURL(path.join(path.dirname(dependencyRoot),'scripts/international-topology.mjs')));
const source=path.resolve(process.argv[2]||'artifacts/southern-africa-source'),out='dist/data/southern-africa';
const read=n=>JSON.parse(fs.readFileSync(path.join(source,n))),fc=features=>({type:'FeatureCollection',features});
const original=n=>{const d=read(n);return d.type==='Topology'?feature(d,Object.values(d.objects)[0]):d;};
const slug=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const title=s=>s.toLowerCase().replace(/(^|[\s-])[a-z]/g,c=>c.toUpperCase());
async function command(data,commands,files={}){const result=JSON.parse((await mapshaper.applyCommands('-i input.json '+commands+' -o result.json format=geojson precision=.000001',{'input.json':JSON.stringify(data),...Object.fromEntries(Object.entries(files).map(([k,v])=>[k,JSON.stringify(v)]))}))['result.json']);return result.type==='FeatureCollection'?result:result.type==='Feature'?fc([result]):fc((result.type==='GeometryCollection'?result.geometries:[result]).map(geometry=>({type:'Feature',properties:{},geometry})));}
function bounds(g){const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);};walk(g.coordinates);return [[b[0],b[1]],[b[2],b[3]]];}
function borders(regions){const t=topology({regions}),owners=new Map(),groups=new Map();for(const f of t.objects.regions.geometries)for(const arc of new Set(f.arcs.flat(Infinity).map(a=>a<0?~a:a))){if(!owners.has(arc))owners.set(arc,new Set());owners.get(arc).add(f.properties.id);}for(const [arc,ids]of owners){if(ids.size<2)continue;const list=[...ids].sort(),key=list.join('|');if(!groups.has(key))groups.set(key,{owners:list,arcs:[]});groups.get(key).arcs.push([arc]);}return fc([...groups.values()].map(({owners,arcs})=>({type:'Feature',properties:{owners},geometry:mesh(t,{type:'MultiLineString',arcs})})));}
function write(country,name,data){const dir=out+'/'+country;fs.mkdirSync(path.dirname(dir+'/'+name),{recursive:true});const bytes=gzipSync(JSON.stringify(data),{level:9});fs.writeFileSync(dir+'/'+name,bytes);return bytes.length;}
const zaProvince={EC:'ZA-EC',FS:'ZA-FS',GT:'ZA-GP',KZ:'ZA-KZN',LI:'ZA-LP',MP:'ZA-MP',NC:'ZA-NC',NW:'ZA-NW',WC:'ZA-WC'};
const saFirst=fc(original('zaf-adm1.topojson').features.map(f=>({...f,properties:{province:zaProvince[f.properties.shapeISO],provinceName:f.properties.shapeName.replace('Nothern','Northern')}})));
assert(saFirst.features.every(f=>f.properties.province),'Province codes must map to ISO');
const modernDistrict=n=>({Cacadu:'Sarah Baartman',Eden:'Garden Route',Sisonke:'Harry Gwala',Uthungulu:'King Cetshwayo','O.R.Tambo':'O. R. Tambo','Z F Mgcawu':'Z. F. Mgcawu'}[n]||n);
const saSecond=fc(original('zaf-adm2.topojson').features.map(f=>({...f,properties:{district:'ZA-D-'+slug(modernDistrict(f.properties.shapeName)),districtName:modernDistrict(f.properties.shapeName)}})));
let za=fc(original('zaf-adm3.topojson').features.map(f=>({...f,properties:{id:'ZA-M-'+slug(f.properties.shapeName),en:f.properties.shapeName,country:'south-africa'}})));
za=await command(za,'-join districts.json fields=district,districtName largest-overlap -join provinces.json fields=province,provinceName largest-overlap -clean gap-width=0 -simplify dp interval=.0004 planar keep-shapes',{'districts.json':saSecond,'provinces.json':saFirst});
assert(za.features.every(f=>f.properties.district&&f.properties.province),'Municipal parent assignment');
const modernMunicipality=n=>({'Greater Tubatse/Fetakgomo':'Fetakgomo Tubatse','Kh�i-Ma':'Khâi-Ma',Mafikeng:'Mahikeng',Mbizana:'Winnie Madikizela-Mandela',Mbombela:'City of Mbombela','Sol Plaatjie':'Sol Plaatje','The Msunduzi':'Msunduzi','Ventersdorp/Tlokwe':'JB Marks'}[n]||n);
for(const f of za.features){const p=f.properties;p.en=modernMunicipality(p.en);p.id='ZA-M-'+slug(p.en)+(p.en.toLowerCase()==='emalahleni'?'-'+p.province.split('-').at(-1).toLowerCase():'');}
const szProvince={Hhohho:'SZ-HH',Lubombo:'SZ-LU',Manzini:'SZ-MA',Shiselweni:'SZ-SH'};
let sz=fc(original('swz-second.geojson').features.map(f=>({...f,properties:{id:'SZ-'+f.properties.INKH_CODE,en:title(f.properties.INKH_NAME),country:'eswatini',province:szProvince[f.properties.REGION],provinceName:f.properties.REGION}})));
sz=await command(sz,'-clean gap-width=100m -simplify dp interval=.0003 planar keep-shapes -clean gap-width=100m');
const lsSource=original('lso-first.geojson').features;
const lsNames=Object.fromEntries(lsSource.map(f=>[f.properties.reg_id,{en:f.properties.d_name.replace('Botha-Bothe','Butha-Buthe'),capital:f.properties.capital.replace('Botha-Bothe','Butha-Buthe')}]));
const lsParents=Object.fromEntries(lsSource.map(f=>[f.properties.d_name,f.properties.reg_id]));
let ls=fc(original('lso-second.geojson').features.map(f=>{const province=lsParents[f.properties.district_name];return {...f,properties:{id:'LS-'+f.properties.code,en:f.properties.name.replace('Botha-Bothe','Butha-Buthe'),country:'lesotho',province,provinceName:lsNames[province]?.en,urban:f.properties.code.includes('UC')||['01','J11'].includes(f.properties.code)}};}));
assert(ls.features.every(f=>f.properties.provinceName),'Council parent assignment');
ls=await command(ls,'-clean gap-width=10m -simplify dp interval=.0003 planar keep-shapes -clean gap-width=10m');
// Replace the enclave hole with the actual council union, then erase the same
// polygons from South Africa. Both countries retain exactly the same seam.
const lsOutline=await command(ls,'-dissolve'),szOutline=await command(sz,'-dissolve');
const inBox=(w,s,e,n)=>(a,b)=>[a,b].every(p=>p[0]>=w&&p[0]<=e&&p[1]>=s&&p[1]<=n);
const seamReports={};
for(const [name,outline,allowed]of [['lesotho',lsOutline,inBox(26.8,-31,30,-28)],['eswatini',szOutline,inBox(30.6,-27.5,32.4,-25.5)]]){const result=alignCountry(za.features,outline.features[0],allowed,4000);za=fc(result.features);seamReports[name]=result.report;console.log('Aligned border',name,result.report);}
for(const f of za.features){const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const poly of polys)for(let i=poly.length-1;i>0;i--){const b=bounds({type:'Polygon',coordinates:[poly[i]]});if(b[0][0]>26.8&&b[1][0]<30&&b[0][1]>-31&&b[1][1]<-28)poly.splice(i,1);}}
za=await command(za,'-erase lesotho.json -erase eswatini.json -clean gap-width=0',{'lesotho.json':lsOutline,'eswatini.json':szOutline});
const all=await command(fc([...za.features,...sz.features,...ls.features]),'-clean gap-width=100m snap-interval=.00001 overlap-rule=min-area');
const byCountry=Object.fromEntries(['south-africa','eswatini','lesotho'].map(c=>[c,fc(all.features.filter(f=>f.properties.country===c))]));
const manifest=read('manifest.json'),contexts={};
const processing='Lowest-level polygons form shared topology. Parent outlines are dissolved from their children; South Africa retains its Lesotho enclave hole. Narrow digitization gaps up to 100 m are repaired, and residual numerical holes are removed from the two landlocked country silhouettes. South African exterior border edges within 4 km of the Lesotho/Eswatini reference are reconciled to that reference and overlap is erased. Internal lines contain shared edges only; coastlines remain unoutlined. International paths are merged into a single topology to draw each edge once. Local geometry loads per parent. Geometry is simplified to about 45 m north-south; the map further simplifies line details at low zoom. Area estimates are spherical polygon areas rounded to 0.1 square kilometres.';
const meta={
 'south-africa':{levels:['Province','District / metropolitan municipality','Local municipality'],coverage:'9 provinces; 44 districts and 8 metropolitan municipalities; 205 local municipalities. Metros are terminal jurisdictions rather than duplicated third-level entries. Municipal Demarcation Board snapshot represented as 2020 by geoBoundaries; OCHA source created in 2018 and reviewed in January 2025. The Prince Edward Islands are outside this mainland municipal extract.',files:['zaf-adm1.topojson','zaf-adm2.topojson','zaf-adm3.topojson']},
 'eswatini':{levels:['Region','Inkhundla'],coverage:'4 regions and all 59 post-2018 tinkhundla from the COSPE/Khetsimphilo cadastre-derived public GIS layer. The source layer does not state a later survey date or a separate reuse licence. Geometry-derived area is a map estimate. Source population fields have no stated census year and are not used as current statistics.',files:['swz-second.geojson','swz-first.topojson']},
 'lesotho':{levels:['District','Community / urban council'],coverage:'10 districts and 76 community/urban council polygons from the Lesotho Department of Rural Water Supply public government GIS. The source does not state survey date or a separate reuse licence. This council layer is distinct from electoral constituencies. Geometry-derived area is a map estimate.',files:['lso-first.geojson','lso-second.geojson']}
};
for(const [country,lowest] of Object.entries(byCountry)){
 const isZa=country==='south-africa';
 const first=await command(lowest,'-dissolve province copy-fields=provinceName -each "id=province"');
 const second=isZa?await command(lowest,'-dissolve district copy-fields=districtName,province -each "id=district"'):lowest;
 const records=[],chunks={};
 async function recordsFor(regions,level,parentOf,nameOf,kindOf){const points=await command(regions,'-points inner'),areas=await command(regions,'-each "areaKm2=$.area/1000000"');for(let i=0;i<regions.features.length;i++){const f=regions.features[i],p=f.properties;records.push({id:p.id,parent:parentOf(p),level,en:nameOf(p),local:nameOf(p),kind:kindOf(p),center:points.features[i].geometry.coordinates,bounds:bounds(f.geometry),areaKm2:Math.round(areas.features[i].properties.areaKm2*10)/10,...(country==='lesotho'&&level===1?{capital:lsNames[p.id]?.capital}:{})});}}
 await recordsFor(first,1,()=>null,p=>p.provinceName,()=>meta[country].levels[0]);
 const metroNames=new Set(['Buffalo City','City of Cape Town','City of Johannesburg','City of Tshwane','Ekurhuleni','eThekwini','Mangaung','Nelson Mandela Bay']);
 await recordsFor(second,2,p=>p.province,p=>isZa?p.districtName:p.en,p=>isZa?(metroNames.has(p.districtName)?'Metropolitan municipality':'District municipality'):country==='lesotho'?(p.urban?'Urban council':'Community council'):meta[country].levels[1]);
 if(isZa)await recordsFor(fc(lowest.features.filter(f=>!metroNames.has(f.properties.districtName))),3,p=>p.district,p=>p.en,()=>meta[country].levels[2]);
 const saveChunk=(parent,regions,level)=>{const payload={regions:fc(regions.features.map(f=>({...f,properties:{id:f.properties.id}}))),boundaries:borders(regions)},file=(level===2?'second/':'third/')+parent+'.bin';chunks[parent]={file,count:regions.features.length,level,bytes:write(country,file,payload),decodedBytes:Buffer.byteLength(JSON.stringify(payload))};};
 for(const p of first.features)saveChunk(p.properties.id,fc(second.features.filter(f=>f.properties.province===p.properties.id)),2);
 if(isZa)for(const p of second.features){const children=lowest.features.filter(f=>f.properties.district===p.properties.id&&!metroNames.has(f.properties.districtName));if(children.length)saveChunk(p.properties.id,fc(children),3);}
 const firstPayload={regions:fc(first.features.map(f=>({...f,properties:{id:f.properties.id}}))),boundaries:borders(first)};
 write(country,'first.bin',firstPayload);contexts[country]=await command(first,'-dissolve');for(const f of contexts[country].features){f.properties={country};if(country!=='south-africa'){const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const poly of polygons)poly.splice(1);}}
 write(country,'context.bin',contexts[country]);
 const counts=Object.fromEntries([1,2,3].map(l=>[l,records.filter(r=>r.level===l).length]));write(country,'catalogue.bin',{records,chunks,counts,levels:meta[country].levels});
 fs.writeFileSync(out+'/'+country+'/sources.json',JSON.stringify({retrieved:manifest.retrieved,counts,coverage:meta[country].coverage,processing,seamReports,sources:meta[country].files.map(n=>({file:n,...manifest.files[n]}))},null,2)+'\n');
 console.log(country,counts,'chunks',Object.keys(chunks).length);
}
function rings(g){return(g.type==='Polygon'?[g.coordinates]:g.coordinates).flat();}
const saLines=[],saGeometry=contexts['south-africa'].features[0].geometry;
// The north-facing route between the Orange River and Mozambique coast is the
// mainland land frontier. Selecting that contiguous arc excludes both coasts.
const exterior=(saGeometry.type==='Polygon'?[saGeometry.coordinates]:saGeometry.coordinates).sort((a,b)=>b[0].length-a[0].length)[0][0];
const nearest=p=>exterior.reduce((best,q,i)=>Math.hypot(q[0]-p[0],q[1]-p[1])<best.d?{i,d:Math.hypot(q[0]-p[0],q[1]-p[1])}:best,{i:0,d:Infinity}).i;
const a=nearest([16.4519,-28.5805]),b=nearest([32.89,-26.86]),n=exterior.length-1;
const route=(from,to)=>{const r=[];for(let i=from;;i=(i+1)%n){r.push(exterior[i]);if(i===to)break;}return r;};
const routes=[route(a,b),route(b,a)],north=routes.sort((x,y)=>Math.max(...y.map(p=>p[1]))-Math.max(...x.map(p=>p[1])))[0];
saLines.push({type:'Feature',properties:{countries:['south-africa','neighboring countries']},geometry:{type:'LineString',coordinates:north}});
for(const country of ['lesotho','eswatini'])for(const f of contexts[country].features)for(const ring of rings(f.geometry))saLines.push({type:'Feature',properties:{countries:['south-africa',country]},geometry:{type:'LineString',coordinates:ring}});
// Eswatini's eastern frontier is with Mozambique; rendered once in this shared
// southern Africa international collection, independent of the active country.
const internationalTopology=topology({lines:fc(saLines)});
write('south-africa','international.bin',lineData(fc([{type:'Feature',properties:{countries:['south-africa','eswatini','lesotho','neighboring countries']},geometry:mesh(internationalTopology,internationalTopology.objects.lines)}])));
write('eswatini','international.bin',fc([]));write('lesotho','international.bin',fc([]));
console.log('Southern Africa boundary build complete.');
