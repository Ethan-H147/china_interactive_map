// Split retained bilingual names without changing geometry or quiz identities.
export function italianNameRows(record){
 const parts=String(record.local||'').split('/').map(name=>name.trim()).filter(Boolean);
 const rows=[['Italian','it',parts[0]||'']];
 const german=record.id==='IT-R-04'||record.id==='IT-P-21'||record.parent==='IT-P-21';
 const french=record.id==='IT-R-02'||record.id==='IT-P-7';
 if(parts.length>1&&german)rows.push(['German','de',record.id==='IT-R-04'?'Trentino-Südtirol':parts[1]]);
 else if(parts.length>1&&french)rows.push(['French','fr',parts[1]]);
 return rows;
}
export function italianCardNames(record){
 const italian=italianNameRows(record)[0][2];
 const en=record.id==='IT-C-021008'?'Bolzano':record.en.includes('/')?record.en.split('/')[0].trim():record.en;
 return {...record,en,local:italian===en?'':italian,localLang:'it'};
}
