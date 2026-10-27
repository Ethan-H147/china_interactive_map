import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import polygonClipping from 'polygon-clipping';
import {load,polygons} from './geo-index.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {command,fc} from './build-regional-dataset.mjs';
const root='scripts/boundary-sources/caucasus-gulf/';
export async function caspianWater(){
 const input='scripts/boundary-sources/nordics/ne-countries.json.gz',sha=createHash('sha256').update(gunzipSync(fs.readFileSync(input))).digest('hex'),file=root+'caspian-water.bin',meta=root+'caspian-water.json';
 if(fs.existsSync(file)&&fs.existsSync(meta)&&load(meta).landSourceSha256===sha&&load(meta).version===2)return load(file);
 const land=fc(load(input).features.filter(f=>['RUS','KAZ','TKM','IRN','AZE','ARM','GEO'].includes(f.properties.ADM0_A3))),box=fc([{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[46,36],[55,36],[55,48],[46,48],[46,36]]]}}]);
 const coast=await command({'land.json':land,'box.json':box},'-clip box.json -dissolve2 -clean gap-fill-area=0');
 const water=fc([{type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:polygonClipping.difference(polygons(box.features[0].geometry),...coast.features.map(f=>polygons(f.geometry)))}}]);
 assert(geographicAreaKm2(water.features[0].geometry)>350000,'Caspian water mask covers the basin');
 fs.writeFileSync(file,gzipSync(JSON.stringify(water),{level:9}));fs.writeFileSync(meta,JSON.stringify({version:2,source:'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson',license:'Natural Earth public domain',landSourceSha256:sha,method:'Caspian water is the basin rectangle minus the union of neighbouring Natural Earth land polygons. This removes territorial sea while preserving land borders between countries.'},null,2)+'\n');return water;
}
