import assert from 'node:assert/strict';

// These positions lay in uncovered survey strips and showed the selected parent
// through the district fill. Checking rendered pixels catches the visible fault.
const points=[[78.273808594,35.66576666],[78.19209778,35.63228847],[77.9785510,35.45462005]];
async function pixel(p,point){return p.evaluate(`new Promise(resolve=>{map.once('render',()=>{const canvas=map.getCanvas(),gl=canvas.getContext('webgl2'),q=map.project(${JSON.stringify(point)}),scale=canvas.width/canvas.clientWidth,pixel=new Uint8Array(4);gl.readPixels(Math.round(q.x*scale),canvas.height-1-Math.round(q.y*scale),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);resolve([...pixel]);});map.triggerRepaint();})`);}
export default [1280,390].flatMap(width=>['mercator','globe'].map(projection=>({name:'Ladakh selection has no edge-color strips '+projection+' '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#india');await p.evaluate("currentAtlas().restore('IN-LA')");await p.settle();
 for(const zoom of [8,10,12])for(const point of points){
  await p.evaluate('map.setProjection({type:'+JSON.stringify(projection)+'});map.jumpTo({center:'+JSON.stringify(point)+',zoom:'+zoom+'});void 0');await p.settle();
  const owners=await p.evaluate('map.queryRenderedFeatures(map.project('+JSON.stringify(point)+'),{layers:["india-second-fill"]}).map(f=>f.properties.id)');assert(owners.includes('IN-D-9'),'The former strip is covered by Leh district');
  const color=await pixel(p,point);assert(color.slice(0,3).every((v,i)=>Math.abs(v-[245,231,214][i])<=2),'No selected-parent orange strip at '+point+' zoom '+zoom+': '+color);
 }
 await p.evaluate("currentAtlas().restore('IN-D-9')");await p.settle();await p.evaluate('map.jumpTo({center:'+JSON.stringify(points[0])+',zoom:10});void 0');await p.settle();
 assert((await pixel(p,points[0])).slice(0,3).every((v,i)=>Math.abs(v-[236,201,160][i])<=2),'The bordering district can be highlighted without leaving an uncovered edge');
 await p.screenshot('ladakh-selected-district-'+projection+'-'+width);
}})));
