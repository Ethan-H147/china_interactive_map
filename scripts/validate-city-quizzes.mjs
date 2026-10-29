import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../dist/countries.js';
// City quizzes outside the US: cumulative levels, unique names, dots inside each quiz's frame
// (France's frame is the mainland; its overseas cities sit behind an option).
const expected={china:[15,46,93,167,231],russia:[8,31,63,106,149],spain:[8,28,61],germany:[9,31,61],'united-kingdom':[10,29,63],france:[8,31,68],italy:[10,32,64],brazil:[10,24,49,89,138],canada:[10,25,45,65],argentina:[8,25,45,65],mexico:[8,24,46,68],'south-africa':[6,18,40],korea:[7,19,49],japan:[10,25,55,83]};
for(const [country,counts] of Object.entries(expected)){
 const data=JSON.parse(fs.readFileSync('dist/data/quiz/'+country+'-cities.json','utf8')),cities=globalThis.AtlasCountries.countries[country].quiz.cities,order=cities.levels.map(l=>l.id);
 assert.deepEqual(data.levels.map(l=>l.id),order,country+' levels match the app');assert.deepEqual(data.levels.map(l=>l.count),counts,country+' levels are cumulative');
 assert.equal(new Set(data.records.map(r=>r.id)).size,data.records.length);assert.equal(new Set(data.records.map(r=>r.wikidata)).size,data.records.length,country+' cities are distinct places');
 for(const level of order){const pool=data.records.filter(r=>order.indexOf(r.tier)<=order.indexOf(level));assert.equal(new Set(pool.map(r=>r.en)).size,pool.length,country+' names are unique in '+level);}
 const [[w,s],[e,n]]=cities.bounds;for(const r of data.records){assert(r.overseas&&country==='france'||r.center[0]>=w&&r.center[0]<=e&&r.center[1]>=s&&r.center[1]<=n,r.en+' lies in the quiz frame');assert(r.aliases.length,r.en+' has accepted answers');if(['china','russia'].includes(country))assert(r.local,r.en+' has a local name');}
 console.log(country,'city quiz:',data.records.length,'cities,',data.levels.map(l=>l.label+' '+l.count).join(', '),'passed.');
}
const china=JSON.parse(fs.readFileSync('dist/data/quiz/china-cities.json','utf8')).records;
assert.deepEqual(china.filter(r=>r.overseas).map(r=>r.region).filter((v,i,a)=>a.indexOf(v)===i),['710000'],'Only Taiwan sits behind the Include Taiwan option');
assert.equal(china.filter(r=>r.overseas).length,12);assert.equal(china.find(r=>r.en==='Taipei').localLang,'zh-Hant');
for(const [name,province] of [['Jilin','220000'],['Huangshan','340000'],['Taizhou, Zhejiang','330000'],['Taizhou, Jiangsu','320000'],['Yulin, Guangxi','450000'],['Yulin, Shaanxi','610000'],['Suzhou','320000'],['Dali','530000']])assert.equal(china.find(r=>r.en===name)?.region,province,name);
const russia=JSON.parse(fs.readFileSync('dist/data/quiz/russia-cities.json','utf8')).records;
for(const [name,region] of [['Mirny','Sakha'],['Rostov Veliky','Yaroslavl Oblast'],['Stavropol','Stavropol Krai'],['Tolyatti','Samara Oblast'],['Kirov','Kirov Oblast']])assert.equal(russia.find(r=>r.en===name)?.regionName,region,name);
assert(['Irkutsk','Murmansk','Kaliningrad'].every(n=>russia.find(r=>r.en===n).tier==='medium'),'Russia Easy keeps only the most famous cities');
const europe=c=>JSON.parse(fs.readFileSync('dist/data/quiz/'+c+'-cities.json','utf8')).records,france=europe('france'),near=(r,[x,y])=>Math.hypot(r.center[0]-x,r.center[1]-y)<.2;
assert.deepEqual(france.filter(r=>r.overseas).map(r=>r.en).sort(),['Cayenne','Fort-de-France','Mamoudzou','Pointe-à-Pitre','Saint-Denis, Réunion'],'France overseas cities are optional');
for(const [c,name,point] of [['spain','Las Palmas',[-15.43,28.12]],['spain','Palma',[2.65,39.57]],['germany','Halle',[11.97,51.48]],['germany','Freiburg',[7.85,47.99]],['germany','Frankfurt',[8.68,50.11]],['united-kingdom','Bangor',[-4.13,53.23]],['united-kingdom','Newport',[-3.0,51.59]],['united-kingdom','Perth',[-3.43,56.4]],['italy','Syracuse',[15.29,37.07]]])assert(near(europe(c).find(r=>r.en===name),point),c+' '+name+' is the intended city');
assert.equal(europe('germany').find(r=>r.en==='Munich').local,'München');
console.log('Same-name cities, Taiwan and France overseas options and Russia levels passed.');

