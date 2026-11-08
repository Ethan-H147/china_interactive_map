import assert from 'node:assert/strict';
export default [1280,390].map(width=>({name:'Italian headings separate labeled regional names '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#italy');
 const cases=[['IT-P-21','South Tyrol','Bolzano',['German Bozen']],['IT-R-04','Trentino-South Tyrol','Trentino-Alto Adige',['German Trentino-Südtirol']],['IT-R-02','Aosta Valley',"Valle d'Aosta",["French Vallée d'Aoste"]],['IT-C-021008','Bolzano','',['German Bozen']],['IT-C-021064','Plaus','',[]],['IT-R-12','Lazio','',[]]];
 for(const [id,en,local,regional]of cases){
  await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+').then(()=>true)');await p.settle();
  const card=await p.evaluate('({en:document.getElementById("it-name").textContent,local:document.getElementById("it-local").textContent,hidden:document.getElementById("it-local").hidden,lang:document.getElementById("it-local").lang,regional:[...document.querySelectorAll("#it-names p")].map(p=>p.textContent),links:document.querySelectorAll("#it-names a").length,overflow:document.documentElement.scrollWidth>innerWidth+1})');
  assert.equal(card.en,en);assert.equal(card.local,local);assert.equal(card.hidden,!local);assert.equal(card.lang,'it');assert.deepEqual(card.regional,regional);assert.equal(card.links,0);assert(!card.overflow);
 }
 await p.evaluate('currentAtlas().restore("IT-P-21").then(()=>true)');await p.settle();await p.screenshot('italy-south-tyrol-names-'+width);
}}));
