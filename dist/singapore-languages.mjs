export const singaporeLanguages=[['zh','Chinese','新加坡'],['ms','Malay','Singapura'],['en','English','Singapore'],['ta','Tamil','சிங்கப்பூர்']];
export const singaporeName=language=>singaporeLanguages.find(([code])=>code===language)?.[2]||'Singapore';
export const singaporeLabel=(record,language='en')=>record?.names?.[language]||record?.en||singaporeName(language);
export function readSingaporeLanguage(storage){try{const value=storage.getItem('boundary-atlas-singapore-language-v1');return singaporeLanguages.some(([code])=>code===value)?value:'en';}catch{return 'en';}}
