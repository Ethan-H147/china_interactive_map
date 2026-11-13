import path from'node:path';import{fileURLToPath}from'node:url';
process.env.ATLAS_BROWSER_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const atlas=process.env.ATLAS_CHECKOUT||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const{pathToFileURL}=await import('node:url');
const{startServer,launch}=await import(pathToFileURL(atlas+'/scripts/browser/harness.mjs'));
const server=await startServer();let page;
try{
 page=await launch({width:1100,height:850});await page.send('Page.navigate',{url:server.url+'/tests/geometry-preview.html'});await page.waitFor('window.ready===true');
 await page.screenshot('native-china-mesh-verification');
 await page.evaluate('window.render({longitude:100,latitude:20,zoom:.85})');await page.screenshot('native-world-mesh-verification');
 if(page.problems.length)throw Error(page.problems.join('\n'));
 console.log('Reference GPU mesh draws passed. These verify exported geometry, not the SwiftUI app or Metal shader compilation.');
}finally{await page?.close();await server.close();}
