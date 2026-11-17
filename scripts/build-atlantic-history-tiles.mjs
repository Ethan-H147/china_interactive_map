import path from 'node:path';
import {compileHistoricalTiles} from './historical-tile-compiler.mjs';
import {prepareAtlanticHistory} from './prepare-atlantic-history.mjs';
const root=path.resolve(process.env.ATLAS_ROOT||'.');
const countries=process.argv.slice(2);
for(const country of countries.length?countries:['united-states','united-kingdom']){
 const output=path.resolve(process.env.HISTORY_TILES_OUTPUT||root+'/dist/data/europe/'+country+'/history/tiles');
 const prepared=await prepareAtlanticHistory(root,country);
 console.log('Compiling',country);
 await compileHistoricalTiles({root,output,...prepared});
}
