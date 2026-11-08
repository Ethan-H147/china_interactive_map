const spanishRegionalNames={
 'ES-P-08':[['Spanish','es','Barcelona'],['Catalan','ca','Barcelona']],
 'ES-P-17':[['Spanish','es','Gerona'],['Catalan','ca','Girona']],
 'ES-P-25':[['Spanish','es','Lérida'],['Catalan','ca','Lleida']],
 'ES-P-43':[['Spanish','es','Tarragona'],['Catalan','ca','Tarragona']],
 'ES-P-15':[['Spanish','es','La Coruña'],['Galician','gl','A Coruña']],
 'ES-P-32':[['Spanish','es','Orense'],['Galician','gl','Ourense']],
 'ES-P-27':[['Spanish','es','Lugo'],['Galician','gl','Lugo']],
 'ES-P-36':[['Spanish','es','Pontevedra'],['Galician','gl','Pontevedra']],
 'ES-P-03':[['Spanish','es','Alicante'],['Valencian','ca','Alacant']],
 'ES-P-12':[['Spanish','es','Castellón'],['Valencian','ca','Castelló']],
 'ES-P-46':[['Spanish','es','Valencia'],['Valencian','ca','València']],
 'ES-P-01':[['Spanish','es','Álava'],['Basque','eu','Araba']],
 'ES-P-20':[['Spanish','es','Guipúzcoa'],['Basque','eu','Gipuzkoa']],
 'ES-P-48':[['Spanish','es','Vizcaya'],['Basque','eu','Bizkaia']],
 'ES-P-31':[['Spanish','es','Navarra'],['Basque','eu','Nafarroa']],
 'ES-P-07':[['Spanish','es','Islas Baleares'],['Catalan','ca','Illes Balears']],
 'ES-A-09':[['Spanish','es','Cataluña'],['Catalan','ca','Catalunya']],
 'ES-A-10':[['Spanish','es','Comunidad Valenciana'],['Valencian','ca','Comunitat Valenciana']],
 'ES-A-04':[['Spanish','es','Islas Baleares'],['Catalan','ca','Illes Balears']],
 'ES-A-12':[['Spanish','es','Galicia'],['Galician','gl','Galicia']],
 'ES-A-15':[['Spanish','es','Comunidad Foral de Navarra'],['Basque','eu','Nafarroako Foru Komunitatea']],
 'ES-A-16':[['Spanish','es','País Vasco'],['Basque','eu','Euskadi']]
};
export function spanishNameRows(record){
 if(spanishRegionalNames[record.id])return spanishRegionalNames[record.id];
 const province=record.level===2?record.id:record.parent;
 const language=['ES-P-08','ES-P-17','ES-P-25','ES-P-43','ES-P-07'].includes(province)?['Catalan','ca']:['ES-P-15','ES-P-27','ES-P-32','ES-P-36'].includes(province)?['Galician','gl']:['Spanish','es'];
 return [[...language,record.local]];
}
export function spanishCardNames(record){
 const spanish=spanishNameRows(record).find(([,lang])=>lang==='es')?.[2]||'';
 return {...record,local:spanish===record.en?'':spanish,localLang:'es'};
}
