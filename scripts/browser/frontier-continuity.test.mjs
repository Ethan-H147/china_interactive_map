import assert from 'node:assert/strict';
import {load,linesOf,metres} from '../geo-index.mjs';
const resolved=load('dist/data/atlas-frontiers.bin').features.filter(f=>f.properties.resolvedFrontier);
function samples(pair){
 const result=[];
 for(const path of linesOf({features:resolved.filter(f=>f.properties.resolvedFrontier===pair)})){
  let since=0;
  for(let i=1;i<path.length;i++){since+=metres(path[i-1],path[i]);if(since>=1500){result.push(path[i]);since=0;}}
 }
 return result;
}
async function checkPixels(page,points){
 return page.evaluate(`new Promise(resolve=>{map.once('render',()=>{
 const canvas=map.getCanvas(),gl=canvas.getContext('webgl2'),pixels=new Uint8Array(canvas.width*canvas.height*4),scale=canvas.width/canvas.clientWidth;
 gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
 let tested=0,missing=0;
 for(const point of ${JSON.stringify(points)}){
  const q=map.project(point),x=Math.round(q.x*scale),y=canvas.height-1-Math.round(q.y*scale);
  if(q.x<12||q.y<12||q.x>canvas.clientWidth-12||q.y>canvas.clientHeight-12)continue;
  tested++;let ink=false;
  for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const i=((y+dy)*canvas.width+x+dx)*4;if((pixels[i]+pixels[i+1]+pixels[i+2])/3<208)ink=true;}
  if(!ink)missing++;
 }
 resolve({tested,missing});});map.triggerRepaint();})`);
}
export default [{
 name:'Brazil Paraguay and northern Peru are continuous single strokes at every zoom',
 options:{width:1280,height:820,developer:true},
 async run(page,base){
  await page.open(base,'#japan');
  const cases=[
   ['BRA-PRY',[-57.8,-21],5],['BRA-PRY',[-56,-22.4],7],['BRA-PRY',[-54.4,-24.2],8],
   ['ARG-PRY',[-58.1,-26.4],6],['PRY-BOL',[-60,-20.3],6],
   ['BRA-PRY',samples('BRA-PRY')[Math.floor(samples('BRA-PRY').length/2)],4],['BRA-PRY',samples('BRA-PRY')[Math.floor(samples('BRA-PRY').length/2)],10],
   ['PER-ECU',[-78.2,-3.4],5],['PER-ECU',[-76.5,-1],7],['PER-COL',[-73,-2.3],6],['PER-COL',[-70.6,-3.5],8],['PER-ECU',samples('PER-ECU')[Math.floor(samples('PER-ECU').length/2)],4],['PER-COL',samples('PER-COL')[Math.floor(samples('PER-COL').length/2)],10]
  ];
  let tested=0;
  for(const [pair,center,zoom] of cases){
   await page.evaluate(`map.jumpTo({center:${JSON.stringify(center)},zoom:${zoom}});0`);await page.settle();
   const result=await checkPixels(page,samples(pair));
   tested+=result.tested;
   assert(result.tested>=4,pair+' has enough on-screen samples');
   assert.equal(result.missing,0,pair+' at zoom '+zoom+': '+JSON.stringify(result));
   assert.equal(await page.evaluate('mapScene.assertOrder()'),true);
  }
  console.log('Frontier continuity:',tested,'rendered samples across zooms 4–10.');
  for(const country of ['brazil','paraguay','peru']){
   await page.evaluate("location.hash='#"+country+"'");await page.settle();
   const paints=await page.evaluate("map.getStyle().layers.filter(l=>l.metadata?.atlasInternationalBorder&&map.getLayoutProperty(l.id,'visibility')!=='none').map(l=>({id:l.id,width:l.paint['line-width'],opacity:l.paint['line-opacity']}))");
   for(const paint of paints){assert.equal(paint.opacity,1,paint.id+' never fades short pieces');assert.deepEqual(paint.width,paints[0].width,'Every national border uses the same stroke width');}
  }
  await page.evaluate("location.hash='#brazil'");await page.settle();
  await page.evaluate("map.jumpTo({center:[-57,-23],zoom:5.8});0");await page.settle();
  await page.screenshot('paraguay-brazil-border-fixed');
  await page.evaluate("map.jumpTo({center:[-76,-2],zoom:5.3});0");await page.settle();
  await page.screenshot('peru-northern-border-fixed');
 }
}];
