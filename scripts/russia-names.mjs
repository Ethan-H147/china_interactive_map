// Preserve native source labels; supply readable Latin names when the boundary
// source has no English title. These are transliterations, not official names.
const alphabet={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
export function sourceNames(raw){
 if(!/[\u0400-\u04ff]/.test(raw))return {en:raw.replace(/Rayon$/,'District'),local:''};
 let name=raw.replace(/муниципальный район/gi,'Municipal District').replace(/муниципальный округ/gi,'Municipal District').replace(/городской округ/gi,'Urban District').replace(/район/gi,'District').replace(/\bЗАТО\b/gu,'Closed Town');
 name=name.replace(/[А-ЯЁа-яё]/g,char=>{const value=alphabet[char.toLowerCase()];return char===char.toUpperCase()?value.charAt(0).toUpperCase()+value.slice(1):value;});
 return {en:name,local:raw};
}
