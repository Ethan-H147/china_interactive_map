// Official cantonal languages: Swiss FDFA; Graubünden's trilingual cantonal site.
export const swissLanguageSource='https://www.aboutswitzerland.eda.admin.ch/en/multilingualism';
export const swissMultilingualNames={
 'CH-K-2':[['de','Bern'],['fr','Berne']],
 'CH-K-10':[['fr','Fribourg'],['de','Freiburg']],
 'CH-K-23':[['fr','Valais'],['de','Wallis']],
 'CH-K-18':[['de','Graubünden'],['it','Grigioni'],['rm','Grischun']]
};
const labels={de:'German',fr:'French',it:'Italian',rm:'Romansh'};
export function swissNameRows(record){
 if(record.level!==1||!/^CH-K-/.test(record.id||''))return[];
 const language=['CH-K-22','CH-K-24','CH-K-25','CH-K-26'].includes(record.id)?'fr':record.id==='CH-K-21'?'it':'de';
 return (swissMultilingualNames[record.id]||[[language,record.local]]).map(([lang,text])=>({lang,text,language:labels[lang],source:record.id==='CH-K-18'?'https://www.gr.ch/EN/Seiten/welcome.aspx':swissLanguageSource}));
}
export function swissCardNames(record){const rows=swissNameRows(record);return rows.length?{...record,local:rows.length>1?'':rows[0].text,localLang:rows[0].lang}:record;}

// A native form already used by the title gets its speaker there, without a repeated row.
export function swissSecondaryNameRows(record){
 const forms=swissNameRows(record),key=value=>String(value||'').normalize('NFC').trim();
 return forms.length>1?forms.filter(form=>key(form.text)!==key(record.en)):[];
}
