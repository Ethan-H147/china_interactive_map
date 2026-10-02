import fs from 'node:fs';
const library=new URL('../node_modules/maplibre-gl/',import.meta.url);
const output=new URL('../dist/vendor/',import.meta.url);
for(const name of ['maplibre-gl.mjs','maplibre-gl-shared.mjs','maplibre-gl-worker.mjs','maplibre-gl.css']){
  fs.copyFileSync(new URL('dist/'+name,library),new URL(name,output));
}
fs.copyFileSync(new URL('LICENSE.txt',library),new URL('maplibre-LICENSE.txt',output));
