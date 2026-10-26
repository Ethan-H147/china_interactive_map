import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const records=JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/united-states/catalogue.bin'))).records;
export default [{name:'County, parish and borough labels shorten with zoom and preserve independent-city distinctions',async run(p,base){
 await p.open(base,'#united-states');
 for(const [id,short] of [['US-COUNTY-08041','El Paso'],['US-COUNTY-02180','Nome'],['US-COUNTY-22033','East Baton Rouge'],['US-COUNTY-02090','Fairbanks North Star'],['US-COUNTY-29189','St. Louis County'],['US-COUNTY-51059','Fairfax County']]){
  const record=records.find(r=>r.id===id);
  await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');
  for(const zoom of [4,id==='US-COUNTY-22033'?11:9,4]){
   await p.evaluate('void map.jumpTo('+JSON.stringify({center:record.center,zoom})+')');await p.settle();
   await p.evaluate('currentAtlas().updateLabels()');
   const expression='document.querySelector('+JSON.stringify('[data-atlas-place="'+id+'"]')+')?.textContent';
   await p.waitFor(expression+'==='+JSON.stringify(zoom<9?short:record.en));
   assert.equal(await p.evaluate('document.getElementById("us-name").textContent'),record.en);
  }
 }
}}];
