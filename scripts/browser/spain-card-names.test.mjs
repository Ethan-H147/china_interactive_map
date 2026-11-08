import assert from 'node:assert/strict';
export default [1280,390].map(width=>({name:'Spain headings use English, distinct Spanish, and labeled regional names '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#spain');
 const cases=[
 ['ES-A-09','Catalonia','Cataluña',['Catalan Catalunya']],
 ['ES-A-16','Basque Country','País Vasco',['Basque Euskadi']],
 ['ES-A-10','Valencian Community','Comunidad Valenciana',['Valencian Comunitat Valenciana']],
 ['ES-A-12','Galicia','',[]],
 ['ES-A-06','Cantabria','',[]],
 ['ES-P-08','Barcelona','',[]],
 ['ES-P-03','Alicante','',['Valencian Alacant']]
 ];
 for(const [id,english,spanish,regional] of cases){
  await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+').then(()=>true)');await p.settle();
  const card=await p.evaluate('({en:document.getElementById("es-name").textContent,local:document.getElementById("es-local").textContent,hidden:document.getElementById("es-local").hidden,lang:document.getElementById("es-local").lang,regional:[...document.querySelectorAll("#es-names p")].map(p=>p.textContent)})');
  assert.equal(card.en,english);assert.equal(card.local,spanish);assert.equal(card.hidden,!spanish);assert.equal(card.lang,'es');assert.deepEqual(card.regional,regional);
 }
 await p.evaluate('currentAtlas().restore("ES-A-09").then(()=>true)');await p.settle();await p.screenshot('spain-corrected-card-'+width);
}}));
