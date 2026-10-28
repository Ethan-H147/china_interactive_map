import fs from 'node:fs';
import sharp from 'sharp';
import {launch,startServer} from './browser/harness.mjs';
const preview='dist/__trophy-render.html';if(fs.existsSync(preview))throw Error('Temporary trophy preview path already exists');fs.copyFileSync('scripts/fixtures/trophy-render.html',preview);
const selected=process.argv.find(a=>a.startsWith('--countries='))?.split('=')[1].split(',');
let server,p;
try{
 server=await startServer();p=await launch({width:600,height:600});await p.send('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}});await p.send('Page.navigate',{url:server.url+'/__trophy-render.html'});await p.waitFor('window.rendererReady');
 const manifest=JSON.parse(fs.readFileSync('dist/data/trophies/manifest.json','utf8'));
 for(const model of [...manifest.models,...(process.argv.includes('--reserved')?manifest.reservedModels||[]:[])].filter(m=>!selected||selected.includes(m.id||m.country))){const country=model.id||model.country;
  await p.evaluate(`window.showModel(${JSON.stringify(country)},${JSON.stringify(model.file)})`);const png=Buffer.from(await p.evaluate('window.captureModel()'),'base64');fs.mkdirSync('artifacts/trophies',{recursive:true});fs.writeFileSync('artifacts/trophies/'+country+'.png',png);await sharp(png).webp({quality:94}).toFile('dist/'+model.file.replace(/\.glb$/,'.webp'));console.log(country,png.length+' bytes rendered');
  if(process.argv.includes('--audit'))for(const [view,steps]of [['front',3],['right',14],['back',25],['left',-8],['elevated',3]]){
   await p.evaluate(`document.querySelector('canvas').dispatchEvent(new KeyboardEvent('keydown',{key:'Home'}));for(let i=0;i<${Math.abs(steps)};i++)document.querySelector('canvas').dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(steps<0?'ArrowLeft':'ArrowRight')}}));`);
   if(view==='elevated')await p.evaluate(`for(let i=0;i<5;i++)document.querySelector('canvas').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown'}));`);
   const frame=Buffer.from(await p.evaluate('window.captureModel()'),'base64');fs.mkdirSync('artifacts/trophies/audit',{recursive:true});fs.writeFileSync('artifacts/trophies/audit/'+country+'-'+view+'.png',frame);
  }
 }
 if(p.problems.length)throw Error(p.problems.join('\n'));
}finally{await p?.close();await server?.close();fs.unlinkSync(preview);}
