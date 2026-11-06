import assert from 'node:assert/strict';

const active='AtlasEntry.current==="china"&&chinaHistory?.isRepublic';
const name='document.getElementById("selection-name").textContent';
async function find(p,query,expected){
 await p.evaluate('void Object.assign(document.getElementById("search"),{value:'+JSON.stringify(query)+'}).dispatchEvent(new Event("input"))');
 await p.tap('#search-results button');await p.settle();
 assert.equal(await p.evaluate(name),expected);
}
async function open(p,base,hash='#china-1949'){
 await p.open(base,hash);await p.waitFor(active,{timeout:30000});await p.settle();
}
export default [
 {name:'all 35 Republic of China provinces can be clicked on the map',options:{width:1440,height:950},async run(p,base){
  await open(p,base,'#china/history=1949');
  const units=await p.evaluate('(async()=>{const d=await AtlasGeoPack.decodeData(await AtlasGeoPack.fetchBytes("data/china/history/borders.bin"));return d.configs[d.years[1949].config].units.filter(u=>u.type==="ROC province").map(u=>({id:u.id,label:u.label}));})()');
  assert.equal(units.length,35);
  for(const {id,label} of units){
   await p.evaluate('void map.jumpTo({center:'+JSON.stringify(label)+',zoom:5.4})');await p.settle();
   const xy=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(label)+'),b=map.getCanvas().getBoundingClientRect();return[q.x+b.x,q.y+b.y]})()');
   await p.tap(xy);
   await p.waitFor('chinaHistory.selection==='+JSON.stringify(id),{timeout:5000});
   if(['ROC-HEILONGJIANG','ROC-SONGJIANG','ROC-NENJIANG'].includes(id)){await p.settle();await p.screenshot('china-1949-'+id.toLowerCase());}
  }
 }},
 {name:'legacy 1949 link opens the shared land, province picker and history cards',options:{width:1440,height:950},async run(p,base){
  await open(p,base);
  assert.equal(await p.evaluate('location.hash'),'#china/history=1949');
  assert(await p.evaluate('!AtlasCountries.countries["china-1949"]&&!map.getLayer("china-1949-first-fill")'));
  assert(await p.evaluate('!!document.querySelector("#province option[value=ROC-JIANGXINPO]")'));
  assert(await p.evaluate('!!document.querySelector("#province option[value=ROC-PAMIRS]")'));
  assert.equal(await p.evaluate('map.getLayoutProperty("atlas-frontiers","visibility")'),'none');
  for(const [query,expected] of [['Chahar','Chahar'],['Rehe','Jehol'],['Xikang','Xikang'],['Outer Mongolia','Outer Mongolia']])await find(p,query,expected);
  assert.match(await p.evaluate('document.getElementById("history-card").innerText'),/1946.*Tuva/s);
  await find(p,'Jiangxinpo','Jiangxinpo');
  assert.match(await p.evaluate('document.getElementById("history-card").innerText'),/Burma administered/);
  await p.evaluate('chinaHistory.clear()');
  await p.evaluate('void map.jumpTo({center:[96.5,25.9],zoom:6})');await p.settle();
  const claim=await p.evaluate('(()=>{const q=map.project([96.5,25.9]),b=map.getCanvas().getBoundingClientRect();return[q.x+b.x,q.y+b.y]})()');
  await p.tap(claim);await p.waitFor('chinaHistory.selection==="ROC-JIANGXINPO"',{timeout:5000});
  assert.equal(await p.evaluate(name),'Jiangxinpo');
  await find(p,'Xinjiang','Xinjiang');
  await p.evaluate('void map.jumpTo({center:[75.7,39.3],zoom:6})');await p.settle();
  assert(await p.evaluate('chinaHistory.hoverAt(map.project([74.272343,38.406657]))?.en==="Eastern Pamirs"'));
  await p.screenshot('china-1949-western-frontier');
  await find(p,'Hejiang','Hejiang');
  await p.evaluate('void map.jumpTo({center:[131.6,44.4],zoom:5.8})');await p.settle();
  assert(await p.evaluate('chinaHistory.hoverAt(map.project([131.247974,43.402549]))?.en!=="Hejiang"'));
  await p.screenshot('china-1949-hejiang');
  await p.tap('#historical-snapshot');await p.settle();
  assert(await p.evaluate('!map.getLayer("china-history-fill")&&map.getLayoutProperty("province-lines","visibility")!=="none"'));
 }},
 {name:'municipality cards and shared-view restoration in China’s 1949 timeline',options:{width:1280,height:900},async run(p,base){
  await open(p,base,'#china/history=1949');
  await find(p,'Peking','Beiping');
  assert.match(await p.evaluate('document.getElementById("history-card").innerText'),/Location point only/);
  const hash=await p.evaluate('viewHash(captureView())');
  await open(p,base,hash);
  assert.equal(await p.evaluate(name),'Beiping');
  await p.evaluate('void map.jumpTo({center:[114.29,30.59],zoom:7})');await p.settle();
  const point=await p.evaluate('(()=>{const q=map.project([114.29,30.59]),b=map.getCanvas().getBoundingClientRect();return[q.x+b.x,q.y+b.y]})()');
  await p.tap(point);await p.settle();
  assert.equal(await p.evaluate(name),'Hankou');
 }},
 {name:'China’s 1949 timeline fits a phone',options:{width:390,height:844,mobile:true},async run(p,base){
  await open(p,base,'#china/history=1949');
  assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
  assert.match(await p.evaluate('document.getElementById("history-summary").textContent'),/municipality dots/i);
 }}
];
