import fs from 'node:fs';
import {gzipSync,gunzipSync,inflateRawSync} from 'node:zlib';
import mapshaper from 'mapshaper';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {lineData} from '../dist/adaptive-lines.mjs';
const rawDir='scripts/japan-sources/municipalities/',out='dist/data/japan-local/';
fs.mkdirSync(out,{recursive:true});
const fc=features=>({type:'FeatureCollection',features});
const write=(file,value)=>{const json=JSON.stringify(value),data=gzipSync(json,{level:9});fs.writeFileSync(out+file,data);return{file,bytes:data.length,decodedBytes:Buffer.byteLength(json)};};
const old=JSON.parse(gunzipSync(fs.readFileSync('dist/data/japan-boundaries.bin'))).first;
const firstNames=new Map(old.features.map(f=>[f.properties.id,f.properties]));
const cities={'札幌市':'01100','仙台市':'04100','さいたま市':'11100','千葉市':'12100','横浜市':'14100','川崎市':'14130','相模原市':'14150','新潟市':'15100','静岡市':'22100','浜松市':'22130','名古屋市':'23100','京都市':'26100','大阪市':'27100','堺市':'27140','神戸市':'28100','岡山市':'33100','広島市':'34100','北九州市':'40100','福岡市':'40130','熊本市':'43100'};
const northern={'01695':'Shikotan','01696':'Tomari','01697':'Ruyobetsu','01698':'Rubetsu','01699':'Shana','01700':'Shibetoro'};
const normal=s=>String(s||'').replace(/[\s　]/g,'').replaceAll('惠','恵');
const roman=new Map(),zip=fs.readFileSync(rawDir+'roman.zip'),end=zip.lastIndexOf(Buffer.from('504b0506','hex')),p=zip.readUInt32LE(end+16),size=zip.readUInt32LE(p+20),offset=zip.readUInt32LE(p+42),start=offset+30+zip.readUInt16LE(offset+26)+zip.readUInt16LE(offset+28);
const csv=new TextDecoder('shift-jis').decode(inflateRawSync(zip.subarray(start,start+size)));
for(const line of csv.split('\n')){const c=[...line.matchAll(/"((?:""|[^"])*)"/g)].map(m=>m[1].replaceAll('""','"'));if(c.length<7)continue;roman.set(normal(c[1]+c[2]),c[5]);}
const title=s=>s.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
function english(pref,district,city,ward,code){
 if(northern[code])return northern[code];
 let value=roman.get(normal(pref+city+(ward||'')))||roman.get(normal(pref+district+city+(ward||'')));
 // Japan Post prefixes these two island addresses with the island name.
 if(!value&&city==='三宅村')value=roman.get(normal(pref+'三宅島'+city))?.replace(/^MIYAKEJIMA /,'');
 if(!value&&city==='八丈町')value=roman.get(normal(pref+'八丈島'+city))?.replace(/^HACHIJOJIMA /,'');
 if(!value&&!ward&&cities[city]){const found=[...roman].find(([name])=>name.startsWith(normal(pref+city)));if(found)value=found[1].replace(/ SHI .*/,' SHI');}
 if(!value)return null;
 value=value.replace(/^.*? GUN /,'');
 if(ward)value=value.split(' SHI ')[1]||value;
 return title(value.replace(/ (SHI|MACHI|CHO|MURA|SON|KU)$/,''));
}
const bbox=c=>{const b=[Infinity,Infinity,-Infinity,-Infinity];function walk(c){if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);}walk(c);return [[b[0],b[1]],[b[2],b[3]]];};
const area=ring=>Math.abs(ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length];return s+p[0]*q[1]-q[0]*p[1];},0));
function metadata(f){const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates,largest=polygons.toSorted((a,b)=>area(b[0])-area(a[0]))[0],b=bbox(largest);return{bounds:bbox(f.geometry.coordinates),focusBounds:b,center:[(b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2]};}
async function commands(data,command){if(!data.features.length)return fc([]);const r=await mapshaper.applyCommands('-i input.json '+command+' -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify(data)});const output=JSON.parse(r['output.json']);return output.type==='FeatureCollection'?output:fc(output.type==='Feature'?[output]:(output.geometries||[output]).map(geometry=>({type:'Feature',properties:{},geometry})));}
async function dissolveGroups(features,key){
 const groups=new Map();for(const f of features)(groups.get(f.properties[key])||groups.set(f.properties[key],[]).get(f.properties[key])).push(f);
 const output=[];for(const [id,parts] of groups){const united=await commands(fc(parts),'-dissolve');if(united.features.length!==1||!united.features[0].geometry?.coordinates?.length)throw Error('Empty local boundary '+id);output.push({...united.features[0],properties:{...parts[0].properties}});}return fc(output);
}
const prefectures=[],records=[],chunks={},sources=[],missing=[];let wards=0;
for(let i=1;i<=47;i++){
 const code=String(i).padStart(2,'0'),parent='JP-'+code,cache=rawDir+code+'-display-v3.bin';let detailed;
 if(fs.existsSync(cache))detailed=JSON.parse(gunzipSync(fs.readFileSync(cache)));
 else{
  const raw=JSON.parse(fs.readFileSync(rawDir+code+'.geojson'));
  for(const f of raw.features){const p=f.properties,known=!!p.N03_004&&p.N03_004!=='所属未定地',cityCode=p.N03_005?cities[p.N03_004]:p.N03_007;if(p.N03_005&&!cityCode)throw Error('Unknown designated city '+p.N03_004);f.properties={id:known?'JP-'+cityCode:'context-'+code,ward:p.N03_005?'JP-'+p.N03_007:'',ja:p.N03_004||'',wardJa:p.N03_005||'',district:p.N03_003||'',subprefecture:p.N03_002||'',known,code:p.N03_007,pref:p.N03_001};}
  detailed=await commands(raw,'-simplify dp interval=15 keep-shapes');fs.writeFileSync(cache,gzipSync(JSON.stringify(detailed)));
 }
 const municipal=await dissolveGroups(detailed.features.filter(f=>f.properties.known),'id');
 for(const f of municipal.features){const p=f.properties,kind=p.ja.endsWith('市')?(cities[p.ja]?'Designated city':'City'):p.ja.endsWith('町')?'Town':p.ja.endsWith('村')?'Village':'Special ward',en=english(p.pref,p.district,p.ja,null,p.id.slice(3));if(!en)missing.push({id:p.id,ja:p.ja,district:p.district});f.properties={id:p.id,en:en||p.ja,ja:p.ja,local:p.ja,parent,level:2,kind,district:p.district,subprefecture:p.subprefecture,aliases:[p.ja,p.district+p.ja,en,en+' '+kind].filter(Boolean),...metadata(f),...(northern[p.id.slice(3)]?{disputed:true,note:'Source outlines follow Japan’s territorial claim; this area is administered by Russia.'}:{})};records.push(f.properties);}
 const wardData=await dissolveGroups(detailed.features.filter(f=>f.properties.ward),'ward');
 for(const f of wardData.features){const p=f.properties,city=municipal.features.find(f=>f.properties.id===p.id),en=english(p.pref,p.district,p.ja,p.wardJa,p.code);if(!en)missing.push({id:p.ward,ja:p.ja+p.wardJa});f.properties={id:p.ward,en:en||p.wardJa,ja:p.wardJa,local:p.wardJa,parent:p.id,prefecture:parent,level:3,kind:'City ward',city:city.properties.en,aliases:[p.ja+p.wardJa,p.wardJa,(city.properties.en+' '+en),en+' Ward'].filter(Boolean),...metadata(f)};records.push(f.properties);wards++;}
 const dissolved=await commands(detailed,'-dissolve2'),precise=fc(dissolved.features.map(f=>({...f,properties:{...firstNames.get(parent),...metadata(f)}})));
 // Tokyo camera focus stays near its largest land component; remote islands
 // retain complete geometry and can be reached through municipal search.
 precise.features[0].properties.focusBounds=parent==='JP-13'?metadata(precise.features[0]).focusBounds:precise.features[0].properties.bounds;
 prefectures.push(...(await commands(precise,'-simplify dp interval=80 keep-shapes')).features);
 chunks[parent]=write(parent+'.bin',{first:precise,second:municipal,wards:wardData});sources.push(JSON.parse(fs.readFileSync(rawDir+code+'-source.json')));console.log('Built',parent,municipal.features.length,wardData.features.length,chunks[parent].bytes);
}
fs.writeFileSync(rawDir+'missing-names.json',JSON.stringify(missing,null,2));if(missing.length)throw Error('Missing romanized names: '+missing.length+'; see '+rawDir+'missing-names.json');
const municipalities=records.filter(p=>p.level===2),claimed=municipalities.filter(p=>p.disputed).length;
const catalogue=write('catalogue.bin',{records,chunks,municipalities:municipalities.length,wards,claimed});
const first=fc(prefectures),t=topology({regions:first}),boundaries=fc([{type:'Feature',properties:{},geometry:mesh(t,t.objects.regions)}]);fs.writeFileSync('dist/data/japan-boundaries.bin',gzipSync(JSON.stringify({first,boundaries}),{level:9}));
const light=await commands(first,'-simplify dp interval=500 keep-shapes');
fs.writeFileSync('dist/data/japan-context.bin',gzipSync(JSON.stringify(light),{level:9}));
fs.writeFileSync('dist/data/japan-motion.bin',gzipSync(JSON.stringify({'japan-first':light,'japan-first-edges':lineData(light),'japan-portal':light}),{level:9}));
const report={population:'japan-local-facts-source.json',flags:'japan-local-flags.json',boundaryDate:'2026-01-01',retrieved:'2026-10-06',boundarySource:'https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html',license:'CC BY 4.0',attribution:'国土交通省 国土数値情報（行政区域）2026年版を加工',nameSource:JSON.parse(fs.readFileSync(rawDir+'roman-source.json')),prefectures:47,municipalities:municipalities.length,cityWards:wards,claimedAreas:claimed,catalogue,chunks,sources,processing:'Official MLIT/GSI municipal and ward topology simplified together to 15 m per prefecture. Municipal polygons dissolve designated-city wards. All local geometry is partitioned by prefecture. National prefecture display uses 80 m detail.',notes:['Tokyo’s 23 special wards are municipalities. Designated-city administrative wards are nested inside their city and are not counted as separate municipalities.','Six village areas in the Northern Territories follow the source’s Japanese territorial claim and are administered by Russia.','Unassigned areas remain in prefecture outlines but are not presented as municipalities.','Romanized municipality labels derive from Japan Post; Japanese names and official five-digit source codes are preserved.']};
fs.writeFileSync('dist/data/japan-local-source.json',JSON.stringify(report,null,2));console.log('Japan local divisions',municipalities.length,'wards',wards,'claimed',claimed,'catalogue',catalogue);
fs.writeFileSync('dist/data/japan-source.json',JSON.stringify({boundarySource:report.boundarySource,boundaryDate:report.boundaryDate,retrieved:report.retrieved,license:report.license,attribution:report.attribution,prefectures:47,processing:report.processing,details:'japan-local-source.json'},null,2));
