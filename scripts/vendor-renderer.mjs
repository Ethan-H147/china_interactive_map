import fs from 'node:fs';
import assert from 'node:assert/strict';
const library=new URL('../node_modules/maplibre-gl/',import.meta.url);
const output=new URL('../dist/vendor/',import.meta.url);
for(const name of ['maplibre-gl.mjs','maplibre-gl-shared.mjs','maplibre-gl-worker.mjs','maplibre-gl.css']){
  fs.copyFileSync(new URL('dist/'+name,library),new URL(name,output));
}
fs.copyFileSync(new URL('LICENSE.txt',library),new URL('maplibre-LICENSE.txt',output));
// A GeoJSON source loaded from a URL normally copies its parsed data back to the
// page so GeoJSONSource.getData() can return it. The atlas never reads source
// data back, and that copy of China's full geometry blocked the main thread.
const worker=new URL('maplibre-gl-worker.mjs',output),code=fs.readFileSync(worker,'utf8'),returnData='e.request&&(n.data=e.data),';
assert.equal(code.split(returnData).length,2,'MapLibre worker changed; review the GeoJSON data-return patch');
fs.writeFileSync(worker,code.replace(returnData,''));
