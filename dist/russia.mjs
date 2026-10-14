import {addRegionalCountry} from './regional-country.mjs';
import {russiaFlags} from './russia-flags.mjs';
import {russiaPlaceNames} from './russia-names.mjs';
import {russiaCityFlags,russiaCityIds} from './russia-cities.mjs';
import './countries.js';
const russia=globalThis.AtlasCountries.countries.russia;
export const configuration={country:'russia',name:russia.en,prefix:russia.prefix,base:'data/russia/',lang:russia.lang,nationalFlag:'vendor/flag-'+russia.prefix+'.svg',...russia.map,flags:russiaFlags,detailFlags:russiaCityFlags,hasStatistics:record=>record.level===1||russiaCityIds.has(record.id),names:russiaPlaceNames,attribution:'Russia: <a href="https://www.geoboundaries.org/api/current/gbOpen/RUS/">geoBoundaries</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a> (ODbL 1.0)'};
export function addRussiaPortal(map,host){return addRegionalCountry(map,host,configuration);}
