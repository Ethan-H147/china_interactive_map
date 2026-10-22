const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const mapshaper = require('mapshaper');
const base = __dirname;
const projection = '+proj=krovak +lat_0=49.5 +lon_0=24.8333333333333 +alpha=30.2881397527778 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +towgs84=485,169.5,483.8,7.786,4.398,4.103,0 +units=m +no_defs';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function unzip(b) {
  const out = new Map(); let p = 0;
  while (p + 30 < b.length && b.readUInt32LE(p) === 0x04034b50) {
    const method=b.readUInt16LE(p+8), size=b.readUInt32LE(p+18), nl=b.readUInt16LE(p+26), el=b.readUInt16LE(p+28);
    const name=b.subarray(p+30,p+30+nl).toString(); let data=b.subarray(p+30+nl+el,p+30+nl+el+size);
    if(method===8)data=zlib.inflateRawSync(data); else if(method!==0)throw new Error('Unsupported compression');
    out.set(name,data);p+=30+nl+el+size;
  } return out;
}
(async()=>{
 const shp=unzip(fs.readFileSync(path.join(base,'sk-official-ah_shp_0.zip')));
 const csv=unzip(fs.readFileSync(path.join(base,'sk-official-ah_csv.zip')));
 const sources={retrieved:'2026-10-22',publisher:'Geodetický a kartografický ústav Bratislava',license:'CC-BY-4.0',sourcePage:'https://www.skgeodesy.sk/geoportal/zbgis/na-stiahnutie/',sourceCRS:'EPSG:5514',targetCRS:'EPSG:4326',transformation:{operation:'EPSG:4836 S-JTSK to WGS 84 (4)',proj:projection,accuracyMetres:1},validity:'2026-06-30, except Nitra, Dunajská Streda, Topoľčany, Čadca, Liptovský Mikuláš, Veľký Krtíš, Michalovce and Trebišov at 2024-12-31',files:{}};
 for(const f of ['ah_shp_0.zip','ah_csv.zip']){let b=fs.readFileSync(path.join(base,'sk-official-'+f));sources.files['sk-official-'+f]={url:'https://opendata.skgeodesy.sk/static/ZBGIS/usj/'+f,bytes:b.length,sha256:sha(b)};}
 for(const [src,dest,count] of [['sr','state',1],['kraj','regions',8],['okres','districts',79],['obec','local',2927]]){
  for(const ext of ['shp','shx','dbf','prj','CPG']){const n=src+'_0.'+ext;fs.writeFileSync(path.join(base,'sk-official-'+n),shp.get(n));}
  const result=await mapshaper.applyCommands('-i "'+path.join(base,'sk-official-'+src+'_0.shp')+'" -proj wgs84 from="'+projection+'" -o format=geojson');
  const raw=Buffer.from(Object.values(result)[0]), json=JSON.parse(raw); if(json.features.length!==count)throw new Error('Feature count '+dest);
  const name='sk-official-'+dest+'.json.gz',packed=zlib.gzipSync(raw,{level:9});fs.writeFileSync(path.join(base,name),packed);
  let coordinates=0; const walk=x=>{if(typeof x[0]==='number')coordinates++;else for(const p of x)walk(p);}; for(const f of json.features)walk(f.geometry.coordinates);
  sources.files[name]={sourceLayer:src+'_0',features:count,sourceCRS:'EPSG:5514',targetCRS:'EPSG:4326',bytes:packed.length,sha256:sha(packed),uncompressedSha256:sha(raw),coordinates};
  console.log(name,packed.length,count,json.features[0].properties);
  for(const ext of ['shp','shx','dbf','prj','CPG'])fs.unlinkSync(path.join(base,'sk-official-'+src+'_0.'+ext));
 }
 fs.writeFileSync(path.join(base,'sk-official-sources.json'),JSON.stringify(sources,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
