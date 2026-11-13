import assert from 'node:assert/strict';

const historyButton = 'document.getElementById("historical-snapshot")';
const historyLayer = 'map.getLayer("mexico-history-fill")';

async function clickCountry(p, coordinates, country) {
 const location = JSON.stringify(coordinates);
 await p.evaluate(`void map.jumpTo({center:${location},zoom:6})`);
 await p.settle();
 const point = await p.evaluate(`(()=>{
  const projected=map.project(${location}), canvas=map.getCanvas().getBoundingClientRect();
  return [canvas.x+projected.x,canvas.y+projected.y];
 })()`);
 await p.tap(point);
 await p.waitFor(`AtlasCountryMemory.snapshot().active===${JSON.stringify(country)}`,{timeout:60000});
 await p.settle();
}

export default [{name:'Historical snapshot reopens after a country switch',options:{width:1440,height:960},async run(p,base){
 await p.open(base,'#mexico');
 await p.tap('#historical-snapshot');
 await p.waitFor(`!!${historyLayer}`);
 await p.evaluate('document.querySelector(\'#mexico-history-dock [data-year="1865"]\').click()');
 const dated = 'document.querySelector("#mexico-history-dock .election-year strong")?.textContent==="1865"';
 await p.waitFor(dated);
 await p.settle();

 await clickCountry(p,[-90.51,14.64],'guatemala');
 assert(!await p.evaluate('AtlasCountryMemory.snapshot().countries.some(country=>country.id==="mexico")'));
 await clickCountry(p,[-92.65,16.74],'mexico');
 assert.equal(await p.evaluate(`${historyButton}.textContent`),'Historical snapshot');
 await p.tap('#historical-snapshot');
 await p.waitFor(`!!${historyLayer}&&${dated}`,{timeout:12000});
 await p.settle();
 assert.equal(await p.evaluate(`${historyButton}.textContent`),'Present day');

 await p.evaluate('AtlasComfort.set({appearance:"light"})');
 const fill = 'map.getFeatureState({source:"mexico-history-faces",id:"D49"}).fill';
 await p.waitFor(`!!${fill}`);
 await p.settle();
 const light = await p.evaluate(fill);
 await p.evaluate('AtlasComfort.set({appearance:"dark"})');
 await p.waitFor(`${fill}!==${JSON.stringify(light)}`);

 await p.tap('#historical-snapshot');
 await p.waitFor(`!${historyLayer}`);
 assert.equal(await p.evaluate(`${historyButton}.textContent`),'Historical snapshot');
}}];
