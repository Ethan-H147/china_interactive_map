import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {statisticsRoot as root} from './prepare-cz-sk-ua-statistics.mjs';
const manifest=JSON.parse(fs.readFileSync(root+'manifest.json'));
for(const [name,meta]of Object.entries(manifest.files)){
 const file=root+name;
 if(!fs.existsSync(file)){
  if(name==='ua-gdp-rows.json'){
   const result=spawnSync(process.env.PYTHON_BIN||'python',['scripts/extract-ukraine-regional-gdp.py'],{stdio:'inherit'});assert.equal(result.status,0,'Install xlrd 2.0.2 to re-extract the retained legacy workbook');
  }else{
   const response=await fetch(meta.url,{signal:AbortSignal.timeout(180000)});assert(response.ok,name+' HTTP '+response.status);let bytes=Buffer.from(await response.arrayBuffer());
   if(name==='sk-population-2024.json'){
    assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.originalSha256,'GISCO release changed; review before replacing it');
    const records=JSON.parse(bytes).features.filter(f=>f.properties.CNTR_CODE==='SK').map(f=>f.properties);bytes=Buffer.from(JSON.stringify({year:2024,date:'2024-01-01',sourceSha256:meta.originalSha256,records}));
   }
   fs.writeFileSync(file,bytes);
  }
 }
 assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),meta.sha256,'Retained source checksum '+name);
 console.log('Verified',name);
}
