// Korea's historical snapshots for the shared historic view (historic-view.mjs): the Samhan
// period around 100 CE and Joseon's eight provinces in 1890, built by
// scripts/build-korea-history.mjs from whole present-day districts.
import {OTHER_LAND} from './historic-borders.mjs';
import {TERRITORY} from './elections.mjs';

const PERIODS={100:{year:'c. 100',name:'Samhan period',source:['Cliopatria (Seshat)','https://github.com/Seshat-Global-History-Databank/cliopatria'],coverage:'Approximate extents, drawn along present-day district lines. Goguryeo and Lelang also extended into present-day China.'},
 1890:{year:'1890',name:'Joseon',source:['county histories','https://encykorea.aks.ac.kr/'],coverage:'Provinces drawn along present-day county lines.'}};
const KINDS={Confederacy:'state',Province:'state',Kingdom:'colony',Chiefdoms:'territory','Han commandery':'foreign'};

export const koreaHistory={
 label:'Historical snapshot',store:'atlas-korea-history-year',file:'history/borders.bin',defaultYear:1890,periods:true,standalone:true,
 yearText:year=>PERIODS[year].year,dateText:year=>PERIODS[year].name,
 sourceName:year=>PERIODS[year].source[0],source:year=>PERIODS[year].source[1],
 title:year=>PERIODS[year].name+(year===100?', c. 100 CE':', 1890'),
 coverage:year=>PERIODS[year].coverage,
 counts:units=>units.length+' '+(units[0]?.type==='Province'?'provinces':'polities'),
 kind:unit=>KINDS[unit.type],
 keys:[['state',year=>year===100?'Confederacy':'Province','#d8e2ee'],['colony','Kingdom','#e0e8da'],['territory','Chiefdoms',TERRITORY],['foreign','Han commandery',OTHER_LAND]],
 kindLabel:unit=>unit.type,
 describe:unit=>unit.note,
 // Joseon adopted its national flag in 1883; the Samhan polities had none.
 flag:unit=>unit.type==='Province'?'vendor/flag-joseon.svg':null,
 labelLines:unit=>[unit.name,unit.ko]
};
