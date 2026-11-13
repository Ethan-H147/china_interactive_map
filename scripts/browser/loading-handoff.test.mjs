import assert from 'node:assert/strict';
export default [{name:'cold geometry stays off the page heap and polar worker preserves exact GPU coordinates and hit outlines',options:{width:1300,height:820},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:String.raw`{
  const native=Response.prototype.arrayBuffer;window.geometryPageCopies=[];
  Response.prototype.arrayBuffer=function(...args){if(/\/data\/(?:compact\/)?(?:world-land|world-country-outlines|globe-overview-land|globe-overview-borders|china-neighbours)\.bin/.test(this.url))geometryPageCopies.push(this.url);return native.apply(this,args);};
 }`});
 await p.open(base,'#china');await p.waitFor('atlasesReady&&!!AtlasAntarcticCap');await p.settle();
 assert.deepEqual(await p.evaluate('geometryPageCopies'),[],'Large boundary bodies never materialize as page ArrayBuffers');
 const result=await p.evaluate(`(async()=>{
  const url=new URL('data/antarctica/pole-mesh.bin',location.href).href;
  const prepared=await new Promise((resolve,reject)=>{const worker=new Worker('./country-boundary-worker.mjs',{type:'module'});worker.onmessage=({data})=>{worker.terminate();data.error?reject(Error(data.error)):resolve(data);};worker.onerror=e=>{worker.terminate();reject(Error(e.message));};worker.postMessage({operation:'polar-mesh',url});});
  const original=await import('./korea-data.mjs').then(m=>m.loadCompressed(url));
  const a=[prepared.neutral,...prepared.claims],b=[original.neutral,...original.claims];
  return {count:a.length,typed:a.every(part=>part.positions instanceof Float32Array),exact:a.every((part,i)=>{const expected=new Float32Array(b[i].positions);return part.positions.length===expected.length&&part.positions.every((n,k)=>n===expected[k]);}),metadata:JSON.stringify({...prepared,neutral:{...prepared.neutral,positions:null},claims:prepared.claims.map(c=>({...c,positions:null}))})===JSON.stringify({...original,neutral:{...original.neutral,positions:null},claims:original.claims.map(c=>({...c,positions:null}))})};
 })()`);
 assert(result.count>1);assert(result.typed&&result.exact,'Every GPU float is bit-for-bit equivalent');assert(result.metadata,'Every hit-test outline, claim and metadata field is retained');
 await p.evaluate('map.setProjection({type:"globe"});void map.jumpTo({center:[0,-85],zoom:2.5})');await p.settle();
 assert(await p.evaluate('!!map.getLayer("antarctica-pole-surface")'),'Transferred mesh attaches when the pole becomes visible');assert(await p.evaluate('mapScene.assertOrder()'));
 }}];
