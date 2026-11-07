import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {decodePack} from '../dist/china-pack.mjs';
import {decodeData} from '../dist/geo-pack.mjs';
import {area,polygons,readMosaic} from './historic-mosaic.mjs';
import {command,fc,geographicBounds} from './build-regional-dataset.mjs';
const sources='scripts/boundary-sources/china-history/',read=file=>JSON.parse(fs.readFileSync(sources+file,'utf8')),manifest=read('manifest.json');
assert.equal(createHash('sha256').update(fs.readFileSync(sources+manifest.cliopatria.file)).digest('hex'),manifest.cliopatria.retainedSha256,'Retained Cliopatria polities');
assert.equal(createHash('sha256').update(fs.readFileSync(sources+manifest.qing1820.file)).digest('hex'),manifest.qing1820.retainedSha256,'Retained Qing divisions');
// Every retained feature is a polity (no group) of a snapshot year, and has an entry.
const cliopatria=read(manifest.cliopatria.file),polities=read('polities.json'),years=[...manifest.snapshots.map(s=>s.year),1949];
assert(cliopatria.features.every(f=>!f.properties.Name.startsWith('(')&&polities[f.properties.Name]&&years.some(y=>f.properties.FromYear<=y&&f.properties.ToYear>=y)),'Retained features are snapshot-year polities with entries');
const {history,config,unit,faceArea,linesSeparate}=await readMosaic('dist/data/china/history/borders.bin');
assert.deepEqual(Object.keys(history.years).map(Number),years);

