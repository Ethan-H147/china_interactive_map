// An internal-border build must not refresh unrelated national frontier bytes.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const file='dist/data/atlas-frontiers.bin',frontiers=fs.readFileSync(file);
try{
 for(const args of [['scripts/prepare-motion.mjs'],['scripts/prepare-context.mjs','--retain-lake-sources'],['scripts/prepare-shared-context.mjs']])execFileSync(process.execPath,args,{stdio:'inherit'});
}finally{fs.writeFileSync(file,frontiers);}
