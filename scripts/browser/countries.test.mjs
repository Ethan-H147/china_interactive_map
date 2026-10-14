import assert from 'node:assert/strict';
// Every public country opens on its own route, takes a real search to a place, and
// selects it; countries switch by clicking a neighbour on the map.
const sidebar=`[...document.querySelectorAll('aside.sidebar')].find(a=>!a.hidden&&getComputedStyle(a).display!=='none')`;
// [country, English title, search text, text the chosen result contains]
const countries=[
 ['china','China','Suzhou','Suzhou'],['korea','Korea','Busan','Busan'],['mongolia','Mongolia','Darkhan','Darkhan'],['japan','Japan','Osaka','Osaka'],
 ['philippines','Philippines','Cebu','Cebu'],['indonesia','Indonesia','Bali','Bali'],['malaysia','Malaysia','Penang','Penang'],['singapore','Singapore','Tampines','Tampines'],
 ['brazil','Brazil','Curitiba','Curitiba'],['uruguay','Uruguay','Paysandú','Paysandú'],['argentina','Argentina','Mendoza','Mendoza'],['russia','Russia','Novosibirsk','Novosibirsk'],
 ['south-africa','South Africa','Soweto','Soweto'],['botswana','Botswana','Francistown','Francistown'],['namibia','Namibia','Windhoek','Windhoek'],['eswatini','Eswatini','Manzini','Manzini'],['lesotho','Lesotho','Mafeteng','Mafeteng']
];
// Waits until an expression gives the same value twice in a row (e.g. a result list that
// has finished updating).
export async function stable(page,expression){let last;for(let i=0;i<40;i++){const v=await page.evaluate(expression);if(v===last)return;last=v;await new Promise(r=>setTimeout(r,250));}}
// Chooses the result containing `pick` (and `kind`, when several places share a name).
export async function searchAndSelect(page,query,pick,kind=''){
 const input=await page.waitFor(`(()=>{const i=${sidebar}?.querySelector('input[type=search],.sidebar-tools input');if(!i||!i.getClientRects().length)return null;const r=i.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];})()`,{label:'a visible search field'});
 await page.tap(input);await page.type(query);
 const target=`[...${sidebar}.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.includes(${JSON.stringify(pick)})&&b.textContent.includes(${JSON.stringify(kind)})&&!b.closest('.panel-tabs,.map-mode'))`;
 await page.waitFor(`!!${target}`,{label:'a search result for '+query,timeout:15000});
 await stable(page,`[...${sidebar}.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>b.textContent).join('|')`);
 await page.tap(await page.evaluate(`(()=>{const r=${target}.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];})()`));
 await page.settle();
 await page.waitFor(`(()=>{const c=document.getElementById('breadcrumb-region');return c&&!c.hidden&&c.textContent.includes(${JSON.stringify(pick)});})()`,{label:'the breadcrumb to show '+pick,timeout:20000});
}
export default [
 ...countries.map(([country,title,query,pick])=>({name:country+': opens, searches and selects',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#'+country);
  assert.equal(await page.evaluate('AtlasEntry.current'),country,'The route opens '+country);
  assert.equal(await page.evaluate(`document.getElementById('atlas-title-english').textContent`),title);
  assert.equal(await page.evaluate(`document.documentElement.dataset.atlas`),country,'The country theme applies');
  await searchAndSelect(page,query,pick);
 }})),
 {name:'clicking a neighbour switches country',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#china');
  const point=await page.evaluate(`(()=>{map.jumpTo({center:[105,42],zoom:3.2});const p=map.project([103,46.5]);const r=map.getCanvas().getBoundingClientRect();return [r.left+p.x,r.top+p.y];})()`);
  await page.settle();
  await page.tap(point);await page.settle();
  assert.equal(await page.evaluate('AtlasEntry.current'),'mongolia','Clicking Mongolia opens Mongolia');
  assert.equal(await page.evaluate('location.hash'),'#mongolia');
 }},
 {name:'a country that fails to load returns and retries',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#japan');
  await page.send('Network.setBlockedURLs',{urls:['*archipelago/indonesia*']});
  await page.evaluate(`location.hash='#indonesia'`);
  await page.waitFor(`!!document.querySelector('#status .status-retry')`,{timeout:60000,label:'a Retry button'});await page.settle();
  assert.equal(await page.evaluate('AtlasEntry.current'),'japan','The visitor is returned to the country they were on');
  assert(await page.evaluate(`[...document.querySelectorAll('aside.sidebar')].some(a=>a.id==='japan-sidebar'&&!a.hidden&&getComputedStyle(a).display!=='none')`),'Its page stays whole');
  assert.equal(await page.evaluate(`document.getElementById('status').textContent`),'Indonesia could not load. Retry');
  // The blocked requests above were deliberate.
  page.failures.length=0;page.problems.length=0;
  await page.send('Network.setBlockedURLs',{urls:[]});
  await page.tap('#status .status-retry');await page.settle();
  assert.equal(await page.evaluate('AtlasEntry.current'),'indonesia','Retry opens the country');
  assert.equal(await page.evaluate(`!document.getElementById('status').hidden&&document.getElementById('status').getClientRects().length>0`),false,'The message clears');
 }},
 {name:'links and browser history',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#japan');
  await page.evaluate(`location.hash='#korea'`);await page.settle();
  assert.equal(await page.evaluate('AtlasEntry.current'),'korea','Changing the link opens the country');
  await page.open(base,'');
  assert.equal(await page.evaluate('AtlasEntry.current'),'korea','A return visit reopens the last country');
 }}
];
