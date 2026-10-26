import assert from 'node:assert/strict';
export default [{name:'China romanization reader and search aliases',options:{width:1360,height:980},async run(p,base){
 await p.open(base,'#china');
 for(const [query,expected] of [['Peking',['Beijing']],['Canton',['Guangzhou']],['Taibei',['Taipei City']],['Tái běi',['Taipei City']],['jiayi',['Chiayi City','Chiayi County']],['Jiayi County',['Chiayi County']],['Xinzhu',['Hsinchu City','Hsinchu County']],['Tsingtao',['Qingdao']]]){
  await p.evaluate('document.getElementById("search").value='+JSON.stringify(query)+';document.getElementById("search").dispatchEvent(new Event("input"));');
  await p.waitFor('document.querySelectorAll("#search-results button").length>0');
  const results=await p.evaluate('document.getElementById("search-results").textContent');
  for(const name of expected)assert(results.includes(name),query+' -> '+results);
 }
 await p.evaluate('document.getElementById("search").value="Taibei";document.getElementById("search").dispatchEvent(new Event("input"));');
 await p.tap('#search-results button');await p.settle();assert.equal(await p.evaluate('document.getElementById("selection-name").textContent'),'Taipei City');
 await p.tap('#tab-extra');await p.tap('#chinese-romanization-open');
 assert(await p.evaluate('document.getElementById("chinese-romanization").open'));
 await p.tap('[data-chinese-section=initials]');
 assert.equal(await p.evaluate('document.querySelectorAll("#chinese-initial-table tbody tr").length'),8);
 await p.screenshot('china-romanization-consonants');
 await p.tap('[data-chinese-section=spelling]');assert.equal(await p.evaluate('document.activeElement.textContent'),'Spelling rules that affect names');
 await p.screenshot('china-romanization-desktop');await p.tap('[data-chinese-section=taiwan]');
 assert.equal(await p.evaluate('document.activeElement.textContent'),'Taiwan’s established names');
 await p.key('Escape');assert.equal(await p.evaluate('document.activeElement.id'),'chinese-romanization-open');
 await p.tap('#chinese-romanization-open');await p.evaluate('location.hash="korea"');await p.settle();
 assert(!await p.evaluate('document.getElementById("chinese-romanization").open'));
 }},{name:'China reader fits a phone',options:{width:390,height:844,mobile:true},async run(p,base){
 await p.open(base,'#china');await p.evaluate('AtlasSheet.expand()');await p.tap('#tab-extra');await p.tap('#chinese-romanization-open');
 assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
 assert(await p.evaluate('(()=>{const r=document.getElementById("chinese-romanization").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()'));
 await p.tap('[data-chinese-section=taiwan]');await p.screenshot('china-romanization-phone');
 await p.tap('#chinese-romanization-close');assert(!await p.evaluate('document.getElementById("chinese-romanization").open'));
 }}];
