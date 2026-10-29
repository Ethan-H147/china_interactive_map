import assert from 'node:assert/strict';
import sharp from 'sharp';
const capture=p=>p.evaluate(`new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Capture timed out')),10000);map.once('render',()=>{clearTimeout(timer);try{resolve(map.getCanvas().toDataURL());}catch(e){reject(e);}});map.triggerRepaint();})`);
const pixels=async url=>sharp(Buffer.from(url.split(',')[1],'base64')).ensureAlpha().raw().toBuffer();
async function compare(p,label){console.log('Compare '+label);
 await p.evaluate('mapScene.setSelectionDrawCulling(false);void 0');await p.settle();const before=await pixels(await capture(p));
 await p.evaluate('mapScene.setSelectionDrawCulling(true);void 0');await p.settle();const after=await pixels(await capture(p));
 let changed=0;for(let i=0;i<before.length;i+=4)if([0,1,2].some(c=>Math.abs(before[i+c]-after[i+c])>2))changed++;
 assert(changed<=5,label+': '+changed+' pixels changed');
}
export default [{name:'China selected outline draw ranges preserve exact colors and geometry',options:{width:1280,height:900},async run(p,base){
 await p.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:2,mobile:false});await p.open(base,'#china');
 await p.evaluate(`window.outlineCounts=[];const gl=map.painter.context.gl,nativeDraw=gl.drawElements.bind(gl),nativeLayer=map.painter.renderLayer;window.outlineActive=false;gl.drawElements=(...args)=>{if(outlineActive)outlineCounts.push(args[1]);return nativeDraw(...args);};map.painter.renderLayer=function(...args){outlineActive=args[2].id==='province-selection';try{return nativeLayer.apply(this,args);}finally{outlineActive=false;}};void 0`);
 for(const projection of ['globe','mercator'])for(const code of [510000,220000,650000,810000]){
  await p.evaluate(`map.setProjection({type:'${projection}'});selectRegion(provinceLayers.get(${code}),${code},true)`);await p.settle();await compare(p,projection+' '+code);
 }
 await p.evaluate(`map.setProjection({type:'globe'});selectRegion(provinceLayers.get(510000),510000,false);map.jumpTo({center:[105,35],zoom:5.5});void 0`);await p.settle();const indices=[];
 for(const enabled of [false,true]){await p.evaluate(`mapScene.setSelectionDrawCulling(${enabled});void 0`);await p.settle();await p.evaluate('outlineCounts=[];void 0');await capture(p);indices.push(await p.evaluate('outlineCounts.reduce((a,b)=>a+b,0)'));}
 assert(indices[1]>0,'Selected outline remains drawn');assert(indices[1]<indices[0]*.4,'Unselected province outlines are not submitted: '+indices);
 console.log('China province selection indices, native/optimized:',indices);
 await p.evaluate(`map.setFeatureState({source:'provinces-selection-edges',id:220000},{quizCorrect:true});map.setFeatureState({source:'provinces-selection-edges',id:650000},{quizWrong:true});void 0`);await p.settle();await compare(p,'Multiple quiz outlines');await p.evaluate(`map.removeFeatureState({source:'provinces-selection-edges',id:220000},'quizCorrect');map.removeFeatureState({source:'provinces-selection-edges',id:650000},'quizWrong');void 0`);
 await p.evaluate(`selectRegion(regionByCode.get(222400),220000,true)`);await p.settle();await compare(p,'Yanbian prefecture');
 await p.evaluate(`selectRegion(regionByCode.get(510104),510000,true)`);await p.settle();await compare(p,'Chengdu county');
 await p.screenshot('china-selection-draw-preserved');
}}];