// The mosaic keeps atlas land and dated extensions beyond modern China.
const display=decodePack(gunzipSync(fs.readFileSync('dist/data/china-boundaries.pack.bin'))).display;
const land=display.provinces.features.reduce((n,f)=>n+area(polygons(f.geometry)),0),total=faceArea.reduce((a,b)=>a+b,0);
// The faces also fill gaps where the displayed provinces' borders do not meet (about 175 km² in all).
assert(total-land>3e6,'The shared faces include historical land outside present-day China');
assert(Math.abs(total-history.source.landAreaKm2)<250,'The final mosaic conserves the assembled land footprint');
// No holes: every hole in a face is another face, apart from rounding specks under 1,000 m².
const {landIndex}=await import('./geo-index.mjs'),faceTests=history.faces.features.map(f=>landIndex(polygons(f.geometry).flat()));
history.faces.features.forEach((f,i)=>{for(const polygon of polygons(f.geometry))for(const hole of polygon.slice(1)){
 if(area([[hole]])<1e-3)continue;
 const inside=landIndex([hole]),point=hole.flatMap((a,k)=>hole.slice(k+2).map(b=>[(a[0]+b[0])/2,(a[1]+b[1])/2])).find(inside);
 assert(!point||faceTests.some((test,j)=>j!==i&&test(point)),'Unfilled hole near '+point);
}});
for(const year of years){
 const c=config(year);
 assert(c.units.every(u=>u.name&&u.zh&&u.type&&u.label&&u.bounds),year+' unit cards');
 assert(linesSeparate(year),year+' lines separate different units');
}
assert.equal(createHash('sha256').update(fs.readFileSync(sources+manifest.tangSong.file)).digest('hex'),manifest.tangSong.retainedSha256);
assert.equal(createHash('sha256').update(fs.readFileSync(sources+manifest.han2.file)).digest('hex'),manifest.han2.retainedSha256);
for(const [year,count,seats,capital,dynasty,frontierCount] of [[2,14,98,'Chang’an','han',1],[742,15,297,'Chang’an','tang',6],[1100,24,301,'Dongjing','song',0]]){
 const {circuits,coverage,municipalities,protectorates}=config(year).points;
 assert.equal(protectorates.length,frontierCount);
 assert(protectorates.every(p=>p.local&&p.statusSource));
 const byId=new Map(circuits.map(c=>[c.id,c]));
 assert.equal(byId.size,count,year+' divisions');
 assert.equal(municipalities.length,seats,year+' audited seats');
 assert.equal(new Set(municipalities.map(p=>p.id)).size,municipalities.length);
 for(const p of municipalities){
  assert(byId.has(p.circuit),p.en+' has a circuit');
  for(const key of ['location','circuit'])assert(['corroborated','uncertain'].includes(p.audit[key]),p.en+' '+key+' was audited');
  assert(p.local&&/^\p{Script=Han}+$/u.test(p.local),p.en+' has a Chinese name');
  assert.equal(p.names['zh-Hant'],p.local,p.en+' has the same map and card name');
  const mapped=faceTests.some(test=>test(p.center))?unit(year,p.center):null;
  if(p.frontier)assert.notEqual(mapped,dynasty,p.en+' records a frontier source disagreement');
  else assert.equal(mapped,dynasty,p.en+' sits on dynasty land');
 }
 assert.equal(municipalities.find(p=>p.en===capital)?.kind,'Imperial capital');
 for(const c of circuits){
  const bands=coverage.features.filter(f=>f.properties.id===c.id);
  const shades=bands.map(f=>f.properties.shade);
  assert(shades[0]<.01&&shades.at(-1)>.25&&shades.every((v,i)=>!i||v>shades[i-1]),c.en+' fades from the interior to the edge');
  let transmission=1;
  for(const f of bands){transmission*=1-f.properties.opacity;assert(Math.abs(1-transmission-f.properties.shade)<1e-5,c.en+' blends to the intended shade');}
  const core=bands.filter(f=>f.properties.step===5);
  assert(core.some(f=>landIndex(polygons(f.geometry).flat())(c.center)),c.en+' label inside selectable area');
  assert.equal(unit(year,c.center),dynasty,c.en+' label on dynasty land');
 }
}
assert.deepEqual(config(742).points.municipalities.find(p=>p.id==='742-city-169').center,[116.94,26.01]);
const songConfig=config(1100),qochoIndex=songConfig.units.findIndex(u=>u.id==='qocho');
const qochoTests=faceTests.filter((_,i)=>songConfig.face[i]===qochoIndex);
const qochoContains=p=>qochoTests.some(test=>test(p));
const qochoOutline=songConfig.selectionLines.qocho.features;
assert(qochoOutline.length,'Qocho retains a selection outline');
for(const line of qochoOutline)for(const path of line.geometry.coordinates)for(let i=1;i<path.length;i++){
 const [x,y]=path[i-1],[e,n]=path[i],length=Math.hypot(e-x,n-y);
 if(length<.001)continue;
 const k=.0002/length,m=(x+e)/2,b=(y+n)/2;
 assert(!(qochoContains([m+(n-y)*k,b+(x-e)*k])&&qochoContains([m-(n-y)*k,b-(x-e)*k])),'Qocho outline contains an interior spur');
}
const songPoints=config(1100).points;
for(const [id,circuit] of [['1100-city-845','1100-circuit-guangnan-east'],['1100-city-1002','1100-circuit-jiangnan-west']]){
 const city=songPoints.municipalities.find(p=>p.id===id);
 assert.equal(city.circuit,circuit,city.en+' corrected circuit');
 assert(songPoints.coverage.features.some(f=>f.properties.id===circuit&&f.properties.step===1&&landIndex(polygons(f.geometry).flat())(city.center)),city.en+' agrees with the corrected circuit extent');
}
assert.equal(config(2).points.circuits.filter(u=>u.kind==='Inspectorate').length,13);
assert.equal(config(1430).points.circuits.filter(u=>u.kind==='Provincial administration').length,13);
const ming=config(1430),mingProvinces=ming.units.filter(u=>u.id.startsWith('1430-circuit-'));
assert.equal(mingProvinces.length,16);
assert.equal(ming.points.municipalities.length,161);
assert(!ming.points.coverage,'Ming uses shared province faces, without faded overlays');
assert(mingProvinces.every(u=>u.boundaryStatus==='unverified-1430'&&u.note.includes('unverified for 1430')));
assert(ming.lines.length&&mingProvinces.every(u=>ming.selectionLines[u.id]?.features.length),'Ming provinces have shared ordinary and selected outlines');
assert.equal(createHash('sha256').update(fs.readFileSync(sources+manifest.ming1430.file)).digest('hex'),manifest.ming1430.retainedSha256);
for(const p of ming.points.municipalities){
 assert(p.local&&p.audit.location&&mingProvinces.some(u=>u.id===p.circuit));
 assert.equal(unit(1430,p.center),p.circuit,p.en+' sits inside its recorded Ming province');
}
for(const [id,expectedArea] of [['zhejiang',101637],['jiangxi',164859],['fujian',121732]]){
 const i=ming.units.findIndex(u=>u.id==='1430-circuit-'+id);
 const actual=faceArea.reduce((n,a,f)=>n+(ming.face[f]===i?a:0),0);
 assert(actual/expectedArea>.9&&actual/expectedArea<1.15,id+' retains its source province area after coastline reconciliation');
}

