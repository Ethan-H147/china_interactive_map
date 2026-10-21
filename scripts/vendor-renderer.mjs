import fs from 'node:fs';
import assert from 'node:assert/strict';
const library=new URL('../node_modules/maplibre-gl/',import.meta.url);
const output=new URL('../dist/vendor/',import.meta.url);
assert.equal(JSON.parse(fs.readFileSync(new URL('package.json',library),'utf8')).version,'6.11.2','Review renderer patches before upgrading MapLibre');
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

// Keep source coverage reuse scoped to a single native source-update pass. The
// original covering algorithm remains the fallback and all tile lifecycles run.
const renderer=new URL('maplibre-gl.mjs',output);
let main=fs.readFileSync(renderer,'utf8');
const coverage='n=Fo(e,{tileSize:this.usedForTerrain?this.tileSize:this._source.tileSize';
const update='_updateSources(e){for(let t in this.tileManagers)this.tileManagers[t].update(e,this.map.terrain)}';
for(const needle of [coverage,update])assert.equal(main.split(needle).length,2,'MapLibre changed; review source coverage reuse');
main=main.replace(coverage,'n=atlasCoveringTiles(Fo,e,{tileSize:this.usedForTerrain?this.tileSize:this._source.tileSize');
main=main.replace(update,'_updateSources(e){return atlasRunSourceUpdate(e,()=>{for(let t in this.tileManagers)this.tileManagers[t].update(e,this.map.terrain)})}');
fs.writeFileSync(renderer,"import {coveringTiles as atlasCoveringTiles,runSourceUpdate as atlasRunSourceUpdate} from '../globe-renderer.mjs';\n"+main);
