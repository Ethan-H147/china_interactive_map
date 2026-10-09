import {addRegionalCountry} from './regional-country.mjs';
import {russiaFlags} from './russia-flags.mjs';
import {russiaPlaceNames} from './russia-names.mjs';
import {russiaCityFlags,russiaCityIds} from './russia-cities.mjs';
export const configuration={country:'russia',name:'Russia',prefix:'ru',base:'data/russia/',lang:'ru',nationalFlag:'vendor/flag-ru.svg',firstLabel:'Regions',secondLabel:'Districts',center:[100,61],zoom:2,bounds:[[19,41],[191,79]],fill:'#d8e2f0',selected:'#c5d2ed',line:'#5d7196',flags:russiaFlags,detailFlags:russiaCityFlags,hasStatistics:record=>record.level===1||russiaCityIds.has(record.id),names:russiaPlaceNames,attribution:'Russia: <a href="https://www.geoboundaries.org/api/current/gbOpen/RUS/">geoBoundaries</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a> (ODbL 1.0)'};
export function addRussiaPortal(map,host){return addRegionalCountry(map,host,configuration);}
