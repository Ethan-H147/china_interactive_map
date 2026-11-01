import {configurations} from '../dist/europe.mjs';
import {compactFiles} from '../dist/compact-files.mjs';
import {load} from './geo-index.mjs';

// Keep retained geometry and rebuild inputs in GitHub. Both hosts publish the
// same runtime paths: compact copies, bundled levels, and scoped county sources.
export function publishedAssetPolicy(){
 const omitted=new Set();
for(const [id,c] of Object.entries(configurations)){
 const base='data/europe/'+id+'/',levels=[c.firstLabel,c.secondLabel,c.thirdLabel].filter(Boolean).length,bundled=c.loadAllSubdivisions?levels:Math.min(levels,c.bundledLevels||1),cat=load('dist/'+base+'catalogue.bin');
 if(bundled>1){omitted.add(base+'first.bin');for(const [parent,ch] of Object.entries(cat.chunks)){const level=ch.level??cat.records.find(r=>r.id===parent)?.level+1;if(level<=bundled)omitted.add(base+ch.file);}}else omitted.add(base+'all.bin');
}
// These retained inputs have been replaced by per-source/per-parent runtime files.
// Keep the original data in GitHub for rebuilds; publish only the data the app uses.
const buildOnly=new Set(['data/china-counties.bin','data/china-boundaries.pack.bin','data/china-overview.pack.bin','data/china-counties.pack.bin','data/china-motion.bin','data/korea-motion.bin','data/mongolia-motion.bin']);
// Runtime requests for these originals are redirected to verified compact copies.
for(const file of compactFiles)buildOnly.add('data/'+file);
// Settlement builders retain readable/full inputs alongside the runtime files.
for(const [id,c] of Object.entries(configurations)){
 if(c.settlementFile)buildOnly.add('data/europe/'+id+'/settlements.json');
 if(c.settlementManifest){buildOnly.add('data/europe/'+id+'/settlements.json');buildOnly.add('data/europe/'+id+'/settlements.bin');}
}
for(const file of buildOnly)omitted.add(file);
 return {omitted,buildOnly};
}
