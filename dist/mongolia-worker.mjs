import {prepareScopedCountry} from './scoped-country.mjs';
try{postMessage({result:await prepareScopedCountry('mongolia')});}
catch(error){postMessage({error:error.message});}
