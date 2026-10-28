import assert from 'node:assert/strict';
const points=[[28.211997,46.685054],[27.965467,47.043713],[28.242226,46.640577],[27.022285,48.137632]];
export default [1280,390].map(width=>({name:'Moldova–Romania border gaps remain filled in both map views '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#moldova');
 for(const country of ['moldova','romania','france']){
  if(country!=='moldova'){await p.evaluate(`changeAtlas('${country}',false)`);await p.settle();}
  for(const projection of ['mercator','globe']){
   await p.evaluate(`document.getElementById('globe-view').setAttribute('aria-pressed','${projection==='globe'}');syncGlobe(false);void 0`);
   for(const point of points){
    await p.evaluate(`map.jumpTo({center:${JSON.stringify(point)},zoom:11.5});void 0`);await p.settle();
    const filled=await p.evaluate(`map.queryRenderedFeatures(map.project(${JSON.stringify(point)})).some(f=>f.layer.type==='fill')`);
    assert(filled,country+' '+projection+' fills former slit '+point);
   }
  }
 }
 await p.evaluate("changeAtlas('moldova',false)");await p.settle();
 await p.evaluate("map.jumpTo({center:[28.211997,46.685054],zoom:10});void 0");await p.settle();
 await p.screenshot('moldova-romania-border-fixed-'+width);
 assert.equal(await p.evaluate('mapScene.assertOrder()'),true);
}}));
