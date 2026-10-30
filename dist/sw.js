// Repeat visits load the site's own files from this device instead of the network.
// Each deploy stamps version.json with its commit (.github/workflows/pages.yml); files are
// stored per version, and a new version empties the store. Version 2 also avoids
// repopulating a fresh store from an older response in the browser HTTP cache. Without a version (local preview,
// other hosts) nothing is stored and every request goes to the network as usual.
// Pages always come from the network, so a page and the files it asks for share one version.
// The worker never takes over a page already open: it serves from the next visit on, and the
// first visit hands it the files it loaded, which it copies in the background.
const family='atlas-',prefix='atlas-v2-';
let checking=null;

self.addEventListener('install',()=>self.skipWaiting());

// version.json bypasses the browser and CDN caches so a deploy is seen at once.
async function checkVersion({refresh=false}={}){
 let version;
 try{
  const response=await fetch(new URL('version.json?'+Date.now(),self.registration.scope),{cache:'no-store'});if(!response.ok)throw Error('Version unavailable');
  version=(await response.json()).version;if(version!==null&&(typeof version!=='string'||!/^[a-f0-9]{40}$/i.test(version)))throw Error('Invalid version');
 }catch(error){if(refresh)throw error;return currentStore();}
 for(const name of await caches.keys())if(name.startsWith(family)&&(refresh||name!==prefix+version))await caches.delete(name);
 return version?prefix+version:null;
}
async function currentStore(){return (await caches.keys()).find(name=>name.startsWith(prefix))||null;}

function navigate(request){checking=checkVersion();return fetch(request,{cache:'no-cache'});}

async function cached(request){
 let store=null;try{store=await (checking??=checkVersion());}catch{}
 if(!store)return fetch(request);
 // A failing store never fails the request: it goes to the network instead.
 let cache;try{cache=await caches.open(store);const hit=await cache.match(request);if(hit)return hit;}catch{cache=null;}
 // Bypass the HTTP cache too: an older response must never enter a new version's store.
 const response=await fetch(request,{cache:'reload'});
 if(cache&&response.status===200&&response.type==='basic')cache.put(request,response.clone()).catch(()=>{});
 return response;
}

self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
 if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname)||url.pathname.endsWith('/version.json'))return;
 event.respondWith(request.mode==='navigate'?navigate(request):cached(request));
});

// The page lists the files its first view loaded before this worker controlled it.
self.addEventListener('message',event=>{
 if(event.data?.refreshAppFiles===true){
  checking=checkVersion({refresh:true});
  event.waitUntil(checking.then(()=>event.ports?.[0]?.postMessage({refreshed:true})).catch(()=>{checking=null;event.ports?.[0]?.postMessage({refreshed:false});}));return;
 }
 if(!Array.isArray(event.data?.store))return;
 event.waitUntil((async()=>{
  const store=await (checking??=checkVersion());if(!store)return;
  const cache=await caches.open(store);
  for(const url of event.data.store){
   const target=new URL(url),scope=new URL(self.registration.scope);
   if(target.origin!==scope.origin||!target.pathname.startsWith(scope.pathname)||target.pathname.endsWith('/version.json')||await cache.match(url))continue;
   try{const response=await fetch(url,{cache:'reload'});if(response.status===200&&response.type==='basic')await cache.put(url,response);}catch{}
  }
 })());
});
