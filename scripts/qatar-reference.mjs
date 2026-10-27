import assert from 'node:assert/strict';
import proj4 from 'proj4';
import polygonClipping from 'polygon-clipping';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {source} from './fetch-caucasus-gulf.mjs';
import {polygons} from './geo-index.mjs';
const require=createRequire(import.meta.url),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate');
export const qatarDatum={from:'QND95 geographic coordinates (EPSG:4614)',to:'WGS 84 (EPSG:4326)',operation:'EPSG:1840, Qatar Centre for GIS seven-parameter position-vector transformation',parameters:[-119.4248,-303.65872,-11.00061,1.164298,0.174458,1.096259,3.657065],url:'https://epsg.io/1840'};
const transform=proj4('+proj=longlat +ellps=intl +towgs84='+qatarDatum.parameters.join(',')+' +no_defs','EPSG:4326');
export const qatarWgs84=point=>transform.forward(point.slice(0,2));
export function correctedQatarReference(data,level){
 assert.equal(createHash('sha256').update(source('qat.zip')).digest('hex'),"62accf5cd95ea4276b59e3b216a25387c3a72f346c99972fe03d8e7e2a9e0d37",'Review Qatar datum correction when the retained source changes');
 const original=JSON.parse(Buffer.from(unzipSync(source('qat.zip'))['qat_admin2.geojson'])),placeholder=original.features.find(f=>f.properties.adm2_pcode==='QAT004099');assert(placeholder&&polygons(placeholder.geometry).length===3);
 data.features=data.features.filter(f=>f.properties.adm2_pcode!=='QAT004099');
 const coordinates=value=>typeof value[0]==='number'?qatarWgs84(value):value.map(coordinates);
 for(const f of data.features){
  if(level===1&&f.properties.adm1_pcode==='QAT004')f.geometry={type:'MultiPolygon',coordinates:polygonClipping.difference(polygons(f.geometry),polygons(placeholder.geometry))};
  f.geometry.coordinates=coordinates(f.geometry.coordinates);
 }
 // The retained export is labelled CRS84, but its numerical coordinates retain
 // QND95. Independent coast controls verify this correction before publication.
 delete data.crs;return data;
}
