import {loadCompressed} from './korea-data.mjs';
import {prepareMongolia} from './mongolia-preparation.mjs';
try{postMessage({result:prepareMongolia(await loadCompressed(new URL('data/mongolia-boundaries.bin',import.meta.url)))});}
catch(error){postMessage({error:error.message});}