assert.equal(config(1100).points.circuits.find(c=>c.en==='Kaifeng capital district')?.kind,'Capital district');
assert(!config(1100).points.municipalities.some(p=>p.aliases.includes('Xining Zhou')),'1100 has no later Xining prefecture');

// Compare every early dynasty's exterior footprint with its retained source on atlas land.
// Checking only modern-China faces would miss whole commanderies beyond today's border.
const contextFiles=['china-neighbours.bin','korea-context.bin','mongolia-context.bin','russia/context.bin','europe/bhutan/context.bin','japan-context.bin','world-land.bin'];
const context=await Promise.all(contextFiles.map(async file=>(await decodeData(fs.readFileSync('dist/data/'+file))).features));
const nearEastAsia=f=>{const [[w,s],[e,n]]=geographicBounds(f.geometry);return w<148&&e>66&&s<59&&n>15;};
const chinaMask=await command(fc(display.provinces.features),'-clean gap-width=0 -dissolve2');
const nearby=fc(context.flat().filter(f=>f.properties.country!=='china'&&nearEastAsia(f)).map(f=>({...f,properties:{}})));
const neighbours=await command({'land.json':nearby,'china.json':chinaMask},'-clip bbox=66,15,148,59 -erase china.json -dissolve2');
const allLand=await command(fc([...chinaMask.features,...neighbours.features].map(f=>({...f,properties:{}}))),'-dissolve2');
const coast=fc(allLand.features.map(f=>({...f,geometry:{type:'MultiPolygon',coordinates:polygons(f.geometry).map(([ring])=>[ring])}})));
for(const {year} of manifest.snapshots.filter(s=>s.year<1820)){
 const retained=fc(cliopatria.features.filter(f=>polities[f.properties.Name]?.chinese&&f.properties.FromYear<=year&&f.properties.ToYear>=year));
 const sourceExterior=await command({'dated.json':retained,'land.json':coast,'china.json':chinaMask},'-dissolve2 -clip land.json -erase china.json -clean gap-width=0');
 const c=config(year),drawn=fc(history.faces.features.filter((f,i)=>c.face[i]>=0&&(c.units[c.face[i]].chinese||c.units[c.face[i]].id.startsWith('1430-circuit-'))));
 const shown=await command(drawn,'-dissolve2 -clean gap-width=0');
 const missing=await command({'source.json':sourceExterior,'shown.json':shown},'-erase shown.json');
 const missingArea=missing.features.filter(f=>f.geometry).reduce((n,f)=>n+area(polygons(f.geometry)),0);
 assert(missingArea<100,year+' retains the modeled exterior territory; missing '+missingArea.toFixed(1)+' km²');
 console.log(year+': exterior source comparison, '+missingArea.toFixed(1)+' km² missing');
}

