import assert from 'node:assert/strict';
export default [{name:'Nangang fill and parent layers remain separately controllable',options:{width:1280,height:844},async run(p,base){
 await p.open(base,'#china');await p.evaluate('selectRegion(regionByCode.get("TW-63000"),710000,true)');await p.waitFor('chinaCountyScope.loaded==="TW-63000"');await p.settle();
 await p.evaluate('setRegionState(regionByCode.get("TW-T-63000090"),{hover:true});void map.jumpTo({center:regionByCode.get("TW-T-63000090").feature.properties.centroid,zoom:12});');await p.settle();
 assert(await p.evaluate('map.getSource("city-districts").serialize().tolerance===0'));
 await p.screenshot('taiwan-fill-combined');
 await p.evaluate('void map.setPaintProperty("city-district-fill","fill-opacity",0)');await p.settle();await p.screenshot('taiwan-fill-parent-only');
 await p.evaluate('void map.setPaintProperty("prefecture-fill","fill-opacity",0);void map.setPaintProperty("prefecture-fragment-fill","fill-opacity",0);void map.setPaintProperty("city-district-fill","fill-opacity",["case",["boolean",["feature-state","hover"],false],0.5,0]);');await p.settle();await p.screenshot('taiwan-fill-child-only');
}}];
