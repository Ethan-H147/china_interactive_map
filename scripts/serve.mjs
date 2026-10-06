import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
http.createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/symbols-preview'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await readFile(new URL('symbol-preview.html',import.meta.url)));return;}
  if(pathname==='/__benchmark.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL('benchmark-client.js',import.meta.url)));return;}
  if(pathname==='/benchmark'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end((await readFile(path.join(root,'index.html'),'utf8')).replace('</body>','<script src="/__benchmark.js" defer></script></body>'));return;}
  if(pathname==='/archipelago-benchmark.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL('archipelago-benchmark.js',import.meta.url)));return;}
  if(pathname==='/archipelago-benchmark'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end((await readFile(path.join(root,'index.html'),'utf8')).replace('</body>','<script src="/archipelago-benchmark.js" defer></script></body>'));return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(path.relative(root,file).startsWith('..')||path.isAbsolute(path.relative(root,file))){res.writeHead(403);res.end();return;}
  const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(data);
}catch{res.writeHead(404);res.end('Not found');}}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