// The period's own states, and the share of land with no recorded polity.
const states=year=>config(year).units.filter(u=>u.chinese).map(u=>u.key).sort();
assert.deepEqual(states(250),['cao-wei','shu-han','wu']);
for(const [year,key] of [[2,'han'],[742,'tang'],[1100,'song']])assert.deepEqual(states(year),[key]);
const unrecorded=year=>config(year).face.reduce((n,i,face)=>i<0?n+faceArea[face]:n,0)/land;
assert(config(1820).fullLand,'Qing draws the full modern China land mask');
const qingUnassigned=config(1820).modernLand.flatMap(i=>config(1820).face[i]<0?polygons(history.faces.features[i].geometry):[]);
const inlandUnassigned=qingUnassigned.filter(p=>geographicBounds({type:'Polygon',coordinates:p})[0][1]>22);
assert(inlandUnassigned.reduce((n,p)=>n+area([p]),0)<100,'Only small coastal and border fragments can remain neutral outside the South China Sea');
assert(config(1820).borders.length,'Qing land frontiers have a separate outline');
assert.equal(config(1820).units.filter(u=>u.type==='Province').length,18,'The eighteen Qing provinces are selectable');
// Every substantial retained Qing/ROC source piece keeps its interior ownership.
const qingReference=JSON.parse(gunzipSync(fs.readFileSync(sources+manifest.qing1820.file)));
const rocReference=(await decodeData(fs.readFileSync('dist/data/europe/china-1949/first.bin'))).regions;
for(const [year,reference] of [[1820,qingReference],[1949,rocReference]]){
 const parts=fc(reference.features.flatMap(f=>polygons(f.geometry).filter(p=>area([p])>500).map(p=>({...f,geometry:{type:'Polygon',coordinates:p}}))));
 const probes=(await command(parts,'-points inner',{precision:null})).features;
 for(const f of probes){
  const expected=String(f.properties.id),actual=unit(year,f.geometry.coordinates);
  assert(actual===expected||year===1820&&expected==='25026'&&actual==='sakhalin',year+' retains source piece '+expected+' at '+f.geometry.coordinates);
 }
 console.log(year+': '+probes.length+' substantial source pieces retain their ownership');
}
const roc=config(1949);
assert(roc.fullLand&&roc.borders.length&&roc.frontiers.length,'ROC uses atlas land and a separate international stroke');
assert.equal(roc.units.filter(u=>u.type==='ROC province').length,35);
assert.equal(roc.points.capitals.length,38);
assert.equal(roc.points.municipalities.length,12);
const rocNeutral=roc.modernLand.filter(i=>roc.face[i]<0).flatMap(i=>polygons(history.faces.features[i].geometry));
const outsideWest=p=>{const [[w,s],[e,n]]=geographicBounds({type:'Polygon',coordinates:p});return s>22&&!(w>=72&&e<=81.40001&&s>=37.49999&&n<=43.30001);};
assert(rocNeutral.filter(outsideWest).reduce((n,p)=>n+area([p]),0)<250,'Neutral land is limited to small gaps and the documented western corrections');
assert(roc.units.every(u=>roc.selectionLines[u.selectionGroup||u.id]?.features.length),'All 1949 units have a clean selection outline');
assert.equal(roc.units.find(u=>u.id==='ROC-JIANGXINPO').selectionGroup,undefined);
assert(roc.selectionLines['ROC-JIANGXINPO'].features.length,'Jiangxinpo has its own selection outline');
assert.equal(roc.units.filter(u=>u.type==='ROC claim').length,10,'All externally administered claim areas are present');
assert(unrecorded(250)>.4,'Cliopatria records no polity over much of the west in 250 CE');

