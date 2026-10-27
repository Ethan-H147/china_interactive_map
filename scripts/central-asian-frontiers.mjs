import fs from 'node:fs';
import {root,countries} from './fetch-central-asian-frontiers.mjs';
// Global border rebuilds must preserve the same ownership mesh as the fills.
export function preserveCentralAsianFrontiers(){
 if(!fs.existsSync(root+'resolved.bin'))return;
 for(const c of Object.keys(countries))fs.copyFileSync(root+'international/'+c+'.bin','dist/data/europe/'+c+'/international.bin');
}
