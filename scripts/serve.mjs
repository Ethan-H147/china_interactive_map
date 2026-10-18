import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url)),port=Number(process.env.PORT)||4174;
const server=http.createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  res.setHeader('Cache-Control','no-store');
  // Local edits have no deployed version: never reuse the production service-worker cache.
  if(pathname==='/__preview-health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({application:'boundary-atlas',status:'running',port}));return;}
  if(pathname==='/__preview-status.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL('preview-status.js',import.meta.url)));return;}
  if(pathname==='/version.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({version:null}));return;}
  if(pathname==='/symbols-preview'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await readFile(new URL('symbol-preview.html',import.meta.url)));return;}
  if(pathname==='/__benchmark.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL('benchmark-client.js',import.meta.url)));return;}
  if(pathname==='/benchmark'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end((await readFile(path.join(root,'index.html'),'utf8')).replace('</body>','<script src="/__benchmark.js" defer></script></body>'));return;}
  if(pathname==='/archipelago-benchmark.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL('archipelago-benchmark.js',import.meta.url)));return;}
  if(pathname==='/archipelago-benchmark'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end((await readFile(path.join(root,'index.html'),'utf8')).replace('</body>','<script src="/archipelago-benchmark.js" defer></script></body>'));return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(path.relative(root,file).startsWith('..')||path.isAbsolute(path.relative(root,file))){res.writeHead(403);res.end();return;}
  const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(path.extname(file)==='.html'?data.toString().replace('</body>','<script src="/__preview-status.js" defer></script></body>'):data);
}catch{res.writeHead(404);res.end('Not found');}});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Preview port '+port+' is already in use. Use the running atlas preview or stop that server before running npm start.':error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log('Atlas preview running: http://127.0.0.1:'+port+' · Stop with Ctrl+C'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{console.log('Atlas preview stopped. Restart with npm start.');server.close(()=>process.exit(0));server.closeAllConnections();});