const canada=europe('canada'),argentina=europe('argentina');
assert.equal(new Set(canada.map(r=>r.region)).size,13,'Canada includes every province and territory');
assert.equal(new Set(argentina.map(r=>r.region)).size,24,'Argentina includes every province and Buenos Aires City');
for(const [name,region]of [["St. John's",'CA-NL'],['Saint John','CA-NB'],['Richmond','CA-BC'],['London','CA-ON'],['Victoria','CA-BC'],['Fort McMurray','CA-AB']])assert.equal(canada.find(r=>r.en===name)?.region,region,name+' is the intended Canadian city');
for(const [name,region]of [['Buenos Aires','AR-02'],['Córdoba','AR-14'],['San Francisco','AR-14'],['Junín','AR-06'],['General Roca','AR-62'],['Río Grande','AR-94']])assert.equal(argentina.find(r=>r.en===name)?.region,region,name+' is the intended Argentine city');
const {createNameRound,submitName}=await import('../dist/name-quiz-engine.mjs');
for(const [records,inputs]of [[canada,['Montreal','Quebec City','Sudbury',"St Johns",'Saint John']],[argentina,['Cordoba','San Carlos de Bariloche','Catamarca','Oran']]]){
 const round=createNameRound(records.map(r=>({code:r.id,en:r.en,zh:r.local,aliases:r.aliases})));
 for(const input of inputs)assert.equal(submitName(round,input).status,'correct',input+' is accepted');
}
console.log('Canada and Argentina: four tiers, all province/territory coverage, intended same-name places and typing aliases passed.');

// New city packs: intended places, local typing and cumulative difficulty.
for(const [c,name,region] of [['mexico','Córdoba','Veracruz de Ignacio de la Llave'],['mexico','La Paz','Baja California Sur'],['south-africa','Emalahleni','Mpumalanga'],['korea','Gwangju','Jeonnam–Gwangju'],['japan','Shirakawa','Fukushima']])assert.equal(europe(c).find(r=>r.en===name)?.regionName,region,name);
for(const [c,inputs]of [['mexico',['CDMX','Cancun','San Cristobal de las Casas']],['south-africa',['Port Elizabeth','Nelspruit','Witbank']],['korea',['서울','부산','수원','Pusan']],['japan',['東京','京都','Osaka','Tōkyō']]]){
 for(const input of inputs)assert.equal(submitName(createNameRound(europe(c).map(r=>({code:r.id,en:r.en,zh:r.local,aliases:r.aliases}))),input).status,'correct',c+' '+input);
}
assert(europe('korea').every(r=>r.region.startsWith('KR-')),'Korean city quiz contains South Korea only');
assert(near(europe('korea').find(r=>r.en==='Asan'),[127,36.79]),'Asan uses its urban centre');
assert(near(europe('south-africa').find(r=>r.en==='Emalahleni'),[29.24,-25.88]),'Emalahleni uses the city rather than the municipality');
console.log('Mexico, South Africa, South Korea and Japan city packs passed.');

for(const [name,point] of [['Acapulco',[-99.88,16.86]],['Puebla',[-98.2,19.04]],['Chihuahua',[-106.07,28.63]],['Toluca',[-99.66,19.29]],['Oaxaca',[-96.73,17.06]],['Querétaro',[-100.39,20.59]],['Cozumel',[-86.95,20.5]]])assert(near(europe('mexico').find(r=>r.en===name),point),'Intended urban locality: '+name);
