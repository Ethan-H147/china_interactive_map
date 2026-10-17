// Real-browser test harness: headless Chrome over the DevTools protocol, no extra
// dependencies. Serves dist/ on a free port, drives real mouse, touch and keyboard
// input, and records exceptions, console errors, failed requests and network use.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../dist/',import.meta.url));
export const output=fileURLToPath(new URL('../../artifacts/browser-tests/',import.meta.url));
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2'};

export function startServer(){
 const server=http.createServer(async(req,res)=>{
  try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
   if(path.relative(root,file).startsWith('..')){res.writeHead(403);res.end();return;}
   const data=await fs.promises.readFile(file);res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data);}
  catch{res.writeHead(404);res.end('Not found');}
 });
 return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve({url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>server.close(r))})));
}

function findChrome(){
 if(process.env.CHROME_PATH)return process.env.CHROME_PATH;
 const candidates=process.platform==='win32'?[process.env.PROGRAMFILES+'/Google/Chrome/Application/chrome.exe',process.env['PROGRAMFILES(X86)']+'/Google/Chrome/Application/chrome.exe',process.env.LOCALAPPDATA+'/Google/Chrome/Application/chrome.exe']:process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']:[];
 for(const c of candidates)if(c&&fs.existsSync(c))return c;
 for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser'])try{return execSync('command -v '+name,{encoding:'utf8',shell:'/bin/sh'}).trim();}catch{}
 throw Error('Chrome not found; set CHROME_PATH');
}

