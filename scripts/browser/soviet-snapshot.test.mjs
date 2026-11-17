import assert from 'node:assert/strict';
export default [
 {name:'Soviet bookmark opens the integrated 1988 timeline',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#soviet-union-1988');await p.waitFor('AtlasEntry.current==="russia"&&currentAtlas().historicalYear===1988');await p.settle();
  assert.equal(await p.evaluate('!!map.getSource("soviet-union-1988-first")'),false);
  assert.equal(await p.evaluate('[...document.getElementById("ru-dated-unit").options].filter(o=>o.value).length'),15);
  await p.evaluate('currentAtlas().restore("SU-KZ","history")');assert.match(await p.evaluate('document.getElementById("ru-history-card").textContent'),/Alma-Ata/);assert.match(await p.evaluate('document.getElementById("ru-history-card").textContent'),/16,536,511/);
  await p.tap('#historical-snapshot');await p.settle();assert.equal(await p.evaluate('currentAtlas().historicalActive'),false);assert.equal(await p.evaluate('AtlasEntry.current'),'russia');
 }},
 {name:'Reused Soviet geometry retains Chukotka and Wrangel continuity',options:{width:1300,height:950},async run(p,base){
  await p.open(base,'#russia/history=1988');await p.waitFor('currentAtlas().historicalYear===1988');
  for(const selected of [false,true]){
   if(selected)await p.evaluate('currentAtlas().restore("SU-RU","history")');
   for(const [name,center,zoom]of [['chukotka',[180,67],6],['wrangel',[180,71.25],8]]){
    await p.evaluate('void map.jumpTo({center:'+JSON.stringify(center)+',zoom:'+zoom+'})');await p.settle();
    const probes=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(center)+');const layers=map.getStyle().layers.filter(l=>l.type==="line"&&l.layout?.visibility!=="none").map(l=>l.id);return {lines:map.queryRenderedFeatures([[q.x-3,q.y-3],[q.x+3,q.y+3]],{layers}).map(f=>f.layer.id),land:map.queryRenderedFeatures(q,{layers:["russia-first-fill"]}).length}})()');
    assert.deepEqual(probes.lines,[],name+' has no date-line slash');assert(probes.land>0,name+' has continuous historical land');
   }
  }
  await p.screenshot('russia-history-soviet-date-line');
 }}
];
