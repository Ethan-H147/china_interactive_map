import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
// Unreleased countries stay out of reach and out of the network until developer mode,
// which opens from Changning by typing "dev mode"; then each loads to its deepest level.
const desktop={width:1280,height:820};
const unreleased=['united-kingdom','spain','france','italy'];
const europeRequests=page=>page.requests.filter(u=>/\/data\/europe\//.test(u));

export default [
 {name:'public visitors cannot open or download unreleased countries',options:desktop,async run(page,base){
  for(const country of unreleased){
   await page.open(base,'#'+country);
   assert.equal(await page.evaluate('AtlasEntry.current'),'china',country+' falls back to China');
  }
  await page.evaluate(`location.hash='#korea'`);await page.settle();
  assert.deepEqual(europeRequests(page),[],'No European data is requested');
 }},
 {name:'Changning unlocks developer mode',options:desktop,async run(page,base){
  await page.open(base,'#china');
  await searchAndSelect(page,'Changning','Changning','Shanghai');
  assert.equal(await page.evaluate(`selected?.layer.feature.properties.adcode`),310105,'Shanghai Changning is selected');
  await page.evaluate(`document.activeElement?.blur()`);
  await page.type('dev mode');
  await page.waitFor(`document.getElementById('developer-dialog')?.open`,{label:'the developer dialog'});
  await page.tap('.developer-continue');
  assert.equal(await page.evaluate('AtlasDev.enabled'),true);
  await page.evaluate(`location.hash='#italy'`);await page.settle();
  assert.equal(await page.evaluate('AtlasEntry.current'),'italy','Italy opens in developer mode');
 }},
 ...[['italy','Bergamo','Bergamo','Comune'],['spain','Llívia','Llívia','Municipality'],['france','Fleury-devant','Fleury-devant-Douaumont','Commune'],['united-kingdom','Maidstone','Maidstone','District'],['united-kingdom','Cardiff','Cardiff','built-up area']].map(([country,query,pick,kind])=>({
  name:`${country}: ${pick} (${kind})`,options:{...desktop,developer:true},async run(page,base){
   await page.open(base,'#'+country);
   assert.equal(await page.evaluate('AtlasEntry.current'),country);
   await searchAndSelect(page,query,pick,kind);
   assert(await page.evaluate(`[...document.querySelectorAll('aside.sidebar')].find(a=>!a.hidden&&getComputedStyle(a).display!=='none').innerText.includes('Population')`),'The statistics card shows');
  }})),
 // A shared link reopens the same place at its own level, with the chosen label language.
 ...[['spain','Llívia','Llívia','Municipality',null],['united-kingdom','Maidstone','Maidstone','District','cy']].map(([country,query,pick,kind,language])=>({
  name:`${country}: a link keeps ${pick} at its level`,options:{...desktop,developer:true},async run(page,base){
   await page.open(base,'#'+country);
   await searchAndSelect(page,query,pick,kind);
   if(language)await page.evaluate(`currentAtlas().setLanguage('${language}')`);
   const before=await page.evaluate('({mode:currentAtlas().getMode(),selection:currentAtlas().getSelection(),hash:AtlasView.hashFor(captureView())})');
   assert.equal(before.mode,3,'The place is shown at the third level');
   await page.send('Page.navigate',{url:'about:blank'});
   await page.open(base,before.hash);
   await page.waitFor(`(()=>{const c=document.getElementById('breadcrumb-region');return c&&!c.hidden&&c.textContent.includes(${JSON.stringify(pick)});})()`,{label:'the breadcrumb to show '+pick,timeout:20000});
   const after=await page.evaluate('({mode:currentAtlas().getMode(),selection:currentAtlas().getSelection(),language:currentAtlas().getLanguage?.(),third:document.getElementById("mode-third")?.getAttribute("aria-pressed")})');
   assert.equal(after.selection,before.selection,'The same place is selected');
   assert.equal(after.mode,3,'The third level is restored');assert.equal(after.third,'true','The third-level button shows as chosen');
   if(language)assert.equal(after.language,language,'The label language is restored');
  }})),
 // Flags stack downward: national, region or community, then department or province. A commune
 // or municipality shows its department's or province's flag, captioned as such.
 ...[
  ['france','Strasbourg','Strasbourg','Commune',['flag-fr.svg','FR-R-44','FR-D-67'],'Bas-Rhin · Department flag'],
  ['france','Bas-Rhin','Bas-Rhin','Department',['flag-fr.svg','FR-R-44','FR-D-67'],''],
  ['france','Chambéry','Chambéry','Commune',['flag-fr.svg','FR-R-84'],''],
  ['spain','Toledo','Toledo','Province',['flag-es.svg','ES-A-08','ES-P-45'],''],
  ['spain','Alcalá de Henares','Alcalá de Henares','Municipality',['flag-es.svg','ES-A-13'],''],
  ['spain','Tarragona','Tarragona','Municipality',['flag-es.svg','ES-A-09','ES-P-43'],'Tarragona · Province flag']
 ].map(([country,query,pick,kind,flags,caption])=>({name:`${country}: ${pick} shows its flags`,options:{...desktop,developer:true},async run(page,base){
  await page.open(base,'#'+country);
  await searchAndSelect(page,query,pick,kind);
  const sidebar=`[...document.querySelectorAll('aside.sidebar')].find(a=>!a.hidden&&getComputedStyle(a).display!=='none')`;
  await page.waitFor(`[...${sidebar}.querySelectorAll('.division-flags img')].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0)`,{label:'the flags to load'});
  const shown=await page.evaluate(`[...${sidebar}.querySelectorAll('.division-flags img')].filter(i=>i.getClientRects().length).map(i=>({src:i.getAttribute('src'),top:i.getBoundingClientRect().top}))`);
  assert.deepEqual(shown.map(i=>flags.find(f=>i.src.includes(f))),flags,'Flags shown, top to bottom: '+shown.map(i=>i.src).join(', '));
  assert(shown.every((i,n)=>!n||i.top>shown[n-1].top),'The flags stack downward');
  assert.equal(await page.evaluate(`(()=>{const c=${sidebar}.querySelector('.flag-caption');return c&&!c.hidden?c.textContent:'';})()`),caption);
 }})),
 {name:'leaving developer mode on an unreleased country returns to China',options:{...desktop,developer:true},async run(page,base){
  await page.open(base,'#italy');
  assert.equal(await page.evaluate('AtlasEntry.current'),'italy');
  await page.tap('.developer-exit');await page.settle();
  await page.waitFor(`AtlasEntry.current==='china'`,{label:'China to open',timeout:30000});
  assert.equal(await page.evaluate('AtlasDev.enabled'),false);
  assert.equal(await page.evaluate('location.hash.startsWith("#china")'),true,'The link follows');
 }}
];
