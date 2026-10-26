import assert from 'node:assert/strict';
export default [false,true].map(mobile=>({name:(mobile?'phone':'desktop')+' cross-strait reader and saved hover preference',options:{width:mobile?390:1280,height:844,mobile},async run(p,base){
 await p.open(base,'#china');if(mobile)await p.evaluate('AtlasSheet.expand()');
 await p.tap('#tab-extra');await p.tap('#cross-strait-open');
 assert(await p.evaluate('document.getElementById("cross-strait-info").open'));
 assert(await p.evaluate('document.querySelectorAll("#cross-strait-info a[href^=https]").length>=10'));
 assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
 await p.screenshot('cross-strait-'+(mobile?'phone':'desktop'));await p.key('Escape');assert.equal(await p.evaluate('document.activeElement.id'),'cross-strait-open');
 await p.evaluate('selectRegion(regionByCode.get("TW-63000"),710000,true)');await p.waitFor('chinaCountyScope.loaded==="TW-63000"');await p.settle();
 await p.evaluate('overview.show({x:400,y:200},"TW-T-63000120")');assert(await p.evaluate('!document.getElementById("atlas-hover-overview").hidden'));
 await p.tap('#settings-open');await p.tap('#settings-hover-info');assert(await p.evaluate('document.getElementById("atlas-hover-overview").hidden'));
 await p.tap('#settings-close');await p.evaluate('overview.show({x:400,y:200},"TW-T-63000120")');assert(await p.evaluate('document.getElementById("atlas-hover-overview").hidden'));
 assert.equal(await p.evaluate('JSON.parse(localStorage.getItem("boundary-atlas-settings-v1")).hoverInfo'),false);
 await p.open(base,'#china');assert.equal(await p.evaluate('AtlasSettings.getSettings().hoverInfo'),false);
 await p.tap('#settings-open');await p.tap('#settings-hover-info');await p.tap('#settings-close');assert.equal(await p.evaluate('AtlasSettings.getSettings().hoverInfo'),true);
 if(!mobile){
  await p.evaluate('selectRegion(regionByCode.get("TW-63000"),710000,true)');await p.waitFor('chinaCountyScope.loaded==="TW-63000"');await p.settle();
  for(const code of ['TW-T-63000090','TW-T-63000120']){
   await p.evaluate('setRegionState(regionByCode.get('+JSON.stringify(code)+'),{hover:true});');
   for(const zoom of [10,11,12,13]){
    await p.evaluate('void map.jumpTo({center:regionByCode.get('+JSON.stringify(code)+').feature.properties.centroid,zoom:'+zoom+'})');await p.settle();
    await p.screenshot('taiwan-fill-'+code+'-'+zoom);
   }
   await p.evaluate('setRegionState(regionByCode.get('+JSON.stringify(code)+'),{hover:false});');
  }
 }
}}));
