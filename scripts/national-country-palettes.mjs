import {mix} from './europe-country-palettes.mjs';

// Flag swatches drive both the interface and map; text uses darker shades of
// those same colors so pale blue and yellow flags still produce legible controls.
export const nationalFlagPalettes={
 egypt:{primary:'#ce1126',secondary:'#c09300',flag:['#ce1126','#ffffff','#000000']},
 eritrea:{primary:'#e4002b',secondary:'#43b02a',flag:['#43b02a','#e4002b','#418fde','#ffc72c']},
 djibouti:{primary:'#6ab2e7',secondary:'#12ad2b',flag:['#6ab2e7','#ffffff','#12ad2b','#d7141a']},
 sudan:{primary:'#d21034',secondary:'#007229',flag:['#d21034','#ffffff','#000000','#007229']},
 libya:{primary:'#239e46',secondary:'#e70013',flag:['#e70013','#000000','#ffffff','#239e46']},
 tunisia:{primary:'#e70013',secondary:'#e70013',flag:['#e70013','#ffffff','#e70013']},
 algeria:{primary:'#006233',secondary:'#d21034',flag:['#006233','#ffffff','#d21034']},
 mauritania:{primary:'#00a95c',secondary:'#ffd700',flag:['#d01c1f','#00a95c','#ffd700','#00a95c','#d01c1f']},
 senegal:{primary:'#00853f',secondary:'#fdef42',flag:['#00853f','#fdef42','#e31b23']},
 gambia:{primary:'#0c1c8c',secondary:'#3a7728',flag:['#ce1126','#ffffff','#0c1c8c','#ffffff','#3a7728']},
 'guinea-bissau':{primary:'#ce1126',secondary:'#fcd116',land:'#009e49',flag:['#ce1126','#fcd116','#009e49']},
 guinea:{primary:'#ce1126',secondary:'#fcd116',land:'#fcd116',flag:['#ce1126','#fcd116','#009460']},
 'sierra-leone':{primary:'#1eb53a',secondary:'#0072c6',flag:['#1eb53a','#ffffff','#0072c6']},
 liberia:{primary:'#bf0a30',secondary:'#002868',flag:['#002868','#bf0a30','#ffffff','#bf0a30','#ffffff']},
 'ivory-coast':{primary:'#f77f00',secondary:'#009e60',flag:['#f77f00','#ffffff','#009e60']},
 ghana:{primary:'#006b3f',secondary:'#fcd116',land:'#fcd116',flag:['#ce1126','#fcd116','#006b3f']},
 togo:{primary:'#006a4e',secondary:'#ffce00',flag:['#d21034','#006a4e','#ffce00','#006a4e','#ffce00','#006a4e']},
 benin:{primary:'#008751',secondary:'#fcd116',land:'#fcd116',flag:['#008751','#fcd116','#e8112d']},
 cameroon:{primary:'#007a5e',secondary:'#ce1126',flag:['#007a5e','#ce1126','#fcd116']},
 'equatorial-guinea':{primary:'#3e9a00',secondary:'#e32118',flag:['#0073ce','#3e9a00','#ffffff','#e32118']},
 gabon:{primary:'#3a75c4',secondary:'#fcd116',land:'#009e60',flag:['#009e60','#fcd116','#3a75c4']},
 'cabo-verde':{primary:'#003893',secondary:'#f7d116',flag:['#003893','#ffffff','#cf2027','#ffffff','#003893']},
 'sao-tome-principe':{primary:'#12ad2b',secondary:'#ffce00',flag:['#d21034','#12ad2b','#ffce00','#12ad2b']},
 comoros:{primary:'#009639',secondary:'#ffd100',flag:['#009639','#ffd100','#ffffff','#ef3340','#003da5']},
 mauritius:{primary:'#ea2839',secondary:'#1a206d',land:'#ffd500',flag:['#ea2839','#1a206d','#ffd500','#00a551']},
 seychelles:{primary:'#003f87',secondary:'#fcd856',land:'#fcd856',flag:['#003f87','#fcd856','#d62828','#ffffff','#007a3d']},
 fiji:{primary:'#62b5e5',secondary:'#cf142b',flag:['#00247d','#ffffff','#cf142b','#62b5e5','#62b5e5']},
 samoa:{primary:'#ce1126',secondary:'#002b7f',flag:['#002b7f','#ffffff','#ce1126','#ce1126']},
 tonga:{primary:'#c10000',secondary:'#c10000',flag:['#c10000','#ffffff','#c10000']},
 tuvalu:{primary:'#5b97b1',secondary:'#ffdf00',flag:['#00247d','#ffffff','#cf142b','#5b97b1','#ffdf00']},
 kiribati:{primary:'#ce1126',secondary:'#fcd116',land:'#003f87',flag:['#ce1126','#fcd116','#ffffff','#003f87']},
 nauru:{primary:'#002b7f',secondary:'#ffc61e',flag:['#002b7f','#ffc61e','#ffffff','#002b7f']},
 palau:{primary:'#4aadd6',secondary:'#ffde00',flag:['#4aadd6','#ffde00','#4aadd6']},
 'marshall-islands':{primary:'#003893',secondary:'#dd7500',flag:['#003893','#ffffff','#dd7500','#003893']},
 micronesia:{primary:'#75b2dd',secondary:'#75b2dd',flag:['#75b2dd','#ffffff','#75b2dd']},
 ethiopia:{primary:'#078930',secondary:'#fcdd09',flag:['#078930','#fcdd09','#da121a']},
 somalia:{primary:'#4189dd',secondary:'#4189dd',flag:['#4189dd','#ffffff','#4189dd']},
 uganda:{primary:'#d90000',secondary:'#fcdc04',land:'#fcdc04',flag:['#000000','#fcdc04','#d90000','#000000','#fcdc04','#d90000']},
 rwanda:{primary:'#00a1de',secondary:'#fad201',land:'#20603d',flag:['#00a1de','#00a1de','#fad201','#20603d']},
 burundi:{primary:'#43b02a',secondary:'#c8102e',flag:['#43b02a','#ffffff','#c8102e','#ffffff','#43b02a']},
 maldives:{primary:'#d21034',secondary:'#007e3a',land:'#007e3a',flag:['#d21034','#007e3a','#ffffff','#007e3a','#d21034']}
};
const luminance=hex=>hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0);
function readable(color){let shade=color;for(let n=0;n<20&&(1.05/(luminance(shade)+.05))<5;n++)shade=mix(shade,'#14212a',.08);return shade;}
export const nationalCountryPalettes=Object.fromEntries(Object.entries(nationalFlagPalettes).map(([country,p])=>{
 const land=p.land||p.primary,accent=readable(p.primary),step=100/p.flag.length;
 return [country,{accent,dark:mix(accent,'#14212a',.25),secondary:readable(p.secondary),fill:mix(land,'#ffffff',.87),selected:mix(land,'#ffffff',.58),line:readable(land),background:mix(land,'#ffffff',.965),stripe:'linear-gradient(90deg,'+p.flag.map((c,i)=>c+' '+(i*step).toFixed(3)+'% '+((i+1)*step).toFixed(3)+'%').join(',')+')'}];
}));
