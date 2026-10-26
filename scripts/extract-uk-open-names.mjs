// Re-extract populated places from the retained OS Open Names CSV archive.
// Usage: node scripts/extract-uk-open-names.mjs path/to/opname_csv_gb.zip
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {StringDecoder} from 'node:string_decoder';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {load} from './geo-index.mjs';
const require=createRequire(import.meta.url),ff=createRequire(require.resolve('mapshaper'))('fflate'),root='scripts/boundary-sources/uk-places/',manifest=load(root+'manifest.json'),archive=fs.readFileSync(process.argv[2]);
assert.equal(createHash('md5').update(archive).digest('hex'),manifest.sources.find(s=>s.id==='os-open-names').archiveMD5,'Use the pinned October 2026 archive, or deliberately review and update the source manifest');
const headers=Buffer.from(Object.values(ff.unzipSync(archive,{filter:f=>/Header\.csv$/i.test(f.name)}))[0]).toString().trim().replace(/^\uFEFF/,'').split(','),places=[],types={},included=new Set(['City','Town','Village','Hamlet','Other Settlement']);let files=0,rows=0;
function csv(line){const cells=[];let value='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){cells.push(value);value='';}else value+=c;}cells.push(value.replace(/\r$/,''));return cells;}
// CSVs expand to about 1.65 GB. Decode one stream at a time and retain places only.
const unzip=new ff.Unzip(file=>{if(!/^Data\/.*\.csv$/i.test(file.name))return;files++;const decoder=new StringDecoder('utf8');let pending='';const consume=text=>{pending+=text;let end;while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);if(!line)continue;rows++;const fields=csv(line),type=fields[7];if(fields[6]!=='populatedPlace')continue;types[type]=(types[type]||0)+1;if(!included.has(type))continue;const r=Object.fromEntries(headers.map((k,i)=>[k,fields[i]]));places.push({id:r.ID.replace(/^\uFEFF/,'').trim(),name:r.NAME1,language:r.NAME1_LANG,alternate:r.NAME2,alternateLanguage:r.NAME2_LANG,type:r.LOCAL_TYPE,easting:+r.GEOMETRY_X,northing:+r.GEOMETRY_Y,district:r.DISTRICT_BOROUGH,county:r.COUNTY_UNITARY,region:r.REGION,country:r.COUNTRY,uri:r.NAMES_URI});}};file.ondata=(error,data,final)=>{if(error)throw error;consume(decoder.write(Buffer.from(data)));if(final)consume(decoder.end()+'\n');};file.start();});unzip.register(ff.UnzipInflate);
for(let i=0;i<archive.length;i+=1048576)unzip.push(archive.subarray(i,i+1048576),i+1048576>=archive.length);
const bytes=gzipSync(JSON.stringify({files,rows,types,places}),{level:9});assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.files['os-places.json.gz'].sha256,'Extraction reproduces retained source');fs.writeFileSync(root+'os-places.json.gz',bytes);console.log('OS populated places',places.length,types);
