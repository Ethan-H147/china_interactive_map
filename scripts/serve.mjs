import http from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {watch} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
export function privateIPv4(ip){const parts=ip.split('.').map(Number);return parts.length===4&&parts.every(n=>Number.isInteger(n)&&n>=0&&n<=255)&&(parts[0]===10||parts[0]===192&&parts[1]===168||parts[0]===172&&parts[1]>=16&&parts[1]<=31);}
export function lanAddresses(interfaces=os.networkInterfaces(),physical){
 return Object.entries(interfaces).filter(([name])=>(!physical||physical.includes(name))&&!/(vpn|cisco|anyconnect|tailscale|wsl|vethernet|docker|virtual|loopback)/i.test(name)).flatMap(([name,entries])=>entries.filter(e=>e.family==='IPv4'&&!e.internal&&privateIPv4(e.address)).map(e=>({name,address:e.address})));
}
export function createPreview({root=fileURLToPath(new URL('../dist/',import.meta.url)),port=4174,hosts=['127.0.0.1']}={}){
 const servers=[],sockets=new Set();let revision=Date.now(),watcher;
 const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
 const inside=file=>{const relative=path.relative(root,file);return !relative.startsWith('..')&&!path.isAbsolute(relative);};
 async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  const send=(data,type)=>{res.setHeader('Content-Type',type);res.end(req.method==='HEAD'?undefined:data);};
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(pathname==='/__preview-health'){send(JSON.stringify({application:'boundary-atlas',status:'running',port,revision}),'application/json');return;}
   if(pathname==='/version.json'){send(JSON.stringify({version:null}),'application/json');return;}
   if(pathname==='/__preview-status.js'){send(await readFile(new URL('preview-status.js',import.meta.url)),'text/javascript');return;}
   if(pathname==='/symbols-preview'){send(await readFile(new URL('symbol-preview.html',import.meta.url)),'text/html; charset=utf-8');return;}
   for(const [route,file]of [['/__benchmark.js','benchmark-client.js'],['/archipelago-benchmark.js','archipelago-benchmark.js']])if(pathname===route){send(await readFile(new URL(file,import.meta.url)),'text/javascript');return;}
   if(['/benchmark','/archipelago-benchmark'].includes(pathname)){const script=pathname==='/benchmark'?'__benchmark.js':'archipelago-benchmark.js';send((await readFile(path.join(root,'index.html'),'utf8')).replace('</body>',`<script src="/${script}" defer></script></body>`),'text/html; charset=utf-8');return;}
   const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
   if(!inside(file)||pathname.split('/').some(p=>p.startsWith('.'))){res.writeHead(403);res.end();return;}
   // Symlinks must not turn the static preview into access to source or user files.
   if(!inside(await realpath(file))){res.writeHead(403);res.end();return;}
   const data=await readFile(file),ext=path.extname(file);
   send(ext==='.html'?data.toString().replace('</body>','<script src="/__preview-status.js" defer></script></body>'):data,types[ext]||'application/octet-stream');
  }catch{res.writeHead(404);res.end('Not found');}
 }
 return {async start(){
  try{
   for(const host of [...new Set(hosts)]){
    const server=http.createServer(handler);server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});servers.push(server);
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
   }
   watcher=watch(root,{recursive:true},()=>{revision=Date.now();});
   return servers.map(s=>`http://${s.address().address}:${s.address().port}`);
  }catch(error){await this.close();throw error;}
 },async close(){watcher?.close();for(const socket of sockets)socket.destroy();await Promise.all(servers.map(s=>new Promise(resolve=>s.listening?s.close(resolve):resolve())));}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const lan=process.argv.includes('--lan'),explicit=process.argv.find(a=>a.startsWith('--host='))?.slice(7),port=Number(process.env.PORT)||(lan?4175:4174);
 let hosts=['127.0.0.1'];
 if(lan){
  let physical;
  if(!explicit&&process.platform==='win32'){
   try{const names=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','Get-NetAdapter -Physical | Select-Object -ExpandProperty Name | ConvertTo-Json -Compress'],{encoding:'utf8',windowsHide:true}));physical=Array.isArray(names)?names:[names];}
   catch{throw Error('Could not identify physical network adapters. Use --lan --host=YOUR_PRIVATE_PC_IP.');}
  }
  const addresses=explicit?[{address:explicit}]:lanAddresses(undefined,physical);
  if(!addresses.length)console.log('No private home-network IPv4 address found. Local preview will run; connect your PC to the home network and restart npm run preview:ipad for the iPad link.');
  for(const {address}of addresses){if(!privateIPv4(address))throw Error('LAN preview requires a private IPv4 address (10.x, 172.16–31.x, or 192.168.x).');hosts.push(address);}
 }
 const preview=createPreview({port,hosts});
 try{const urls=await preview.start();for(const url of urls)console.log((url.includes('127.0.0.1')?'Local: ':'iPad (same network): ')+url);console.log('Changes are local. Refresh the iPad page after editing; GitHub is not needed. Stop with Ctrl+C.');}
 catch(error){console.error(error.code==='EADDRINUSE'?'Preview port '+port+' is already in use. Reuse the running preview or choose another PORT.':error.message);process.exitCode=1;}
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>void preview.close().then(()=>process.exit(0)));
}
