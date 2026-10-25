import fs from 'node:fs';
import sharp from 'sharp';
import {launch,startServer} from './browser/harness.mjs';
const preview='dist/__trophy-render.html';if(fs.existsSync(preview))throw Error('Temporary trophy preview path already exists');fs.copyFileSync('scripts/fixtures/trophy-render.html',preview);
let server,p;
try{
 server=await startServer();p=await launch({width:600,height:600});await p.send('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}});await p.send('Page.navigate',{url:server.url+'/__trophy-render.html'});await p.waitFor('window.rendererReady');
 for(const {country}of JSON.parse(fs.readFileSync('dist/data/trophies/manifest.json','utf8')).models){
  await p.evaluate(`window.showModel(${JSON.stringify(country)})`);const png=Buffer.from(await p.evaluate('window.captureModel()'),'base64');fs.mkdirSync('artifacts/trophies',{recursive:true});fs.writeFileSync('artifacts/trophies/'+country+'.png',png);await sharp(png).webp({quality:94}).toFile('dist/data/trophies/'+country+'.webp');console.log(country,png.length+' bytes rendered');
  if(process.argv.includes('--audit'))for(const [view,steps]of [['front',3],['right',14],['back',25],['left',-8]]){
   await p.evaluate(`document.querySelector('canvas').dispatchEvent(new KeyboardEvent('keydown',{key:'Home'}));for(let i=0;i<${Math.abs(steps)};i++)document.querySelector('canvas').dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(steps<0?'ArrowLeft':'ArrowRight')}}));`);
   const frame=Buffer.from(await p.evaluate('window.captureModel()'),'base64');fs.mkdirSync('artifacts/trophies/audit',{recursive:true});fs.writeFileSync('artifacts/trophies/audit/'+country+'-'+view+'.png',frame);
  }
 }
 if(p.problems.length)throw Error(p.problems.join('\n'));
}finally{await p?.close();await server?.close();fs.unlinkSync(preview);}