for(const [name,p,checks] of [
 ['Nanchang',[115.86,28.68],{1430:'1430-circuit-jiangxi',1820:'25043',1949:'ROC-JIANGXI'}],
 ['Fuzhou',[119.3,26.08],{1430:'1430-circuit-fujian',1820:'25034',1949:'ROC-FUJIAN'}],
 ['Hangzhou',[120.15,30.27],{1430:'1430-circuit-zhejiang',1820:'25035',1949:'ROC-ZHEJIANG'}],
 ['Northern Vietnam',[105.85,21.03],{2:'han',250:'wu',742:'tang'}],
 ['Pyongyang',[125.716,38.958],{2:'han',250:'cao-wei'}],
 ['Ming northeastern frontier',[136.34,47.09],{1430:'ming'}],
 ['Western source frontier',[74.355,40.609],{2:'han',250:'cao-wei'}],
 ['Tang western source frontier',[76.07,40.79],{742:'tang'}],
 ['Xi’an',[108.94,34.34],{2:'han',250:'cao-wei',742:'tang',1100:'song',1430:'1430-circuit-shaanxi',1820:'25029'}],
 ['Chengdu',[104.07,30.67],{250:'shu-han',742:'tang',1100:'song'}],
 ['Nanjing',[118.8,32.06],{250:'wu',1100:'song'}],
 ['Beijing',[116.4,39.9],{2:'han',250:'cao-wei',742:'tang',1100:'liao',1430:'1430-circuit-northern-metropolitan-region',1820:'25036'}],
 ['Ji’an',[126.19,41.12],{2:'goguryeo',742:'balhae'}],['Kashgar',[75.99,39.47],{1100:'kara-khanid',1430:'chagatai'}],['Turpan',[89.19,42.95],{1100:'qocho'}],
 ['Xinxing main area',[93.724674,42.694585],{1100:'qocho'}],['Xinxing detached area',[94.106193,42.548185],{1100:'qocho'}],
 ['Lhasa',[91.1,29.65],{742:'tibetan-empire',1100:'tibetans',1430:'tibet',1820:'25020'}],
 ['Yinchuan',[106.23,38.49],{1100:'western-xia'}],['Dali',[100.23,25.6],{1100:'dali'}],
 ['Taipei',[121.56,25.04],{1430:null,1820:'25034'}],['Macau',[113.55,22.19],{1820:'macau'}],['Zhuhai',[113.55,22.27],{1820:'25033'}],
 ['Zhoushan',[122.2,30.0],{1820:'25035'}],['Dongtou',[121.16,27.84],{1820:'25035'}],
 ['Ulaanbaatar',[106.9,47.9],{1430:'northern-yuan',1820:'25027',1949:'ROC-MONGOLIA'}],['Kyzyl',[94.4,51.7],{1820:'25027',1949:'ROC-TUVA'}],
 ['Khabarovsk',[135.1,48.5],{1820:'25026'}],['Vladivostok',[131.8855,43.1155],{1820:'25026'}],['Nerchinsk treaty frontier',[133,53.94],{1820:'25021'}],
 ['Western Ili',[80.304016,44.287421],{1820:'25022',1949:null}],['Modern-only western strip',[74,39.6],{1949:null}],['Jiangxinpo',[96.5,25.9],{1949:'ROC-JIANGXINPO'}],['Western Pamirs',[74.272343,38.406657],{1949:'ROC-PAMIRS'}],['Qinzhou',[108.62,21.97],{1949:'ROC-GUANGDONG'}],['Beihai',[109.08,21.48],{1949:'ROC-GUANGDONG'}],['Leizhou coast',[110.098829,21.722858],{1949:'ROC-GUANGDONG'}],['Nanning',[108.33,22.82],{1949:'ROC-GUANGXI'}],['Shangsi',[107.98,22.16],{1949:'ROC-GUANGXI'}],['Arunachal Pradesh',[93.61,27.08],{1949:'ROC-ARUNACHAL'}],['Historical Hejiang east of the modern border',[133.865723,46.076109],{1949:'ROC-HEJIANG'}],['Mongolian land formerly drawn as Ningxia',[101.953446,42.493076],{1949:'ROC-MONGOLIA'}],['Eastern Wakhan',[74.3,37.16],{1949:'ROC-WAKHAN'}],['Karakoram',[75.05,36.6],{1949:'ROC-KARAKORAM'}],['Bhutan frontier',[90.41,27.97],{1949:'ROC-BHUTAN'}],['East of the Amur',[127.89,50.33],{1949:'ROC-AMUR'}],['Diaoyutai / Senkaku',[123.475,25.744],{1949:'ROC-DIAOYU'}],['Kashgar',[75.99,39.47],{1949:'ROC-XINJIANG'}],['Taipei',[121.56,25.04],{1949:'ROC-TAIWAN'}],['Sakhalin',[142.7,50.8],{1820:'sakhalin'}]

])for(const [year,key] of Object.entries(checks))assert.equal(unit(+year,p),key,name+' in '+year);
for(const point of [[131.247974,43.402549],[130.579031,42.447734],[130.584667,42.668779],[130.869532,42.900463]]){
 const id=unit(1949,point);
 assert(id&&!['ROC-HEJIANG','ROC-HEILONGJIANG'].includes(id),'The modern border strip near '+point+' is no longer assigned to Hejiang');
}
const hejiang=fc(history.faces.features.filter((f,i)=>roc.units[roc.face[i]]?.id==='ROC-HEJIANG'));
const hejiangParts=(await command(hejiang,'-dissolve2')).features.flatMap(f=>polygons(f.geometry));
assert.equal(hejiangParts.filter(p=>area([p])>=.01).length,1,'Hejiang has one continuous historical shape');
// Modern coast additions must join coastal provinces rather than the frontier.
for(const [at,province] of [
 [[121.055805,30.369306],'zhejiang'],[[121.184495,28.248198],'zhejiang'],
 [[120.901792,32.774488],'southern-metropolitan-region'],[[121.617334,28.428468],'zhejiang'],
 [[120.861561,31.859957],'southern-metropolitan-region'],[[121.933142,31.523482],'southern-metropolitan-region'],
 [[121.79337,29.509467],'zhejiang'],[[120.633182,32.962197],'southern-metropolitan-region'],
 [[113.55,22.19],'guangdong'],[[120.49,26.37],'fujian']
])assert.equal(unit(1430,at),'1430-circuit-'+province,'Ming coastal land at '+at);
assert.equal(unit(2,[125.716,38.958]),'han','Chaoxian and the Lelang seat sit on Han land');
assert(!faceTests.some((test,i)=>test([126.978,37.566])&&config(2).units[config(2).face[i]]?.key==='han'),'The extension does not include Seoul');
const beijing=config(1430).partOf['110000'];assert.equal(config(1430).units[beijing].key,'1430-circuit-northern-metropolitan-region','Beijing selected without a click shows the Ming');
console.log('China history: '+years.length+' snapshots, '+history.faces.features.length+' faces; spot checks passed.');
