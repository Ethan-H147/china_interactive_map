import assert from 'node:assert/strict';
export default [{name:'South Asian historical fill remains continuous across regional detail cutoff',options:{width:1300,height:900},async run(p,base){
 await p.open(base,'#united-kingdom');
 await p.evaluate('void document.getElementById("historical-snapshot").click()');
 await p.waitFor('!!map.getLayer("united-kingdom-history-fill")');
 await p.evaluate("void document.querySelector('#united-kingdom-history-dock [data-year=\"1857\"]').click()");
 await p.waitFor('document.querySelector("#united-kingdom-history-dock .election-year strong").textContent==="1857"');
 for(const projection of ['mercator','globe']){
  await p.evaluate('void map.setProjection({type:'+JSON.stringify(projection)+'})');
  for(const zoom of [5,6.99,7.01,8]){
   await p.evaluate('void map.jumpTo({center:[76,31.04],zoom:'+zoom+'})');await p.settle();
   const names=await p.evaluate('('+(()=>[30.98,31.01,31.04,31.06,31.1].map(y=>currentAtlas().hoverAt(map.project([76,y]))?.en??null))+')()');
   assert(names.every(name=>name==='East India Company possessions'),projection+' '+zoom+' has continuous Company ownership: '+names);
   await p.screenshot('south-asia-region-seam-'+projection+'-'+zoom);
  }
 }
}}];
