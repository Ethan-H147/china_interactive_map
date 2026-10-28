// Retain the SCAR Antarctic Digital Database medium-resolution coastline (v7.7, CC BY 4.0).
// The GeoPackage's land, ice-shelf, ice-tongue and rumple polygons are dissolved into one outline in
// its own EPSG:3031 plane and kept there; build-antarctica.mjs simplifies and converts it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {readAddCoast} from './antarctic-coast.mjs';
import {command} from './build-regional-dataset.mjs';
const root='scripts/boundary-sources/antarctica/',file='add_coastline_medium_res_polygon_v7_7.gpkg';
const url='https://ramadda.data.bas.ac.uk/repository/entry/get/add_coastline_medium_res_polygon_v7_7.gpkg?entryid=synth%3Acc111b81-5066-42dd-be60-9f05abcb5873%3AL2FkZF9jb2FzdGxpbmVfbWVkaXVtX3Jlc19wb2x5Z29uX3Y3XzcuZ3BrZw%3D%3D';
const response=await fetch(url);if(!response.ok)throw Error('ADD coastline '+response.status);
const bytes=Buffer.from(await response.arrayBuffer()),sha256=createHash('sha256').update(bytes).digest('hex');
const expected='725e0abe3fdcb31f78f49bf29e7c4a2a65a82798eba743fe2cecfa37b5664193';
if(sha256!==expected)throw Error('ADD coastline v7.7 changed: '+sha256);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'add-coast-')),local=path.join(dir,file);
try{
 fs.writeFileSync(local,bytes);
 const source=readAddCoast(local),surfaces={};for(const f of source.features)surfaces[f.properties.surface]=(surfaces[f.properties.surface]||0)+1;
 const outline=await command(source,'-dissolve2 copy-fields=none -clean',{precision:null});
 for(const f of outline.features){f.properties={};const round=v=>Array.isArray(v[0])?v.map(round):v.map(n=>Math.round(n*10)/10);f.geometry.coordinates=round(f.geometry.coordinates);}
 fs.writeFileSync(root+'add-coastline-medium-v7_7-epsg3031.json.gz',gzipSync(JSON.stringify(outline),{level:9}));
 fs.writeFileSync(root+'coast-manifest.json',JSON.stringify({retrieved:'2026-10-27',dataset:'Medium resolution vector polygons of the Antarctic coastline',version:'7.7',published:'2023-05-12',doi:'https://doi.org/10.5285/cc111b81-5066-42dd-be60-9f05abcb5873',page:'https://data.bas.ac.uk/items/cc111b81-5066-42dd-be60-9f05abcb5873',credit:'SCAR Antarctic Digital Database; UK Polar Data Centre',license:'CC BY 4.0; https://creativecommons.org/licenses/by/4.0/',files:{[file]:{url,sha256,bytes:bytes.length,crs:'EPSG:3031',surfaces}},retained:{file:'add-coastline-medium-v7_7-epsg3031.json.gz',description:'All surfaces dissolved into one outline, EPSG:3031 metres rounded to 0.1 m.'}},null,2)+'\n');
 console.log('Retained ADD v7.7 coastline:',bytes.length,'bytes;',JSON.stringify(surfaces));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
