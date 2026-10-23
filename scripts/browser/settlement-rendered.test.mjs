import assert from 'node:assert/strict';
import sharp from 'sharp';
const magentaPixels=async png=>{const bytes=Buffer.from(png.split(',')[1],'base64'),data=await sharp(bytes).ensureAlpha().raw().toBuffer();let count=0;for(let i=0;i<data.length;i+=4)if(data[i]>180&&data[i+1]<100&&data[i+2]>180)count++;return count;};
export default [1280,390].map(width=>({name:'Globe rendered dots stay sparse during fast zoom-out '+width,options:{width,height:909,mobile:width===390},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-globe-v1','true');"});
 await p.open(base,'#finland');assert.equal(await p.evaluate('map.getProjection().type'),'globe');
 await p.evaluate(`for(const l of map.getStyle().layers.filter(l=>l.id.startsWith('finland-settlements')))map.setPaintProperty(l.id,'circle-color','#ff00ff');void map.jumpTo({center:[27.126934,68.107676],zoom:16});`);await p.settle();
 const close=await p.evaluate('new Promise(resolve=>{map.once("render",()=>resolve(map.getCanvas().toDataURL()));map.triggerRepaint();})');assert(await magentaPixels(close)>0,'Close-up village dots actually render');
 await p.evaluate('void map.jumpTo({center:[25.1,62.5],zoom:14})');await p.settle();
 const frames=await p.evaluate(`new Promise(resolve=>{const frames=[];const capture=()=>{const z=map.getZoom();if(z<8&&z>5.1&&frames.length<18)frames.push({zoom:z,png:map.getCanvas().toDataURL(),labels:document.querySelectorAll('.settlement-label').length});};map.on('render',capture);map.once('moveend',()=>{map.off('render',capture);resolve(frames)});map.easeTo({zoom:5.2,duration:700});})`);
 assert(frames.length>2,'Inspect real frames throughout zoom-out');for(const f of frames){assert(await magentaPixels(f.png)<3000,'No dense dot flood in the framebuffer at zoom '+f.zoom);assert.equal(f.labels,0,'Old close-up labels are removed during movement');}
 await p.settle();await p.screenshot('settlement-rendered-'+width);
 // Manual input must clear existing labels synchronously, before their old
 // collision layout can collapse into a stack at a smaller camera scale.
 await p.evaluate('void map.jumpTo({center:[25.7,62.2],zoom:10})');await p.settle();assert(await p.evaluate('document.querySelectorAll(".maplibregl-marker").length')>0);
 assert.equal(await p.evaluate(`(()=>{map.fire('movestart');return document.querySelectorAll('.maplibregl-marker').length})()`),0);await p.evaluate('map.fire("moveend");void 0');await p.settle();
}}));
