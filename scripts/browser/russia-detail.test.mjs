import assert from 'node:assert/strict';
// Russia opens on lighter region files, pans as soon as a region is clicked, and swaps each
// area to its full file past zoom 7, so close views keep every original point.
const points=`(async()=>{const out={};for(const id of Object.keys(map.style.sourceCaches||map.style.tileManagers||{}).filter(id=>/^russia-(first|second)[^-]*$/.test(id))){const d=map.getSource(id).serialize().data;const j=typeof d==='string'?await (await fetch(d)).json():d;out[id.replace(/^russia-|-.*$/g,'')]=(JSON.stringify(j.features.map(f=>f.geometry)).match(/\[-?[0-9.]+,-?[0-9.]+\]/g)||[]).length;}return out;})()`;
export default [{name:'Russia pans at once, opens light and keeps full detail when zoomed in',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#russia');await p.settle();
 const full=await p.evaluate(`(async()=>{const count=async f=>{const r=await fetch('data/russia/'+f),j=JSON.parse(new TextDecoder().decode(await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()));return (JSON.stringify(j.regions.features.map(f=>f.geometry)).match(/\[-?[0-9.]+,-?[0-9.]+\]/g)||[]).length;};return {first:await count('first.bin'),second:await count('second/RU-KYA.bin')};})()`);
 const opened=await p.evaluate(points);assert(opened.first<full.first/2,'Overview uses the light copy: '+opened.first+' of '+full.first);
 await p.evaluate(`{window.__pan=null;const t0=performance.now();map.once('movestart',()=>__pan=performance.now()-t0);null;}`);
 const pt=await p.evaluate(`(()=>{const q=map.project([93,65]),b=map.getCanvas().getBoundingClientRect();return [b.left+q.x,b.top+q.y]})()`);await p.tap(pt);
 await p.waitFor('window.__pan!==null',{timeout:5000});const detailAtPan=await p.evaluate(`!!map.getSource('russia-second')&&map.isSourceLoaded('russia-second')`);
 assert(!detailAtPan||await p.evaluate('__pan<250'),'The camera does not wait for district detail');
 await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'RU-KYA');
 await p.evaluate('void map.jumpTo({center:[88.2,69.35],zoom:8})');for(let i=0;i<60;i++){const o=await p.evaluate(points);if(o.first===full.first&&o.second===full.second)break;await new Promise(r=>setTimeout(r,500));}
 assert.deepEqual(await p.evaluate(points),full,'Zoomed in, both levels hold every original point');
}}];
