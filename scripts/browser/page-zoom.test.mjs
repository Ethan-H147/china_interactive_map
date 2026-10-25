import assert from 'node:assert/strict';
async function pinch(p,x,y,from=28,to=80){
 const contacts=g=>[{x:x-g,y,id:1},{x:x+g,y,id:2}];
 await p.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contacts(from)[0]]});
 await p.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:contacts(from)});
 for(let i=1;i<=10;i++){await p.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:contacts(from+(to-from)*i/10)});await new Promise(r=>setTimeout(r,25));}
 await p.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.settle();
}
const viewport=p=>p.evaluate('visualViewport.scale');
export default [
 {name:'Phone pinch leaves the UI fixed while map pinch and article scrolling work',options:{width:390,height:844,mobile:true},async run(p,base){
  await p.open(base,'#korea');await p.evaluate(`AtlasSettings.setSettings({motion:'reduce'})`);
  const scale=await viewport(p),zoom=await p.evaluate('map.getZoom()');
  await pinch(p,160,45,20,65);assert.equal(await viewport(p),scale);assert.equal(await p.evaluate('map.getZoom()'),zoom,'Header pinch does not move the map');
  await p.evaluate(`AtlasSheet.expand()`);await p.tap('#k-tab-extra');await p.tap('#k-romanization-open');
  await pinch(p,190,360,25,95);assert.equal(await viewport(p),scale,'Article pinch does not scale the page');
  await p.drag([200,650],[200,330],{steps:18,duration:450});
  assert(await p.evaluate(`document.querySelector('#k-romanization article').scrollTop>100`),'One-finger reading scroll remains available');
  await p.tap('#k-romanization-close');await p.evaluate(`AtlasSheet.collapse()`);await p.settle();
  const start=await p.evaluate('map.getZoom()');await pinch(p,195,380,28,95);
  assert((await p.evaluate('map.getZoom()'))>start+.25,'Two-finger pinch still zooms the map');assert.equal(await viewport(p),scale);
  await p.screenshot('phone-ui-zoom-fixed');
 }},
 {name:'Safari touch gesture fallback blocks panel scaling but leaves single touches alone',options:{width:390,height:844,mobile:true},async run(p,base){
  await p.open(base,'#korea');
  const state=await p.evaluate(`(()=>{var ui=document.querySelector('.site-header'),canvas=map.getCanvas(),result={};
   for(var kind of ['gesturestart','gesturechange']){var e=new Event(kind,{bubbles:true,cancelable:true});ui.dispatchEvent(e);result[kind]=e.defaultPrevented;}
   var touch=new Touch({identifier:1,target:ui,clientX:80,clientY:40}),one=new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[touch]});ui.dispatchEvent(one);result.single=one.defaultPrevented;
   var end=new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[]});ui.dispatchEvent(end);return result;})()`);
  assert.deepEqual(state,{gesturestart:true,gesturechange:true,single:false});
 }}
];
