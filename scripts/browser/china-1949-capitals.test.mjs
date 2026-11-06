import assert from 'node:assert/strict';

export default [{name:'1949 capital toggle and reference-seat card on the China map',options:{width:1440,height:950},async run(p,base){
 await p.open(base,'#china/history=1949');
 await p.waitFor('chinaHistory?.isRepublic',{timeout:30000});await p.settle();
 assert.equal(await p.evaluate('map.getSource("china-history-roc-capitals").serialize().data.features.length'),38);
 await p.evaluate('void document.getElementById("capital-layer").click()');await p.settle();
 assert.equal(await p.evaluate('map.getLayoutProperty("china-history-roc-capitals","visibility")'),'visible');
 await p.evaluate('void map.jumpTo({center:[119.45,32.20],zoom:6})');await p.settle();
 const point=await p.evaluate('(()=>{const q=map.project([119.45,32.20]),b=map.getCanvas().getBoundingClientRect();return[q.x+b.x,q.y+b.y]})()');
 await p.tap(point);await p.settle();
 assert.match(await p.evaluate('document.getElementById("history-card").innerText'),/Zhenjiang/);
 await p.evaluate('void document.getElementById("capital-layer").click()');await p.settle();
 assert.equal(await p.evaluate('map.getLayoutProperty("china-history-roc-capitals","visibility")'),'none');
 await p.evaluate('void [...document.querySelectorAll("#china-history-dock [data-year]")].find(t=>t.dataset.year==="1820").click()');await p.settle();
 assert(await p.evaluate('!map.getSource("china-history-roc-capitals")&&mapScene.assertOrder()'));
}}];
