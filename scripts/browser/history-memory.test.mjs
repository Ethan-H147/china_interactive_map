import assert from 'node:assert/strict';
export default [{name:'history releases before country switches and Spain cards label languages',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#china');
 for(const year of [742,1820,1949]){
  await p.evaluate(`loadChinaHistory().then(h=>h.set(true,${year})).then(()=>true)`);await p.settle();
  assert(await p.evaluate('chinaHistory.active'));
  assert(await p.evaluate('changeAtlas("spain",false)'));await p.settle();
  assert.equal(await p.evaluate('chinaHistory?.active||false'),false);
  assert.deepEqual(await p.evaluate('AtlasCountryMemory.snapshot().countries.map(r=>r.id)'),['spain']);
  assert.equal(await p.evaluate('Object.keys(map.getStyle().sources).filter(id=>id.startsWith("china-history")).length'),0);
  await p.evaluate('currentAtlas().restore("ES-A-09").then(()=>true)');await p.settle();
  assert.deepEqual(await p.evaluate('[document.getElementById("es-name").textContent,document.getElementById("es-local").textContent]'),['Catalonia','Cataluña']);
  assert.deepEqual(await p.evaluate('[...document.querySelectorAll("#es-names p")].map(p=>p.textContent)'),['Catalan Catalunya']);
  if(year===1949)await p.screenshot('spain-catalonia-language-card');
  assert(await p.evaluate('changeAtlas("china",false)'));await p.settle();
 }
 // Closing a still-loading history cannot install sources after leaving.
 await p.evaluate('loadChinaHistory().then(h=>{h.set(true);h.leave();return true})');
 await p.settle();assert.equal(await p.evaluate('chinaHistory.active'),false);
 assert.equal(await p.evaluate('Object.keys(map.getStyle().sources).filter(id=>id.startsWith("china-history")).length'),0);
}}];
