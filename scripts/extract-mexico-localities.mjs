import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';

// Read only the ten identity, position and population columns. The national CSV
// has hundreds of other columns; never materialize its complete table in memory.
export function localityRows(text){
 const output=[];let header,row=[],field='',quoted=false,column=0;
 const cell=()=>{if(column<10)row.push(field.replace(/\r$/,''));field='';column++;};
 const finish=()=>{if(!header)header=row;else if(row.length===10){const r=Object.fromEntries(header.map((k,i)=>[k,row[i]]));if(/^\d{2}$/.test(r.ENTIDAD)&&r.ENTIDAD!=='00'&&r.MUN!=='000'&&/^\d{4}$/.test(r.LOC)&&!['0000','9998','9999'].includes(r.LOC))output.push(r);}row=[];column=0;};
 for(let i=0;i<text.length;i++){
  const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){if(column<10)field+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&(c===','||c==='\n')){cell();if(c==='\n')finish();}else if(column<10)field+=c;
 }
 if(column||field){cell();finish();}return output;
}
export async function extractMexicoLocalities(archivePath='artifacts/expansion-source/mexico-population.zip'){
 const root='scripts/boundary-sources/mexico-localities/',pin=JSON.parse(fs.readFileSync('scripts/country-expansion-sources.json')).files['mexico-population.zip'];
 let archive;if(fs.existsSync(archivePath))archive=fs.readFileSync(archivePath);else{const response=await fetch(pin.url,{signal:AbortSignal.timeout(180000)});if(!response.ok)throw Error('INEGI census archive: '+response.status);archive=Buffer.from(await response.arrayBuffer());fs.mkdirSync(path.dirname(archivePath),{recursive:true});fs.writeFileSync(archivePath,archive);}
 if(createHash('sha256').update(archive).digest('hex')!==pin.sha256)throw Error('INEGI census archive does not match its retained hash');
 const require=createRequire(import.meta.url),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate'),files=unzipSync(archive),member=Object.keys(files).find(k=>k.includes('conjunto_de_datos/')&&k.endsWith('.csv'));
 const records=localityRows(Buffer.from(files[member]).toString('utf8').replace(/^\uFEFF/,''));
 if(records.length!==189432)throw Error('Unexpected 2020 locality count: '+records.length);
 const text=JSON.stringify(records)+'\n',bytes=gzipSync(text,{level:9});fs.mkdirSync(root,{recursive:true});fs.writeFileSync(root+'localities-2020.json.gz',bytes);
 const manifest={retrieved:'2026-10-26',snapshot:2020,title:'INEGI · Censo de Población y Vivienda 2020, Principales resultados por localidad (ITER)',url:pin.url,documentation:'https://www.inegi.org.mx/programas/ccpv/2020/#datos_abiertos',license:pin.license,archiveSha256:pin.sha256,archiveBytes:archive.length,member,fields:Object.keys(records[0]),records:records.length,retainedSha256:createHash('sha256').update(bytes).digest('hex'),processing:'All 189,432 named census locality rows. Excludes national/state/municipal totals and aggregate codes 0000, 9998 and 9999. Retains published names, 2020 municipality codes, DMS reference coordinates and total population. No population cutoff.'};
 fs.writeFileSync(root+'manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log('Retained',records.length,'INEGI census localities;',bytes.length,'compressed bytes.');return manifest;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await extractMexicoLocalities(process.argv[2]);