// One browser per scenario; viewport, touch and developer mode are fixed at launch.
// BROWSER_CPU_SLOWDOWN (e.g. 4) throttles the page like a slower machine.
export async function launch({width=1280,height=820,mobile=false,developer=false}={}){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-browser-'));
 const software=process.env.CI?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--enable-gpu','--ignore-gpu-blocklist'];
 const chrome=spawn(findChrome(),['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--hide-scrollbars','--mute-audio',`--window-size=${width},${height}`,...software,'about:blank'],{stdio:['ignore','ignore','pipe']});
 const endpoint=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Chrome did not start')),30000);chrome.stderr.on('data',d=>{text+=d;const m=/DevTools listening on (ws:\S+)/.exec(text);if(m){clearTimeout(timer);resolve(m[1]);}});chrome.on('exit',code=>reject(Error('Chrome exited '+code)));});
 const port=new URL(endpoint).port;let target;
 for(let i=0;i<100&&!target;i++){try{target=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t=>t.type==='page');}catch{}if(!target)await sleep(100);}
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 let id=0;const pending=new Map(),listeners=new Map();
 const problems=[],requests=[],failures=[];
 ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id){pending.get(d.id)?.(d);pending.delete(d.id);return;}for(const fn of listeners.get(d.method)||[])fn(d.params);};
 const on=(method,fn)=>{if(!listeners.has(method))listeners.set(method,[]);listeners.get(method).push(fn);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const i=++id;pending.set(i,d=>d.error?reject(Error(method+': '+d.error.message)):resolve(d.result));ws.send(JSON.stringify({id:i,method,params}));});
 on('Runtime.exceptionThrown',p=>problems.push('exception: '+(p.exceptionDetails.exception?.description||p.exceptionDetails.text).split('\n')[0]));
 const warnings=[];
 on('Runtime.consoleAPICalled',p=>{const text=p.args.map(a=>a.value??a.description).join(' ').slice(0,400);if(p.type==='error')problems.push('console.error: '+text);if(p.type==='warning')warnings.push(text);});
 on('Network.requestWillBeSent',p=>requests.push(p.request.url));
 on('Network.responseReceived',p=>{if(p.response.status>=400)failures.push(p.response.status+' '+p.response.url);});
 on('Network.loadingFailed',p=>{if(!p.canceled&&p.errorText!=='net::ERR_ABORTED')failures.push(p.errorText+' '+p.requestId);});
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:mobile?2:1,mobile});
 if(mobile)await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 if(+process.env.BROWSER_CPU_SLOWDOWN>1)await send('Emulation.setCPUThrottlingRate',{rate:+process.env.BROWSER_CPU_SLOWDOWN});
 if(developer)await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{sessionStorage.setItem('boundary-atlas-developer-v1','true')}catch{}"});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error('evaluate: '+(r.exceptionDetails.exception?.description||r.exceptionDetails.text).split('\n')[0]);return r.result.value;};
 const waitFor=async(expression,{timeout=30000,label=expression}={})=>{const start=Date.now();for(;;){let value;try{value=await evaluate(expression);}catch{}if(value)return value;if(Date.now()-start>timeout)throw Error('Timed out waiting for '+label);await sleep(150);}};
 // The atlas is ready when startup and country switching have finished and the map is idle.
 const settle=async()=>{await waitFor("!document.documentElement.dataset.starting&&!document.documentElement.dataset.switching&&typeof map!=='undefined'&&map.loaded()&&!map.isMoving()&&!cameraBusy",{timeout:90000,label:'atlas to settle'});await sleep(600);};
 const center=async selector=>{const r=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;e.scrollIntoView({block:'nearest'});const b=e.getBoundingClientRect();return b.width&&b.height?[b.x+b.width/2,b.y+b.height/2]:null;})()`);if(!r)throw Error('Not visible: '+selector);return r;};
  // Input carries explicit timestamps (seconds), so gesture speed does not depend on how
 // quickly this machine delivers events.
 const mouse=async(type,x,y,extra={})=>send('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1,timestamp:Date.now()/1000,...extra});
 const touch=async(type,points,timestamp=Date.now()/1000)=>send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y])=>({x,y})),timestamp});
 const session={
  send,on,evaluate,waitFor,settle,problems,warnings,requests,failures,mobile,
  async open(base,hash=''){problems.length=0;failures.length=0;await send('Page.navigate',{url:base+'/'+hash});await settle();},
  // A real pointer press: touch on a phone, mouse otherwise.
  async tap(target){const [x,y]=Array.isArray(target)?target:await center(target);if(mobile){await touch('touchStart',[[x,y]]);await sleep(40);await touch('touchEnd',[]);}else{await mouse('mouseMoved',x,y);await mouse('mousePressed',x,y);await mouse('mouseReleased',x,y);}await sleep(250);},
  async drag(from,to,{steps=12,duration=240}={}){const [x0,y0]=Array.isArray(from)?from:await center(from),[x1,y1]=Array.isArray(to)?to:[x0+to.dx,y0+to.dy];
   const t0=Date.now()/1000,at=i=>t0+duration/1000*i/steps;
   if(mobile){await touch('touchStart',[[x0,y0]],at(0));for(let i=1;i<=steps;i++){await sleep(duration/steps);await touch('touchMove',[[x0+(x1-x0)*i/steps,y0+(y1-y0)*i/steps]],at(i));}await touch('touchEnd',[],at(steps));}
   else{await mouse('mouseMoved',x0,y0,{timestamp:at(0)});await mouse('mousePressed',x0,y0,{timestamp:at(0)});for(let i=1;i<=steps;i++){await sleep(duration/steps);await mouse('mouseMoved',x0+(x1-x0)*i/steps,y0+(y1-y0)*i/steps,{buttons:1,timestamp:at(i)});}await mouse('mouseReleased',x1,y1,{timestamp:at(steps)});}
   await sleep(450);},
  async key(key,{code=key,text,modifiers=0}={}){const keyCode={Enter:13,Escape:27,Tab:9,' ':32,Backspace:8,ArrowDown:40,ArrowUp:38}[key]||key.toUpperCase().charCodeAt(0);const t=text??(key.length===1?key:key==='Enter'?'\r':undefined);
   await send('Input.dispatchKeyEvent',{type:t?'keyDown':'rawKeyDown',key,code:code===' '?'Space':code,windowsVirtualKeyCode:keyCode,...(t?{text:t}:{}),modifiers});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:code===' '?'Space':code,windowsVirtualKeyCode:keyCode,modifiers});await sleep(60);},
  async type(text){for(const ch of text)await session.key(ch);await sleep(300);},
  async viewport(width,height){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:mobile?2:1,mobile});await sleep(500);},
  async screenshot(name){fs.mkdirSync(output,{recursive:true});const r=await send('Page.captureScreenshot',{format:'png'});const file=path.join(output,name.replace(/[^\w.-]+/g,'-')+'.png');fs.writeFileSync(file,Buffer.from(r.data,'base64'));return file;},
  async close(){try{ws.close();}catch{}chrome.kill();await new Promise(r=>{chrome.once('exit',r);setTimeout(r,3000);});try{fs.rmSync(profile,{recursive:true,force:true});}catch{}}
 };
 return session;
}
